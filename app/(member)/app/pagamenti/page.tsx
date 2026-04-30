/**
 * Member payment history — `/app/pagamenti`.
 *
 * Server component. Lists every payment made by the signed-in member,
 * filterable by year via a query-string `?year=YYYY` chip. The receipt
 * download uses the existing /api/owner/payments/receipt endpoint —
 * `regenerateReceiptUrlAction` already authorises the owning member.
 */
import { CreditCardIcon, RefreshCwIcon } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { PaymentHistoryItem } from '@/components/member/payment-history-item'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireMember } from '@/lib/auth'
import {
  getMemberPaymentHistory,
  getMemberPaymentYears,
} from '@/lib/queries/member'
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pagamenti"
        subtitle="Le tue ricevute e fatture"
        showBack={false}
      />

      {portalError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {portalError}
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-2 py-4 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/app/abbonamento/rinnova">
              <RefreshCwIcon size={14} />
              Rinnova ora
            </Link>
          </Button>
          {hasStripeCustomer ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app/pagamenti/portal" prefetch={false}>
                <CreditCardIcon size={14} />
                Gestisci metodo
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {years.length > 1 ? (
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
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
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
            <p>
              {validYear
                ? `Nessun pagamento nel ${validYear}.`
                : 'Non hai ancora effettuato pagamenti.'}
            </p>
            {!validYear ? (
              <Button asChild size="sm">
                <Link href="/app/abbonamento/rinnova">
                  Effettua il primo pagamento
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((p) => (
            <PaymentHistoryItem key={p.id} payment={p} />
          ))}
        </div>
      )}
    </div>
  )
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
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-accent bg-accent text-accent-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  )
}
