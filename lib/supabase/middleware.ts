/**
 * Session-refresh middleware helper for Supabase.
 *
 * Called from the root `middleware.ts`. Reads the incoming request cookies,
 * lets `@supabase/ssr` refresh the session if needed, and propagates any
 * updated cookies to the outgoing `NextResponse`.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { env } from '@/lib/env'
import type { Database } from '@/lib/supabase/types'

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
  // We swallow network errors so a transient auth failure (or unconfigured
  // Supabase project, e.g. before Phase 02) doesn't 500 every request.
  try {
    await supabase.auth.getUser()
  } catch {
    // best-effort session refresh
  }

  return supabaseResponse
}
