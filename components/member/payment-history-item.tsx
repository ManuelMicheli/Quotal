/**
 * Payment row for the member's /app/pagamenti page.
 *
 * Server component. Premium minimalist row: leading method icon disc,
 * amount + date stack, status pill, expandable receipt links.
 */
import {
  BanknoteIcon,
  CreditCardIcon,
  DownloadIcon,
  LandmarkIcon,
  ReceiptIcon,
  type LucideIcon,
} from 'lucide-react'

import { PaymentStatusBadge } from '@/components/owner/subscription-status-badge'
import { Button } from '@/components/ui/button'
import { PAYMENT_METHODS } from '@/lib/constants'
import type { Payment } from '@/lib/domain-types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const METHOD_ICON: Record<string, LucideIcon> = {
  [PAYMENT_METHODS.CARD]: CreditCardIcon,
  [PAYMENT_METHODS.SEPA]: LandmarkIcon,
  [PAYMENT_METHODS.CASH]: BanknoteIcon,
  [PAYMENT_METHODS.BANK_TRANSFER]: LandmarkIcon,
}

const METHOD_LABEL: Record<string, string> = {
  [PAYMENT_METHODS.CARD]: 'Carta',
  [PAYMENT_METHODS.SEPA]: 'Addebito SEPA',
  [PAYMENT_METHODS.CASH]: 'Contanti',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bonifico',
}

export function PaymentHistoryItem({ payment }: { payment: Payment }) {
  const date = payment.paid_at ?? payment.created_at
  const hasReceipt = Boolean(payment.receipt_pdf_path)
  const hasInvoice = Boolean(payment.invoice_pdf_path)
  const isRefund = payment.amount_cents < 0
  const Icon = payment.payment_method
    ? (METHOD_ICON[payment.payment_method] ?? ReceiptIcon)
    : ReceiptIcon
  const methodLabel = payment.payment_method
    ? (METHOD_LABEL[payment.payment_method] ?? payment.payment_method)
    : 'Pagamento'

  return (
    <article className="ring-soft hover-lift rounded-3xl bg-card p-4 transition-all">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            isRefund
              ? 'bg-destructive-soft text-destructive'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                'tabular text-base font-semibold tracking-tight',
                isRefund && 'text-destructive',
              )}
            >
              {isRefund ? '−' : ''}
              {formatCurrency(Math.abs(payment.amount_cents))}
            </p>
            <PaymentStatusBadge status={payment.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {isRefund ? 'Rimborso · ' : ''}
            {methodLabel} · {formatDate(date, 'long')}
          </p>
        </div>
      </div>

      {payment.receipt_number || payment.invoice_number ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[3.75rem] text-[11px] text-muted-foreground">
          {payment.receipt_number ? (
            <span className="tabular">Ricevuta #{payment.receipt_number}</span>
          ) : null}
          {payment.invoice_number ? (
            <span className="tabular">Fattura #{payment.invoice_number}</span>
          ) : null}
        </div>
      ) : null}

      {(hasReceipt || hasInvoice) && payment.status === 'succeeded' ? (
        <div className="mt-3 flex flex-wrap gap-2 pl-[3.75rem]">
          {hasReceipt ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a
                href={`/api/owner/payments/receipt?payment=${payment.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadIcon size={14} />
                Ricevuta
              </a>
            </Button>
          ) : null}
          {hasInvoice ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a
                href={`/api/owner/payments/receipt?payment=${payment.id}&kind=invoice`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadIcon size={14} />
                Fattura
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
