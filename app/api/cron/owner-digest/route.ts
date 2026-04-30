/**
 * POST /api/cron/owner-digest
 *
 * Daily owner digest. For every gym, computes today's must-do items
 * (scadenze, pagamenti falliti, cassa da chiudere) and:
 *   1. inserts an `owner_notifications` row per owner/staff (bell-icon)
 *   2. dispatches `daily_digest_owner` email to each (idempotent per
 *      day via the partial unique index in `notifications_sent`)
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`. Intended cadence: 08:00
 * Europe/Rome.
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { checkCronAuth } from '@/lib/notifications/cron-auth'
import { dispatchNotification } from '@/lib/notifications/dispatcher'
import { fanoutOwnerNotification } from '@/lib/notifications/owner-inbox'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isoOffsetDate(days: number): string {
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

export async function POST(req: Request): Promise<Response> {
  const auth = checkCronAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const today = isoOffsetDate(0)
  const sevenDays = isoOffsetDate(7)
  const yesterday = isoOffsetDate(-1)

  // Get every gym
  const { data: gyms, error: gymsError } = await admin.from('gyms').select('id')
  if (gymsError || !gyms) {
    return NextResponse.json(
      { ok: false, error: gymsError?.message ?? 'Errore caricamento gyms' },
      { status: 500 },
    )
  }

  const results: {
    gym_id: string
    expiring_today: number
    expiring_7d: number
    failed_payments: number
    pending_cash_close: boolean
    inboxed: number
    emails: number
  }[] = []

  for (const g of gyms) {
    // Counts
    const [todayRes, weekRes, failedRes, closeRes] = await Promise.all([
      admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', g.id)
        .eq('status', 'active')
        .eq('end_date', today),
      admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', g.id)
        .eq('status', 'active')
        .gte('end_date', today)
        .lte('end_date', sevenDays),
      admin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', g.id)
        .eq('status', 'failed')
        .gte('failed_at', `${yesterday}T00:00:00Z`),
      admin
        .from('daily_close_reports')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', g.id)
        .eq('close_date', yesterday),
    ])

    const expiring_today = todayRes.count ?? 0
    const expiring_7d = weekRes.count ?? 0
    const failed_payments = failedRes.count ?? 0
    // If no daily_close_reports row exists for yesterday and there were
    // any cash-method payments, treat the cash as still open.
    const pending_cash_close = (closeRes.count ?? 0) === 0

    const summary = {
      expiring_today,
      expiring_7d,
      failed_payments,
      pending_cash_close,
    }

    // Skip empty digests — no point bell-ringing on a quiet day.
    const totalActions = expiring_today + failed_payments
    if (totalActions === 0 && expiring_7d === 0) {
      results.push({ gym_id: g.id, ...summary, inboxed: 0, emails: 0 })
      continue
    }

    // 1. In-app fanout
    const fanout = await fanoutOwnerNotification(g.id, {
      type: 'member_subscription_expiring',
      title: `Riepilogo del ${today}`,
      body: `${expiring_today} scadenze oggi, ${expiring_7d} entro 7 giorni, ${failed_payments} pagamenti falliti`,
      link: '/dashboard',
    })

    // 2. Email per owner/staff
    const { data: owners } = await admin
      .from('profiles')
      .select('id')
      .eq('gym_id', g.id)
      .in('role', ['owner', 'staff'])

    let emails = 0
    for (const owner of owners ?? []) {
      const r = await dispatchNotification({
        type: 'daily_digest_owner',
        recipient_id: owner.id,
        data: {
          for_date: today,
          expiring_today,
          expiring_7d,
          failed_payments,
          pending_cash_close,
        },
      })
      if ('sent' in r) emails++
    }

    results.push({
      gym_id: g.id,
      ...summary,
      inboxed: fanout.inserted,
      emails,
    })
  }

  return NextResponse.json({ ok: true, gyms: results.length, results })
}
