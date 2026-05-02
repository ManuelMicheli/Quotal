/**
 * Subscriptions list page.
 *
 * MVP implementation: list view only. The "Calendario" view in the spec is
 * deferred — toggle button is rendered but the calendar is a "Disponibile
 * prossimamente" placeholder. We keep the list rich with filters: status,
 * plan, date range.
 */
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DownloadIcon,
} from 'lucide-react'
import Link from 'next/link'

import { SubscriptionsFilterBar } from '@/components/owner/subscriptions-filter-bar'
import { SubscriptionStatusBadge } from '@/components/owner/subscription-status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
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
  const filterFromHome = sp.filter
  let status: ValidStatus = parseStatus(sp.status)
  if (filterFromHome === 'expiring') {
    status = 'active'
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
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Gestione</PageHeaderEyebrow>
          <PageHeaderHeading>Abbonamenti</PageHeaderHeading>
          <PageHeaderDescription>
            {total} {total === 1 ? 'abbonamento' : 'abbonamenti'} attivi e
            storici. Filtra per stato o piano.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <a
              href={`/api/owner/payments/export?month=${new Date()
                .toISOString()
                .slice(0, 7)}`}
              download
            >
              <DownloadIcon className="size-4" />
              Esporta CSV
            </a>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <SubscriptionsFilterBar
        plans={plans}
        currentStatus={status}
        currentPlan={sp.plan ?? ''}
      />

      {subscriptions.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<CreditCardIcon />}
          title="Nessun abbonamento"
          description="Crea un membro e poi un abbonamento per iniziare."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-1)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                        className="group/sub flex items-center gap-2.5 outline-none"
                      >
                        <Avatar className="size-8 ring-1 ring-border/60">
                          {s.member.avatar_url ? (
                            <AvatarImage
                              src={s.member.avatar_url}
                              alt={s.member.full_name}
                            />
                          ) : null}
                          <AvatarFallback className="bg-muted text-xs font-semibold">
                            {initialsFor(s.member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold tracking-tight transition-colors group-hover/sub:text-accent">
                          {s.member.full_name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-[0.8125rem]">
                      {s.plan.name}
                    </TableCell>
                    <TableCell className="tabular text-[0.8125rem] text-muted-foreground">
                      {formatDate(s.start_date, 'short')} →{' '}
                      {formatDate(s.end_date, 'short')}
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="number font-semibold">
                        {formatCurrency(s.plan.price_cents)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {lastPage > 1 ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="tabular text-xs text-muted-foreground">
                Pagina <span className="font-medium text-foreground">{page}</span> di{' '}
                <span className="font-medium text-foreground">{lastPage}</span>
                <span className="mx-2 text-border">·</span>
                {total} abbonamenti
              </p>
              <div className="flex items-center gap-1.5">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: '/dashboard/abbonamenti',
                        query: { ...sp, page: page - 1 },
                      }}
                    >
                      <ChevronLeftIcon className="size-3.5" />
                      Precedente
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
                      Successiva
                      <ChevronRightIcon className="size-3.5" />
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
