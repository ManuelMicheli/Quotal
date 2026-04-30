/**
 * Web push helpers — wraps `web-push` and the Supabase admin client.
 *
 * Server-only. Lazy-configures the VAPID details so the project still
 * builds with placeholder env values. Send is a no-op (returns 0/0) when
 * the keys aren't set.
 */
import 'server-only'

import webpush from 'web-push'

import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

import type { NotificationType } from './types'

let configured = false

function ensureConfigured() {
  if (configured) return true
  if (
    !env.VAPID_PRIVATE_KEY ||
    !env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !env.RESEND_REPLY_TO
  ) {
    return false
  }
  webpush.setVapidDetails(
    `mailto:${env.RESEND_REPLY_TO}`,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  )
  configured = true
  return true
}

export function isPushConfigured(): boolean {
  return Boolean(
    env.VAPID_PRIVATE_KEY &&
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      env.RESEND_REPLY_TO,
  )
}

type PushCopy = { title: string; body: string; url?: string }

const DEFAULT_TITLE: Record<NotificationType, string> = {
  welcome: 'Benvenuto!',
  expiry_7d: 'Abbonamento in scadenza',
  expiry_3d: 'Solo 3 giorni rimasti',
  expiry_today: "Oggi è l'ultimo giorno",
  post_expiry_3d: 'Abbonamento scaduto',
  sepa_failed: 'Addebito SEPA non riuscito',
  sepa_succeeded: 'Pagamento ricevuto',
  receipt: 'Nuova ricevuta disponibile',
  subscription_renewed: 'Abbonamento rinnovato',
  subscription_suspended: 'Abbonamento sospeso',
  subscription_resumed: 'Abbonamento riattivato',
  daily_digest_owner: 'Riepilogo giornaliero',
  payment_failed_owner: 'Pagamento fallito',
  new_member_owner: 'Nuovo membro',
  monthly_owner_report: 'Report mensile pronto',
}

const DEFAULT_LINK: Partial<Record<NotificationType, string>> = {
  expiry_7d: '/app/abbonamento',
  expiry_3d: '/app/abbonamento/rinnova',
  expiry_today: '/app/abbonamento/rinnova',
  post_expiry_3d: '/app/abbonamento/rinnova',
  receipt: '/app/pagamenti',
  sepa_failed: '/app/profilo',
  sepa_succeeded: '/app',
  welcome: '/app',
  subscription_renewed: '/app',
  subscription_suspended: '/app',
  subscription_resumed: '/app',
  daily_digest_owner: '/dashboard',
  payment_failed_owner: '/dashboard/pagamenti',
  new_member_owner: '/dashboard/membri',
  monthly_owner_report: '/dashboard/pagamenti',
}

function defaultBody(type: NotificationType): string {
  switch (type) {
    case 'expiry_7d':
      return 'Il tuo abbonamento scade tra 7 giorni. Rinnova ora.'
    case 'expiry_3d':
      return 'Solo 3 giorni rimasti. Rinnova in un tap.'
    case 'expiry_today':
      return "Da domani l'accesso non sarà più garantito."
    case 'post_expiry_3d':
      return 'Riattiva il tuo abbonamento per tornare ad allenarti.'
    case 'sepa_failed':
      return 'Aggiorna il metodo di pagamento.'
    case 'sepa_succeeded':
      return 'Abbiamo ricevuto il pagamento. Grazie!'
    case 'receipt':
      return 'Trovi il dettaglio nella sezione Pagamenti.'
    case 'welcome':
      return 'Apri la tua app per vedere il QR di accesso.'
    case 'subscription_renewed':
      return 'Il tuo abbonamento è stato rinnovato.'
    case 'subscription_suspended':
      return 'Il tuo abbonamento è in pausa.'
    case 'subscription_resumed':
      return 'Bentornato — il tuo abbonamento è attivo.'
    case 'daily_digest_owner':
      return 'Apri la dashboard per le scadenze di oggi.'
    case 'payment_failed_owner':
      return 'Un addebito non è andato a buon fine.'
    case 'new_member_owner':
      return 'Una nuova persona si è registrata.'
    case 'monthly_owner_report':
      return 'Il report del mese è disponibile.'
  }
}

/**
 * Send a push notification to every subscription registered for the
 * given member. Failed endpoints (HTTP 404 / 410) are pruned from the
 * `push_subscriptions` table so the next call doesn't keep retrying.
 *
 * Returns counters; never throws (a failed push must not break the
 * caller dispatch flow).
 */
export async function sendPushNotification(
  memberId: string,
  type: NotificationType,
  data: PushCopy = {
    title: DEFAULT_TITLE[type],
    body: defaultBody(type),
    url: DEFAULT_LINK[type],
  },
): Promise<{ sent: number; failed: number; pruned: number }> {
  if (!ensureConfigured()) {
    return { sent: 0, failed: 0, pruned: 0 }
  }
  const admin = createAdminClient()
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('member_id', memberId)

  if (error || !subs || subs.length === 0) {
    return { sent: 0, failed: 0, pruned: 0 }
  }

  const payload = JSON.stringify({
    title: data.title || DEFAULT_TITLE[type],
    body: data.body || defaultBody(type),
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    data: { url: data.url || DEFAULT_LINK[type] || '/app' },
  })

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh_key, auth: s.auth_key },
        },
        payload,
      ),
    ),
  )

  let sent = 0
  let failed = 0
  let pruned = 0
  const toPrune: string[] = []
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!
    const sub = subs[i]!
    if (r.status === 'fulfilled') {
      sent++
    } else {
      failed++
      const err = r.reason as { statusCode?: number } | undefined
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        toPrune.push(sub.id)
      }
    }
  }
  if (toPrune.length > 0) {
    const { error: delErr } = await admin
      .from('push_subscriptions')
      .delete()
      .in('id', toPrune)
    if (!delErr) pruned = toPrune.length
  }
  return { sent, failed, pruned }
}
