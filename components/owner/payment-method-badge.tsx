/**
 * Coloured badge with icon for payment methods.
 *
 * Server-friendly. Single source of truth for "carta", "SEPA", "contanti",
 * "bonifico" — used in payment lists, receipts, dashboards.
 */
import {
  BanknoteIcon,
  CreditCardIcon,
  EuroIcon,
  LandmarkIcon,
  type LucideIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/constants'
import { cn } from '@/lib/utils'

const METHOD_LABEL: Record<string, string> = {
  [PAYMENT_METHODS.CARD]: 'Carta',
  [PAYMENT_METHODS.SEPA]: 'SEPA',
  [PAYMENT_METHODS.CASH]: 'Contanti',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bonifico',
}

const METHOD_ICON: Record<string, LucideIcon> = {
  [PAYMENT_METHODS.CARD]: CreditCardIcon,
  [PAYMENT_METHODS.SEPA]: LandmarkIcon,
  [PAYMENT_METHODS.CASH]: EuroIcon,
  [PAYMENT_METHODS.BANK_TRANSFER]: BanknoteIcon,
}

const METHOD_CLASS: Record<string, string> = {
  [PAYMENT_METHODS.CARD]: 'bg-accent-soft text-accent border-accent/20',
  [PAYMENT_METHODS.SEPA]: 'bg-info-soft text-info border-info/20',
  [PAYMENT_METHODS.CASH]: 'bg-warning-soft text-warning border-warning/30',
  [PAYMENT_METHODS.BANK_TRANSFER]:
    'bg-secondary text-secondary-foreground border-border/60',
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
  const Icon = METHOD_ICON[method] ?? EuroIcon
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1',
        METHOD_CLASS[method] ?? METHOD_CLASS.cash,
        className,
      )}
    >
      {showIcon ? <Icon className="size-3" /> : null}
      {METHOD_LABEL[method] ?? method}
    </Badge>
  )
}
