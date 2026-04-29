'use server'

/**
 * Server actions — payment flow (Phase 05).
 *
 * Three groups:
 *   - Owner-only: `createPaymentSessionAction`, `refundPaymentAction`,
 *     `triggerSepaRenewalAction` (manual auto-renew until cron in Phase 09).
 *   - Public (token-gated): `initiateCardPaymentAction`,
 *     `initiateSepaSetupAction`, `confirmPaymentAction` — called from the
 *     `/pay/[token]` page on behalf of an unauthenticated visitor. The token
 *     is the trust boundary; we look up everything via the service-role
 *     admin client, never via the user's session.
 *   - Admin: `createBillingPortalSessionAction` for the member portal.
 */
import { revalidatePath } from 'next/cache'

import { requireOwnerOrStaff, requireProfile } from '@/lib/auth'
import { env } from '@/lib/env'
import {
  generatePaymentSessionToken,
  getOrCreateStripeCustomer,
} from '@/lib/stripe/helpers'
import { getStripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  confirmPaymentSchema,
  createPaymentSessionSchema,
  initiateCardPaymentSchema,
  initiateSepaSetupSchema,
  refundPaymentSchema,
  triggerSepaRenewalSchema,
  type ConfirmPaymentInput,
  type CreatePaymentSessionInput,
  type InitiateCardPaymentInput,
  type InitiateSepaSetupInput,
  type RefundPaymentInput,
  type TriggerSepaRenewalInput,
} from '@/lib/validations/payments'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

// ---------------------------------------------------------------------------
// Owner: create a payment session / shareable link
// ---------------------------------------------------------------------------

/**
 * Create a `payment_sessions` row + return the shareable URL.
 *
 * Email delivery is Phase 09; for now the owner copies the URL from the UI.
 */
export async function createPaymentSessionAction(
  input: CreatePaymentSessionInput,
): Promise<
  ActionResult<{ token: string; paymentUrl: string; sessionId: string }>
> {
  const profile = await requireOwnerOrStaff()

  const parsed = createPaymentSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Dati non validi' }
  }
  const { member_id, plan_id } = parsed.data

  const admin = createAdminClient()

  // Verify member belongs to the same gym.
  const { data: member, error: memberErr } = await admin
    .from('profiles')
    .select('id, gym_id, role')
    .eq('id', member_id)
    .single()
  if (memberErr || !member) return { ok: false, error: 'Membro non trovato' }
  if (member.gym_id !== profile.gym_id || member.role !== 'member') {
    return { ok: false, error: 'Membro non valido' }
  }

  // Verify plan belongs to the same gym + is active.
  const { data: plan, error: planErr } = await admin
    .from('subscription_plans')
    .select('id, gym_id, price_cents, is_active')
    .eq('id', plan_id)
    .single()
  if (planErr || !plan) return { ok: false, error: 'Piano non trovato' }
  if (plan.gym_id !== profile.gym_id || !plan.is_active) {
    return { ok: false, error: 'Piano non valido' }
  }

  const token = generatePaymentSessionToken()
  const { data: session, error: insertErr } = await admin
    .from('payment_sessions')
    .insert({
      gym_id: profile.gym_id,
      member_id: member.id,
      plan_id: plan.id,
      token,
      status: 'pending',
      amount_cents: plan.price_cents,
      created_by: profile.id,
    })
    .select('id, token')
    .single()
  if (insertErr || !session) {
    return { ok: false, error: insertErr?.message ?? 'Errore creazione sessione' }
  }

  const paymentUrl = `${env.APP_URL}/pay/${session.token}`

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/membri/${member.id}`)
  return {
    ok: true,
    data: { token: session.token, paymentUrl, sessionId: session.id },
    message: 'Link di pagamento creato',
  }
}

// ---------------------------------------------------------------------------
// Public (token-gated): initiate card payment
// ---------------------------------------------------------------------------

async function loadActiveSession(token: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_sessions')
    .select(
      'id, gym_id, member_id, plan_id, status, amount_cents, expires_at, stripe_payment_intent_id, stripe_setup_intent_id',
    )
    .eq('token', token)
    .single()
  if (error || !data) return { error: 'Link non valido' as const, admin }
  if (data.status === 'completed') {
    return { error: 'Pagamento già completato' as const, admin }
  }
  if (data.status === 'cancelled' || data.status === 'expired') {
    return { error: 'Link non più valido' as const, admin }
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { error: 'Link scaduto' as const, admin }
  }
  return { session: data, admin }
}

export async function initiateCardPaymentAction(
  input: InitiateCardPaymentInput,
): Promise<ActionResult<{ clientSecret: string }>> {
  const parsed = initiateCardPaymentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Token non valido' }

  const { session, error, admin } = await loadActiveSession(parsed.data.token)
  if (error || !session) return { ok: false, error: error ?? 'Errore' }

  const { data: member } = await admin
    .from('profiles')
    .select('id, email, full_name, stripe_customer_id, gym_id')
    .eq('id', session.member_id)
    .single()
  if (!member) return { ok: false, error: 'Membro non trovato' }

  const stripe = getStripe()

  let clientSecret: string

  // Reuse an existing PaymentIntent if we already created one for this session.
  if (session.stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve(
      session.stripe_payment_intent_id,
    )
    if (pi.status === 'succeeded') {
      return { ok: false, error: 'Pagamento già completato' }
    }
    if (!pi.client_secret) {
      return { ok: false, error: 'Stripe non ha restituito un clientSecret' }
    }
    clientSecret = pi.client_secret
  } else {
    const pi = await stripe.paymentIntents.create({
      amount: session.amount_cents,
      currency: 'eur',
      payment_method_types: ['card'],
      receipt_email: member.email,
      metadata: {
        gym_id: session.gym_id,
        member_id: session.member_id,
        plan_id: session.plan_id,
        payment_session_id: session.id,
        auto_renew: 'false',
      },
    })

    await admin
      .from('payment_sessions')
      .update({
        stripe_payment_intent_id: pi.id,
        payment_method: 'card',
      })
      .eq('id', session.id)

    if (!pi.client_secret) {
      return { ok: false, error: 'Stripe non ha restituito un clientSecret' }
    }
    clientSecret = pi.client_secret
  }

  return { ok: true, data: { clientSecret } }
}

// ---------------------------------------------------------------------------
// Public (token-gated): initiate SEPA setup
// ---------------------------------------------------------------------------

export async function initiateSepaSetupAction(
  input: InitiateSepaSetupInput,
): Promise<ActionResult<{ clientSecret: string; customerId: string }>> {
  const parsed = initiateSepaSetupSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dati non validi' }
  const { token, auto_renew } = parsed.data

  const { session, error, admin } = await loadActiveSession(token)
  if (error || !session) return { ok: false, error: error ?? 'Errore' }

  const { data: member } = await admin
    .from('profiles')
    .select('*')
    .eq('id', session.member_id)
    .single()
  if (!member) return { ok: false, error: 'Membro non trovato' }

  const customerId = await getOrCreateStripeCustomer(member, admin)
  const stripe = getStripe()

  // Reuse the SetupIntent if we already created one for this session.
  if (session.stripe_setup_intent_id) {
    const si = await stripe.setupIntents.retrieve(session.stripe_setup_intent_id)
    if (si.status === 'succeeded') {
      return {
        ok: false,
        error: 'Mandato SEPA già confermato',
      }
    }
    if (!si.client_secret) {
      return { ok: false, error: 'Stripe non ha restituito un clientSecret' }
    }
    return {
      ok: true,
      data: { clientSecret: si.client_secret, customerId },
    }
  }

  const si = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['sepa_debit'],
    usage: auto_renew ? 'off_session' : 'on_session',
    metadata: {
      gym_id: session.gym_id,
      member_id: session.member_id,
      plan_id: session.plan_id,
      payment_session_id: session.id,
      auto_renew: auto_renew ? 'true' : 'false',
    },
  })

  await admin
    .from('payment_sessions')
    .update({
      stripe_setup_intent_id: si.id,
      payment_method: 'sepa',
      auto_renew,
    })
    .eq('id', session.id)

  if (!si.client_secret) {
    return { ok: false, error: 'Stripe non ha restituito un clientSecret' }
  }
  return {
    ok: true,
    data: { clientSecret: si.client_secret, customerId },
  }
}

// ---------------------------------------------------------------------------
// Public (token-gated): confirm landing — single source of truth is the webhook
// ---------------------------------------------------------------------------

export async function confirmPaymentAction(
  input: ConfirmPaymentInput,
): Promise<ActionResult<{ status: 'completed' | 'pending' | 'failed' }>> {
  const parsed = confirmPaymentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dati non validi' }
  const admin = createAdminClient()
  const { data: session } = await admin
    .from('payment_sessions')
    .select('status')
    .eq('token', parsed.data.token)
    .single()
  if (!session) return { ok: false, error: 'Sessione non trovata' }
  const status =
    session.status === 'completed'
      ? 'completed'
      : session.status === 'failed'
        ? 'failed'
        : 'pending'
  return { ok: true, data: { status } }
}

// ---------------------------------------------------------------------------
// Owner: refund a payment
// ---------------------------------------------------------------------------

export async function refundPaymentAction(
  input: RefundPaymentInput,
): Promise<ActionResult> {
  const profile = await requireOwnerOrStaff()
  const parsed = refundPaymentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dati non validi' }

  const admin = createAdminClient()
  const { data: payment, error } = await admin
    .from('payments')
    .select('id, gym_id, status, stripe_payment_intent_id')
    .eq('id', parsed.data.payment_id)
    .single()
  if (error || !payment) return { ok: false, error: 'Pagamento non trovato' }
  if (payment.gym_id !== profile.gym_id) {
    return { ok: false, error: 'Non autorizzato' }
  }
  if (payment.status !== 'succeeded') {
    return { ok: false, error: 'Solo pagamenti completati possono essere rimborsati' }
  }
  if (!payment.stripe_payment_intent_id) {
    return { ok: false, error: 'Pagamento non gestito tramite Stripe' }
  }

  const stripe = getStripe()
  await stripe.refunds.create({
    payment_intent: payment.stripe_payment_intent_id,
    reason: 'requested_by_customer',
    metadata: { gym_id: profile.gym_id, requested_by: profile.id },
  })

  // Webhook `charge.refunded` will mark the row in DB.
  revalidatePath('/dashboard/pagamenti')
  return { ok: true, message: 'Rimborso richiesto. Aggiornamento entro pochi secondi.' }
}

// ---------------------------------------------------------------------------
// Owner: trigger a SEPA off-session renewal manually (cron lands in Phase 09)
// ---------------------------------------------------------------------------

export async function triggerSepaRenewalAction(
  input: TriggerSepaRenewalInput,
): Promise<ActionResult<{ paymentIntentId: string }>> {
  const profile = await requireOwnerOrStaff()
  const parsed = triggerSepaRenewalSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dati non validi' }

  const admin = createAdminClient()
  const { data: subscription, error } = await admin
    .from('subscriptions')
    .select(
      'id, gym_id, member_id, plan_id, auto_renew, payment_method, status',
    )
    .eq('id', parsed.data.subscription_id)
    .single()
  if (error || !subscription) {
    return { ok: false, error: 'Abbonamento non trovato' }
  }
  if (subscription.gym_id !== profile.gym_id) {
    return { ok: false, error: 'Non autorizzato' }
  }
  if (
    !subscription.auto_renew ||
    subscription.payment_method !== 'sepa' ||
    subscription.status !== 'active'
  ) {
    return { ok: false, error: 'Abbonamento non eleggibile per rinnovo SEPA' }
  }

  const [{ data: member }, { data: plan }, { data: mandate }] =
    await Promise.all([
      admin
        .from('profiles')
        .select('*')
        .eq('id', subscription.member_id)
        .single(),
      admin
        .from('subscription_plans')
        .select('id, price_cents, name')
        .eq('id', subscription.plan_id)
        .single(),
      admin
        .from('sepa_mandates')
        .select('stripe_payment_method_id, status')
        .eq('member_id', subscription.member_id)
        .eq('status', 'active')
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  if (!member || !member.stripe_customer_id) {
    return { ok: false, error: 'Stripe Customer non trovato per il membro' }
  }
  if (!plan) return { ok: false, error: 'Piano non trovato' }
  if (!mandate?.stripe_payment_method_id) {
    return { ok: false, error: 'Mandato SEPA attivo non trovato' }
  }

  // Create a payment_session row to give the webhook the same shape it sees
  // for first-time payments. This unifies the success path through the
  // `process_successful_payment` SQL function.
  const token = generatePaymentSessionToken()
  const { data: session, error: sErr } = await admin
    .from('payment_sessions')
    .insert({
      gym_id: profile.gym_id,
      member_id: member.id,
      plan_id: plan.id,
      token,
      status: 'pending',
      amount_cents: plan.price_cents,
      auto_renew: true,
      payment_method: 'sepa',
      created_by: profile.id,
    })
    .select('id')
    .single()
  if (sErr || !session) {
    return { ok: false, error: sErr?.message ?? 'Errore creazione sessione' }
  }

  const stripe = getStripe()
  const pi = await stripe.paymentIntents.create({
    amount: plan.price_cents,
    currency: 'eur',
    customer: member.stripe_customer_id,
    payment_method: mandate.stripe_payment_method_id,
    payment_method_types: ['sepa_debit'],
    confirm: true,
    off_session: true,
    receipt_email: member.email,
    metadata: {
      gym_id: profile.gym_id,
      member_id: member.id,
      plan_id: plan.id,
      payment_session_id: session.id,
      auto_renew: 'true',
      renewal: 'true',
    },
  })

  await admin
    .from('payment_sessions')
    .update({ stripe_payment_intent_id: pi.id })
    .eq('id', session.id)

  revalidatePath('/dashboard/pagamenti')
  return {
    ok: true,
    data: { paymentIntentId: pi.id },
    message: 'Addebito SEPA in corso. Stato definitivo entro 5 giorni.',
  }
}

// ---------------------------------------------------------------------------
// Member: open Stripe Billing Portal session
// ---------------------------------------------------------------------------

export async function createBillingPortalSessionAction(): Promise<
  ActionResult<{ url: string }>
> {
  const profile = await requireProfile()
  if (!profile.stripe_customer_id) {
    return { ok: false, error: 'Nessun account Stripe collegato' }
  }
  const stripe = getStripe()
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${env.APP_URL}/app`,
  })
  return { ok: true, data: { url: portal.url } }
}
