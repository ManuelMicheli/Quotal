/**
 * POST /api/webhooks/resend
 *
 * Receives delivery-status events from Resend (`email.delivered`,
 * `email.bounced`, `email.complained`, `email.opened`, etc.) and
 * updates the matching `notifications_sent` row by `resend_message_id`.
 *
 * If `RESEND_WEBHOOK_SECRET` is set, the request is authenticated via
 * the Svix-style signature header Resend uses (HMAC-SHA256 over
 * `webhook-id.webhook-timestamp.body`). When the secret is unset, the
 * endpoint accepts requests unconditionally — useful in dev, must be
 * configured in production.
 */
import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ResendEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    [k: string]: unknown
  }
}

/**
 * Verify the Svix-style signature Resend sends. Header values:
 *   - svix-id: webhook event id
 *   - svix-timestamp: unix seconds (string)
 *   - svix-signature: "v1,<base64>" possibly comma-separated
 *
 * The signed payload is `${id}.${timestamp}.${body}`.
 */
function verifySignature(
  body: string,
  headers: Headers,
  secret: string,
): boolean {
  const id = headers.get('svix-id') ?? headers.get('webhook-id')
  const timestamp =
    headers.get('svix-timestamp') ?? headers.get('webhook-timestamp')
  const signature =
    headers.get('svix-signature') ?? headers.get('webhook-signature')
  if (!id || !timestamp || !signature) return false

  // Resend ships the secret with a `whsec_` prefix; strip it.
  const cleanSecret = secret.startsWith('whsec_')
    ? secret.slice('whsec_'.length)
    : secret
  let secretBytes: Buffer
  try {
    secretBytes = Buffer.from(cleanSecret, 'base64')
  } catch {
    return false
  }

  const signed = `${id}.${timestamp}.${body}`
  const expected = createHmac('sha256', secretBytes)
    .update(signed)
    .digest('base64')

  // Header is "v1,<sig> v1,<sig2> …" — any one matching is OK.
  for (const part of signature.split(' ')) {
    const [, sig] = part.split(',')
    if (!sig) continue
    try {
      const a = Buffer.from(sig, 'base64')
      const b = Buffer.from(expected, 'base64')
      if (a.length === b.length && timingSafeEqual(a, b)) return true
    } catch {
      // ignore malformed sig entries
    }
  }
  return false
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.text()

  if (env.RESEND_WEBHOOK_SECRET) {
    const ok = verifySignature(body, req.headers, env.RESEND_WEBHOOK_SECRET)
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: 'Firma webhook non valida.' },
        { status: 401 },
      )
    }
  }

  let event: ResendEvent
  try {
    event = JSON.parse(body) as ResendEvent
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Body JSON non valido.' },
      { status: 400 },
    )
  }

  const messageId = event.data?.email_id
  if (!messageId || !event.type) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('notifications_sent')
    .update({
      delivery_status: event.type,
      delivery_updated_at: new Date().toISOString(),
    })
    .eq('resend_message_id', messageId)

  if (error) {
    console.error('[webhooks/resend] update failed', error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    )
  }
  return NextResponse.json({ ok: true })
}
