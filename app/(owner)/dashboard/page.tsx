/**
 * Home dashboard.
 *
 * Server component. All KPI numbers are rendered server-side from a single
 * pass of parallel SELECTs — no client fetch. Animations are scoped to the
 * KPI cards (Framer Motion stagger).
 */
import { AlertTriangleIcon, ArrowRightIcon, PlusIcon } from 'lucide-react'
import Link from 'next/link'

import { CashPaymentDialog } from '@/components/owner/cash-payment-dialog'
import { ExportPaymentsButton } from '@/components/owner/export-payments-button'
import { KpiCard } from '@/components/owner/kpi-card'
import { OnboardingCoach } from '@/components/owner/onboarding-coach'
import { PaymentMethodBadge } from '@/components/owner/payment-method-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

function badgeForDays(days: number): { label: string; className: string } {
  if (days <= 0)
    return {
      label: 'Scaduto oggi',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    }
  if (days <= 3)
    return {
      label: `${days} ${days === 1 ? 'giorno' : 'giorni'}`,
      className: 'bg-warning/10 text-warning border-warning/20',
    }
  return {
    label: `${days} giorni`,
    className: 'bg-success/10 text-success border-success/20',
  }
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
    <div className="flex flex-col gap-6 md:gap-8 lg:gap-10">
      {isFirstTime ? <OnboardingCoach /> : null}

      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:text-xs">
          Panoramica
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight md:text-5xl lg:text-6xl">
          Buongiorno,{' '}
          <span className="italic text-muted-foreground">
            andiamo a vedere com&apos;è andata.
          </span>
        </h1>
      </header>

      {/* KPI cards */}
      <section className="grid gap-4 md:grid-cols-3 md:gap-6 lg:gap-8">
        <KpiCard
          title="Incasso del mese"
          value={formatCurrency(kpis.monthRevenueCents)}
          delay={0}
          trend={kpis.revenueTrend}
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
          delay={0.08}
          subtitle={
            <span>
              Su {kpis.totalMembers}{' '}
              {kpis.totalMembers === 1 ? 'totale' : 'totali'}
              <br />
              <span className="text-xs">
                {kpis.activeMembers} attivi · {kpis.expiringMembers} in scadenza ·{' '}
                {kpis.suspendedMembers} sospesi
              </span>
            </span>
          }
        />
        <KpiCard
          title="Ingressi oggi"
          value={kpis.todayEntries.toString()}
          delay={0.16}
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

      {/* Action cards */}
      <section className="grid gap-4 md:grid-cols-2 md:gap-6 lg:gap-8">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>Scadenze prossime 7 giorni</CardTitle>
            <Badge variant="outline">{expiring.length}</Badge>
          </CardHeader>
          <CardContent>
            {expiring.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessuna scadenza nei prossimi 7 giorni.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {expiring.slice(0, 6).map((row) => {
                  const badge = badgeForDays(row.daysRemaining)
                  return (
                    <li
                      key={row.subscription.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <Avatar className="size-9 shrink-0">
                        {row.member.avatar_url ? (
                          <AvatarImage
                            src={row.member.avatar_url}
                            alt={row.member.full_name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-muted text-xs">
                          {initialsFor(row.member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dashboard/membri/${row.member.id}`}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {row.member.full_name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.subscription.plan.name} · scade{' '}
                          {formatDate(row.subscription.end_date, 'short')}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(badge.className)}>
                        {badge.label}
                      </Badge>
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
          <div className="border-t border-border px-6 py-3">
            <Link
              href="/dashboard/abbonamenti?filter=expiring"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Vedi tutte
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ultimi pagamenti</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessun pagamento ancora registrato.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recentPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.member?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(p.paid_at ?? p.created_at)}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatCurrency(p.amount_cents)}
                    </span>
                    <PaymentMethodBadge method={p.payment_method} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <div className="border-t border-border px-6 py-3">
            <Link
              href="/dashboard/pagamenti"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Vedi tutti
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </Card>
      </section>

      {failedPayments.length > 0 ? (
        <section>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangleIcon className="size-4" />
                Da gestire — pagamenti falliti (ultimi 7 giorni)
              </CardTitle>
              <Badge variant="outline" className="border-destructive/40">
                {failedPayments.length}
              </Badge>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border">
                {failedPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/membri/${p.member_id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {p.member?.full_name ?? '—'}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatRelativeDate(p.created_at)} ·{' '}
                        {p.failure_reason ?? 'Errore generico'}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatCurrency(p.amount_cents)}
                    </span>
                    <PaymentMethodBadge method={p.payment_method} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/membri/${p.member_id}`}>
                        Apri
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Quick actions */}
      <section className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href="/dashboard/membri/nuovo">
            <PlusIcon className="size-4" />
            Nuovo membro
          </Link>
        </Button>
        <CashPaymentDialog
          plans={plans}
          mode={{ kind: 'picker' }}
          trigger={
            <Button variant="outline">
              <PlusIcon className="size-4" />
              Registra pagamento contanti
            </Button>
          }
        />
        <ExportPaymentsButton />
      </section>
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
    return (
      <span>
        vs mese scorso: {formatCurrency(lastMonthCents)}
      </span>
    )
  }
  const sign = deltaPct > 0 ? '+' : ''
  return (
    <span>
      vs mese scorso: {sign}
      {Math.round(deltaPct)}%
    </span>
  )
}
