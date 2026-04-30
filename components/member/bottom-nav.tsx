'use client'

/**
 * Sticky bottom navigation for the member PWA.
 *
 * Four tabs: Home / Abbonamento / Pagamenti / Profilo. The active tab
 * gets a thin accent indicator above the icon. Bottom safe-area is
 * honoured via env(safe-area-inset-bottom) so the nav clears the iPhone
 * home-indicator without overlap.
 *
 * Pure presentational — segments come from `usePathname()` so the nav
 * stays in sync without any external state.
 */
import {
  CreditCardIcon,
  HomeIcon,
  ReceiptIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

type Tab = {
  href: string
  label: string
  icon: LucideIcon
}

const TABS: ReadonlyArray<Tab> = [
  { href: '/app', label: 'Home', icon: HomeIcon },
  { href: '/app/abbonamento', label: 'Abbonamento', icon: CreditCardIcon },
  { href: '/app/pagamenti', label: 'Pagamenti', icon: ReceiptIcon },
  { href: '/app/profilo', label: 'Profilo', icon: UserIcon },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((tab) => {
          // "Home" must match exactly — every other tab is a prefix match
          // so nested pages (e.g. /app/profilo/sicurezza) keep the parent
          // tab highlighted.
          const active =
            tab.href === '/app'
              ? pathname === '/app'
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          const Icon = tab.icon
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-xs',
                  active
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-0 h-0.5 w-8 rounded-b-full bg-accent transition-opacity',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon
                  size={20}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span className={cn(active && 'font-medium')}>
                  {tab.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
