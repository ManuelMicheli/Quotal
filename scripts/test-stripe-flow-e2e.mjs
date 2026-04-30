#!/usr/bin/env node
/**
 * End-to-end Stripe payment flow smoke test.
 *
 * Creates (or reuses) a synthetic test member, opens a payment_session for
 * an existing plan, then triggers a Stripe PaymentIntent with the matching
 * metadata so the webhook handler hits `process_successful_payment` with a
 * real UUID. Verifies row state in `payments`/`subscriptions` afterwards.
 *
 * Cleans up afterwards (deletes the test member + cascade rows).
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   node scripts/test-stripe-flow-e2e.mjs
 */
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const TEST_EMAIL = `webhook-smoke-${Date.now()}@quotal-test.invalid`
const TEST_NAME = 'Smoke Test Member'
const TEST_AMOUNT_CENTS = 100

function envOrDie(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

async function main() {
  const stripe = new Stripe(envOrDie('STRIPE_SECRET_KEY'), {
    apiVersion: '2026-04-22.dahlia',
  })
  const supabase = createClient(
    envOrDie('NEXT_PUBLIC_SUPABASE_URL'),
    envOrDie('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  console.log('[1/7] resolving gym + plan…')
  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name')
    .limit(1)
    .single()
  if (!gym) throw new Error('No gym found in DB')
  console.log(`    gym: ${gym.name} (${gym.id})`)

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, name, price_cents, duration_days, is_active')
    .eq('gym_id', gym.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!plan) throw new Error('No active plan found')
  console.log(`    plan: ${plan.name} (${plan.id}, €${plan.price_cents / 100})`)

  console.log('[2/7] creating synthetic member (auth.users + profile)…')
  const tempPassword = randomUUID() + 'A1!'
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: TEST_NAME, gym_id: gym.id, role: 'member' },
  })
  if (cErr) throw cErr
  const memberId = created.user.id
  console.log(`    auth user: ${memberId}`)

  // Wait for handle_new_user trigger then patch the profile to attach to gym
  // and force role=member (trigger may have set it from metadata, but make
  // it explicit).
  await new Promise((r) => setTimeout(r, 500))
  const { error: pErr } = await supabase
    .from('profiles')
    .update({
      gym_id: gym.id,
      role: 'member',
      full_name: TEST_NAME,
      email: TEST_EMAIL,
    })
    .eq('id', memberId)
  if (pErr) throw pErr
  console.log(`    profile patched`)

  console.log('[3/7] creating payment_session…')
  const sessionToken = randomUUID().replace(/-/g, '')
  const { data: session, error: sErr } = await supabase
    .from('payment_sessions')
    .insert({
      gym_id: gym.id,
      member_id: memberId,
      plan_id: plan.id,
      token: sessionToken,
      status: 'pending',
      amount_cents: TEST_AMOUNT_CENTS,
      created_by: memberId,
    })
    .select('id, token')
    .single()
  if (sErr) throw sErr
  console.log(`    session: ${session.id}`)

  console.log('[4/7] creating + confirming PaymentIntent (pm_card_visa)…')
  const pi = await stripe.paymentIntents.create({
    amount: TEST_AMOUNT_CENTS,
    currency: 'eur',
    payment_method: 'pm_card_visa',
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: {
      payment_session_id: session.id,
      gym_id: gym.id,
      member_id: memberId,
      plan_id: plan.id,
      smoke_test: 'true',
    },
    description: 'Quotal E2E smoke test',
  })
  console.log(`    PI: ${pi.id} status=${pi.status}`)

  console.log('[5/7] waiting 10s for webhook delivery + handler…')
  await new Promise((r) => setTimeout(r, 10000))

  console.log('[6/7] verifying DB state…')
  const { data: payment } = await supabase
    .from('payments')
    .select('id, status, amount_cents, payment_method, receipt_number, subscription_id')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle()
  console.log(`    payments row:`, payment)

  let sub = null
  if (payment?.subscription_id) {
    const { data: s } = await supabase
      .from('subscriptions')
      .select('id, status, start_date, end_date')
      .eq('id', payment.subscription_id)
      .single()
    sub = s
  }
  console.log(`    subscription:`, sub)

  const { data: evtRow } = await supabase
    .from('stripe_events_processed')
    .select('id, type, livemode')
    .eq('payload->>id', `evt_${pi.id.replace('pi_', '')}`)
    .limit(1)
  console.log(`    stripe_events_processed (sample):`, evtRow)

  console.log('[7/7] cleanup — deleting test member + cascade…')
  // Delete payment_session manually first if cascade isn't set up.
  await supabase.from('payments').delete().eq('member_id', memberId)
  await supabase.from('subscriptions').delete().eq('member_id', memberId)
  await supabase.from('payment_sessions').delete().eq('member_id', memberId)
  await supabase.from('profiles').delete().eq('id', memberId)
  await supabase.auth.admin.deleteUser(memberId)
  console.log(`    cleaned up.`)

  if (payment?.status === 'succeeded' && sub?.status === 'active') {
    console.log('\n✅ E2E PASS — payment processed, subscription created.')
    process.exit(0)
  }
  console.log('\n❌ E2E FAIL — expected payments.status=succeeded + subscriptions.status=active.')
  process.exit(1)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
