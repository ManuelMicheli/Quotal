/**
 * Session-refresh + auth gate middleware helper.
 *
 * Called from the root `middleware.ts`. Two responsibilities:
 *
 *   1. Refresh the Supabase session cookie if it's stale, so that downstream
 *      Server Components see a fresh `auth.getUser()`.
 *   2. Enforce a coarse-grained auth gate:
 *        - unauthenticated users are bounced from protected routes to /login
 *        - authenticated users hitting auth pages are bounced to their
 *          role-appropriate landing page
 *        - members hitting /dashboard get redirected to /app, and vice versa
 *
 * Server components MUST still call `requireProfile`/`requireOwnerOrStaff`
 * etc. as a second line of defence — middleware can be skipped under unusual
 * routing conditions.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { ROLES } from '@/lib/constants'
import { env } from '@/lib/env'
import type { Database } from '@/lib/supabase/types'

/** Paths reachable without an authenticated session. */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/update-password',
  '/onboarding-titolare',
  '/auth/callback',
] as const

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

function isAuthPage(pathname: string): boolean {
  // Pages where a *signed-in* user has no business being.
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/reset-password'
  )
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // IMPORTANT: do not run any logic between createServerClient and getUser.
  // Skipping this call breaks session refresh and silently logs users out.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] =
    null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // best-effort: a transient auth failure must not 500 every request.
  }

  const { pathname } = request.nextUrl
  const isWebhook = pathname.startsWith('/api/webhooks/')
  const isHealth = pathname === '/api/health'
  const isApiRoute = pathname.startsWith('/api/')

  // --- Unauthenticated requests ---------------------------------------------
  if (!user) {
    if (isPublicPath(pathname) || isWebhook || isHealth) {
      return supabaseResponse
    }

    // For API routes other than webhooks/health, return 401 instead of HTML
    // redirect — the caller is almost certainly not a browser.
    if (isApiRoute) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // --- Authenticated requests ----------------------------------------------
  // Skip the role check for API routes — server actions and route handlers
  // do their own auth via lib/auth.ts helpers.
  if (isApiRoute) return supabaseResponse

  // Look up the role once; reuse for both auth-page and route-guard checks.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? ROLES.OWNER
  const homeForRole = role === ROLES.MEMBER ? '/app' : '/dashboard'

  // 1. Logged-in users on auth pages → bounce home.
  if (isAuthPage(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = homeForRole
    url.search = ''
    return NextResponse.redirect(url)
  }

  // 2. Cross-area access → bounce to own area.
  if (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/')
  ) {
    if (role === ROLES.MEMBER) {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    if (role !== ROLES.MEMBER) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
