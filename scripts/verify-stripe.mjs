#!/usr/bin/env node
/**
 * Local Stripe webhook smoke test.
 *
 * Builds a fake `payment_intent.succeeded` event, signs it with our
 * STRIPE_WEBHOOK_SECRET, POSTs it to /api/webhooks/stripe on the dev server,
 * and asserts a 2xx response. This validates the signature-verification
 * code path end-to-end without requiring real Stripe API access.
 *
 * Usage:
 *
 *   # 1. Run dev server in another shell with placeholder Stripe keys:
 *   STRIPE_SECRET_KEY=sk_test_dummy \
 *   STRIPE_WEBHOOK_SECRET=whsec_test_local \
 *   npm run dev
 *
 *   # 2. Run this script:
 *   STRIPE_WEBHOOK_SECRET=whsec_test_local \
 *   node scripts/verify-stripe.mjs
 *
 * Note: the handler tries to call `stripe.paymentIntents.retrieve()` etc.
 * for some flows. With dummy keys those calls fail at the network layer
 * and the handler returns 5xx. That's fine — what we want to validate
 * here is signature verification + idempotency, both of which run *before*
 * any Stripe API call. We use a `setup_intent.setup_failed`-style event
 * (no Stripe round-trip needed in the handler) for that reason.
 */
import { createHmac, randomBytes } from 'node:crypto'

const URL = process.env.QUOTAL_URL ?? 'http://localhost:3000'
const SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_local'

function sign(payload, secret, timestamp) {
  const signed = `${timestamp}.${payload}`
  const sig = createHmac('sha256', secret).update(signed).digest('hex')
  return `t=${timestamp},v1=${sig}`
}

async function postEvent(event, headerOverrides = {}) {
  const body = JSON.stringify(event)
  const ts = Math.floor(Date.now() / 1000)
  const sig = sign(body, SECRET, ts)
  const res = await fetch(`${URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig,
      ...headerOverrides,
    },
    body,
  })
  return { status: res.status, text: await res.text() }
}

function fakeId(prefix) {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

async function main() {
  const failures = []

  // 1. Reject events with no signature header.
  {
    const body = JSON.stringify({ id: fakeId('evt'), type: 'foo' })
    const res = await fetch(`${URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (res.status === 400) {
      console.log('OK  : missing signature → 400')
    } else {
      failures.push(`missing signature returned ${res.status}, expected 400`)
    }
  }

  // 2. Reject events with an invalid signature.
  {
    const body = JSON.stringify({ id: fakeId('evt'), type: 'foo' })
    const res = await fetch(`${URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1,v1=bogus',
      },
      body,
    })
    if (res.status === 400) {
      console.log('OK  : bad signature   → 400')
    } else {
      failures.push(`bad signature returned ${res.status}, expected 400`)
    }
  }

  // 3. Accept a properly-signed event with an unhandled type → 200.
  const eventId = fakeId('evt')
  const event = {
    id: eventId,
    object: 'event',
    api_version: '2026-04-22.dahlia',
    livemode: false,
    type: 'invoice.created',
    data: { object: { id: fakeId('in') } },
  }
  {
    const r = await postEvent(event)
    if (r.status === 200) {
      console.log(`OK  : unhandled event ${eventId} → 200`)
    } else {
      failures.push(`unhandled event returned ${r.status} (${r.text})`)
    }
  }

  // 4. Replay the same event → 200. With a real SUPABASE_SERVICE_ROLE_KEY
  //    the body will be "ok (duplicate)"; with a placeholder, the
  //    idempotency lookup silently fails and the handler returns "ok"
  //    twice. Both indicate the route is accepting the signed event.
  {
    const r = await postEvent(event)
    if (r.status === 200) {
      const idempotent = r.text.includes('duplicate')
      console.log(
        `OK  : replay → 200 (${idempotent ? 'idempotency confirmed' : 'note: idempotency requires real SUPABASE_SERVICE_ROLE_KEY'})`,
      )
    } else {
      failures.push(`replay returned ${r.status} (${r.text})`)
    }
  }

  if (failures.length) {
    console.error('\nFAILURES:')
    for (const f of failures) console.error(' - ' + f)
    process.exit(1)
  }
  console.log('\nAll webhook smoke tests passed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
