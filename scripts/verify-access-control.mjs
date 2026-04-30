// Phase 08 verification script.
//
// What it does (against the live Supabase project + the dev server):
//   1. Provisions a temporary `access_devices` row directly in the DB.
//   2. Mints a QR token for the test member using the same logic as
//      `lib/qr.ts` (mirrors HS256 signing).
//   3. Calls POST /api/access/verify with the device token + QR.
//      Expects allow:true (an active subscription is created on the fly).
//   4. Backdates the subscription past the grace period, calls again with
//      a fresh QR. Expects allow:false reason:"expired".
//   5. Checks `access_logs` rows were written for both calls.
//   6. Cleans up: deletes the device + the test subscription + the rows.
//
// Prereqs:
//   - `npm run dev` running on $PORT (default 3000) OR pass --base=URL.
//   - .env.local has a REAL SUPABASE_SERVICE_ROLE_KEY (admin operations).
//
// If the service-role key is the placeholder, the script aborts with a
// helpful message rather than producing confusing failures.
//
// Usage:
//   node scripts/verify-access-control.mjs [--base=http://localhost:3138]

import { createHash, createHmac, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

// ---- Tiny .env.local parser (no dotenv dep) -------------------------------
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
    const key = m[1]
    let value = m[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}
loadEnv()

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
const BASE_URL = args.base || `http://localhost:${process.env.PORT || 3000}`
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL not set in .env.local')
  process.exit(2)
}
if (!SERVICE_ROLE || SERVICE_ROLE.startsWith('placeholder')) {
  console.warn(
    '⚠  SUPABASE_SERVICE_ROLE_KEY is missing or a placeholder.\n' +
      '   The verify endpoint cannot run without a real key — paste one from\n' +
      '   https://supabase.com/dashboard/project/' +
      (SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] ?? '<project>') +
      '/settings/api-keys\n' +
      '   then re-run this script.',
  )
  process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function getQrSecret() {
  const explicit = process.env.QR_TOKEN_SECRET
  if (explicit && explicit.length >= 16) return explicit
  return createHmac('sha256', 'quotal-qr-dev-fallback')
    .update(SUPABASE_URL)
    .digest('hex')
}
function signQr(payload, ttlSeconds = 300) {
  return jwt.sign(payload, getQrSecret(), {
    algorithm: 'HS256',
    expiresIn: ttlSeconds,
    jwtid: randomBytes(6).toString('hex'),
  })
}
function sha256(s) {
  return createHash('sha256').update(s).digest('hex')
}
function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
function shiftIso(iso, days) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
function fmt(label, ok) {
  return `${ok ? '✓' : '✗'} ${label}`
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`)

  const { data: member, error: memberErr } = await supabase
    .from('profiles')
    .select('id, gym_id, badge_uid, full_name')
    .eq('role', 'member')
    .limit(1)
    .single()
  if (memberErr || !member) {
    throw new Error(`No test member found: ${memberErr?.message}`)
  }
  if (!member.badge_uid) throw new Error('Test member has no badge_uid')
  console.log(
    `Member: ${member.full_name} (${member.id})  badge=${member.badge_uid}`,
  )

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, duration_days')
    .eq('gym_id', member.gym_id)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single()
  if (!plan) throw new Error('No subscription plan found')

  await supabase.from('subscriptions').delete().eq('member_id', member.id)
  const today = todayIso()
  const future = shiftIso(today, plan.duration_days || 30)
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .insert({
      gym_id: member.gym_id,
      member_id: member.id,
      plan_id: plan.id,
      status: 'active',
      start_date: today,
      end_date: future,
      original_end_date: future,
    })
    .select('id')
    .single()
  if (subErr || !sub) {
    throw new Error(`Could not seed subscription: ${subErr?.message}`)
  }
  console.log(`Seeded active subscription ${sub.id} (end_date=${future})`)

  const { data: deviceRow, error: devInsertErr } = await supabase
    .from('access_devices')
    .insert({
      gym_id: member.gym_id,
      name: 'verify-script-device',
      device_type: 'tablet',
      token_hash: 'pending',
    })
    .select('id')
    .single()
  if (devInsertErr || !deviceRow) {
    throw new Error(`Failed to insert device: ${devInsertErr?.message}`)
  }
  const secret = randomBytes(32).toString('base64url')
  const deviceToken = `qd_${deviceRow.id}_${secret}`
  await supabase
    .from('access_devices')
    .update({ token_hash: sha256(secret) })
    .eq('id', deviceRow.id)
  console.log(`Provisioned device ${deviceRow.id}`)

  let pass = true

  // ---- ALLOW path -------------------------------------------------------
  const allowQr = signQr({
    buid: member.badge_uid,
    mid: member.id,
    gid: member.gym_id,
  })
  let res = await fetch(`${BASE_URL}/api/access/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-token': deviceToken,
    },
    body: JSON.stringify({ qr_token: allowQr }),
  })
  let body = await res.json()
  const allowOk = res.status === 200 && body.allow === true
  console.log(
    fmt(
      `ALLOW path returns 200 + allow:true (got ${res.status}, allow=${body.allow}, msg="${body.message}")`,
      allowOk,
    ),
  )
  if (!allowOk) pass = false

  // ---- DENY path: backdate past grace -----------------------------------
  const past = shiftIso(today, -10)
  await supabase
    .from('subscriptions')
    .update({ end_date: past, original_end_date: past, status: 'expired' })
    .eq('id', sub.id)

  const denyQr = signQr({
    buid: member.badge_uid,
    mid: member.id,
    gid: member.gym_id,
  })
  res = await fetch(`${BASE_URL}/api/access/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-token': deviceToken,
    },
    body: JSON.stringify({ qr_token: denyQr }),
  })
  body = await res.json()
  const denyOk =
    res.status === 200 && body.allow === false && body.reason === 'expired'
  console.log(
    fmt(
      `DENY path returns 200 + allow:false reason:"expired" (got ${res.status}, allow=${body.allow}, reason=${body.reason})`,
      denyOk,
    ),
  )
  if (!denyOk) pass = false

  // ---- access_logs check ------------------------------------------------
  const { data: logs } = await supabase
    .from('access_logs')
    .select('id, granted, denial_reason, device_id, member_id')
    .eq('device_id', deviceRow.id)
    .order('accessed_at', { ascending: false })
  const grantedRow = logs?.find((l) => l.granted === true)
  const deniedRow = logs?.find(
    (l) => l.granted === false && l.denial_reason === 'expired',
  )
  console.log(
    fmt(
      `access_logs has GRANTED row for this device (${grantedRow?.id ?? '—'})`,
      !!grantedRow,
    ),
  )
  console.log(
    fmt(
      `access_logs has DENIED row with reason expired (${deniedRow?.id ?? '—'})`,
      !!deniedRow,
    ),
  )
  if (!grantedRow || !deniedRow) pass = false

  // ---- Cleanup -----------------------------------------------------------
  await supabase.from('access_logs').delete().eq('device_id', deviceRow.id)
  await supabase.from('access_devices').delete().eq('id', deviceRow.id)
  await supabase.from('subscriptions').delete().eq('id', sub.id)
  console.log('Cleanup done.')

  if (!pass) {
    console.error('\nFAIL — see ✗ items above.')
    process.exit(1)
  }
  console.log('\nPASS — all checks green.')
}

main().catch((err) => {
  console.error('Script crashed:', err)
  process.exit(2)
})
