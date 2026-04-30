'use client'

/**
 * Owner desktop top bar — breadcrumb + (placeholder) global search + bell.
 *
 * The breadcrumb is computed from `usePathname()` against a small label map.
 * Items not in the map are humanised (capitalised, dashes → spaces). The
 * last segment is rendered as plain text; the rest as links.
 *
 * Mobile presentation: the breadcrumb collapses to the page title only and a
 * compact action cluster (theme toggle + bell + avatar trigger).
 */
import { SearchIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { OwnerNotificationsBell } from '@/components/owner/notifications-bell'
import { ProfileDropdown } from '@/components/owner/sidebar'
import { ThemeToggle } from '@/components/shared/theme-toggle'
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
  cassa: 'Cassa',
}

function humaniseSegment(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
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
  const lastSeg = segments[segments.length - 1] ?? 'dashboard'

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 md:h-20 md:gap-4 md:px-8 lg:px-12 xl:px-16"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <nav
        className="hidden flex-1 items-center gap-2 text-sm md:flex"
        aria-label="Breadcrumb"
      >
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
                <span className="font-display text-base font-medium text-foreground tracking-tight md:text-lg">
                  {label}
                </span>
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

      <p className="font-display text-base font-medium tracking-tight md:hidden">
        {humaniseSegment(lastSeg)}
      </p>

      <div className="hidden flex-1 items-center justify-center md:flex">
        <button
          type="button"
          disabled
          className="hidden h-10 w-80 items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 text-sm text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed md:flex"
          title="Disponibile prossimamente"
        >
          <SearchIcon className="size-4" />
          <span>Cerca membri, pagamenti, abbonamenti…</span>
          <kbd className="ml-auto rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <OwnerNotificationsBell
          initialNotifications={initialNotifications}
          initialUnread={initialUnread}
        />
        <ProfileDropdown
          ownerName={ownerName}
          ownerEmail={ownerEmail}
          ownerAvatarUrl={ownerAvatarUrl}
        >
          <button
            type="button"
            className="tap-shrink md:hidden"
            aria-label="Apri profilo"
          >
            <Avatar className="size-9">
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
