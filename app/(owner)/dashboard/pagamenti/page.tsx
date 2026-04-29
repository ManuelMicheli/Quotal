/**
 * Payments registry. Server-rendered table + monthly KPI strip.
 */
import { DownloadIcon, ReceiptIcon } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/owner/empty-state'
import { PaymentMethodBadge } from '@/components/owner/payment-method-badge'
import { PaymentsFilterBar } from '@/components/owner/payments-filter-bar'
import { PaymentStatusBadge } from '@/components/owner/subscription-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Contabilità</p>
          <h1 className="font-display text-3xl tracking-tight">Pagamenti</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              Disponibile dopo il primo pagamento (Phase 06).
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Incassato questo mese" value={result.totalAmountCents} />
        <KpiTile label="Contanti" value={result.cashAmountCents} />
        <KpiTile label="Digitale" value={result.digitalAmountCents} />
        <KpiTile
          label="In attesa"
          value={result.pendingAmountCents}
          variant="warning"
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
          icon={ReceiptIcon}
          title="Nessun pagamento"
          description="I pagamenti registrati appariranno qui."
        />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell className="text-sm">
                      {formatDate(p.paid_at ?? p.created_at, 'short')}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/membri/${p.member_id}`}
                        className="font-medium hover:underline"
                      >
                        {p.member?.full_name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(p.amount_cents)}
                    </TableCell>
                    <TableCell>
                      <PaymentMethodBadge method={p.payment_method} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.receipt_number ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.invoice_number ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {lastPage > 1 ? (
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Pagina {result.page} di {lastPage} · {result.total} pagamenti
              </p>
              <div className="flex items-center gap-2">
                {result.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: '/dashboard/pagamenti',
                        query: { ...sp, page: result.page - 1 },
                      }}
                    >
                      ← Precedente
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

function KpiTile({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant?: 'default' | 'warning'
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={
            variant === 'warning'
              ? 'font-display text-2xl tabular-nums text-warning'
              : 'font-display text-2xl tabular-nums'
          }
        >
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  )
}
