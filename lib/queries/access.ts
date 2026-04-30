/**
 * Server-only queries for the owner-side access-control UI.
 *
 * Uses the SSR Supabase client so RLS scopes results to the caller's gym.
 * Functions never throw — they return safe defaults and log errors for the
 * developer.
 */
import 'server-only'

import type { AccessDevice } from '@/lib/domain-types'
import { createClient } from '@/lib/supabase/server'

export async function getAccessDevices(): Promise<AccessDevice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('access_devices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    if (error) {
      console.error('[queries/access] getAccessDevices failed:', error.message)
    }
    return []
  }
  return data
}
