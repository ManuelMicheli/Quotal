/**
 * POST /api/cron/update-expired
 *
 * Wraps the SQL helper `public.update_expired_subscriptions()` so it
 * can be run from any HTTP scheduler. Intended cadence: 00:30
 * Europe/Rome. Marks subscriptions whose end_date + grace_period has
 * passed as `expired`.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`.
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { checkCronAuth } from '@/lib/notifications/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  const auth = checkCronAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }
  const admin = createAdminClient()
  const { error } = await admin.rpc('update_expired_subscriptions')
  if (error) {
    console.error('[cron/update-expired] rpc failed', error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    )
  }
  return NextResponse.json({ ok: true })
}
