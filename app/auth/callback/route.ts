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
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const explicitNext = searchParams.get('next')

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

  // Resolve the destination: explicit `next` wins (used by the recovery
  // flow), otherwise pick the role-appropriate landing page.
  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
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
