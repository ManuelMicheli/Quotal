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
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-6 py-6">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
        <div className="mt-auto" />
        <Link
          href={SETTINGS_NAV.href}
          className={cn(
            'mb-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive(SETTINGS_NAV, pathname)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <SettingsIcon className="size-4" />
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
          className="m-3 flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar p-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <Avatar className="size-8">
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-6">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item, pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-accent' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" />
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
      <DropdownMenuContent align={align} className="w-56">
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
