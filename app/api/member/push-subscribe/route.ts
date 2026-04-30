/**
 * Member push subscription endpoint.
 *
 * POST /api/member/push-subscribe — body matches `pushSubscribeSchema`.
 *
 * Stores the web-push subscription in `push_subscriptions`. As of Phase
 * 09 the send pipeline is wired up via `lib/notifications/dispatcher.ts`,
 * but the UI still hides the "abilita notifiche" prompt when no VAPID
 * keypair is set (the SW would refuse to subscribe anyway).
 */
import { NextResponse } from 'next/server'

import { pushSubscribeAction } from '@/app/actions/member'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!env.VAPID_PRIVATE_KEY || !env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Notifiche push non ancora configurate per questa palestra.',
      },
      { status: 501 },
    )
  }
  const body = (await request.json().catch(() => null)) as unknown
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'Body JSON non valido.' },
      { status: 400 },
    )
  }
  const result = await pushSubscribeAction(body as never)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
