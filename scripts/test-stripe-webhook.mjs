#!/usr/bin/env node
/**
 * End-to-end webhook smoke test (test mode).
 *
 * Creates a real PaymentIntent in Stripe test mode + confirms with the
 * `pm_card_visa` token (succeeds instantly). Stripe then delivers the
 * `payment_intent.succeeded` webhook to the live prod endpoint. We poll the
 * Stripe Events API and check delivery status.
 *
 * Run:
 *     STRIPE_SECRET_KEY=sk_test_... node scripts/test-stripe-webhook.mjs
 */
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

async function main() {
  console.log('[1/4] creating PaymentIntent (€1.23 test)…')
  const pi = await stripe.paymentIntents.create({
    amount: 123,
    currency: 'eur',
    payment_method: 'pm_card_visa',
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: {
      payment_session_id: 'webhook-smoke-test-no-session',
      smoke_test: 'true',
    },
    description: 'Quotal webhook smoke test',
  })
  console.log(`    → ${pi.id} status=${pi.status}`)
  if (pi.status !== 'succeeded') {
    console.error('PI did not succeed; aborting.')
    process.exit(1)
  }

  console.log('[2/4] waiting 5s for webhook delivery…')
  await new Promise((r) => setTimeout(r, 5000))

  console.log('[3/4] fetching most recent payment_intent.succeeded event…')
  const events = await stripe.events.list({
    type: 'payment_intent.succeeded',
    limit: 5,
  })
  const evt = events.data.find((e) => e.data.object.id === pi.id)
  if (!evt) {
    console.error('Event not found in Stripe. Webhook may not have fired.')
    process.exit(1)
  }
  console.log(`    → event ${evt.id} (livemode=${evt.livemode})`)

  console.log('[4/4] checking delivery to webhook endpoint…')
  // Stripe doesn't expose per-endpoint delivery status via Events API directly.
  // Use the webhook_endpoints + Events list_attempts is internal-only; we rely
  // on event.pending_webhooks decreasing to 0 as a proxy.
  for (let i = 0; i < 6; i++) {
    const fresh = await stripe.events.retrieve(evt.id)
    console.log(`    pending_webhooks=${fresh.pending_webhooks}`)
    if (fresh.pending_webhooks === 0) {
      console.log('\n✓ Webhook delivered (pending_webhooks=0).')
      console.log(
        `  Verify on https://dashboard.stripe.com/test/events/${evt.id}`,
      )
      console.log(
        `  And check "Webhook attempts" tab for HTTP 200 on your endpoint.`,
      )
      process.exit(0)
    }
    await new Promise((r) => setTimeout(r, 5000))
  }
  console.warn(
    '\n⚠ pending_webhooks still > 0 after 30s — Stripe may be retrying. Check dashboard.',
  )
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
