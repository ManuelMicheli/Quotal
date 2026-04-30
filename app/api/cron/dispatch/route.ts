/**
 * POST /api/cron/dispatch
 *
 * Generic dispatch endpoint — Supabase Edge Functions, pg_cron, or any
 * external scheduler can POST a JSON body matching `DispatchInput` and
 * the dispatcher will fan out the notification (with idempotency).
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`.
 *
 * Body:
 * ```json
 * {
 *   "type": "expiry_7d",
 *   "recipient_id": "<uuid>",
 *   "subscription_id": "<uuid>",
 *   "data": { "end_date": "2026-05-06", "plan": { "name": "Mensile" } },
 *   "channels": ["email", "push"]
 * }
 * ```
 */
import 'server-only'

import { NextResponse } from 'next/server'

import { checkCronAuth } from '@/lib/notifications/cron-auth'
import { dispatchNotification } from '@/lib/notifications/dispatcher'
import {
  ALL_NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationType,
} from '@/lib/notifications/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  type: NotificationType
  recipient_id: string
  subscription_id?: string | null
  data?: Record<string, unknown>
  channels?: readonly NotificationChannel[]
  force?: boolean
}

function isValidBody(value: unknown): value is Body {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.recipient_id !== 'string') return false
  if (typeof v.type !== 'string') return false
  if (!ALL_NOTIFICATION_TYPES.includes(v.type as NotificationType)) return false
  return true
}

export async function POST(req: Request): Promise<Response> {
  const auth = checkCronAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Body JSON non valido.' },
      { status: 400 },
    )
  }
  if (!isValidBody(body)) {
    return NextResponse.json(
      { ok: false, error: 'Body deve includere `type` valido e `recipient_id`.' },
      { status: 400 },
    )
  }

  const result = await dispatchNotification(body)
  return NextResponse.json({ ok: true, result }, { status: 200 })
}
