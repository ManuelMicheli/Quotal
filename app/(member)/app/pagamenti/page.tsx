/**
 * Member payment history — `/app/pagamenti`.
 *
 * Server component. Lists every payment made by the signed-in member,
 * filterable by year via a query-string `?year=YYYY` chip. The receipt
 * download uses the existing /api/owner/payments/receipt endpoint —
 * `regenerateReceiptUrlAction` already authorises the owning member.
 */
import {
  ArrowUpRightIcon,
  CreditCardIcon,
  ReceiptIcon,
  RefreshCwIcon,
} from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { PaymentHistoryItem } from '@/components/member/payment-history-item'
import { EmptyState } from '@/components/shared/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { requireMember } from '@/lib/auth'
import {
  getMemberPaymentHistory,
  getMemberPaymentYears,
} from '@/lib/queries/member'
import type { Payment } from '@/lib/domain-types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pagamenti',
}

const PORTAL_ERROR_MESSAGES: Record<string, string> = {
  missing:
    'Nessun metodo di pagamento collegato. Effettua un pagamento per attivare il portale.',
  error:
    'Portale pagamenti non disponibile in questo momento. Riprova più tardi.',
}

const MONTH_LABELS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const

export default async function MemberPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; portal?: string }>
}) {
  const profile = await requireMember()
  const { year: yearParam, portal: portalParam } = await searchParams
  const yearNum = yearParam ? Number.parseInt(yearParam, 10) : undefined
  const validYear =
    yearNum && Number.isFinite(yearNum) && yearNum > 2000 && yearNum < 3000
      ? yearNum
      : undefined
  const portalError =
    portalParam && PORTAL_ERROR_MESSAGES[portalParam]
      ? PORTAL_ERROR_MESSAGES[portalParam]
      : null

  const [payments, years] = await Promise.all([
    getMemberPaymentHistory(profile.id, validYear),
    getMemberPaymentYears(profile.id),
  ])

  const hasStripeCustomer = Boolean(profile.stripe_customer_id)

  const totalPaid = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount_cents, 0)

  const grouped = groupByMonth(payments)

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <PageHeader
        title="Pagamenti"
        subtitle="Le tue ricevute e fatture"
        showBack={false}
      />

      {portalError ? (
        <Alert variant="destructive">
          <AlertDescription>{portalError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 md:grid-cols-12 md:gap-6 lg:gap-8">
        <section className="ring-elevated relative overflow-hidden rounded-3xl bg-foreground p-6 text-background sheen md:col-span-5 md:p-8 lg:col-span-4">
          <div
            aria-hidden="true"
            className="pulse-glow pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-80"
            style={{
              background:
                'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 65%, transparent), transparent)',
            }}
          />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-background/60">
              {validYear ? `Speso nel ${validYear}` : 'Totale incassato'}
            </p>
            <p className="number mt-2 text-4xl font-semibold md:text-5xl lg:text-6xl">
              {formatTotal(totalPaid)}
            </p>
            <p className="mt-1 text-xs text-background/60">
              {payments.length}{' '}
              {payments.length === 1 ? 'pagamento' : 'pagamenti'}
              {validYear ? ` · ${validYear}` : ''}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                className="rounded-full bg-background text-foreground hover:bg-background/92"
              >
                <Link href="/app/abbonamento/rinnova">
                  <RefreshCwIcon size={14} />
                  Rinnova ora
                  <ArrowUpRightIcon size={12} />
                </Link>
              </Button>
              {hasStripeCustomer ? (
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="rounded-full bg-background/10 text-background hover:bg-background/20"
                >
                  <Link href="/app/pagamenti/portal" prefetch={false}>
                    <CreditCardIcon size={14} />
                    Gestisci metodo
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="md:col-span-7 lg:col-span-8">
          {years.length > 1 ? (
            <div
              className="mask-fade-x -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
              aria-label="Filtra per anno"
            >
              <YearChip
                href="/app/pagamenti"
                label="Tutti"
                active={!validYear}
              />
              {years.map((y) => (
                <YearChip
                  key={y}
                  href={`/app/pagamenti?year=${y}`}
                  label={String(y)}
                  active={validYear === y}
                />
              ))}
            </div>
          ) : null}

          {payments.length === 0 ? (
            <div className="ring-soft rounded-3xl bg-card">
              <EmptyState
                icon={<ReceiptIcon />}
                title={
                  validYear
                    ? `Nessun pagamento nel ${validYear}.`
                    : 'Non hai ancora effettuato pagamenti.'
                }
                action={
                  !validYear ? (
                    <Button
                      asChild
                      variant="accent"
                      size="lg"
                      className="rounded-full"
                    >
                      <Link href="/app/abbonamento/rinnova">
                        Effettua il primo pagamento
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {grouped.map((group) => (
                <section key={group.key}>
                  <p className="eyebrow mb-2 px-1">{group.label}</p>
                  <div className="flex flex-col gap-3">
                    {group.items.map((p) => (
                      <PaymentHistoryItem key={p.id} payment={p} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTotal(cents: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function groupByMonth(
  payments: Payment[],
): Array<{ key: string; label: string; items: Payment[] }> {
  const map = new Map<string, { label: string; items: Payment[] }>()
  for (const p of payments) {
    const date = new Date(p.paid_at ?? p.created_at)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`
    const label = `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`
    const bucket = map.get(key)
    if (bucket) {
      bucket.items.push(p)
    } else {
      map.set(key, { label, items: [p] })
    }
  }
  return Array.from(map.entries()).map(([key, { label, items }]) => ({
    key,
    label,
    items,
  }))
}

function YearChip({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'tap-shrink shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border/70 bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  )
}
