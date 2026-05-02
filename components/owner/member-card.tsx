/**
 * Compact member card. Used in mobile-only member lists, expiring-soon list,
 * and anywhere we need a single-line member summary with avatar + status.
 */
import { ChevronRightIcon } from 'lucide-react'
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
        'group/mc tap-shrink flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-1)] transition-all duration-200 hover:-translate-y-px hover:border-border-strong hover:shadow-[var(--shadow-2)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
        className,
      )}
    >
      <Avatar className="size-10 shrink-0 ring-1 ring-border/60">
        {member.avatar_url ? (
          <AvatarImage src={member.avatar_url} alt={member.full_name} />
        ) : null}
        <AvatarFallback className="bg-muted text-xs font-semibold">
          {initialsFor(member.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          {member.full_name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <SubscriptionStatusBadge status={sub?.status ?? null} />
        {sub ? (
          <span className="tabular text-[0.6875rem] text-muted-foreground">
            scade {formatDate(sub.end_date, 'short')}
          </span>
        ) : null}
      </div>
      <ChevronRightIcon
        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover/mc:translate-x-0.5 group-hover/mc:text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  )
}
