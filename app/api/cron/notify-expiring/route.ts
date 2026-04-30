/**
 * POST /api/cron/notify-expiring
 *
 * Daily job (intended cadence: 09:00 Europe/Rome). Walks every active
 * subscription, computes days-to-expiry, and dispatches the matching
 * reminder template:
 *   -  7d ahead → expiry_7d
 *   -  3d ahead → expiry_3d
 *   -  0d (today) → expiry_today
 *   -  3d after  → post_expiry_3d
 *
 * Idempotency is handled by `dispatchNotification` via the
 * `notifications_sent` unique index on (subscription_id, type), so
 * re-running the cron is safe.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`.
 *
 * The endpoint deliberately does NOT trigger SEPA renewals — that's a
 * separate cron (`/api/cron/retry-sepa`) which can run independently.
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { checkCronAuth } from '@/lib/notifications/cron-auth'
import { dispatchNotification } from '@/lib/notifications/dispatcher'
import type { NotificationType } from '@/lib/notifications/types'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ScanResult = {
  scanned_dates: { offset: number; date: string; type: NotificationType }[]
  candidates: number
  dispatched: number
  skipped: number
  errors: number
}

function isoOffsetDate(days: number): string {
  // "today" in Europe/Rome at noon UTC, then offset.
  const now = new Date()
  const utc = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + days,
    ),
  )
  return utc.toISOString().slice(0, 10)
}

const PRE_OFFSETS: { days: number; type: NotificationType }[] = [
  { days: 7, type: 'expiry_7d' },
  { days: 3, type: 'expiry_3d' },
  { days: 0, type: 'expiry_today' },
]
const POST_OFFSETS: { days: number; type: NotificationType }[] = [
  { days: -3, type: 'post_expiry_3d' },
]

export async function POST(req: Request): Promise<Response> {
  const auth = checkCronAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  // Optional dry-run: ?dry=1 logs what would be sent without dispatching.
  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry') === '1'

  const admin = createAdminClient()
  const result: ScanResult = {
    scanned_dates: [],
    candidates: 0,
    dispatched: 0,
    skipped: 0,
    errors: 0,
  }

  // Pre-expiry: subscriptions with end_date matching exactly today + offset.
  for (const { days, type } of PRE_OFFSETS) {
    const date = isoOffsetDate(days)
    result.scanned_dates.push({ offset: days, date, type })
    const { data: subs, error } = await admin
      .from('subscriptions')
      .select('id, member_id, end_date, plan:subscription_plans(name)')
      .eq('status', 'active')
      .eq('end_date', date)
    if (error) {
      console.error('[cron/notify-expiring] subscriptions query failed', error)
      result.errors++
      continue
    }
    if (!subs) continue
    result.candidates += subs.length
    if (dryRun) continue
    for (const sub of subs) {
      const r = await dispatchNotification({
        type,
        recipient_id: sub.member_id,
        subscription_id: sub.id,
        data: {
          end_date: sub.end_date,
          plan: sub.plan ?? null,
        },
        channels: ['email', 'push'],
      })
      if ('sent' in r) result.dispatched++
      else if ('skipped' in r) result.skipped++
      else result.errors++
    }
  }

  // Post-expiry: subscriptions whose end_date was N days ago.
  for (const { days, type } of POST_OFFSETS) {
    const date = isoOffsetDate(days)
    result.scanned_dates.push({ offset: days, date, type })
    const { data: subs, error } = await admin
      .from('subscriptions')
      .select('id, member_id, end_date, plan:subscription_plans(name)')
      .in('status', ['active', 'expired'])
      .eq('end_date', date)
    if (error) {
      console.error('[cron/notify-expiring] post-expiry query failed', error)
      result.errors++
      continue
    }
    if (!subs) continue
    result.candidates += subs.length
    if (dryRun) continue
    for (const sub of subs) {
      const r = await dispatchNotification({
        type,
        recipient_id: sub.member_id,
        subscription_id: sub.id,
        data: {
          end_date: sub.end_date,
          plan: sub.plan ?? null,
        },
        channels: ['email', 'push'],
      })
      if ('sent' in r) result.dispatched++
      else if ('skipped' in r) result.skipped++
      else result.errors++
    }
  }

  return NextResponse.json({ ok: true, dry: dryRun, ...result })
}
