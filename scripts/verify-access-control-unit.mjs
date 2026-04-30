// In-process unit verification for the Phase 08 access pipeline.
//
// Why this exists: the live `/api/access/verify` endpoint requires a real
// SUPABASE_SERVICE_ROLE_KEY in .env.local. When that key is still the
// `placeholder-service-role-key` (typical for early-phase dev installs),
// every admin call fails with auth-rejected and the route can't be tested
// end-to-end. This script tests the decision pipeline + adapter contract
// in-process, with a hand-rolled fake supabase client.
//
// The full live test (`scripts/verify-access-control.mjs`) is what you
// run once you've pasted the real service-role key.

import { createHmac, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createRequire } from 'node:module'

// Load .env.local so the @t3-oss/env validator finds the keys when
// modules pull them in transitively.
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local')
  let text
  try {
    text = readFileSync(envPath, 'utf8')
  } catch {
    return
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let value = m[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value
  }
}
loadEnv()
// Bypass strict env validation — the modules under test never call out
// to Supabase/Stripe in this script.
process.env.SKIP_ENV_VALIDATION = 'true'
const require = createRequire(import.meta.url)

// `server-only` throws unconditionally on import outside the Next runtime —
// it's just a bundler signal. Stub it BEFORE `tsx` loads our .ts modules.
const Module = require('module')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
  if (request === 'server-only') {
    return require.resolve('./_server-only-stub.cjs', { paths: [process.cwd() + '/scripts'] })
  }
  return originalResolve.call(this, request, ...rest)
}

// Use tsx to load the .ts modules directly.
// (`tsx` is already a dev dependency in this project.)
require('tsx/cjs')

const {
  evaluateAccess,
} = require('../lib/access/evaluate.ts')
const {
  MockAdapter,
} = require('../lib/access/adapters/mock-adapter.ts')
const {
  RestAdapter,
} = require('../lib/access/adapters/rest-adapter.ts')
const {
  generateDeviceToken,
  hashDeviceSecret,
} = require('../lib/access/device-auth.ts')
const {
  getRecentDecision,
  rememberDecision,
  __resetIdempotencyCache,
} = require('../lib/access/idempotency.ts')

// ---- Fake supabase client -------------------------------------------------
function makeFakeClient(state) {
  function makeQuery(table) {
    const filters = {}
    let single = false
    let maybeSingle = false
    const builder = {
      select() {
        return builder
      },
      eq(col, val) {
        filters[col] = val
        return builder
      },
      order() {
        return builder
      },
      maybeSingle() {
        maybeSingle = true
        return runQuery()
      },
      single() {
        single = true
        return runQuery()
      },
      then(fn) {
        return Promise.resolve(runQuery()).then(fn)
      },
    }
    function runQuery() {
      const rows = (state[table] ?? []).filter((r) =>
        Object.entries(filters).every(([k, v]) => r[k] === v),
      )
      if (single) {
        return Promise.resolve({
          data: rows[0] ?? null,
          error: rows.length ? null : { message: 'no rows' },
        })
      }
      if (maybeSingle) {
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      }
      return Promise.resolve({ data: rows, error: null })
    }
    return builder
  }
  return { from: (table) => makeQuery(table) }
}

let pass = true
function check(label, ok, extra = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`)
  if (!ok) pass = false
}

async function main() {
  const member = {
    id: 'm-1',
    full_name: 'Mario Rossi',
    gym_id: 'gym-1',
    role: 'member',
    is_problematic: false,
    problematic_reason: null,
  }
  const future = new Date(Date.now() + 30 * 86400_000)
    .toISOString()
    .slice(0, 10)
  const past = new Date(Date.now() - 10 * 86400_000)
    .toISOString()
    .slice(0, 10)

  // ALLOW — active subscription, future end_date.
  {
    const fake = makeFakeClient({
      profiles: [{ ...member, badge_uid: 'Q-abc' }],
      subscriptions: [
        {
          id: 's-1',
          member_id: 'm-1',
          status: 'active',
          end_date: future,
          original_end_date: future,
        },
      ],
      gyms: [{ id: 'gym-1', settings: {} }],
    })
    const r = await evaluateAccess(
      { badgeUid: 'Q-abc', gymId: 'gym-1' },
      fake,
    )
    check(
      `ALLOW for active sub (allow=${r.allow}, msg="${r.message}")`,
      r.allow === true && r.member_id === 'm-1',
    )
  }

  // DENY — expired past grace.
  {
    const fake = makeFakeClient({
      profiles: [{ ...member, badge_uid: 'Q-abc' }],
      subscriptions: [
        {
          id: 's-2',
          member_id: 'm-1',
          status: 'expired',
          end_date: past,
          original_end_date: past,
        },
      ],
      gyms: [{ id: 'gym-1', settings: { gracePeriodDays: 3 } }],
    })
    const r = await evaluateAccess(
      { badgeUid: 'Q-abc', gymId: 'gym-1' },
      fake,
    )
    check(
      `DENY for expired beyond grace (allow=${r.allow}, reason=${r.reason})`,
      r.allow === false && r.reason === 'expired',
    )
  }

  // ALLOW — within grace period.
  {
    const recentPast = new Date(Date.now() - 1 * 86400_000)
      .toISOString()
      .slice(0, 10)
    const fake = makeFakeClient({
      profiles: [{ ...member, badge_uid: 'Q-abc' }],
      subscriptions: [
        {
          id: 's-3',
          member_id: 'm-1',
          status: 'expired',
          end_date: recentPast,
          original_end_date: recentPast,
        },
      ],
      gyms: [{ id: 'gym-1', settings: { gracePeriodDays: 3 } }],
    })
    const r = await evaluateAccess(
      { badgeUid: 'Q-abc', gymId: 'gym-1' },
      fake,
    )
    check(
      `ALLOW within grace period (allow=${r.allow}, msg includes "Rinnova"=${r.message.includes('Rinnova')})`,
      r.allow === true && r.message.includes('Rinnova'),
    )
  }

  // DENY — suspended.
  {
    const fake = makeFakeClient({
      profiles: [{ ...member, badge_uid: 'Q-abc' }],
      subscriptions: [
        {
          id: 's-4',
          member_id: 'm-1',
          status: 'suspended',
          end_date: future,
          original_end_date: future,
        },
      ],
      gyms: [{ id: 'gym-1', settings: {} }],
    })
    const r = await evaluateAccess(
      { badgeUid: 'Q-abc', gymId: 'gym-1' },
      fake,
    )
    check(
      `DENY for suspended (reason=${r.reason})`,
      r.allow === false && r.reason === 'suspended',
    )
  }

  // DENY — unknown badge.
  {
    const fake = makeFakeClient({
      profiles: [],
      subscriptions: [],
      gyms: [],
    })
    const r = await evaluateAccess(
      { badgeUid: 'Q-unknown', gymId: 'gym-1' },
      fake,
    )
    check(
      `DENY for unknown badge (reason=${r.reason})`,
      r.allow === false && r.reason === 'unknown_badge',
    )
  }

  // DENY — problematic flag.
  {
    const fake = makeFakeClient({
      profiles: [
        {
          ...member,
          badge_uid: 'Q-abc',
          is_problematic: true,
          problematic_reason: 'Conto sospeso',
        },
      ],
      subscriptions: [],
      gyms: [{ id: 'gym-1', settings: {} }],
    })
    const r = await evaluateAccess(
      { badgeUid: 'Q-abc', gymId: 'gym-1' },
      fake,
    )
    check(
      `DENY for problematic member (reason=${r.reason})`,
      r.allow === false && r.reason === 'problematic_member',
    )
  }

  // DENY — no subscription at all.
  {
    const fake = makeFakeClient({
      profiles: [{ ...member, badge_uid: 'Q-abc' }],
      subscriptions: [],
      gyms: [{ id: 'gym-1', settings: {} }],
    })
    const r = await evaluateAccess(
      { badgeUid: 'Q-abc', gymId: 'gym-1' },
      fake,
    )
    check(
      `DENY for no subscription (reason=${r.reason})`,
      r.allow === false && r.reason === 'no_subscription',
    )
  }

  // Adapter — mock allow.
  {
    const adapter = new MockAdapter()
    const r = await adapter.grantAccess({
      deviceId: 'd-1',
      decision: { allow: true, message: 'ok' },
    })
    check(`MockAdapter.grantAccess ok (ok=${r.ok})`, r.ok === true)
  }

  // RestAdapter constructor guard.
  {
    let threw = false
    try {
      new RestAdapter({})
    } catch {
      threw = true
    }
    check(`RestAdapter throws when baseUrl missing (threw=${threw})`, threw)
  }

  // Device-token format & hash roundtrip.
  {
    const { token, hash } = generateDeviceToken('dev-1')
    // Split on the first two underscores only — base64url secret may
    // contain its own underscores.
    const i1 = token.indexOf('_')
    const i2 = token.indexOf('_', i1 + 1)
    const prefix = token.slice(0, i1)
    const deviceId = token.slice(i1 + 1, i2)
    const secret = token.slice(i2 + 1)
    const okFormat =
      prefix === 'qd' && deviceId === 'dev-1' && secret.length >= 40
    const okHash = hash === hashDeviceSecret(secret)
    check(
      `Device token format qd_<id>_<secret> (prefix=${prefix} id=${deviceId})`,
      okFormat,
    )
    check(`Device token hash roundtrip matches`, okHash)
  }

  // Idempotency cache — collapse repeats.
  {
    __resetIdempotencyCache()
    const dec = { allow: true, message: 'first' }
    const before = getRecentDecision('d-1', 'Q-abc')
    rememberDecision('d-1', 'Q-abc', dec)
    const after = getRecentDecision('d-1', 'Q-abc')
    check(
      `Idempotency: first lookup is null (got ${before})`,
      before === null,
    )
    check(
      `Idempotency: same key returns cached decision (msg="${after?.message}")`,
      after && after.message === 'first',
    )
  }

  // QR token roundtrip — sign + verify same secret.
  {
    const SUPABASE_URL = 'https://x.supabase.co'
    const secret = createHmac('sha256', 'quotal-qr-dev-fallback')
      .update(SUPABASE_URL)
      .digest('hex')
    const jwt = require('jsonwebtoken')
    const token = jwt.sign(
      { buid: 'Q-abc', mid: 'm-1', gid: 'gym-1' },
      secret,
      { algorithm: 'HS256', expiresIn: 60, jwtid: randomBytes(6).toString('hex') },
    )
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] })
    check(
      `QR JWT signs + verifies (decoded.buid=${decoded.buid})`,
      decoded.buid === 'Q-abc' && decoded.gid === 'gym-1',
    )
  }

  if (!pass) {
    console.error('\nFAIL — see ✗ items above.')
    process.exit(1)
  }
  console.log('\nPASS — all decision-pipeline + adapter checks green.')
}

main().catch((err) => {
  console.error('Script crashed:', err)
  process.exit(2)
})
