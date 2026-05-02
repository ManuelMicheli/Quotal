/**
 * Coloured badge for subscription/member statuses.
 *
 * Server-friendly: pure presentation. Use everywhere we render a status.
 */
import { Badge } from '@/components/ui/badge'
import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from '@/lib/constants'

const STATUS_LABEL: Record<string, string> = {
  [SUBSCRIPTION_STATUS.ACTIVE]: 'Attivo',
  [SUBSCRIPTION_STATUS.EXPIRED]: 'Scaduto',
  [SUBSCRIPTION_STATUS.SUSPENDED]: 'Sospeso',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'Annullato',
  none: 'Senza abbonamento',
}

const STATUS_VARIANT: Record<
  string,
  'success' | 'destructive' | 'warning' | 'secondary' | 'outline'
> = {
  [SUBSCRIPTION_STATUS.ACTIVE]: 'success',
  [SUBSCRIPTION_STATUS.EXPIRED]: 'destructive',
  [SUBSCRIPTION_STATUS.SUSPENDED]: 'warning',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'secondary',
  none: 'outline',
}

export function SubscriptionStatusBadge({
  status,
  className,
}: {
  status: SubscriptionStatus | 'none' | string | null | undefined
  className?: string
}) {
  const key = status ?? 'none'
  return (
    <Badge variant={STATUS_VARIANT[key] ?? STATUS_VARIANT.none} className={className}>
      {STATUS_LABEL[key] ?? STATUS_LABEL.none}
    </Badge>
  )
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'In attesa',
  succeeded: 'Pagato',
  failed: 'Fallito',
  refunded: 'Rimborsato',
}

const PAYMENT_STATUS_VARIANT: Record<
  string,
  'success' | 'destructive' | 'warning' | 'secondary'
> = {
  succeeded: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'secondary',
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <Badge
      variant={PAYMENT_STATUS_VARIANT[status] ?? 'warning'}
      className={className}
    >
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
