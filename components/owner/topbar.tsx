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
import { ChevronRightIcon, SearchIcon } from 'lucide-react'
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
  nuova: 'Nuova',
  cassa: 'Cassa',
  schede: 'Schede',
  notifiche: 'Notifiche',
  dispositivi: 'Dispositivi',
  stripe: 'Stripe',
  'gdpr-richieste': 'Richieste GDPR',
  return: 'Conferma',
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
      className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/50 bg-background/70 px-4 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/55 md:h-16 md:gap-4 md:px-8 lg:px-10 xl:px-14 pt-safe"
    >
      <nav
        className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm md:flex"
        aria-label="Breadcrumb"
      >
        {segments.map((seg, idx) => {
          const href = '/' + segments.slice(0, idx + 1).join('/')
          const isLast = idx === segments.length - 1
          const label = humaniseSegment(seg)
          return (
            <React.Fragment key={href}>
              {idx > 0 ? (
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground/40"
                />
              ) : null}
              {isLast ? (
                <span className="truncate text-[0.9375rem] font-semibold tracking-tight text-foreground">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="truncate rounded-sm px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                >
                  {label}
                </Link>
              )}
            </React.Fragment>
          )
        })}
      </nav>

      <p className="truncate font-semibold tracking-tight md:hidden">
        {humaniseSegment(lastSeg)}
      </p>

      <div className="hidden flex-1 items-center justify-center md:flex">
        <button
          type="button"
          disabled
          className="hidden h-9 w-80 items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed md:flex"
          title="Disponibile prossimamente"
        >
          <SearchIcon className="size-4" />
          <span className="truncate">Cerca membri, pagamenti, abbonamenti…</span>
          <kbd className="ml-auto rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
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
            className="tap-shrink rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 md:hidden"
            aria-label="Apri profilo"
          >
            <Avatar className="size-9 ring-1 ring-border/60">
              {ownerAvatarUrl ? <AvatarImage src={ownerAvatarUrl} alt={ownerName} /> : null}
              <AvatarFallback className="bg-muted text-xs font-semibold">
                {initialsFor(ownerName)}
              </AvatarFallback>
            </Avatar>
          </button>
        </ProfileDropdown>
      </div>
    </header>
  )
}
