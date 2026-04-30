/**
 * Access verification endpoint — the only network surface a turnstile or
 * tablet kiosk needs to call.
 *
 * Auth: requires the device's bearer token in `x-device-token`. The token
 * IS the device's identity — no Supabase session involved. RLS doesn't
 * apply because the verify pipeline runs under the service role; gym
 * scope is enforced from the device row, never from the request body.
 *
 * Two body shapes accepted:
 *   - `{ qr_token: "..." }` — JWT minted by the member PWA's QR. Decoded
 *     here so we never trust a raw badge_uid that came over the wire.
 *   - `{ badge_uid: "Q-..." }` — physical RFID/MIFARE UID. Acceptable
 *     because the device→server hop is authenticated; the badge UID
 *     itself is just an identifier, not a secret.
 *
 * Response:
 *   200 { allow, reason?, member_id?, member_name?, subscription_id?, message }
 *   401 if device token missing/invalid
 *   400 on malformed body
 *
 * Side effects:
 *   - Writes one `access_logs` row per unique (device, badge) call within
 *     the 5s idempotency window. Repeated reads return the cached decision
 *     and DO NOT re-log.
 *   - Calls the configured `AccessControlAdapter.grantAccess()` on ALLOW
 *     decisions and `displayMessage()` on DENY decisions. Adapter failures
 *     never change the decision — they're appended to the log metadata.
 *
 * Runtime: nodejs (we use jsonwebtoken + Node crypto). Edge would force a
 * jose rewrite without meaningful latency win for a 5/min endpoint.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAccessAdapter } from '@/lib/access/adapter-factory'
import type { EntryDecision } from '@/lib/access/adapters/types'
import { verifyDeviceToken } from '@/lib/access/device-auth'
import { evaluateAccess } from '@/lib/access/evaluate'
import {
  getRecentDecision,
  rememberDecision,
} from '@/lib/access/idempotency'
import { verifyQrToken } from '@/lib/qr'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const inputSchema = z
  .object({
    badge_uid: z.string().min(1).optional(),
    qr_token: z.string().min(1).optional(),
  })
  .refine((d) => d.badge_uid || d.qr_token, {
    message: 'badge_uid or qr_token required',
  })

export async function POST(req: Request) {
  // ---- Auth: device bearer token ------------------------------------------
  const deviceToken = req.headers.get('x-device-token')
  if (!deviceToken) {
    return NextResponse.json(
      { allow: false, reason: 'unauthorized', message: 'Token dispositivo mancante' },
      { status: 401 },
    )
  }
  const device = await verifyDeviceToken(deviceToken)
  if (!device) {
    return NextResponse.json(
      { allow: false, reason: 'unauthorized', message: 'Dispositivo non autorizzato' },
      { status: 401 },
    )
  }

  // ---- Body ----------------------------------------------------------------
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { allow: false, reason: 'bad_request', message: 'Body non valido' },
      { status: 400 },
    )
  }
  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        allow: false,
        reason: 'bad_request',
        message: parsed.error.issues[0]?.message ?? 'Richiesta non valida',
      },
      { status: 400 },
    )
  }

  // ---- Resolve badge_uid ---------------------------------------------------
  let badgeUid: string | undefined = parsed.data.badge_uid
  let source: 'qr' | 'badge' = 'badge'
  let qrTokenWasInvalid = false

  if (parsed.data.qr_token) {
    source = 'qr'
    const decoded = verifyQrToken(parsed.data.qr_token)
    if (!decoded) {
      qrTokenWasInvalid = true
    } else if (decoded.gid !== device.gym_id) {
      // Token signed for a different gym — never trust a cross-gym mint.
      const decision: EntryDecision = {
        allow: false,
        reason: 'wrong_gym',
        message: 'QR di un altro impianto',
      }
      await logDecision({
        deviceId: device.id,
        gymId: device.gym_id,
        badgeUid: decoded.buid,
        decision,
        source,
      })
      return NextResponse.json(decision, { status: 200 })
    } else {
      badgeUid = decoded.buid
    }
  }

  if (qrTokenWasInvalid) {
    const decision: EntryDecision = {
      allow: false,
      reason: 'invalid_token',
      message: 'QR non valido o scaduto',
    }
    // Log without a badge_uid — we don't trust anything from a bad signature.
    await logDecision({
      deviceId: device.id,
      gymId: device.gym_id,
      badgeUid: null,
      decision,
      source,
    })
    return NextResponse.json(decision, { status: 200 })
  }

  if (!badgeUid) {
    return NextResponse.json(
      { allow: false, reason: 'bad_request', message: 'Badge mancante' },
      { status: 400 },
    )
  }

  // ---- Idempotency: collapse repeats within 5s ----------------------------
  const cached = getRecentDecision(device.id, badgeUid)
  if (cached) {
    return NextResponse.json(cached, {
      status: 200,
      headers: { 'x-quotal-cached': '1' },
    })
  }

  // ---- Decision pipeline ---------------------------------------------------
  const decision = await evaluateAccess({
    badgeUid,
    gymId: device.gym_id,
  })

  // ---- Hardware action (best-effort) --------------------------------------
  const adapter = getAccessAdapter()
  let hardwareError: string | null = null
  try {
    const hwRes = decision.allow
      ? await adapter.grantAccess({ deviceId: device.id, decision })
      : await adapter.displayMessage({
          deviceId: device.id,
          message: decision.message,
        })
    if (!hwRes.ok) hardwareError = hwRes.error
  } catch (err) {
    hardwareError =
      err instanceof Error ? err.message : 'unexpected adapter failure'
  }

  // ---- Log + remember ------------------------------------------------------
  await logDecision({
    deviceId: device.id,
    gymId: device.gym_id,
    badgeUid,
    decision,
    source,
    hardwareError,
    adapterName: adapter.name,
  })
  rememberDecision(device.id, badgeUid, decision)

  return NextResponse.json(decision, { status: 200 })
}

async function logDecision(opts: {
  deviceId: string
  gymId: string
  badgeUid: string | null
  decision: EntryDecision
  source: 'qr' | 'badge'
  hardwareError?: string | null
  adapterName?: string
}): Promise<void> {
  const supabase = createAdminClient()
  const metadata: Record<string, Json> = {
    source: opts.source,
    adapter: opts.adapterName ?? null,
  }
  if (opts.hardwareError) metadata.hardware_error = opts.hardwareError

  const { error } = await supabase.from('access_logs').insert({
    gym_id: opts.gymId,
    member_id: opts.decision.member_id ?? null,
    badge_uid: opts.badgeUid,
    granted: opts.decision.allow,
    denial_reason: opts.decision.allow ? null : (opts.decision.reason ?? null),
    device_id: opts.deviceId,
    metadata,
  })
  if (error) {
    console.warn('[access] failed to write access_logs row:', error.message)
  }
}
