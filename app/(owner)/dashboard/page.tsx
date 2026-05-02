/**
 * Home dashboard.
 *
 * Server component. All KPI numbers are rendered server-side from a single
 * pass of parallel SELECTs — no client fetch. Animations are scoped to the
 * KPI cards (Framer Motion stagger).
 */
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  PlusIcon,
  ReceiptIcon,
} from 'lucide-react'
import Link from 'next/link'

import { CashPaymentDialog } from '@/components/owner/cash-payment-dialog'
import { ExportPaymentsButton } from '@/components/owner/export-payments-button'
import { KpiCard } from '@/components/owner/kpi-card'
import { OnboardingCoach } from '@/components/owner/onboarding-coach'
import { PaymentMethodBadge } from '@/components/owner/payment-method-badge'
import { EmptyState } from '@/components/shared/empty-state'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getActiveSubscriptionPlans,
  getDashboardKPIs,
  getExpiringSoon,
  getRecentFailedPayments,
  getRecentPayments,
} from '@/lib/queries/owner'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/utils'

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function badgeForDays(
  days: number,
): { label: string; variant: 'destructive' | 'warning' | 'success' } {
  if (days <= 0) return { label: 'Scaduto oggi', variant: 'destructive' }
  if (days <= 3)
    return {
      label: `${days} ${days === 1 ? 'giorno' : 'giorni'}`,
      variant: 'warning',
    }
  return { label: `${days} giorni`, variant: 'success' }
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Buona notte'
  if (h < 12) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

export default async function DashboardHomePage() {
  const [kpis, expiring, recentPayments, failedPayments, plans] = await Promise.all([
    getDashboardKPIs(),
    getExpiringSoon(7),
    getRecentPayments(5),
    getRecentFailedPayments({ days: 7, limit: 5 }),
    getActiveSubscriptionPlans(),
  ])

  const isFirstTime = kpis.totalMembers === 0

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {isFirstTime ? <OnboardingCoach /> : null}

      <PageHeader className="border-b-0 pb-0">
        <PageHeaderContent>
          <PageHeaderEyebrow>Panoramica</PageHeaderEyebrow>
          <PageHeaderHeading className="font-display text-balance text-3xl font-normal leading-[1.05] tracking-tight md:text-5xl lg:text-[3.25rem]">
            {greeting()},{' '}
            <span className="italic text-muted-foreground">
              andiamo a vedere com&apos;è andata.
            </span>
          </PageHeaderHeading>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild size="sm">
            <Link href="/dashboard/membri/nuovo">
              <PlusIcon className="size-4" />
              Nuovo membro
            </Link>
          </Button>
          <CashPaymentDialog
            plans={plans}
            mode={{ kind: 'picker' }}
            trigger={
              <Button variant="outline" size="sm">
                <PlusIcon className="size-4" />
                Pagamento contanti
              </Button>
            }
          />
          <ExportPaymentsButton />
        </PageHeaderActions>
      </PageHeader>

      {/* KPI cards */}
      <section className="grid gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
        <KpiCard
          title="Incasso del mese"
          value={formatCurrency(kpis.monthRevenueCents)}
          delay={0}
          trend={kpis.revenueDeltaPct ?? null}
          subtitle={
            <RevenueDelta
              deltaPct={kpis.revenueDeltaPct}
              lastMonthCents={kpis.lastMonthRevenueCents}
            />
          }
          sparkline={kpis.monthSparkline}
          emphasize
        />
        <KpiCard
          title="Membri attivi"
          value={kpis.activeMembers.toString()}
          delay={0.06}
          subtitle={
            <div className="flex flex-col gap-0.5">
              <span>
                Su {kpis.totalMembers}{' '}
                {kpis.totalMembers === 1 ? 'totale' : 'totali'}
              </span>
              <span className="text-xs text-muted-foreground/70">
                {kpis.activeMembers} attivi · {kpis.expiringMembers} in scadenza ·{' '}
                {kpis.suspendedMembers} sospesi
              </span>
            </div>
          }
        />
        <KpiCard
          title="Ingressi oggi"
          value={kpis.todayEntries.toString()}
          delay={0.12}
          subtitle={
            kpis.peakHour !== null && kpis.todayEntries > 0
              ? `Picco alle ${kpis.peakHour
                  .toString()
                  .padStart(2, '0')}:00`
              : 'Nessun ingresso registrato'
          }
          bars={kpis.hourlyEntries}
        />
      </section>

      {/* Expiring + recent payments */}
      <section className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-warning-soft text-warning">
                <CalendarClockIcon className="size-4" />
              </div>
              <CardTitle>Scadenze prossime 7 giorni</CardTitle>
            </div>
            <Badge variant="outline">{expiring.length}</Badge>
          </CardHeader>
          <CardContent className="flex-1">
            {expiring.length === 0 ? (
              <EmptyState
                size="sm"
                icon={<CalendarClockIcon />}
                title="Tutto sotto controllo"
                description="Nessuna scadenza nei prossimi 7 giorni."
                className="py-6"
              />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {expiring.slice(0, 6).map((row) => {
                  const badge = badgeForDays(row.daysRemaining)
                  return (
                    <li
                      key={row.subscription.id}
                      className="group/exp relative flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/60"
                    >
                      <Avatar className="size-9 shrink-0 ring-1 ring-border/60">
                        {row.member.avatar_url ? (
                          <AvatarImage
                            src={row.member.avatar_url}
                            alt={row.member.full_name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {initialsFor(row.member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dashboard/membri/${row.member.id}`}
                          className="block truncate text-sm font-semibold tracking-tight outline-none transition-colors group-hover/exp:text-accent focus-visible:underline"
                        >
                          {row.member.full_name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.subscription.plan.name} · scade{' '}
                          {formatDate(row.subscription.end_date, 'short')}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/dashboard/membri/${row.member.id}?action=renew`}
                        >
                          Rinnova
                        </Link>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Link
              href="/dashboard/abbonamenti?filter=expiring"
              className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              Vedi tutte
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-accent-soft text-accent">
                <ReceiptIcon className="size-4" />
              </div>
              <CardTitle>Ultimi pagamenti</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {recentPayments.length === 0 ? (
              <EmptyState
                size="sm"
                icon={<ReceiptIcon />}
                title="Nessun pagamento"
                description="I pagamenti registrati appariranno qui."
                className="py-6"
              />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {recentPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight">
                        {p.member?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(p.paid_at ?? p.created_at)}
                      </p>
                    </div>
                    <span className="number text-sm font-semibold">
                      {formatCurrency(p.amount_cents)}
                    </span>
                    <PaymentMethodBadge method={p.payment_method} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Link
              href="/dashboard/pagamenti"
              className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              Vedi tutti
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </CardFooter>
        </Card>
      </section>

      {failedPayments.length > 0 ? (
        <section>
          <Card tone="destructive">
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangleIcon className="size-4" />
                Da gestire — pagamenti falliti (ultimi 7 giorni)
              </CardTitle>
              <Badge variant="destructive">{failedPayments.length}</Badge>
            </CardHeader>
            <CardContent>
              <ul className="-mx-2 flex flex-col">
                {failedPayments.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-destructive/5',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/membri/${p.member_id}`}
                        className="block truncate text-sm font-semibold tracking-tight hover:underline"
                      >
                        {p.member?.full_name ?? '—'}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatRelativeDate(p.created_at)} ·{' '}
                        {p.failure_reason ?? 'Errore generico'}
                      </p>
                    </div>
                    <span className="number text-sm font-semibold">
                      {formatCurrency(p.amount_cents)}
                    </span>
                    <PaymentMethodBadge method={p.payment_method} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/membri/${p.member_id}`}>Apri</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  )
}

function RevenueDelta({
  deltaPct,
  lastMonthCents,
}: {
  deltaPct: number | null
  lastMonthCents: number
}) {
  if (deltaPct === null) {
    return <span>vs mese scorso: {formatCurrency(lastMonthCents)}</span>
  }
  return <span>vs mese scorso: {formatCurrency(lastMonthCents)}</span>
}
