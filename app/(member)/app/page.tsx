/**
 * Member PWA home — `/app`.
 *
 * Server component. Pulls everything the hero needs in one
 * `getMemberHomeData()` call so the page paints with no client fetches
 * on the critical path. The QR card hydrates and starts polling the
 * `/api/member/qr` endpoint; the SW caches the response so the next
 * visit (online or offline) shows it immediately.
 *
 * Layout: vertical stack of cards, mobile-first, max-w-md.
 */
import { CalendarClockIcon, DoorOpenIcon } from 'lucide-react'
import Link from 'next/link'

import { QrCodeCard } from '@/components/member/qr-code-card'
import { SubscriptionStatusCard } from '@/components/member/subscription-status-card'
import { Button } from '@/components/ui/button'
import { requireMember } from '@/lib/auth'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/format'
import { getMemberHomeData } from '@/lib/queries/member'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Home',
}

export default async function MemberHomePage() {
  const profile = await requireMember()
  const data = await getMemberHomeData(profile.id)

  const grantsAccess =
    data.status === 'active' ||
    data.status === 'expiring_soon' ||
    data.status === 'grace_period'

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {data.gym?.name ?? 'La tua palestra'}
        </p>
        <h1 className="font-display text-3xl tracking-tight">
          Ciao, {profile.full_name.split(' ')[0]}
        </h1>
      </header>

      <SubscriptionStatusCard data={data} />

      <QrCodeCard
        initialFullName={data.profile.full_name}
        isAccessAllowed={grantsAccess}
      />

      {data.sepaMandate && data.subscription?.auto_renew ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prossimo addebito SEPA
          </p>
          <p className="mt-1 text-sm">
            Il{' '}
            <span className="font-semibold">
              {formatDate(data.subscription.end_date, 'long')}
            </span>{' '}
            verranno addebitati{' '}
            <span className="font-semibold">
              {formatCurrency(data.subscription.plan.price_cents)}
            </span>{' '}
            dal conto IBAN ****{data.sepaMandate.iban_last4}.
          </p>
          <div className="mt-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/pagamenti/portal">Modifica metodo</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {data.lastAccess ? (
        <section className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <DoorOpenIcon size={18} className="text-muted-foreground" />
          </div>
          <div className="text-sm">
            <p className="font-medium">Ultimo ingresso</p>
            <p className="text-muted-foreground">
              {formatRelativeDate(data.lastAccess.accessed_at)} —{' '}
              {data.lastAccess.granted ? 'consentito' : 'negato'}
            </p>
          </div>
        </section>
      ) : null}

      {data.lastPayment ? (
        <section className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <CalendarClockIcon size={18} className="text-muted-foreground" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium">Ultimo pagamento</p>
            <p className="text-muted-foreground">
              {formatCurrency(Math.abs(data.lastPayment.amount_cents))} ·{' '}
              {formatRelativeDate(
                data.lastPayment.paid_at ?? data.lastPayment.created_at,
              )}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/pagamenti">Tutti</Link>
          </Button>
        </section>
      ) : null}
    </div>
  )
}
