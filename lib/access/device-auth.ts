/**
 * Authentication for physical access devices (tornelli, tablet kiosk).
 *
 * Each device holds a long-lived bearer token formatted `qd_<id>_<secret>`.
 * Format choice:
 *   - The `<id>` half lets us look up the row in O(1) without scanning every
 *     hash — bcrypt-style "scan all, compare hashes" doesn't scale even at
 *     small sizes and adds a hard dependency we don't otherwise need.
 *   - The `<secret>` half is a 32-byte URL-safe random string. We store
 *     only its SHA-256 hex (constant-time compared on read).
 *
 * The cleartext token is shown to the owner once on creation and never
 * again. Rotating means generating a new secret and replacing `token_hash`.
 *
 * Unlike user sessions, device tokens never expire on their own — the
 * lifecycle is owner-driven (revoke when a tablet is lost, etc.).
 */
import 'server-only'

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/admin'
import type { AccessDevice } from '@/lib/domain-types'

export const DEVICE_TOKEN_PREFIX = 'qd'

/**
 * Generate a fresh device-token pair.
 *
 * Returns:
 *   - `token`: the cleartext value to hand to the owner. Show ONCE.
 *   - `hash`:  the SHA-256 hex to persist in `access_devices.token_hash`.
 */
export function generateDeviceToken(deviceId: string): {
  token: string
  hash: string
} {
  const secret = randomBytes(32).toString('base64url')
  const token = `${DEVICE_TOKEN_PREFIX}_${deviceId}_${secret}`
  const hash = sha256Hex(secret)
  return { token, hash }
}

/**
 * Recompute the hash for a device-secret. Exposed so the dialog flow can
 * rotate a token without re-deriving the hashing logic.
 */
export function hashDeviceSecret(secret: string): string {
  return sha256Hex(secret)
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Constant-time hex compare. `crypto.timingSafeEqual` requires equal-length
 * Buffers — we coerce the strings, return false on mismatch length up-front
 * (which only leaks "did the request use a totally wrong-length value" —
 * not exploitable since both sides are 64 hex chars).
 */
function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

/**
 * Verify a device bearer token. Returns the device row on success.
 *
 * Side-effect: bumps `last_seen_at` to `now()` so the dashboard can show
 * which devices are still phoning home. The bump is fire-and-forget — a
 * write failure does not deny the access decision.
 *
 * Why service role: the device token IS the auth — there's no Supabase
 * session, so RLS would block the lookup. We re-enforce gym scope on
 * the call site (the verify route uses `device.gym_id`, never trusts the
 * caller's body).
 */
export async function verifyDeviceToken(
  rawToken: string,
): Promise<AccessDevice | null> {
  // Token shape: qd_<deviceId>_<secret>. Both the secret (base64url) and
  // the device id (uuid) contain dashes, but only the secret contains
  // underscores. Split on the first two underscores so the rest of the
  // string stays intact as the secret.
  const firstUnderscore = rawToken.indexOf('_')
  if (firstUnderscore === -1) return null
  const secondUnderscore = rawToken.indexOf('_', firstUnderscore + 1)
  if (secondUnderscore === -1) return null
  const prefix = rawToken.slice(0, firstUnderscore)
  const deviceId = rawToken.slice(firstUnderscore + 1, secondUnderscore)
  const secret = rawToken.slice(secondUnderscore + 1)
  if (prefix !== DEVICE_TOKEN_PREFIX) return null
  if (!deviceId || !secret) return null

  const supabase = createAdminClient()
  const { data: device, error } = await supabase
    .from('access_devices')
    .select('*')
    .eq('id', deviceId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !device) return null

  const expected = device.token_hash
  const actual = sha256Hex(secret)
  if (!safeHexEqual(actual, expected)) return null

  // Fire-and-forget last_seen update.
  void supabase
    .from('access_devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', device.id)
    .then((res) => {
      if (res.error) {
        console.warn('[access] failed to update device.last_seen:', res.error.message)
      }
    })

  return device
}
