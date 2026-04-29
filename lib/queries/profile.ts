/**
 * Profile-scoped queries.
 *
 * Server-only. Each function uses the `@supabase/ssr` server client so RLS
 * applies based on the caller's session. Never throws — errors are returned
 * as `null` (logged for the developer).
 */
import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/domain-types'

/**
 * Return the profile of the currently authenticated user, or `null` if not
 * signed in or the profile row does not exist (e.g. between auth.users
 * insert and the `handle_new_user` trigger firing — should be impossible
 * in practice, but we never throw).
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error(
      '[queries/profile] getCurrentProfile failed:',
      error.message,
    )
    return null
  }
  return data
}

/**
 * Return a member profile by id, or `null` if not visible.
 *
 * RLS on `profiles` ensures the caller can only see members of their own
 * gym, so we don't need an explicit `gym_id` filter here — Postgres adds it.
 */
export async function getMemberById(id: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[queries/profile] getMemberById failed:', error.message)
    return null
  }
  return data
}
