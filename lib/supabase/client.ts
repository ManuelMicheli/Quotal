/**
 * Supabase client for the browser (Client Components).
 *
 * Uses the public anon key. Cookies are managed by `@supabase/ssr` so the
 * session stays in sync with the server-side client.
 */
import { createBrowserClient } from '@supabase/ssr'

import { env } from '@/lib/env'
import type { Database } from '@/lib/supabase/types'

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
