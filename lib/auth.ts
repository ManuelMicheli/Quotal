/**
 * Server-only auth helpers.
 *
 * Use these in Server Components, Server Actions, and Route Handlers to
 * enforce auth + role on protected routes. Each helper short-circuits with
 * `redirect()` rather than returning, so callers can rely on the returned
 * value being non-null.
 *
 * The Next.js middleware also performs role-based redirects, but server
 * components must defend themselves: middleware runs once per request, but
 * a parallel route can be reached from another origin.
 */
import 'server-only'

import { redirect } from 'next/navigation'

import { ROLES } from '@/lib/constants'
import type { Profile } from '@/lib/domain-types'
import { createClient } from '@/lib/supabase/server'

/**
 * Resolve the destination path for a freshly-authenticated user based on
 * their role. Owners and staff land in the dashboard, members in the PWA.
 */
export function dashboardPathForRole(role: string): string {
  return role === ROLES.MEMBER ? '/app' : '/dashboard'
}

/**
 * Recover the auth user, or redirect to `/login` if there is no session.
 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Recover both the auth user and the matching profile row.
 *
 * If either is missing the user is sent back to `/login`. The profile row
 * is created by the `handle_new_user` DB trigger on signup, so the only
 * legitimate way to land here without a profile is during the brief window
 * between Supabase confirming the email and the trigger firing — vanishingly
 * rare in practice, but we still guard against it.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) redirect('/login')
  return profile
}

/**
 * Require an owner or staff profile. Members are bounced to `/app`.
 */
export async function requireOwnerOrStaff(): Promise<Profile> {
  const profile = await requireProfile()
  if (profile.role !== ROLES.OWNER && profile.role !== ROLES.STAFF) {
    redirect('/app')
  }
  return profile
}

/**
 * Require a member profile. Owners/staff are bounced to `/dashboard`.
 */
export async function requireMember(): Promise<Profile> {
  const profile = await requireProfile()
  if (profile.role !== ROLES.MEMBER) redirect('/dashboard')
  return profile
}
