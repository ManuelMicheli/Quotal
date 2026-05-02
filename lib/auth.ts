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
import { cache } from 'react'

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
 *
 * Reads the session from cookies (no HTTP round-trip to Supabase auth) — the
 * root middleware already calls `auth.getUser()` on every protected request,
 * which validates the JWT and refreshes the cookie. Trusting the freshly
 * validated cookie here saves ~300-500ms per Server Action invocation.
 *
 * Wrapped in `react.cache` so layout + page hits in the same request share
 * the result.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')
  return session.user
})

/**
 * Recover both the auth user and the matching profile row.
 *
 * Same fast-path rationale as `requireUser`: middleware already validated the
 * JWT, so the cookie-derived session is trustworthy. If the profile row is
 * missing the user is bounced to `/login`; the row is created by the
 * `handle_new_user` DB trigger on signup, so missing implies a brief race
 * window right after email confirmation.
 *
 * Wrapped in `react.cache` so the layout's call and the page's call share
 * a single SELECT per request.
 */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error || !profile) redirect('/login')
  return profile
})

/**
 * Require an owner or staff profile. Members are bounced to `/app`.
 */
export const requireOwnerOrStaff = cache(async (): Promise<Profile> => {
  const profile = await requireProfile()
  if (profile.role !== ROLES.OWNER && profile.role !== ROLES.STAFF) {
    redirect('/app')
  }
  return profile
})

/**
 * Require a member profile. Owners/staff are bounced to `/dashboard`.
 */
export const requireMember = cache(async (): Promise<Profile> => {
  const profile = await requireProfile()
  if (profile.role !== ROLES.MEMBER) redirect('/dashboard')
  return profile
})
