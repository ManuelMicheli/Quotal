/**
 * Member PWA home — `/app`.
 *
 * Server component. Pulls everything the hero needs in one
 * `getMemberHomeData()` call so the page paints with no client fetches
 * on the critical path.
 *
 * Responsive layout:
 *   - Phone: stacked single column.
 *   - Tablet+: hero greeting full width, then 12-col grid (status 7, QR 5),
 *     metadata sections aligned in the right column.
 */
import {
  ArrowUpRightIcon,
  CalendarClockIcon,
  CreditCardIcon,
  DoorOpenIcon,
  ReceiptIcon,
} from 'lucide-react'
import Link from 'next/link'

import { QrCodeCard } from '@/components/member/qr-code-card'
import { SubscriptionStatusCard } from '@/components/member/subscription-status-card'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { requireMember } from '@/lib/auth'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/format'
import { getMemberHomeData } from '@/lib/queries/member'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Home',
}

function italianGreeting(): string {
  const hour = Number.parseInt(
    new Intl.DateTimeFormat('it-IT', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Rome',
    }).format(new Date()),
    10,
  )
  if (hour >= 5 && hour < 12) return 'Buongiorno'
  if (hour >= 12 && hour < 18) return 'Buon pomeriggio'
  if (hour >= 18 && hour < 24) return 'Buonasera'
  return 'Buonanotte'
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  }).format(new Date())
}

export default async function MemberHomePage() {
  const profile = await requireMember()
  const data = await getMemberHomeData(profile.id)

  const grantsAccess =
    data.status === 'active' ||
    data.status === 'expiring_soon' ||
    data.status === 'grace_period'

  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="flex flex-col gap-5 md:gap-8 lg:gap-10">
      <header className="flex items-start justify-between gap-3 pt-2 md:pt-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:text-xs">
            {todayLabel()}
          </p>
          <h1 className="mt-2 font-display text-[2.4rem] leading-[1.05] tracking-tight text-balance md:mt-3 md:text-6xl lg:text-7xl">
            {italianGreeting()},{' '}
            <span className="italic text-muted-foreground">{firstName}</span>
          </h1>
          {data.gym?.name ? (
            <p className="mt-1.5 text-sm text-muted-foreground md:mt-3 md:text-base">
              {data.gym.name}
            </p>
          ) : null}
        </div>
        <ThemeToggle className="mt-1 shrink-0 md:hidden" />
      </header>

      <div className="grid gap-5 md:grid-cols-12 md:gap-6 lg:gap-8">
        <div className="md:col-span-7">
          <SubscriptionStatusCard data={data} />
        </div>
        <div className="md:col-span-5">
          <QrCodeCard
            initialFullName={data.profile.full_name}
            isAccessAllowed={grantsAccess}
          />
        </div>

        {data.sepaMandate && data.subscription?.auto_renew ? (
          <section className="ring-soft rounded-3xl bg-card p-5 md:col-span-7 md:p-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-[color:var(--accent)] md:h-12 md:w-12">
                <CreditCardIcon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground md:text-xs">
                  Prossimo addebito SEPA
                </p>
                <p className="mt-1 text-sm leading-snug md:text-base">
                  Il{' '}
                  <span className="font-semibold">
                    {formatDate(data.subscription.end_date, 'long')}
                  </span>{' '}
                  verranno addebitati{' '}
                  <span className="tabular font-semibold">
                    {formatCurrency(data.subscription.plan.price_cents)}
                  </span>{' '}
                  dal conto IBAN ****
                  <span className="tabular">{data.sepaMandate.iban_last4}</span>.
                </p>
                <Link
                  href="/app/pagamenti/portal"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--accent)] hover:underline md:text-sm"
                >
                  Modifica metodo
                  <ArrowUpRightIcon size={12} />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {data.lastAccess || data.lastPayment || data.subscription ? (
          <section className="ring-soft overflow-hidden rounded-3xl bg-card md:col-span-5 md:row-span-2">
            <p className="px-5 pt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground md:px-6 md:pt-5 md:text-xs">
              Attività recente
            </p>
            <ul className="divide-y divide-border/60">
              {data.lastAccess ? (
                <li>
                  <div className="flex items-center gap-3 px-5 py-4 md:px-6 md:py-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted md:h-11 md:w-11">
                      <DoorOpenIcon size={18} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium md:text-base">
                        Ultimo ingresso
                      </p>
                      <p className="truncate text-xs text-muted-foreground md:text-sm">
                        {formatRelativeDate(data.lastAccess.accessed_at)} ·{' '}
                        {data.lastAccess.granted ? 'consentito' : 'negato'}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={
                        'inline-block size-2 rounded-full ' +
                        (data.lastAccess.granted
                          ? 'bg-success'
                          : 'bg-destructive')
                      }
                    />
                  </div>
                </li>
              ) : null}
              {data.lastPayment ? (
                <li>
                  <Link
                    href="/app/pagamenti"
                    className="tap-shrink flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40 md:px-6 md:py-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted md:h-11 md:w-11">
                      <ReceiptIcon size={18} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium md:text-base">
                        Ultimo pagamento
                      </p>
                      <p className="truncate text-xs text-muted-foreground md:text-sm">
                        <span className="tabular">
                          {formatCurrency(
                            Math.abs(data.lastPayment.amount_cents),
                          )}
                        </span>{' '}
                        ·{' '}
                        {formatRelativeDate(
                          data.lastPayment.paid_at ?? data.lastPayment.created_at,
                        )}
                      </p>
                    </div>
                    <ArrowUpRightIcon
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                  </Link>
                </li>
              ) : null}
              {data.subscription ? (
                <li>
                  <Link
                    href="/app/abbonamento"
                    className="tap-shrink flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40 md:px-6 md:py-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted md:h-11 md:w-11">
                      <CalendarClockIcon
                        size={18}
                        className="text-muted-foreground"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium md:text-base">
                        Dettagli abbonamento
                      </p>
                      <p className="truncate text-xs text-muted-foreground md:text-sm">
                        {data.subscription.plan.name} · scade{' '}
                        {formatDate(data.subscription.end_date, 'short')}
                      </p>
                    </div>
                    <ArrowUpRightIcon
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
