/**
 * Cassa giornaliera — daily cash register / close UI.
 *
 * Lives at `/dashboard/cassa`. KPI strip on top (today + month + breakdown),
 * transaction list ordered by time, and a "Chiudi cassa" button that
 * generates the daily-report PDF.
 */
import {
  CheckCircle2Icon,
  CreditCardIcon,
  DownloadIcon,
  EuroIcon,
  LandmarkIcon,
  ReceiptIcon,
  TrendingUpIcon,
} from 'lucide-react'
import Link from 'next/link'

import { CashPaymentDialog } from '@/components/owner/cash-payment-dialog'
import { CloseCashButton } from '@/components/owner/close-cash-button'
import { PaymentMethodBadge } from '@/components/owner/payment-method-badge'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
    <div className="flex flex-col gap-6 md:gap-8">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Contabilità</PageHeaderEyebrow>
          <PageHeaderHeading>Cassa giornaliera</PageHeaderHeading>
          <PageHeaderDescription>
            {formatDate(day.closeDate, 'full')}
            {!isToday ? ' · giornata storica' : ''}
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <CashPaymentDialog plans={plans} mode={{ kind: 'picker' }} />
          <CloseCashButton
            closeDate={day.closeDate}
            alreadyClosed={day.alreadyClosedAt !== null}
          />
        </PageHeaderActions>
      </PageHeader>

      {day.alreadyClosedAt ? (
        <Alert variant="success">
          <CheckCircle2Icon className="size-4" />
          <AlertTitle>Cassa chiusa</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Chiusa il{' '}
              <strong className="text-foreground">
                {new Date(day.alreadyClosedAt).toLocaleString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
              . I pagamenti successivi compaiono qui ma non rientrano nel report.
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
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Hero card with today's totals */}
      <Card variant="hero" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="bg-aurora pointer-events-none absolute inset-0 opacity-60"
        />
        <CardContent className="relative grid gap-6 px-6 py-6 md:grid-cols-2 md:px-8 md:py-8">
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Incassato oggi</p>
            <p className="number font-display text-5xl tracking-tight md:text-6xl">
              {formatCurrency(day.totalCents)}
            </p>
            <p className="text-sm text-muted-foreground">
              {day.transactionsCount}{' '}
              {day.transactionsCount === 1 ? 'transazione' : 'transazioni'} ·{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(day.monthCents)}
              </span>{' '}
              questo mese
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <BreakdownTile
              icon={<EuroIcon />}
              label="Contanti"
              value={day.cashCents}
              tone="warning"
            />
            <BreakdownTile
              icon={<CreditCardIcon />}
              label="Carta + SEPA"
              value={day.cardCents + day.sepaCents}
              tone="accent"
            />
            <BreakdownTile
              icon={<LandmarkIcon />}
              label="Bonifico"
              value={day.bankTransferCents}
              tone="default"
            />
            <BreakdownTile
              icon={<TrendingUpIcon />}
              label="Mese"
              value={day.monthCents}
              tone="default"
            />
          </div>
        </CardContent>
      </Card>

      {day.payments.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<ReceiptIcon />}
          title="Nessuna transazione"
          description="Le ricevute generate oggi appariranno qui."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-1)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
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
                  <TableCell className="tabular text-[0.8125rem]">
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
                  <TableCell className="font-mono text-xs text-muted-foreground">
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

function BreakdownTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'default' | 'accent' | 'warning'
}) {
  return (
    <StatCard
      icon={icon}
      label={label}
      value={formatCurrency(value)}
      tone={tone === 'default' ? 'default' : tone}
      className="bg-card/80 backdrop-blur-sm"
    />
  )
}
