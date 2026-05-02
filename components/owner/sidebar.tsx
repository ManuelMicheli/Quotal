'use client'

/**
 * Owner sidebar (desktop) + bottom-nav (mobile).
 *
 * Two presentations of the same nav data:
 *   - Desktop: vertical sidebar pinned to the left, with logo on top, nav in
 *     the middle, profile dropdown at the bottom.
 *   - Mobile: fixed bottom bar with the 5 main entries; settings live in the
 *     profile dropdown that's accessible from the topbar avatar.
 *
 * Active route detection uses `usePathname()`. We prefix-match because
 * `/dashboard/membri/abc` should still highlight the "Membri" item.
 */
import {
  BanknoteIcon,
  ClipboardListIcon,
  CreditCardIcon,
  DoorOpenIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ReceiptIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'

import { logoutAction } from '@/app/actions/auth'
import { Logo } from '@/components/shared/logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Match exactly (no prefix) — for the Home item which would otherwise
   *  match every dashboard route. */
  exact?: boolean
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboardIcon, exact: true },
  { href: '/dashboard/membri', label: 'Membri', icon: UsersIcon },
  { href: '/dashboard/abbonamenti', label: 'Abbonamenti', icon: CreditCardIcon },
  { href: '/dashboard/schede', label: 'Schede', icon: ClipboardListIcon },
  { href: '/dashboard/pagamenti', label: 'Pagamenti', icon: ReceiptIcon },
  { href: '/dashboard/cassa', label: 'Cassa', icon: BanknoteIcon },
  { href: '/dashboard/ingressi', label: 'Ingressi', icon: DoorOpenIcon },
]

const SETTINGS_NAV: NavItem = {
  href: '/dashboard/impostazioni',
  label: 'Impostazioni',
  icon: SettingsIcon,
}

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function OwnerSidebar({
  ownerName,
  ownerEmail,
  ownerAvatarUrl,
}: {
  ownerName: string
  ownerEmail: string
  ownerAvatarUrl?: string | null
}) {
  return (
    <>
      <DesktopSidebar
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        ownerAvatarUrl={ownerAvatarUrl}
      />
      <MobileBottomNav />
    </>
  )
}

function DesktopSidebar({
  ownerName,
  ownerEmail,
  ownerAvatarUrl,
}: {
  ownerName: string
  ownerEmail: string
  ownerAvatarUrl?: string | null
}) {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border/70 bg-sidebar/80 text-sidebar-foreground backdrop-blur-xl md:flex lg:w-72">
      <div className="px-7 py-7">
        <Link href="/dashboard" className="inline-block">
          <Logo size="sm" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'tap-shrink group relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon
                className={cn('size-4 shrink-0', active && 'text-background')}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {active ? (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-background/80"
                />
              ) : null}
            </Link>
          )
        })}
        <div className="mt-auto" />
        <Link
          href={SETTINGS_NAV.href}
          aria-current={isActive(SETTINGS_NAV, pathname) ? 'page' : undefined}
          className={cn(
            'tap-shrink mb-3 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors',
            isActive(SETTINGS_NAV, pathname)
              ? 'bg-foreground text-background'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <SettingsIcon className="size-4" strokeWidth={1.75} />
          Impostazioni
        </Link>
      </nav>
      <ProfileDropdown
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        ownerAvatarUrl={ownerAvatarUrl}
        align="start"
      >
        <button
          type="button"
          className="tap-shrink m-3 flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-card p-3 text-left transition-colors hover:bg-sidebar-accent"
        >
          <Avatar className="size-9">
            {ownerAvatarUrl ? <AvatarImage src={ownerAvatarUrl} alt={ownerName} /> : null}
            <AvatarFallback className="bg-muted text-xs">
              {initialsFor(ownerName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {ownerName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{ownerEmail}</p>
          </div>
        </button>
      </ProfileDropdown>
    </aside>
  )
}

function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-7">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item, pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tap-shrink relative flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -top-px h-0.5 w-7 rounded-b-full bg-foreground transition-opacity',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function ProfileDropdown({
  ownerName,
  ownerEmail,
  ownerAvatarUrl,
  children,
  align = 'end',
}: {
  ownerName: string
  ownerEmail: string
  ownerAvatarUrl?: string | null
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
}) {
  const [pending, startTransition] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Avatar className="size-7">
            {ownerAvatarUrl ? <AvatarImage src={ownerAvatarUrl} alt={ownerName} /> : null}
            <AvatarFallback className="bg-muted text-xs">
              {initialsFor(ownerName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ownerName}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {ownerEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/impostazioni/profilo" className="cursor-pointer">
            <UserIcon className="size-4" />
            Profilo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/impostazioni" className="cursor-pointer">
            <SettingsIcon className="size-4" />
            Impostazioni
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onClick={() => startTransition(() => logoutAction())}
        >
          <LogOutIcon className="size-4" />
          {pending ? 'Uscita…' : 'Esci'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
