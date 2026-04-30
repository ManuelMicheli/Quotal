'use client'

/**
 * Floating bottom navigation for the member PWA.
 *
 * Pill-shaped, glass-blurred dock. Active tab gets a filled accent pill
 * with the label visible only when active (tab-bar idiom). Bottom safe
 * area is honoured via env(safe-area-inset-bottom).
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
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 md:hidden"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
      }}
    >
      <ul
        className={cn(
          'ring-floating flex w-full max-w-sm items-center justify-between gap-1 rounded-full p-1.5',
          'bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70',
        )}
      >
        {TABS.map((tab) => {
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
                aria-label={tab.label}
                className={cn(
                  'tap-shrink relative flex h-11 items-center justify-center gap-1.5 overflow-hidden rounded-full text-sm font-medium transition-colors',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-[13px] tracking-tight transition-[max-width,opacity] duration-300',
                    active ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0',
                  )}
                >
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
