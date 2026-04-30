/**
 * Member access QR — token signing + image generation.
 *
 * The QR encodes a short JWT-like HMAC-signed token rather than the raw
 * `badge_uid`. Why:
 *
 *   - Screenshots become useless quickly: the token expires in ~5 min.
 *   - The badge_uid is a long-lived secret; binding it to a short TTL
 *     limits the blast radius if someone shares a screenshot.
 *   - The tornello (Phase 08) verifies the signature, no DB call needed
 *     on the hot path — the badge_uid is recovered from the JWT payload.
 *
 * We hand-roll a minimal HS256 JWT here instead of pulling in the full
 * `jsonwebtoken` package, but jsonwebtoken is also installed and used in
 * the route handler for symmetry with the rest of the codebase.
 */
import 'server-only'

import { createHmac, randomBytes } from 'node:crypto'

import jwt, { type JwtPayload } from 'jsonwebtoken'
import QRCode from 'qrcode'

import { env } from '@/lib/env'

/** Default TTL of the QR token. The client-side card refreshes faster. */
export const QR_TOKEN_TTL_SECONDS = 300

/**
 * Resolve the HMAC secret used to sign QR tokens.
 *
 * Production MUST set `QR_TOKEN_SECRET` to a strong 32+ byte value. In
 * dev we derive a deterministic secret from the Supabase URL so localhost
 * "just works" without polluting `.env.local`. The fallback is loud in
 * the logs the first time it's used.
 */
let warned = false
function getSecret(): string {
  const explicit = env.QR_TOKEN_SECRET
  if (explicit && explicit.length >= 16) return explicit
  if (!warned) {
    console.warn(
      '[qr] QR_TOKEN_SECRET not set. Using a deterministic dev fallback ' +
        'derived from NEXT_PUBLIC_SUPABASE_URL. DO NOT ship to prod like ' +
        'this — set a 32+ byte random secret.',
    )
    warned = true
  }
  return createHmac('sha256', 'quotal-qr-dev-fallback')
    .update(env.NEXT_PUBLIC_SUPABASE_URL)
    .digest('hex')
}

/** Shape of the signed payload inside the QR. */
export type QrTokenPayload = {
  /** Member badge UID (matches `profiles.badge_uid`). */
  buid: string
  /** Member id — convenience for the tornello to look up logs faster. */
  mid: string
  /** Gym id — multitenancy guard. */
  gid: string
}

/**
 * Sign a QR access token. Returns the compact JWT string and the
 * absolute expiry (ms epoch) so the UI can show a countdown.
 */
export function signQrToken(
  payload: QrTokenPayload,
  ttlSeconds: number = QR_TOKEN_TTL_SECONDS,
): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + ttlSeconds * 1000
  const token = jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: ttlSeconds,
    // Add a short jti so two tokens issued in the same second never
    // collide in any future deduplication logic on the tornello.
    jwtid: randomBytes(6).toString('hex'),
  })
  return { token, expiresAt }
}

/**
 * Verify a QR token. Returns the decoded payload on success, `null` on
 * invalid signature / expired token / wrong issuer. Used by the tornello
 * route in Phase 08 — exposed here so both sides import the same logic.
 */
export function verifyQrToken(token: string): QrTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ['HS256'],
    }) as JwtPayload
    if (
      decoded &&
      typeof decoded === 'object' &&
      typeof decoded.buid === 'string' &&
      typeof decoded.mid === 'string' &&
      typeof decoded.gid === 'string'
    ) {
      return {
        buid: decoded.buid,
        mid: decoded.mid,
        gid: decoded.gid,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Render a token as an SVG QR code (string).
 *
 * SVG keeps the payload tiny and scales perfectly on retina screens —
 * crucial because the QR card is the most-viewed surface in the PWA.
 */
export async function renderQrSvg(token: string): Promise<string> {
  return await QRCode.toString(token, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  })
}

/** Render a token as a base64 PNG data URL — used in tests / debugging. */
export async function renderQrPngDataUrl(token: string): Promise<string> {
  return await QRCode.toDataURL(token, {
    margin: 1,
    errorCorrectionLevel: 'M',
    width: 512,
  })
}
