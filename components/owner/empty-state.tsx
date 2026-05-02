/**
 * Empty-state placeholder. Used wherever a table or list has no rows.
 *
 * Server-friendly: pure presentation. Re-export of the shared EmptyState with
 * a Lucide-icon-friendly signature kept for legacy callers.
 */
import type { LucideIcon } from 'lucide-react'

import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <SharedEmptyState
      variant="bordered"
      icon={Icon ? <Icon /> : undefined}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  )
}
