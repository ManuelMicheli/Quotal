'use client'

/**
 * Persistent left sidebar for the member PWA on desktop (lg+).
 *
 * Hidden below lg — phones use the bottom dock and tablets use the glass
 * top bar. On desktop the canvas can spread horizontally instead of
 * stacking through a centred column.
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

import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
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

export function MemberSidebar({
  fullName,
  email,
}: {
  fullName: string
  email: string
}) {
  const pathname = usePathname()
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '·'

  return (
    <aside
      aria-label="Navigazione principale"
      className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border/50 bg-card/55 backdrop-blur-xl supports-[backdrop-filter]:bg-card/40 lg:flex"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-20 items-center px-7">
        <Link href="/app" className="tap-shrink shrink-0">
          <Logo size="md" />
        </Link>
      </div>

      <nav className="flex-1 px-4">
        <ul className="flex flex-col gap-1">
          {TABS.map((tab) => {
            const active =
              tab.href === '/app'
                ? pathname === '/app'
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            const Icon = tab.icon
            return (
              <li key={tab.href} className="relative">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'tap-shrink relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'text-background'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="member-sidebar-pill"
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-2xl bg-foreground shadow-[var(--shadow-2)]"
                      transition={spring.snappy}
                    />
                  ) : null}
                  <Icon
                    size={18}
                    aria-hidden="true"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border/50 px-4 py-5">
        <Link
          href="/app/profilo"
          className="tap-shrink flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted/60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-sm text-background">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {fullName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {email}
            </span>
          </span>
        </Link>
        <div className="flex justify-end px-1">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
