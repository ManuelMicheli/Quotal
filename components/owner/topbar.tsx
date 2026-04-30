'use client'

/**
 * Owner desktop top bar — breadcrumb + (placeholder) global search + bell.
 *
 * The breadcrumb is computed from `usePathname()` against a small label map.
 * Items not in the map are humanised (capitalised, dashes → spaces). The
 * last segment is rendered as plain text; the rest as links.
 *
 * The mobile counterpart shows just the page title + avatar trigger; render
 * via `<MobileTopbar />`.
 */
import { SearchIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { OwnerNotificationsBell } from '@/components/owner/notifications-bell'
import { ProfileDropdown } from '@/components/owner/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { OwnerNotification } from '@/lib/domain-types'

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  membri: 'Membri',
  abbonamenti: 'Abbonamenti',
  pagamenti: 'Pagamenti',
  ingressi: 'Ingressi',
  impostazioni: 'Impostazioni',
  palestra: 'Palestra',
  piani: 'Piani',
  regole: 'Regole',
  profilo: 'Profilo',
  nuovo: 'Nuovo',
}

function humaniseSegment(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  // UUIDs and ids: don't humanise, leave as-is but truncate.
  if (/^[0-9a-f]{8}-/.test(seg)) return seg.slice(0, 8) + '…'
  return seg
    .split('-')
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(' ')
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function OwnerTopbar({
  ownerName,
  ownerEmail,
  ownerAvatarUrl,
  initialNotifications = [],
  initialUnread = 0,
}: {
  ownerName: string
  ownerEmail: string
  ownerAvatarUrl?: string | null
  initialNotifications?: OwnerNotification[]
  initialUnread?: number
}) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <nav className="hidden flex-1 items-center gap-2 text-sm md:flex" aria-label="Breadcrumb">
        {segments.map((seg, idx) => {
          const href = '/' + segments.slice(0, idx + 1).join('/')
          const isLast = idx === segments.length - 1
          const label = humaniseSegment(seg)
          return (
            <React.Fragment key={href}>
              {idx > 0 ? (
                <span className="text-muted-foreground/40">/</span>
              ) : null}
              {isLast ? (
                <span className="font-medium text-foreground">{label}</span>
              ) : (
                <Link
                  href={href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              )}
            </React.Fragment>
          )
        })}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-2 md:flex-none md:flex-1 md:justify-center">
        <button
          type="button"
          disabled
          className="hidden h-9 w-72 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed md:flex"
          title="Disponibile prossimamente"
        >
          <SearchIcon className="size-4" />
          <span>Cerca…</span>
          <kbd className="ml-auto hidden rounded bg-background px-1.5 py-0.5 text-[10px] font-medium md:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <OwnerNotificationsBell
          initialNotifications={initialNotifications}
          initialUnread={initialUnread}
        />
        <ProfileDropdown
          ownerName={ownerName}
          ownerEmail={ownerEmail}
          ownerAvatarUrl={ownerAvatarUrl}
        >
          <button type="button" className="md:hidden" aria-label="Apri profilo">
            <Avatar className="size-8">
              {ownerAvatarUrl ? <AvatarImage src={ownerAvatarUrl} alt={ownerName} /> : null}
              <AvatarFallback className="bg-muted text-xs">
                {initialsFor(ownerName)}
              </AvatarFallback>
            </Avatar>
          </button>
        </ProfileDropdown>
      </div>
    </header>
  )
}
