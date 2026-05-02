'use client'

/**
 * Floating bottom dock for the member PWA.
 *
 * Apple-grade tab bar: glass-strong surface, 5 icon-label cells, an active
 * pill that slides between cells via framer-motion `layoutId`. Tactile press
 * feedback via `tap-shrink`. Honours `env(safe-area-inset-bottom)`.
 */
import {
  ClipboardListIcon,
  CreditCardIcon,
  HomeIcon,
  ReceiptIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Tab = {
  href: string
  label: string
  icon: LucideIcon
}

const TABS: ReadonlyArray<Tab> = [
  { href: '/app', label: 'Home', icon: HomeIcon },
  { href: '/app/abbonamento', label: 'Abbonamento', icon: CreditCardIcon },
  { href: '/app/schede', label: 'Schede', icon: ClipboardListIcon },
  { href: '/app/pagamenti', label: 'Pagamenti', icon: ReceiptIcon },
  { href: '/app/profilo', label: 'Profilo', icon: UserIcon },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 md:hidden"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.625rem)',
      }}
    >
      <ul
        className={cn(
          'glass-strong relative flex w-full max-w-md items-stretch justify-between gap-0.5 rounded-full p-1.5',
        )}
      >
        {TABS.map((tab) => {
          const active =
            tab.href === '/app'
              ? pathname === '/app'
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          const Icon = tab.icon
          return (
            <li key={tab.href} className="relative flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                aria-label={tab.label}
                className={cn(
                  'tap-shrink relative z-10 flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium leading-none tracking-tight transition-colors',
                  active
                    ? 'text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="member-bottom-nav-pill"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-foreground"
                    transition={spring.snappy}
                  />
                ) : null}
                <Icon
                  size={20}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span className="px-1">{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
