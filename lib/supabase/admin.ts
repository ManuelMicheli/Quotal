/**
 * Supabase admin client — service-role JWT.
 *
 * **NEVER import this from client code.** It bypasses Row Level Security and
 * grants full DB access. The `server-only` import will fail loudly if some
 * future client component tries to pull it in.
 *
 * Used by:
 *   - `app/(auth)/onboarding-titolare/page.tsx` — to create the very first
 *     owner via `auth.admin.createUser()` with `email_confirm: true`.
 *
 * No other code path needs service-role today; signup, login, password reset,
 * and session refresh all work fine with the anon key + RLS.
 */
import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { env } from '@/lib/env'
import type { Database } from '@/lib/supabase/types'

/**
 * Lazy factory — defers reading the service-role key until the function is
 * actually called. Lets the rest of the app build/run even when the key is
 * still a placeholder, as long as no admin flow is triggered.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
