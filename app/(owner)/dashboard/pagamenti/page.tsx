/**
 * Payments registry. Server-rendered table + monthly KPI strip.
 */
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CreditCardIcon,
  DownloadIcon,
  EuroIcon,
  ReceiptIcon,
  TrendingUpIcon,
} from 'lucide-react'
import Link from 'next/link'

import { PaymentMethodBadge } from '@/components/owner/payment-method-badge'
import { PaymentsFilterBar } from '@/components/owner/payments-filter-bar'
import { PaymentStatusBadge } from '@/components/owner/subscription-status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getPaymentsList, type PaymentsFilter } from '@/lib/queries/owner'
import { formatCurrency, formatDate } from '@/lib/format'

const VALID_METHODS = ['all', 'card', 'sepa', 'cash', 'bank_transfer'] as const
const VALID_STATUSES = [
  'all',
  'pending',
  'succeeded',
  'failed',
  'refunded',
] as const

export const dynamic = 'force-dynamic'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    method?: string
    status?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  const params: PaymentsFilter = {
    method: (VALID_METHODS as readonly string[]).includes(sp.method ?? 'all')
      ? (sp.method as PaymentsFilter['method'])
      : 'all',
    status: (VALID_STATUSES as readonly string[]).includes(sp.status ?? 'all')
      ? (sp.status as PaymentsFilter['status'])
      : 'all',
    startDate: sp.from
      ? new Date(sp.from + 'T00:00:00.000Z').toISOString()
      : undefined,
    endDate: sp.to
      ? new Date(sp.to + 'T23:59:59.999Z').toISOString()
      : undefined,
    page: sp.page ? Math.max(1, Number(sp.page) || 1) : 1,
  }
  const result = await getPaymentsList(params)
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize))
  const monthCsvUrl = `/api/owner/payments/export?month=${new Date()
    .toISOString()
    .slice(0, 7)}`

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Contabilità</PageHeaderEyebrow>
          <PageHeaderHeading>Pagamenti</PageHeaderHeading>
          <PageHeaderDescription>
            Registro completo. Filtra per metodo, stato e periodo.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <a href={monthCsvUrl} download>
              <DownloadIcon className="size-4" />
              Esporta mese (CSV)
            </a>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" disabled>
                  Esporta per commercialista
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Disponibile dopo il primo pagamento.
            </TooltipContent>
          </Tooltip>
        </PageHeaderActions>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={<TrendingUpIcon />}
          label="Incassato questo mese"
          value={formatCurrency(result.totalAmountCents)}
          tone="accent"
        />
        <StatCard
          icon={<EuroIcon />}
          label="Contanti"
          value={formatCurrency(result.cashAmountCents)}
        />
        <StatCard
          icon={<CreditCardIcon />}
          label="Digitale"
          value={formatCurrency(result.digitalAmountCents)}
        />
        <StatCard
          icon={<ClockIcon />}
          label="In attesa"
          value={formatCurrency(result.pendingAmountCents)}
          tone="warning"
        />
      </section>

      <PaymentsFilterBar
        currentMethod={params.method ?? 'all'}
        currentStatus={params.status ?? 'all'}
        currentFrom={sp.from ?? ''}
        currentTo={sp.to ?? ''}
      />

      {result.payments.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<ReceiptIcon />}
          title="Nessun pagamento"
          description="I pagamenti registrati appariranno qui."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-1)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Membro</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Ricevuta</TableHead>
                  <TableHead>Fattura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="tabular text-[0.8125rem]">
                      {formatDate(p.paid_at ?? p.created_at, 'short')}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/membri/${p.member_id}`}
                        className="font-semibold tracking-tight transition-colors hover:text-accent"
                      >
                        {p.member?.full_name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="number font-semibold">
                        {formatCurrency(p.amount_cents)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PaymentMethodBadge method={p.payment_method} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.receipt_number ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.invoice_number ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {lastPage > 1 ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="tabular text-xs text-muted-foreground">
                Pagina <span className="font-medium text-foreground">{result.page}</span>{' '}
                di <span className="font-medium text-foreground">{lastPage}</span>
                <span className="mx-2 text-border">·</span>
                {result.total} pagamenti
              </p>
              <div className="flex items-center gap-1.5">
                {result.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: '/dashboard/pagamenti',
                        query: { ...sp, page: result.page - 1 },
                      }}
                    >
                      <ChevronLeftIcon className="size-3.5" />
                      Precedente
                    </Link>
                  </Button>
                ) : null}
                {result.page < lastPage ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: '/dashboard/pagamenti',
                        query: { ...sp, page: result.page + 1 },
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
