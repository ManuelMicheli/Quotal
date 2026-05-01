'use server'

/**
 * Server actions — payment flow (Phases 05 + 06).
 *
 * Three groups:
 *   - Owner-only: `createPaymentSessionAction`, `refundPaymentAction`,
 *     `triggerSepaRenewalAction` (manual auto-renew until cron in Phase 09),
 *     plus the Phase 06 cash flow: `registerCashPaymentAction`,
 *     `refundCashPaymentAction`, `closeCashAction`,
 *     `regenerateReceiptUrlAction`.
 *   - Public (token-gated): `initiateCardPaymentAction`,
 *     `initiateSepaSetupAction`, `confirmPaymentAction` — called from the
 *     `/pay/[token]` page on behalf of an unauthenticated visitor. The token
 *     is the trust boundary; we look up everything via the service-role
 *     admin client, never via the user's session.
 *   - Admin: `createBillingPortalSessionAction` for the member portal.
 */
import { revalidatePath } from 'next/cache'

import { requireMember, requireOwnerOrStaff, requireProfile } from '@/lib/auth'
import { env } from '@/lib/env'
import { dispatchNotification } from '@/lib/notifications/dispatcher'
import {
  createSignedReceiptUrl,
  generateAndStoreReceipt,
} from '@/lib/pdf/generate-receipt'
import { generateAndStoreDailyReport } from '@/lib/pdf/generate-daily-report'
import {
  computeApplicationFee,
  getGymStripeAccountId,
} from '@/lib/stripe/connect'
import {
  generatePaymentSessionToken,
  getOrCreateStripeCustomer,
} from '@/lib/stripe/helpers'
import { getStripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  closeCashAction as closeCashActionSchema,
  confirmPaymentSchema,
  createPaymentSessionSchema,
  initiateCardPaymentSchema,
  initiateSepaSetupSchema,
  refundCashPaymentSchema,
  refundPaymentSchema,
  registerCashPaymentSchema,
  triggerSepaRenewalSchema,
  type CloseCashInput,
  type ConfirmPaymentInput,
  type CreatePaymentSessionInput,
  type InitiateCardPaymentInput,
  type InitiateSepaSetupInput,
  type RefundCashPaymentInput,
  type RefundPaymentInput,
  type RegisterCashPaymentInput,
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

/**
 * Member self-service: create a payment session to renew their own subscription.
 *
 * Distinct from `createPaymentSessionAction` (owner/staff only). Reuses an
 * existing pending session for the same plan if one is still valid, so a
 * member tapping "Paga" twice doesn't pile up rows.
 */
export async function createSelfPaymentSessionAction(input: {
  plan_id: string
}): Promise<ActionResult<{ token: string; paymentUrl: string }>> {
  const member = await requireMember()
  const planId = typeof input.plan_id === 'string' ? input.plan_id.trim() : ''
  if (!planId) return { ok: false, error: 'Piano non valido' }

  const admin = createAdminClient()

  const { data: plan, error: planErr } = await admin
    .from('subscription_plans')
    .select('id, gym_id, price_cents, is_active')
    .eq('id', planId)
    .single()
  if (planErr || !plan) return { ok: false, error: 'Piano non trovato' }
  if (plan.gym_id !== member.gym_id || !plan.is_active) {
    return { ok: false, error: 'Piano non valido' }
  }

  const nowIso = new Date().toISOString()
  const { data: existing } = await admin
    .from('payment_sessions')
    .select('id, token, expires_at, plan_id, amount_cents')
    .eq('member_id', member.id)
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (
    existing &&
    existing.plan_id === plan.id &&
    existing.amount_cents === plan.price_cents
  ) {
    return {
      ok: true,
      data: {
        token: existing.token,
        paymentUrl: `${env.APP_URL}/pay/${existing.token}`,
      },
    }
  }

  const token = generatePaymentSessionToken()
  const { data: session, error: insertErr } = await admin
    .from('payment_sessions')
    .insert({
      gym_id: member.gym_id,
      member_id: member.id,
      plan_id: plan.id,
      token,
      status: 'pending',
      amount_cents: plan.price_cents,
      created_by: member.id,
    })
    .select('id, token')
    .single()
  if (insertErr || !session) {
    return { ok: false, error: insertErr?.message ?? 'Errore creazione sessione' }
  }

  return {
    ok: true,
    data: {
      token: session.token,
      paymentUrl: `${env.APP_URL}/pay/${session.token}`,
    },
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
  const stripeAccountId = await getGymStripeAccountId(session.gym_id, admin)
  const connectOpts = stripeAccountId
    ? ({ stripeAccount: stripeAccountId } as const)
    : undefined

  let clientSecret: string

  // Reuse an existing PaymentIntent if we already created one for this session.
  if (session.stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve(
      session.stripe_payment_intent_id,
      undefined,
      connectOpts,
    )
    if (pi.status === 'succeeded') {
      return { ok: false, error: 'Pagamento già completato' }
    }
    if (!pi.client_secret) {
      return { ok: false, error: 'Stripe non ha restituito un clientSecret' }
    }
    clientSecret = pi.client_secret
  } else {
    const applicationFee = stripeAccountId
      ? computeApplicationFee(session.amount_cents)
      : 0
    const pi = await stripe.paymentIntents.create(
      {
        amount: session.amount_cents,
        currency: 'eur',
        payment_method_types: ['card'],
        receipt_email: member.email,
        ...(applicationFee > 0
          ? { application_fee_amount: applicationFee }
          : {}),
        metadata: {
          gym_id: session.gym_id,
          member_id: session.member_id,
          plan_id: session.plan_id,
          payment_session_id: session.id,
          auto_renew: 'false',
        },
      },
      connectOpts,
    )

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

  const stripeAccountId = await getGymStripeAccountId(session.gym_id, admin)
  const connectOpts = stripeAccountId
    ? ({ stripeAccount: stripeAccountId } as const)
    : undefined
  const customerId = await getOrCreateStripeCustomer(
    member,
    admin,
    stripeAccountId,
  )
  const stripe = getStripe()

  // Reuse the SetupIntent if we already created one for this session.
  if (session.stripe_setup_intent_id) {
    const si = await stripe.setupIntents.retrieve(
      session.stripe_setup_intent_id,
      undefined,
      connectOpts,
    )
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

  const si = await stripe.setupIntents.create(
    {
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
    },
    connectOpts,
  )

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
  const stripeAccountId = await getGymStripeAccountId(profile.gym_id, admin)
  await stripe.refunds.create(
    {
      payment_intent: payment.stripe_payment_intent_id,
      reason: 'requested_by_customer',
      metadata: { gym_id: profile.gym_id, requested_by: profile.id },
    },
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  )

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
  const stripeAccountId = await getGymStripeAccountId(profile.gym_id, admin)
  const connectOpts = stripeAccountId
    ? ({ stripeAccount: stripeAccountId } as const)
    : undefined
  const applicationFee = stripeAccountId
    ? computeApplicationFee(plan.price_cents)
    : 0
  const pi = await stripe.paymentIntents.create(
    {
      amount: plan.price_cents,
      currency: 'eur',
      customer: member.stripe_customer_id,
      payment_method: mandate.stripe_payment_method_id,
      payment_method_types: ['sepa_debit'],
      confirm: true,
      off_session: true,
      receipt_email: member.email,
      ...(applicationFee > 0
        ? { application_fee_amount: applicationFee }
        : {}),
      metadata: {
        gym_id: profile.gym_id,
        member_id: member.id,
        plan_id: plan.id,
        payment_session_id: session.id,
        auto_renew: 'true',
        renewal: 'true',
      },
    },
    connectOpts,
  )

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
  const stripeAccountId = await getGymStripeAccountId(profile.gym_id)
  const portal = await stripe.billingPortal.sessions.create(
    {
      customer: profile.stripe_customer_id,
      return_url: `${env.APP_URL}/app`,
    },
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  )
  return { ok: true, data: { url: portal.url } }
}

// ---------------------------------------------------------------------------
// Phase 06 — cash / bank-transfer payment registration
// ---------------------------------------------------------------------------

function zodFieldErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path
      .map((p) => (typeof p === 'symbol' ? p.description ?? '' : String(p)))
      .join('.')
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

/**
 * Register a manual cash / bank-transfer payment.
 *
 * The DB function `register_cash_payment` does the atomic part: reserves the
 * receipt number, creates/extends the subscription, inserts the payment row.
 * We then render and store the PDF; if PDF generation fails the payment row
 * stays valid and the owner can re-trigger via `regenerateReceiptUrlAction`.
 */
export async function registerCashPaymentAction(
  input: RegisterCashPaymentInput,
): Promise<
  ActionResult<{
    payment_id: string
    subscription_id: string
    receipt_number: string
    invoice_number: string | null
    receipt_url: string | null
    invoice_url: string | null
  }>
> {
  const owner = await requireOwnerOrStaff()
  const parsed = registerCashPaymentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    }
  }
  const data = parsed.data

  const admin = createAdminClient()

  // Verify the member belongs to the gym + the plan does too.
  const { data: member } = await admin
    .from('profiles')
    .select('id, gym_id, role')
    .eq('id', data.member_id)
    .single()
  if (!member || member.gym_id !== owner.gym_id || member.role !== 'member') {
    return { ok: false, error: 'Membro non valido' }
  }

  const { data: plan } = await admin
    .from('subscription_plans')
    .select('id, gym_id, price_cents, is_active')
    .eq('id', data.plan_id)
    .single()
  if (!plan || plan.gym_id !== owner.gym_id || !plan.is_active) {
    return { ok: false, error: 'Piano non valido' }
  }

  const today = new Date().toISOString().slice(0, 10)
  const startDate = data.start_date ?? today

  const { data: rpcResult, error: rpcErr } = await admin.rpc(
    'register_cash_payment',
    {
      p_gym_id: owner.gym_id,
      p_member_id: data.member_id,
      p_plan_id: data.plan_id,
      p_start_date: startDate,
      p_amount_cents: data.amount_cents,
      p_payment_method: data.payment_method,
      p_created_by: owner.id,
      p_notes: data.notes ?? undefined,
      p_emit_invoice: data.emit_invoice ?? false,
      p_invoice_fiscal_code: data.invoice_fiscal_code ?? undefined,
    },
  )

  if (rpcErr || !rpcResult) {
    return {
      ok: false,
      error: `Registrazione non riuscita: ${rpcErr?.message ?? 'errore'}`,
    }
  }

  // The RPC returns a Json (jsonb_build_object). Narrow it.
  const rpc = rpcResult as unknown as {
    payment_id: string
    subscription_id: string
    receipt_number: string
    invoice_number: string | null
  }

  // Generate PDFs synchronously: the action result wants the URL so the UI
  // can open the file in a new tab. If it throws we still return success with
  // a hint (the receipt_number is reserved and the URL can be regenerated).
  let receiptUrl: string | null = null
  let invoiceUrl: string | null = null

  try {
    const r = await generateAndStoreReceipt({
      paymentId: rpc.payment_id,
      kind: 'receipt',
    })
    receiptUrl = r.signedUrl
  } catch (err) {
    console.error(
      '[payments] receipt PDF generation failed (gap %s):',
      rpc.receipt_number,
      err,
    )
  }

  if (rpc.invoice_number) {
    try {
      const i = await generateAndStoreReceipt({
        paymentId: rpc.payment_id,
        kind: 'invoice',
        withVirtualStamp: data.amount_cents > 7747,
      })
      invoiceUrl = i.signedUrl
    } catch (err) {
      console.error(
        '[payments] invoice PDF generation failed (gap %s):',
        rpc.invoice_number,
        err,
      )
    }
  }

  // Phase 09: email the receipt to the member (best-effort).
  try {
    await dispatchNotification({
      type: 'receipt',
      recipient_id: data.member_id,
      // Receipts are NOT idempotent on subscription_id (a single
      // subscription may receive multiple receipts over time), so we
      // force the send.
      force: true,
      data: {
        receipt_number: rpc.receipt_number,
        amount_cents: data.amount_cents,
        paid_at: today,
        payment_method: data.payment_method,
      },
    })
  } catch (err) {
    console.warn('[payments] cash receipt notification failed', err)
  }

  revalidatePath('/dashboard', 'layout')
  revalidatePath(`/dashboard/membri/${data.member_id}`)

  return {
    ok: true,
    data: {
      payment_id: rpc.payment_id,
      subscription_id: rpc.subscription_id,
      receipt_number: rpc.receipt_number,
      invoice_number: rpc.invoice_number,
      receipt_url: receiptUrl,
      invoice_url: invoiceUrl,
    },
    message: `Pagamento registrato — ricevuta ${rpc.receipt_number}`,
  }
}

/**
 * Mint a fresh signed URL for an existing receipt PDF, so the owner / member
 * can re-download from the dashboard at any time.
 */
export async function regenerateReceiptUrlAction(
  paymentId: string,
  kind: 'receipt' | 'invoice' = 'receipt',
): Promise<ActionResult<{ url: string }>> {
  const profile = await requireProfile()
  const admin = createAdminClient()

  const { data: payment, error } = await admin
    .from('payments')
    .select(
      'id, gym_id, member_id, receipt_pdf_path, invoice_pdf_path, receipt_number, invoice_number',
    )
    .eq('id', paymentId)
    .single()
  if (error || !payment) {
    return { ok: false, error: 'Pagamento non trovato' }
  }

  // Authorization: owner/staff of the same gym OR the owning member.
  const isOwnerStaff =
    (profile.role === 'owner' || profile.role === 'staff') &&
    profile.gym_id === payment.gym_id
  const isOwningMember =
    profile.role === 'member' && profile.id === payment.member_id
  if (!isOwnerStaff && !isOwningMember) {
    return { ok: false, error: 'Non autorizzato' }
  }

  const path = kind === 'invoice' ? payment.invoice_pdf_path : payment.receipt_pdf_path

  // If the path is missing, regenerate the PDF (covers gaps from earlier failures).
  if (!path) {
    if (kind === 'invoice' && !payment.invoice_number) {
      return { ok: false, error: 'Fattura non disponibile per questo pagamento' }
    }
    if (kind === 'receipt' && !payment.receipt_number) {
      return { ok: false, error: 'Ricevuta non disponibile per questo pagamento' }
    }
    if (!isOwnerStaff) {
      return {
        ok: false,
        error: 'PDF non disponibile, contatta la palestra per la rigenerazione.',
      }
    }
    try {
      const r = await generateAndStoreReceipt({ paymentId, kind })
      return { ok: true, data: { url: r.signedUrl } }
    } catch (err) {
      console.error('[payments] regenerate failed:', err)
      return { ok: false, error: 'Generazione PDF non riuscita' }
    }
  }

  try {
    const url = await createSignedReceiptUrl(path)
    return { ok: true, data: { url } }
  } catch (err) {
    console.error('[payments] signed URL failed:', err)
    return { ok: false, error: 'Impossibile generare il link di download' }
  }
}

/**
 * Refund a cash/bank-transfer payment.
 *
 * Records a NEW payment row with `status='refunded'`, negative `amount_cents`
 * and `refund_of_payment_id` pointing at the original. Rolls back the
 * subscription `end_date` by the plan duration (best-effort symmetry with
 * `register_cash_payment`).
 */
export async function refundCashPaymentAction(
  input: RefundCashPaymentInput,
): Promise<ActionResult> {
  const owner = await requireOwnerOrStaff()
  const parsed = refundCashPaymentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Dati non validi' }
  }

  const admin = createAdminClient()
  const { data: original, error } = await admin
    .from('payments')
    .select(
      'id, gym_id, member_id, subscription_id, amount_cents, payment_method, status, receipt_number',
    )
    .eq('id', parsed.data.payment_id)
    .single()

  if (error || !original) {
    return { ok: false, error: 'Pagamento non trovato' }
  }
  if (original.gym_id !== owner.gym_id) {
    return { ok: false, error: 'Non autorizzato' }
  }
  if (original.status !== 'succeeded') {
    return {
      ok: false,
      error: 'Solo pagamenti completati possono essere rimborsati',
    }
  }
  if (
    original.payment_method !== 'cash' &&
    original.payment_method !== 'bank_transfer'
  ) {
    return {
      ok: false,
      error: 'Per rimborsare carte/SEPA usa Stripe (Rimborsa nella riga)',
    }
  }

  // Insert refund row.
  const { error: insertErr } = await admin.from('payments').insert({
    gym_id: original.gym_id,
    member_id: original.member_id,
    subscription_id: original.subscription_id,
    amount_cents: -original.amount_cents,
    currency: 'EUR',
    payment_method: original.payment_method,
    status: 'refunded',
    paid_at: new Date().toISOString(),
    created_by: owner.id,
    refund_of_payment_id: original.id,
    notes: parsed.data.reason
      ? `Rimborso ricevuta ${original.receipt_number ?? original.id} — ${parsed.data.reason}`
      : `Rimborso ricevuta ${original.receipt_number ?? original.id}`,
  })
  if (insertErr) {
    return {
      ok: false,
      error: `Rimborso non riuscito: ${insertErr.message}`,
    }
  }

  // Mark the original payment as refunded too so the row reflects the new state.
  await admin
    .from('payments')
    .update({ status: 'refunded' })
    .eq('id', original.id)

  // Best-effort subscription rollback: shrink end_date by the plan duration.
  if (original.subscription_id) {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, end_date, plan_id')
      .eq('id', original.subscription_id)
      .single()
    if (sub?.plan_id) {
      const { data: plan } = await admin
        .from('subscription_plans')
        .select('duration_days')
        .eq('id', sub.plan_id)
        .single()
      if (plan?.duration_days && sub.end_date) {
        const newEnd = new Date(sub.end_date + 'T00:00:00Z')
        newEnd.setUTCDate(newEnd.getUTCDate() - plan.duration_days)
        await admin
          .from('subscriptions')
          .update({ end_date: newEnd.toISOString().slice(0, 10) })
          .eq('id', sub.id)
      }
    }
  }

  revalidatePath('/dashboard', 'layout')
  revalidatePath(`/dashboard/membri/${original.member_id}`)
  revalidatePath('/dashboard/cassa')
  return { ok: true, message: 'Rimborso registrato.' }
}

/**
 * Close the daily cash: aggregates the day's payments, generates a PDF
 * report, uploads to storage, and persists a `daily_close_reports` row.
 *
 * Idempotent on (gym_id, close_date): if a row already exists it gets
 * updated (the report PDF is overwritten via Storage `upsert: true`).
 */
export async function closeCashAction(
  input: CloseCashInput,
): Promise<ActionResult<{ pdfUrl: string }>> {
  const owner = await requireOwnerOrStaff()
  const parsed = closeCashActionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Dati non validi' }
  }

  const closeDate = parsed.data.close_date ?? new Date().toISOString().slice(0, 10)
  const admin = createAdminClient()

  // Pull all *succeeded* payments paid_at within the day window for this gym.
  const startIso = new Date(closeDate + 'T00:00:00.000Z').toISOString()
  const endIso = new Date(closeDate + 'T23:59:59.999Z').toISOString()

  const { data: paymentsRaw, error: pErr } = await admin
    .from('payments')
    .select(
      'id, paid_at, amount_cents, payment_method, receipt_number, member_id, member:profiles!payments_member_id_fkey(full_name)',
    )
    .eq('gym_id', owner.gym_id)
    .eq('status', 'succeeded')
    .gte('paid_at', startIso)
    .lte('paid_at', endIso)
    .order('paid_at', { ascending: true })

  if (pErr) {
    return { ok: false, error: `Lettura pagamenti non riuscita: ${pErr.message}` }
  }

  type Row = {
    id: string
    paid_at: string | null
    amount_cents: number
    payment_method: string
    receipt_number: string | null
    member_id: string
    member: { full_name: string } | null
  }
  const rows = (paymentsRaw ?? []) as unknown as Row[]

  let cash = 0
  let card = 0
  let sepa = 0
  let bank = 0
  for (const r of rows) {
    if (r.payment_method === 'cash') cash += r.amount_cents
    else if (r.payment_method === 'card') card += r.amount_cents
    else if (r.payment_method === 'sepa') sepa += r.amount_cents
    else if (r.payment_method === 'bank_transfer') bank += r.amount_cents
  }
  const total = cash + card + sepa + bank

  const closedAt = new Date()

  const { path, signedUrl } = await generateAndStoreDailyReport({
    gymId: owner.gym_id,
    closeDate,
    closedAt,
    closedBy: owner.full_name,
    payments: rows.map((r) => ({
      id: r.id,
      paid_at: r.paid_at ?? closedAt.toISOString(),
      member_name: r.member?.full_name ?? '—',
      amount_cents: r.amount_cents,
      payment_method: r.payment_method,
      receipt_number: r.receipt_number,
    })),
    totals: {
      total_cents: total,
      cash_cents: cash,
      card_cents: card,
      sepa_cents: sepa,
      bank_transfer_cents: bank,
      transactions_count: rows.length,
    },
  })

  // Upsert the daily-close row.
  const { error: upsertErr } = await admin.from('daily_close_reports').upsert(
    {
      gym_id: owner.gym_id,
      close_date: closeDate,
      closed_at: closedAt.toISOString(),
      closed_by: owner.id,
      total_cents: total,
      cash_cents: cash,
      card_cents: card,
      sepa_cents: sepa,
      bank_transfer_cents: bank,
      transactions_count: rows.length,
      pdf_path: path,
      notes: parsed.data.notes ?? null,
    },
    { onConflict: 'gym_id,close_date' },
  )
  if (upsertErr) {
    return {
      ok: false,
      error: `Salvataggio chiusura non riuscito: ${upsertErr.message}`,
    }
  }

  revalidatePath('/dashboard/cassa')
  return {
    ok: true,
    data: { pdfUrl: signedUrl },
    message: 'Chiusura cassa registrata.',
  }
}
