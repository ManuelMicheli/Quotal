'use client'

/**
 * Tablet top bar for the member PWA.
 *
 * Visible at `md:` and above as a glass sticky header. Houses the brand
 * wordmark, primary tab navigation with an animated active pill, and the
 * theme toggle. Hidden on phones (the bottom dock takes over) and on `lg+`
 * (the persistent sidebar takes over).
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

export function MemberTopBar() {
  const pathname = usePathname()
  return (
    <header
      className="sticky top-0 z-40 hidden border-b border-border/50 bg-background/65 backdrop-blur-xl supports-[backdrop-filter]:bg-background/45 md:block lg:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-16 w-full items-center gap-6 px-8">
        <Link href="/app" className="tap-shrink shrink-0">
          <Logo size="sm" />
        </Link>

        <nav
          aria-label="Navigazione principale"
          className="ml-2 flex flex-1 items-center"
        >
          <ul className="flex items-center gap-0.5 rounded-full bg-muted/60 p-1">
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
                      'tap-shrink relative inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="member-topbar-pill"
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-full bg-card shadow-[var(--shadow-1)] ring-1 ring-border/60"
                        transition={spring.snappy}
                      />
                    ) : null}
                    <Icon size={16} aria-hidden="true" />
                    {tab.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <ThemeToggle className="shrink-0" />
      </div>
    </header>
  )
}
