/**
 * Subject line builder — kept in its own file so both the dispatcher
 * and any future preview tooling can format subjects without rendering
 * the full template.
 *
 * All copy in Italian; use placeholders sparingly (subjects > 70 chars
 * get truncated by Gmail/iOS Mail).
 */
import { formatCurrency, formatDate } from '@/lib/format'

import type { NotificationType } from './types'

export type SubjectContext = {
  gym_name: string
  member_name?: string | null
  amount_cents?: number | null
  end_date?: string | null
  receipt_number?: string | null
  failed_member_name?: string | null
  for_date?: string | null
  month_label?: string | null
}

export function buildSubject(
  type: NotificationType,
  ctx: SubjectContext,
): string {
  const gym = ctx.gym_name
  switch (type) {
    case 'welcome':
      return `Benvenuto in ${gym}!`
    case 'expiry_7d':
      return `Il tuo abbonamento scade tra 7 giorni`
    case 'expiry_3d':
      return `Solo 3 giorni: rinnova il tuo abbonamento`
    case 'expiry_today':
      return `Ultimo giorno per rinnovare l'abbonamento`
    case 'post_expiry_3d':
      return `Il tuo abbonamento è scaduto — riattivalo`
    case 'sepa_failed':
      return `Addebito SEPA non riuscito`
    case 'sepa_succeeded':
      return `Pagamento ricevuto — abbonamento rinnovato`
    case 'receipt':
      return ctx.receipt_number
        ? `Ricevuta ${ctx.receipt_number}`
        : `Ricevuta del tuo pagamento`
    case 'subscription_renewed':
      return ctx.end_date
        ? `Abbonamento rinnovato fino al ${formatDate(ctx.end_date, 'long')}`
        : `Abbonamento rinnovato`
    case 'subscription_suspended':
      return `Il tuo abbonamento è stato sospeso`
    case 'subscription_resumed':
      return `Il tuo abbonamento è stato riattivato`
    case 'daily_digest_owner':
      return ctx.for_date
        ? `Riepilogo del ${formatDate(ctx.for_date, 'short')} — ${gym}`
        : `Riepilogo giornaliero — ${gym}`
    case 'payment_failed_owner':
      return `Pagamento fallito — ${ctx.failed_member_name ?? 'un membro'}${
        ctx.amount_cents != null ? ` (${formatCurrency(ctx.amount_cents)})` : ''
      }`
    case 'new_member_owner':
      return `Nuovo membro: ${ctx.member_name ?? 'iscritto'}`
    case 'monthly_owner_report':
      return ctx.month_label
        ? `Report ${ctx.month_label} — ${gym}`
        : `Report mensile — ${gym}`
  }
}
