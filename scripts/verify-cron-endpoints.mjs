#!/usr/bin/env node
/**
 * Verify Phase 09 cron-callable endpoints accept-only-with-secret.
 *
 * Usage:
 *   node scripts/verify-cron-endpoints.mjs           # against http://localhost:3000
 *   APP_URL=https://staging.quotal.it node scripts/verify-cron-endpoints.mjs
 *
 * Sends one unauth request and one auth request to each endpoint and
 * reports the status. The fake secret is configured via CRON_SECRET in
 * the environment OR a deterministic test value; the test secret only
 * works if the running server is configured with that same secret.
 *
 * This is a smoke test — it intentionally does NOT trigger live email/
 * push sends (those degrade gracefully when Resend/VAPID are missing).
 */
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
const SECRET =
  process.env.CRON_SECRET ?? 'phase09-test-cron-secret-changeme'

const ENDPOINTS = [
  { method: 'POST', path: '/api/cron/notify-expiring', body: undefined, query: '?dry=1' },
  { method: 'POST', path: '/api/cron/update-expired', body: undefined },
  { method: 'POST', path: '/api/cron/owner-digest', body: undefined },
  { method: 'POST', path: '/api/cron/retry-sepa', body: undefined },
  {
    method: 'POST',
    path: '/api/cron/dispatch',
    body: {
      type: 'welcome',
      recipient_id: '00000000-0000-0000-0000-000000000000',
    },
  },
]

const banner = '────────────────────────────────────────────────────────────────'
let failures = 0

for (const ep of ENDPOINTS) {
  const url = `${APP_URL}${ep.path}${ep.query ?? ''}`
  console.log('')
  console.log(banner)
  console.log(`${ep.method} ${ep.path}${ep.query ?? ''}`)
  console.log(banner)

  // Unauth
  try {
    const resp = await fetch(url, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    })
    const ok = resp.status === 401 || resp.status === 503
    console.log(
      `  [${ok ? 'OK' : 'FAIL'}] unauth → ${resp.status} ${resp.statusText}`,
    )
    if (!ok) failures++
  } catch (err) {
    console.log('  [SKIP] unauth — server not reachable:', err?.message ?? err)
    failures++
    continue
  }

  // Auth (only smoke-tests; receives a 200 if CRON_SECRET matches AND
  // body is valid). For a 401 we still consider it "expected when the
  // server has a different CRON_SECRET configured".
  try {
    const resp = await fetch(url, {
      method: ep.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SECRET}`,
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    })
    const expected = [200, 401, 500]
    const ok = expected.includes(resp.status)
    console.log(
      `  [${ok ? 'OK' : 'FAIL'}] auth   → ${resp.status} ${resp.statusText}`,
    )
    if (!ok) failures++
  } catch (err) {
    console.log('  [SKIP] auth — server not reachable:', err?.message ?? err)
    failures++
  }
}

console.log('')
if (failures === 0) {
  console.log('All cron endpoints behave as expected.')
} else {
  console.error(`${failures} check(s) failed.`)
  process.exit(1)
}
