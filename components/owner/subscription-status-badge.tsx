/**
 * Coloured badge for subscription/member statuses.
 *
 * Server-friendly: pure presentation. Use everywhere we render a status.
 */
import { Badge } from '@/components/ui/badge'
import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from '@/lib/constants'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  [SUBSCRIPTION_STATUS.ACTIVE]: 'Attivo',
  [SUBSCRIPTION_STATUS.EXPIRED]: 'Scaduto',
  [SUBSCRIPTION_STATUS.SUSPENDED]: 'Sospeso',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'Annullato',
  none: 'Senza abbonamento',
}

const STATUS_CLASS: Record<string, string> = {
  [SUBSCRIPTION_STATUS.ACTIVE]:
    'bg-success/10 text-success border-success/20',
  [SUBSCRIPTION_STATUS.EXPIRED]:
    'bg-destructive/10 text-destructive border-destructive/20',
  [SUBSCRIPTION_STATUS.SUSPENDED]:
    'bg-warning/10 text-warning border-warning/20',
  [SUBSCRIPTION_STATUS.CANCELLED]:
    'bg-muted text-muted-foreground border-border',
  none: 'bg-muted text-muted-foreground border-border',
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
    <Badge
      variant="outline"
      className={cn(STATUS_CLASS[key] ?? STATUS_CLASS.none, className)}
    >
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
const PAYMENT_STATUS_CLASS: Record<string, string> = {
  succeeded: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  refunded: 'bg-muted text-muted-foreground border-border',
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
      variant="outline"
      className={cn(
        PAYMENT_STATUS_CLASS[status] ?? PAYMENT_STATUS_CLASS.pending,
        className,
      )}
    >
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
