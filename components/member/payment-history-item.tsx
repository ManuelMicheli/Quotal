/**
 * Payment row for the member's /app/pagamenti page.
 *
 * Server component (pure presentation). Shows: date, amount, method
 * badge, status badge, and a "Scarica ricevuta" button when a stored
 * receipt PDF is available.
 */
import { DownloadIcon } from 'lucide-react'

import {
  PaymentStatusBadge,
} from '@/components/owner/subscription-status-badge'
import { PaymentMethodBadge } from '@/components/owner/payment-method-badge'
import { Button } from '@/components/ui/button'
import type { Payment } from '@/lib/domain-types'
import { formatCurrency, formatDate } from '@/lib/format'

export function PaymentHistoryItem({ payment }: { payment: Payment }) {
  const date = payment.paid_at ?? payment.created_at
  const hasReceipt = Boolean(payment.receipt_pdf_path)
  const hasInvoice = Boolean(payment.invoice_pdf_path)
  const isRefund = payment.amount_cents < 0
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {isRefund ? (
              <>
                <span>Rimborso</span>
                <span className="ml-2 font-normal text-destructive">
                  {formatCurrency(payment.amount_cents)}
                </span>
              </>
            ) : (
              formatCurrency(payment.amount_cents)
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(date, 'long')}
          </p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PaymentMethodBadge method={payment.payment_method} />
        {payment.receipt_number ? (
          <span className="text-xs text-muted-foreground">
            #{payment.receipt_number}
          </span>
        ) : null}
        {payment.invoice_number ? (
          <span className="text-xs text-muted-foreground">
            Fattura #{payment.invoice_number}
          </span>
        ) : null}
      </div>

      {(hasReceipt || hasInvoice) && payment.status === 'succeeded' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {hasReceipt ? (
            <Button asChild variant="outline" size="sm">
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
            <Button asChild variant="outline" size="sm">
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
