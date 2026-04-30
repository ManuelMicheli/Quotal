/**
 * Member push subscription endpoint.
 *
 * POST /api/member/push-subscribe — body matches `pushSubscribeSchema`.
 *
 * Stores the web-push subscription in `push_subscriptions`. The send
 * pipeline lives in Phase 09 — this endpoint exists now so the SW can
 * register on first install/permission grant without losing the data.
 *
 * Returns 501 if the gym hasn't configured a VAPID keypair yet, so the
 * UI can hide the "abilita notifiche" prompt until Phase 09 ships.
 */
import { NextResponse } from 'next/server'

import { pushSubscribeAction } from '@/app/actions/member'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!env.VAPID_PRIVATE_KEY) {
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
