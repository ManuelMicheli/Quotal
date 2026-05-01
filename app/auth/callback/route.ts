/**
 * Supabase auth callback handler.
 *
 * Used for:
 *   - Email confirmation links (`?code=...`)
 *   - Password recovery links (`?code=...&next=/update-password`)
 *   - Magic links (Phase 09 — same shape as email confirmation)
 *
 * Supabase appends a `code` query param that we exchange for a session
 * cookie via `exchangeCodeForSession`. After the exchange we redirect to
 * the `next` parameter (or a sensible default).
 */
import { NextResponse, type NextRequest } from 'next/server'

import { dashboardPathForRole } from '@/lib/auth'
import { ROLES } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Window during which a freshly-created profile is allowed to be re-bound to
 * the gym slug carried over from the signup link. Anything older is treated
 * as an existing-user login and the slug is ignored.
 */
const FRESH_PROFILE_WINDOW_MS = 2 * 60 * 1000

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const explicitNext = searchParams.get('next')
  const gymSlugParam = searchParams.get('gym')?.trim().toLowerCase() || null

  if (!code) {
    // No code → bounce to login with a generic error in the URL so the page
    // can show a friendly message if it wants.
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Multi-tenant: when the OAuth round-trip carries a gym slug, the user just
  // signed up via a public invite link. The handle_new_user trigger has
  // already created a profile pointing at "the first gym" (legacy fallback);
  // re-bind it to the right tenant before the session lands on a dashboard.
  // Only do this for freshly-created profiles to avoid letting an existing
  // user hop tenants by appending ?gym= to a login link.
  if (gymSlugParam) {
    const admin = createAdminClient()
    const { data: gym } = await admin
      .from('gyms')
      .select('id')
      .eq('slug', gymSlugParam)
      .maybeSingle()

    if (gym) {
      const { data: profile } = await admin
        .from('profiles')
        .select('gym_id, created_at')
        .eq('id', user.id)
        .maybeSingle()

      const createdAt = profile?.created_at
        ? new Date(profile.created_at).getTime()
        : 0
      const isFresh = Date.now() - createdAt < FRESH_PROFILE_WINDOW_MS

      if (profile && isFresh && profile.gym_id !== gym.id) {
        await admin
          .from('profiles')
          .update({ gym_id: gym.id, role: ROLES.MEMBER })
          .eq('id', user.id)
      }
    }
  }

  // Resolve the destination: explicit `next` wins (used by the recovery
  // flow), otherwise pick the role-appropriate landing page.
  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.redirect(
    `${origin}${dashboardPathForRole(profile?.role ?? ROLES.OWNER)}`,
  )
}
