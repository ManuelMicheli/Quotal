/**
 * POST /api/cron/purge-deleted-accounts
 *
 * Auto-processes GDPR Art. 17 deletion requests that have been pending for
 * more than 30 days. Mirrors the manual scrub performed by
 * `processAccountDeletionAction` (app/actions/legal.ts) — the titolare's
 * inbox at `/dashboard/impostazioni/gdpr-richieste` remains the primary
 * path; this cron just enforces the 30-day SLA when the inbox is ignored.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`. Intended cadence: 03:00
 * Europe/Rome, daily.
 *
 * Response body: `{ ok: true, processed: <count> }`.
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { checkCronAuth } from '@/lib/notifications/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RETENTION_DAYS = 30

export async function POST(req: Request): Promise<Response> {
  const auth = checkCronAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('process_expired_deletion_requests', {
    retention_days: RETENTION_DAYS,
  })

  if (error) {
    console.error('[cron/purge-deleted-accounts] rpc failed', error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    )
  }

  const processed = typeof data === 'number' ? data : 0
  return NextResponse.json({ ok: true, processed })
}
