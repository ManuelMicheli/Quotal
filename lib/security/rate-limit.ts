/**
 * Rate limiter — in-memory only.
 *
 * Why in-memory and not Upstash for the MVP:
 *   - Quotal traffic is tiny (one gym, ~100 daily active users), so a
 *     dedicated Redis is over-spec.
 *   - Adding `@upstash/ratelimit` requires a Redis instance + secrets that
 *     would otherwise be empty noise in `.env.local.example`.
 *   - The per-instance scope is acceptable on Vercel: each Lambda usually
 *     handles a sticky burst of requests from the same IP, so in-memory
 *     catches the local burst that matters.
 *
 * Caveat (documented): with multiple Vercel functions running in parallel
 * a malicious actor could divide their bursts across cold starts and slip
 * past these limits. For the MVP this is acceptable; before scaling beyond
 * a single gym, swap the in-memory map for Redis. The interface below
 * (`limit(identifier)` returning `{ success, remaining, resetAt }`) matches
 * the Upstash SDK so the swap is mechanical.
 *
 * Each named limiter uses a sliding-window counter approximated with a
 * fixed-window bucket — good enough granularity for auth abuse, simpler
 * and faster than a full sliding window.
 */

import 'server-only'

import { headers } from 'next/headers'

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
}

export type RateLimiter = {
  limit: (identifier: string) => Promise<RateLimitResult>
  /** Window size in ms — useful for the `Retry-After` header. */
  windowMs: number
  max: number
}

type Bucket = { count: number; resetAt: number }

function makeFixedWindowLimiter(max: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, Bucket>()
  // Best-effort eviction so the map doesn't grow unbounded under abuse.
  const evictionThreshold = 10_000

  return {
    max,
    windowMs,
    async limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now()
      const existing = buckets.get(identifier)

      if (!existing || existing.resetAt <= now) {
        if (buckets.size > evictionThreshold) {
          for (const [key, bucket] of buckets) {
            if (bucket.resetAt <= now) buckets.delete(key)
          }
        }
        buckets.set(identifier, { count: 1, resetAt: now + windowMs })
        return { success: true, remaining: max - 1, resetAt: now + windowMs }
      }

      if (existing.count >= max) {
        return {
          success: false,
          remaining: 0,
          resetAt: existing.resetAt,
        }
      }

      existing.count += 1
      return {
        success: true,
        remaining: max - existing.count,
        resetAt: existing.resetAt,
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Named limiters
// ---------------------------------------------------------------------------
//
// Numbers are tuned so that a real human at the keyboard never hits the
// limit, while a script firing 10+ requests/sec is throttled fast.

export const limiters = {
  /** Login & signup — both go through `/login` and `/signup`. */
  auth: makeFixedWindowLimiter(10, 60_000),
  /** Generic password reset — keep this tighter (email send is expensive). */
  passwordReset: makeFixedWindowLimiter(3, 60_000),
  /** Public payment link acquisition (`/pay/[token]`). */
  payment: makeFixedWindowLimiter(20, 60_000),
  /** GDPR data export — generation is slow, member should never need >2/h. */
  dataExport: makeFixedWindowLimiter(2, 3_600_000),
  /** Generic JSON API protection. */
  api: makeFixedWindowLimiter(60, 60_000),
} as const

export type LimiterName = keyof typeof limiters

// ---------------------------------------------------------------------------
// Identifier helpers
// ---------------------------------------------------------------------------

/**
 * Extract the best-effort caller IP from the incoming request headers.
 *
 * On Vercel `x-forwarded-for` is set by the edge to a comma-separated list
 * (`client, proxy1, proxy2`); we keep the leftmost client value. Falls back
 * to `x-real-ip`, then a literal `'unknown'` so we still rate-limit globally
 * if all headers are stripped.
 */
export async function getCallerIp(): Promise<string> {
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return h.get('x-real-ip') ?? 'unknown'
}

/**
 * Run a named limiter against the current request's IP. Returns the result
 * without throwing — caller decides how to respond (HTTP 429, ActionResult
 * with error, etc.).
 */
export async function checkRateLimit(
  name: LimiterName,
  extraIdentifier?: string,
): Promise<RateLimitResult> {
  const ip = await getCallerIp()
  const id = extraIdentifier ? `${ip}:${extraIdentifier}` : ip
  return limiters[name].limit(`${name}:${id}`)
}
