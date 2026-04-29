/**
 * Compact member card. Used in mobile-only member lists, expiring-soon list,
 * and anywhere we need a single-line member summary with avatar + status.
 */
import Link from 'next/link'

import { SubscriptionStatusBadge } from '@/components/owner/subscription-status-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { MemberWithSubscription } from '@/lib/domain-types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function MemberCard({
  member,
  className,
}: {
  member: MemberWithSubscription
  className?: string
}) {
  const sub = member.active_subscription
  return (
    <Link
      href={`/dashboard/membri/${member.id}`}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50',
        className,
      )}
    >
      <Avatar className="size-10 shrink-0">
        {member.avatar_url ? (
          <AvatarImage src={member.avatar_url} alt={member.full_name} />
        ) : null}
        <AvatarFallback className="bg-muted text-xs">
          {initialsFor(member.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{member.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <SubscriptionStatusBadge status={sub?.status ?? null} />
        {sub ? (
          <span className="text-xs text-muted-foreground">
            scade {formatDate(sub.end_date, 'short')}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
