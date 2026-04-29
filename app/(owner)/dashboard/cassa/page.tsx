/**
 * Cassa giornaliera — daily cash register / close UI.
 *
 * Lives at `/dashboard/cassa`. KPI strip on top (today + month + breakdown),
 * transaction list ordered by time, and a "Chiudi cassa" button that
 * generates the daily-report PDF.
 */
import { DownloadIcon, ReceiptIcon } from 'lucide-react'
import Link from 'next/link'

import { CashPaymentDialog } from '@/components/owner/cash-payment-dialog'
import { CloseCashButton } from '@/components/owner/close-cash-button'
import { EmptyState } from '@/components/owner/empty-state'
import { PaymentMethodBadge } from '@/components/owner/payment-method-badge'
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
  getActiveSubscriptionPlans,
  getCashRegisterDay,
} from '@/lib/queries/owner'
import { formatCurrency, formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default async function CassaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const sp = await searchParams
  const date = sp.date && ISO_DATE.test(sp.date) ? sp.date : undefined

  const [day, plans] = await Promise.all([
    getCashRegisterDay(date),
    getActiveSubscriptionPlans(),
  ])

  const isToday = day.closeDate === new Date().toISOString().slice(0, 10)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Contabilità</p>
          <h1 className="font-display text-3xl tracking-tight">
            Cassa giornaliera
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(day.closeDate, 'full')}
            {!isToday ? ' · giornata storica' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CashPaymentDialog plans={plans} mode={{ kind: 'picker' }} />
          <CloseCashButton
            closeDate={day.closeDate}
            alreadyClosed={day.alreadyClosedAt !== null}
          />
        </div>
      </header>

      {day.alreadyClosedAt ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              Cassa già chiusa il{' '}
              <strong>
                {new Date(day.alreadyClosedAt).toLocaleString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
              . Tutti i pagamenti successivi appariranno qui ma non sono nel
              report.
            </span>
            {day.alreadyClosedPdfPath ? (
              <Button asChild size="sm" variant="outline">
                <a
                  href={`/api/owner/payments/daily-report?date=${day.closeDate}`}
                  target="_blank"
                  rel="noopener"
                >
                  <DownloadIcon className="size-4" />
                  Scarica report
                </a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Incassato oggi" value={day.totalCents} emphasize />
        <KpiTile label="Contanti" value={day.cashCents} />
        <KpiTile label="Carta + SEPA" value={day.cardCents + day.sepaCents} />
        <KpiTile label="Bonifico" value={day.bankTransferCents} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mese corrente
            </p>
            <p className="font-display text-2xl tabular-nums">
              {formatCurrency(day.monthCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Transazioni oggi
            </p>
            <p className="font-display text-2xl tabular-nums">
              {day.transactionsCount}
            </p>
          </CardContent>
        </Card>
      </section>

      {day.payments.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="Nessuna transazione"
          description="Le ricevute generate oggi appariranno qui."
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ora</TableHead>
                <TableHead>Membro</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead>Metodo</TableHead>
                <TableHead>Ricevuta</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {day.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm tabular-nums">
                    {p.paid_at
                      ? new Date(p.paid_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
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
                  <TableCell className="text-sm text-muted-foreground">
                    {p.receipt_number ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.receipt_pdf_path || p.receipt_number ? (
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={`/api/owner/payments/receipt?payment=${p.id}&kind=receipt`}
                          target="_blank"
                          rel="noopener"
                        >
                          <DownloadIcon className="size-4" />
                          PDF
                        </a>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function KpiTile({
  label,
  value,
  emphasize,
}: {
  label: string
  value: number
  emphasize?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={
            emphasize
              ? 'font-display text-3xl tabular-nums'
              : 'font-display text-2xl tabular-nums'
          }
        >
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  )
}
