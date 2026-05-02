/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * Reads/writes the Next.js cookie store via `next/headers`. Wrap the cookie
 * setter in try/catch — Server Components are not allowed to mutate cookies
 * and would otherwise throw on every render where a session refresh happens.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

import { env } from '@/lib/env'
import type { Database } from '@/lib/supabase/types'

/**
 * Build a Supabase server client.
 *
 * Wrapped in `react.cache` so a single render that touches multiple query
 * helpers (layout + page + server actions) reuses one client + cookie-store
 * instance instead of allocating a fresh one each time.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // `cookies().set` throws when called from a Server Component.
            // Safe to ignore: the middleware refreshes the session on the
            // next request.
          }
        },
      },
    },
  )
})
