/**
 * Coloured badge with icon for payment methods.
 *
 * Server-friendly. Single source of truth for "carta", "SEPA", "contanti",
 * "bonifico" — used in payment lists, receipts, dashboards.
 */
import { Badge } from '@/components/ui/badge'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/constants'
import { cn } from '@/lib/utils'

const METHOD_LABEL: Record<string, string> = {
  [PAYMENT_METHODS.CARD]: 'Carta',
  [PAYMENT_METHODS.SEPA]: 'SEPA',
  [PAYMENT_METHODS.CASH]: 'Contanti',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bonifico',
}

const METHOD_ICON: Record<string, string> = {
  [PAYMENT_METHODS.CARD]: '💳',
  [PAYMENT_METHODS.SEPA]: '🏦',
  [PAYMENT_METHODS.CASH]: '💶',
  [PAYMENT_METHODS.BANK_TRANSFER]: '🏧',
}

const METHOD_CLASS: Record<string, string> = {
  [PAYMENT_METHODS.CARD]: 'bg-accent/10 text-accent border-accent/20',
  [PAYMENT_METHODS.SEPA]: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  [PAYMENT_METHODS.CASH]: 'bg-warning/10 text-warning border-warning/20',
  [PAYMENT_METHODS.BANK_TRANSFER]:
    'bg-muted text-muted-foreground border-border',
}

export function PaymentMethodBadge({
  method,
  className,
  showIcon = true,
}: {
  method: PaymentMethod | string
  className?: string
  showIcon?: boolean
}) {
  return (
    <Badge
      variant="outline"
      className={cn(METHOD_CLASS[method] ?? METHOD_CLASS.cash, className)}
    >
      {showIcon ? <span className="mr-1">{METHOD_ICON[method] ?? '💶'}</span> : null}
      {METHOD_LABEL[method] ?? method}
    </Badge>
  )
}
