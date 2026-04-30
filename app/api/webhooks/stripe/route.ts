/**
 * Stripe webhook receiver.
 *
 * The webhook is the **single source of truth** for payment state. Stripe
 * will retry failed deliveries with exponential backoff, so this route must
 * be:
 *   1. Signature-verifying — we reject anything we can't authenticate.
 *   2. Idempotent — every event is dedup'd by `event.id` against the
 *      `stripe_events_processed` ledger; a duplicate just returns 200.
 *   3. Fast — heavy work is delegated to atomic SQL functions
 *      (`process_successful_payment`, `record_failed_payment`, `record_refund`)
 *      so we never hold the request open longer than necessary.
 *
 * Events we currently handle:
 *   - payment_intent.succeeded       → mark payment + extend/create subscription
 *   - payment_intent.payment_failed  → record failed payment + reason
 *   - setup_intent.succeeded         → store SEPA mandate, then charge first PI
 *   - setup_intent.setup_failed      → tag the session with the failure
 *   - charge.refunded                → mark payment refunded + cancel sub
 *   - charge.dispute.created         → tag the payment with the dispute reason
 *   - mandate.updated                → propagate mandate.status into our DB
 *
 * Anything else returns 200 (acknowledged) without DB writes.
 */
import 'server-only'

import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'

import { dispatchNotification } from '@/lib/notifications/dispatcher'
import {
  extractFailureReason,
  stripePaymentMethodToDb,
  type AdminClient,
} from '@/lib/stripe/helpers'
import { getStripe, getWebhookSecret } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Wrap a handler so that any thrown error becomes a 500 — never a 200 — so
 * Stripe will retry. Successful processing returns 200.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()

  let stripe: Stripe
  let webhookSecret: string
  try {
    stripe = getStripe()
    webhookSecret = getWebhookSecret()
  } catch (err) {
    return new Response(
      `Stripe non configurato: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 },
    )
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response(
      `Invalid signature: ${err instanceof Error ? err.message : String(err)}`,
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  // Idempotency: drop duplicates fast.
  const { data: existing } = await admin
    .from('stripe_events_processed')
    .select('id')
    .eq('id', event.id)
    .maybeSingle()
  if (existing) {
    return new Response('ok (duplicate)', { status: 200 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          admin,
          stripe,
        )
        break
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
          admin,
        )
        break
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(
          event.data.object as Stripe.SetupIntent,
          admin,
          stripe,
        )
        break
      case 'setup_intent.setup_failed':
        await handleSetupIntentFailed(
          event.data.object as Stripe.SetupIntent,
          admin,
        )
        break
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, admin)
        break
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute, admin)
        break
      case 'mandate.updated':
        await handleMandateUpdated(event.data.object as Stripe.Mandate, admin)
        break
      default:
        // No-op: acknowledge so Stripe stops retrying.
        break
    }

    await admin.from('stripe_events_processed').insert({
      id: event.id,
      type: event.type,
      api_version: event.api_version ?? null,
      livemode: event.livemode,
      // Cast through unknown → Json: the Stripe Event shape is JSON-encodable
      // by definition (it came from a JSON request body), but TS doesn't
      // know that.
      payload: JSON.parse(JSON.stringify(event)) as unknown as never,
    })

    return new Response('ok', { status: 200 })
  } catch (err) {
    // Returning 5xx makes Stripe retry. Log and bail.
    console.error('[stripe webhook] handler error', {
      type: event.type,
      id: event.id,
      err,
    })
    return new Response(
      `Handler error: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handlePaymentSucceeded(
  pi: Stripe.PaymentIntent,
  admin: AdminClient,
  stripe: Stripe,
): Promise<void> {
  const sessionId = pi.metadata?.payment_session_id
  if (!sessionId) {
    console.warn('[stripe webhook] payment_intent.succeeded missing metadata.payment_session_id', pi.id)
    return
  }
  const autoRenew = pi.metadata?.auto_renew === 'true'

  // Resolve the payment-method type and charge id.
  let chargeId: string | null = null
  let pmType: string | null = null
  if (typeof pi.latest_charge === 'string') {
    chargeId = pi.latest_charge
  } else if (pi.latest_charge && 'id' in pi.latest_charge) {
    chargeId = pi.latest_charge.id
    pmType = pi.latest_charge.payment_method_details?.type ?? null
  }
  if (!pmType && pi.payment_method) {
    if (typeof pi.payment_method === 'string') {
      const pm = await stripe.paymentMethods.retrieve(pi.payment_method)
      pmType = pm.type
    } else {
      pmType = pi.payment_method.type
    }
  }
  const dbMethod = stripePaymentMethodToDb(pmType) ?? 'card'

  const { error } = await admin.rpc('process_successful_payment', {
    p_payment_session_id: sessionId,
    p_amount_cents: pi.amount_received ?? pi.amount,
    p_payment_method: dbMethod,
    p_stripe_payment_intent_id: pi.id,
    p_stripe_charge_id: chargeId ?? '',
    p_auto_renew: autoRenew,
  })
  if (error) {
    throw new Error(`process_successful_payment failed: ${error.message}`)
  }

  // Phase 09: notify the member that the payment landed.
  // Best-effort; never block webhook acknowledgement on email send.
  try {
    const { data: payment } = await admin
      .from('payments')
      .select(
        'id, member_id, amount_cents, paid_at, payment_method, receipt_number, subscription_id, subscription:subscriptions(end_date)',
      )
      .eq('stripe_payment_intent_id', pi.id)
      .maybeSingle()
    if (payment) {
      const subRow = Array.isArray(payment.subscription)
        ? payment.subscription[0]
        : payment.subscription
      const isSepa = dbMethod === 'sepa'
      // SEPA renewals get a dedicated "succeeded" message; everyone gets a receipt.
      if (isSepa && autoRenew) {
        await dispatchNotification({
          type: 'sepa_succeeded',
          recipient_id: payment.member_id,
          subscription_id: payment.subscription_id ?? null,
          data: {
            amount_cents: payment.amount_cents,
            end_date: subRow?.end_date ?? null,
            receipt_number: payment.receipt_number,
          },
        })
      }
      if (payment.receipt_number) {
        await dispatchNotification({
          type: 'receipt',
          recipient_id: payment.member_id,
          // Receipts are NOT subscription-scoped for idempotency: a member
          // can receive multiple receipts in the lifetime of one
          // subscription. Use force so we always send.
          force: true,
          data: {
            receipt_number: payment.receipt_number,
            amount_cents: payment.amount_cents,
            paid_at: payment.paid_at,
            payment_method: payment.payment_method,
          },
        })
      }
    }
  } catch (err) {
    console.warn('[stripe webhook] notification dispatch failed', err)
  }
}

async function handlePaymentFailed(
  pi: Stripe.PaymentIntent,
  admin: AdminClient,
): Promise<void> {
  const sessionId = pi.metadata?.payment_session_id
  if (!sessionId) return

  const reason = extractFailureReason(pi)

  const dbMethod =
    stripePaymentMethodToDb(
      typeof pi.payment_method === 'object' && pi.payment_method
        ? pi.payment_method.type
        : null,
    ) ?? 'card'

  const { error } = await admin.rpc('record_failed_payment', {
    p_payment_session_id: sessionId,
    p_amount_cents: pi.amount,
    p_payment_method: dbMethod,
    p_stripe_payment_intent_id: pi.id,
    p_failure_reason: reason,
  })
  if (error) {
    throw new Error(`record_failed_payment failed: ${error.message}`)
  }

  // Phase 09: notify member (sepa_failed) + owner (payment_failed_owner).
  // Best-effort; never block webhook ack.
  try {
    const { data: payment } = await admin
      .from('payments')
      .select('id, gym_id, member_id, amount_cents, member:profiles!payments_member_id_fkey(full_name)')
      .eq('stripe_payment_intent_id', pi.id)
      .maybeSingle()
    if (payment && dbMethod === 'sepa') {
      await dispatchNotification({
        type: 'sepa_failed',
        recipient_id: payment.member_id,
        // No subscription_id scoping — multiple SEPA failures over time
        // are independent events; force so each lands.
        force: true,
        data: {
          amount_cents: payment.amount_cents,
          failure_reason: reason,
        },
      })
    }
    if (payment) {
      // Owner alerts: fan out to every owner/staff in the gym.
      const { data: owners } = await admin
        .from('profiles')
        .select('id')
        .eq('gym_id', payment.gym_id)
        .in('role', ['owner', 'staff'])
      const memberRow = Array.isArray(payment.member)
        ? payment.member[0]
        : payment.member
      for (const o of owners ?? []) {
        await dispatchNotification({
          type: 'payment_failed_owner',
          recipient_id: o.id,
          force: true,
          data: {
            failed_member_name: memberRow?.full_name ?? 'membro',
            amount_cents: payment.amount_cents,
            failure_reason: reason,
            payment_id: payment.id,
          },
        })
      }
    }
  } catch (err) {
    console.warn('[stripe webhook] failed-payment notification dispatch failed', err)
  }
}

async function handleSetupIntentSucceeded(
  si: Stripe.SetupIntent,
  admin: AdminClient,
  stripe: Stripe,
): Promise<void> {
  const sessionId = si.metadata?.payment_session_id
  if (!sessionId) {
    console.warn('[stripe webhook] setup_intent.succeeded missing metadata.payment_session_id', si.id)
    return
  }
  const autoRenew = si.metadata?.auto_renew === 'true'
  const memberId = si.metadata?.member_id
  const gymId = si.metadata?.gym_id

  if (!memberId || !gymId) {
    throw new Error(
      `setup_intent.succeeded missing required metadata (memberId/gymId) on ${si.id}`,
    )
  }

  // Pull the PaymentMethod for IBAN last-4 + bank code.
  if (!si.payment_method) {
    throw new Error(`setup_intent.succeeded ${si.id} has no payment_method`)
  }
  const pmId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method.id
  const pm = await stripe.paymentMethods.retrieve(pmId)

  const sepa = pm.sepa_debit
  if (!sepa) {
    throw new Error(`PaymentMethod ${pmId} is not a SEPA Debit method`)
  }

  let mandateId: string | null = null
  if (si.mandate) {
    mandateId = typeof si.mandate === 'string' ? si.mandate : si.mandate.id
  }
  if (!mandateId) {
    // Fallback: Stripe sometimes attaches the mandate to the PaymentMethod.
    const fallbackMandate = (sepa as { generated_from?: { mandate?: string } })
      .generated_from?.mandate
    if (fallbackMandate) mandateId = fallbackMandate
  }
  if (!mandateId) {
    // We can still store the PM and rely on `mandate.updated` to fill the id later.
    mandateId = `pending_${si.id}`
  }

  const { error: mErr } = await admin.from('sepa_mandates').upsert(
    {
      gym_id: gymId,
      member_id: memberId,
      stripe_mandate_id: mandateId,
      stripe_payment_method_id: pmId,
      stripe_setup_intent_id: si.id,
      iban_last4: sepa.last4 ?? '0000',
      bank_code: sepa.bank_code ?? null,
      status: 'active',
      signed_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_payment_method_id' },
  )
  if (mErr) throw new Error(`sepa_mandates upsert failed: ${mErr.message}`)

  // Now charge the first PaymentIntent so the member is actually paying.
  const { data: session } = await admin
    .from('payment_sessions')
    .select('id, gym_id, member_id, plan_id, amount_cents, stripe_payment_intent_id')
    .eq('id', sessionId)
    .single()
  if (!session) throw new Error(`payment_session ${sessionId} not found`)
  if (session.stripe_payment_intent_id) {
    // First charge already initiated; nothing to do.
    return
  }

  const customerId = typeof si.customer === 'string' ? si.customer : si.customer?.id
  if (!customerId) {
    throw new Error(`setup_intent ${si.id} has no customer`)
  }

  const pi = await stripe.paymentIntents.create({
    amount: session.amount_cents,
    currency: 'eur',
    customer: customerId,
    payment_method: pmId,
    payment_method_types: ['sepa_debit'],
    mandate: mandateId.startsWith('pending_') ? undefined : mandateId,
    confirm: true,
    off_session: autoRenew,
    metadata: {
      gym_id: session.gym_id,
      member_id: session.member_id,
      plan_id: session.plan_id,
      payment_session_id: session.id,
      auto_renew: autoRenew ? 'true' : 'false',
    },
  })

  await admin
    .from('payment_sessions')
    .update({ stripe_payment_intent_id: pi.id, payment_method: 'sepa', auto_renew: autoRenew })
    .eq('id', session.id)
}

async function handleSetupIntentFailed(
  si: Stripe.SetupIntent,
  admin: AdminClient,
): Promise<void> {
  const sessionId = si.metadata?.payment_session_id
  if (!sessionId) return
  const reason =
    si.last_setup_error?.message ?? si.last_setup_error?.code ?? 'unknown'
  await admin
    .from('payment_sessions')
    .update({ failure_reason: reason })
    .eq('id', sessionId)
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
  admin: AdminClient,
): Promise<void> {
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id
  if (!piId) return
  const { error } = await admin.rpc('record_refund', {
    p_stripe_payment_intent_id: piId,
    p_amount_refunded_cents: charge.amount_refunded ?? charge.amount,
  })
  if (error) throw new Error(`record_refund failed: ${error.message}`)
}

async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  admin: AdminClient,
): Promise<void> {
  const piId = typeof dispute.payment_intent === 'string'
    ? dispute.payment_intent
    : dispute.payment_intent?.id
  if (!piId) return
  // Best effort: tag the payment with a dispute note so it shows up in the
  // owner's "Da gestire" pane. Doesn't change status (Stripe will fire a
  // separate `charge.refunded` if the dispute resolves in the customer's
  // favor).
  const { data: payment } = await admin
    .from('payments')
    .select('id, notes')
    .eq('stripe_payment_intent_id', piId)
    .maybeSingle()
  if (!payment) return
  const note = `Disputa Stripe (${dispute.id}, motivo: ${dispute.reason}, importo €${(dispute.amount / 100).toFixed(2)})`
  const newNotes = payment.notes ? `${payment.notes}\n${note}` : note
  await admin.from('payments').update({ notes: newNotes }).eq('id', payment.id)
}

async function handleMandateUpdated(
  mandate: Stripe.Mandate,
  admin: AdminClient,
): Promise<void> {
  const pmId =
    typeof mandate.payment_method === 'string'
      ? mandate.payment_method
      : mandate.payment_method?.id
  if (!pmId) return
  const newStatus =
    mandate.status === 'active'
      ? 'active'
      : mandate.status === 'inactive'
        ? 'revoked'
        : 'pending'
  await admin
    .from('sepa_mandates')
    .update({
      stripe_mandate_id: mandate.id,
      status: newStatus,
      revoked_at: newStatus === 'revoked' ? new Date().toISOString() : null,
    })
    .eq('stripe_payment_method_id', pmId)
}
