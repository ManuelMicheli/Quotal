/**
 * Gym-scoped queries.
 *
 * Server-only. Each function uses the `@supabase/ssr` server client so RLS
 * applies based on the caller's session. Never throws — errors are returned
 * as `null` (logged for the developer, opaque to the caller).
 */
import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Gym } from '@/lib/domain-types'

/**
 * Return the gym for the currently authenticated user, or `null` if no gym
 * is visible (no session, no profile, or the row was filtered out by RLS).
 *
 * Single-tenant MVP: the `Users see their own gym` policy guarantees at most
 * one row will be returned, so we use `maybeSingle()` rather than `single()`
 * to avoid throwing when a fresh user has no profile yet.
 */
export async function getCurrentGym(): Promise<Gym | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gyms')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[queries/gym] getCurrentGym failed:', error.message)
    return null
  }
  return data
}
