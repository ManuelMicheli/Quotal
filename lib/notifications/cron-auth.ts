/**
 * Shared auth gate for `/api/cron/*` endpoints.
 *
 * Cron endpoints are called server-to-server from Supabase pg_cron
 * (via `net.http_post`) or any Edge Function we deploy. Authentication
 * is a single shared bearer token: `CRON_SECRET`.
 *
 * Behavior:
 *   - Missing env var → endpoint always 503 (fail-closed). Forces the
 *     operator to set the secret before scheduling.
 *   - Header missing or mismatched → 401.
 *   - Match → returns true.
 *
 * Server-only.
 */
import 'server-only'

import { env } from '@/lib/env'

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string }

export function checkCronAuth(req: Request): CronAuthResult {
  if (!env.CRON_SECRET) {
    return {
      ok: false,
      status: 503,
      error: 'CRON_SECRET non configurato sul server.',
    }
  }
  const header =
    req.headers.get('authorization') ??
    req.headers.get('x-cron-secret') ??
    ''
  const expected = `Bearer ${env.CRON_SECRET}`
  // Allow plain `<secret>` in addition to `Bearer <secret>` so that
  // pg_cron-configured net.http_post calls without a Bearer prefix still
  // work.
  if (header === expected || header === env.CRON_SECRET) {
    return { ok: true }
  }
  return { ok: false, status: 401, error: 'Token cron non valido.' }
}
