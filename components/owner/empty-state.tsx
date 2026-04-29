/**
 * Empty-state placeholder. Used wherever a table or list has no rows.
 *
 * Server-friendly: pure presentation. The CTA can be any node (link, button,
 * client-component dialog trigger, etc.).
 */
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

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
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Icon className="size-6" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
