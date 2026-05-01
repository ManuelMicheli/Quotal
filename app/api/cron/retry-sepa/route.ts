/**
 * POST /api/cron/retry-sepa
 *
 * Retries SEPA payments that failed in the last 7 days, up to 3
 * attempts each. For each retry-eligible payment:
 *   1. Resolve the active SEPA mandate for the member
 *   2. Create a fresh `paymentIntents.create({ off_session: true, ... })`
 *      with the same amount / mandate
 *   3. Increment `payments.retry_count` (the Stripe webhook will
 *      eventually fire `.succeeded` or `.failed` and update status)
 *
 * If the payment cannot be retried (no mandate, mandate revoked, etc.),
 * the dispatcher fires `payment_failed_owner` so the gym owner can
 * intervene.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`. Intended cadence: 09:00
 * Europe/Rome (right after notify-expiring).
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { checkCronAuth } from '@/lib/notifications/cron-auth'
import { dispatchNotification } from '@/lib/notifications/dispatcher'
import { fanoutOwnerNotification } from '@/lib/notifications/owner-inbox'
import {
  computeApplicationFee,
  getGymStripeAccountId,
} from '@/lib/stripe/connect'
import { getStripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_RETRIES = 3

export async function POST(req: Request): Promise<Response> {
  const auth = checkCronAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { data: candidates, error } = await admin
    .from('payments')
    .select(
      'id, gym_id, member_id, amount_cents, retry_count, failed_at, member:profiles!payments_member_id_fkey(stripe_customer_id, full_name)',
    )
    .eq('status', 'failed')
    .eq('payment_method', 'sepa')
    .gte('failed_at', sevenDaysAgo)
    .lt('retry_count', MAX_RETRIES)
    .limit(100)

  if (error) {
    console.error('[cron/retry-sepa] candidates query failed', error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    )
  }

  type Stat = {
    payment_id: string
    action: 'retried' | 'no_mandate' | 'no_stripe' | 'gave_up' | 'error'
    detail?: string
  }
  const stats: Stat[] = []

  let stripe: ReturnType<typeof getStripe> | null = null
  try {
    stripe = getStripe()
  } catch (err) {
    // Stripe not configured — cron is a no-op in that environment.
    console.warn(
      '[cron/retry-sepa] Stripe not configured, skipping all retries',
      err,
    )
    return NextResponse.json({
      ok: true,
      stripe_configured: false,
      candidates: candidates?.length ?? 0,
      stats,
    })
  }

  for (const p of candidates ?? []) {
    const memberRow = Array.isArray(p.member) ? p.member[0] : p.member
    if (!memberRow?.stripe_customer_id) {
      stats.push({ payment_id: p.id, action: 'no_stripe' })
      continue
    }
    const { data: mandate } = await admin
      .from('sepa_mandates')
      .select('stripe_payment_method_id, stripe_mandate_id, status')
      .eq('member_id', p.member_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!mandate) {
      stats.push({ payment_id: p.id, action: 'no_mandate' })
      // Notify owner — there's nothing the cron can do without a mandate.
      await fanoutOwnerNotification(p.gym_id, {
        type: 'sepa_mandate_revoked',
        title: 'SEPA: mandato non disponibile',
        body: `Impossibile riprovare l'addebito di ${memberRow.full_name ?? 'un membro'}: nessun mandato SEPA attivo.`,
        link: '/dashboard/pagamenti',
      })
      continue
    }

    if (p.retry_count + 1 >= MAX_RETRIES) {
      // This is the last attempt; flag it.
      stats.push({ payment_id: p.id, action: 'gave_up' })
    }

    try {
      const stripeAccountId = await getGymStripeAccountId(p.gym_id, admin)
      const applicationFee = stripeAccountId
        ? computeApplicationFee(p.amount_cents)
        : 0
      const intent = await stripe.paymentIntents.create(
        {
          amount: p.amount_cents,
          currency: 'eur',
          customer: memberRow.stripe_customer_id,
          payment_method: mandate.stripe_payment_method_id,
          payment_method_types: ['sepa_debit'],
          mandate: mandate.stripe_mandate_id.startsWith('pending_')
            ? undefined
            : mandate.stripe_mandate_id,
          confirm: true,
          off_session: true,
          ...(applicationFee > 0
            ? { application_fee_amount: applicationFee }
            : {}),
          metadata: {
            retry_of_payment_id: p.id,
            gym_id: p.gym_id,
            member_id: p.member_id,
          },
        },
        stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
      )
      await admin
        .from('payments')
        .update({
          retry_count: p.retry_count + 1,
          stripe_payment_intent_id: intent.id,
        })
        .eq('id', p.id)
      stats.push({ payment_id: p.id, action: 'retried' })
    } catch (err) {
      console.error('[cron/retry-sepa] retry failed', err)
      const detail = err instanceof Error ? err.message : String(err)
      stats.push({ payment_id: p.id, action: 'error', detail })

      // Owner email + in-app
      await dispatchNotification({
        type: 'payment_failed_owner',
        recipient_id: p.member_id, // best-effort; the dispatcher will load the member's gym + skip if no owner role
        data: {
          failed_member_name: memberRow.full_name ?? 'un membro',
          amount_cents: p.amount_cents,
          failure_reason: detail,
          payment_id: p.id,
        },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    stripe_configured: true,
    candidates: candidates?.length ?? 0,
    stats,
  })
}
