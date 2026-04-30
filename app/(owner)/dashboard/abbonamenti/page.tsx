/**
 * Subscriptions list page.
 *
 * MVP implementation: list view only. The "Calendario" view in the spec is
 * deferred — toggle button is rendered but the calendar is a "Disponibile
 * prossimamente" placeholder. We keep the list rich with filters: status,
 * plan, date range.
 */
import { CreditCardIcon } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/owner/empty-state'
import { SubscriptionsFilterBar } from '@/components/owner/subscriptions-filter-bar'
import { SubscriptionStatusBadge } from '@/components/owner/subscription-status-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getSubscriptionPlans,
  getSubscriptionsList,
  type SubscriptionsFilter,
} from '@/lib/queries/owner'
import { formatCurrency, formatDate } from '@/lib/format'

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const VALID_STATUS = ['all', 'active', 'expired', 'suspended', 'cancelled'] as const
type ValidStatus = (typeof VALID_STATUS)[number]

function parseStatus(raw: string | undefined): ValidStatus {
  if (!raw) return 'all'
  return (VALID_STATUS as readonly string[]).includes(raw)
    ? (raw as ValidStatus)
    : 'all'
}

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string
    status?: string
    plan?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  // The "filter" param can come from the dashboard "Vedi tutte" link
  const filterFromHome = sp.filter
  let status: ValidStatus = parseStatus(sp.status)
  if (filterFromHome === 'expiring') {
    status = 'active' // surface active subs sorted by end_date desc
  }

  const params: SubscriptionsFilter = {
    status,
    planId: sp.plan,
    page: sp.page ? Math.max(1, Number(sp.page) || 1) : 1,
  }
  const [{ subscriptions, total, page, pageSize }, plans] = await Promise.all([
    getSubscriptionsList(params),
    getSubscriptionPlans(),
  ])
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Gestione</p>
          <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">Abbonamenti</h1>
        </div>
        <Button asChild variant="outline">
          <a
            href={`/api/owner/payments/export?month=${new Date()
              .toISOString()
              .slice(0, 7)}`}
            download
          >
            Esporta CSV
          </a>
        </Button>
      </header>

      <SubscriptionsFilterBar plans={plans} currentStatus={status} currentPlan={sp.plan ?? ''} />

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCardIcon}
          title="Nessun abbonamento"
          description="Crea un membro e poi un abbonamento per iniziare."
        />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Piano</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Prezzo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/membri/${s.member_id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Avatar className="size-7">
                          {s.member.avatar_url ? (
                            <AvatarImage
                              src={s.member.avatar_url}
                              alt={s.member.full_name}
                            />
                          ) : null}
                          <AvatarFallback className="bg-muted text-xs">
                            {initialsFor(s.member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{s.member.full_name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{s.plan.name}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(s.start_date, 'short')} →{' '}
                      {formatDate(s.end_date, 'short')}
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(s.plan.price_cents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {lastPage > 1 ? (
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Pagina {page} di {lastPage} · {total} abbonamenti
              </p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: '/dashboard/abbonamenti',
                        query: { ...sp, page: page - 1 },
                      }}
                    >
                      ← Precedente
                    </Link>
                  </Button>
                ) : null}
                {page < lastPage ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: '/dashboard/abbonamenti',
                        query: { ...sp, page: page + 1 },
                      }}
                    >
                      Successiva →
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
