/**
 * Server-rendered table of members. Two presentations:
 *   - Desktop (md+): real <table> with avatar, contact, status, plan, end-date, actions
 *   - Mobile: stacked MemberCard list
 *
 * Pure presentation: filtering / sorting / pagination is performed by the
 * server query, not in here.
 */
import { ChevronRightIcon, MoreVerticalIcon } from 'lucide-react'
import Link from 'next/link'

import { MemberCard } from '@/components/owner/member-card'
import { SubscriptionStatusBadge } from '@/components/owner/subscription-status-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MemberWithSubscription } from '@/lib/domain-types'
import { formatDate, formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function daysRemainingFor(endDate: string): number {
  const end = new Date(endDate + 'T00:00:00Z')
  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
  return Math.round((end.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24))
}

export function MembersTable({ members }: { members: MemberWithSubscription[] }) {
  return (
    <>
      {/* Mobile: card list */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {members.map((m) => (
          <MemberCard key={m.id} member={m} />
        ))}
      </div>

      {/* Desktop: real table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-1)] md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead>Contatto</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Piano</TableHead>
              <TableHead>Scadenza</TableHead>
              <TableHead className="w-12 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const sub = m.active_subscription
              const days = sub ? daysRemainingFor(sub.end_date) : null
              const expiringSoon = days !== null && days >= 0 && days <= 7
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/membri/${m.id}`}
                      className="group/name flex items-center gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                    >
                      <Avatar className="size-9 ring-1 ring-border/60">
                        {m.avatar_url ? (
                          <AvatarImage src={m.avatar_url} alt={m.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {initialsFor(m.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold tracking-tight text-foreground transition-colors group-hover/name:text-accent">
                        {m.full_name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="text-[0.8125rem]">{m.email}</span>
                      {m.phone ? (
                        <span className="tabular text-xs text-muted-foreground/70">
                          {formatPhone(m.phone)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <SubscriptionStatusBadge status={sub?.status ?? null} />
                  </TableCell>
                  <TableCell className="text-[0.8125rem]">
                    {sub?.plan?.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-[0.8125rem]">
                    {sub ? (
                      <div className="flex flex-col">
                        <span className="tabular font-medium">
                          {formatDate(sub.end_date, 'short')}
                        </span>
                        <span
                          className={cn(
                            'text-xs',
                            expiringSoon
                              ? 'text-warning'
                              : 'text-muted-foreground/70',
                          )}
                        >
                          {days !== null && days >= 0
                            ? `tra ${days} ${days === 1 ? 'giorno' : 'giorni'}`
                            : days !== null
                              ? `scaduto ${Math.abs(days)} gg fa`
                              : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="Azioni">
                          <MoreVerticalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/membri/${m.id}`}>
                            <ChevronRightIcon className="size-4" />
                            Visualizza
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/membri/${m.id}?action=renew`}>
                            Rinnova
                          </Link>
                        </DropdownMenuItem>
                        {sub?.status === 'active' ? (
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/membri/${m.id}?action=suspend`}>
                              Sospendi
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        {sub?.status === 'suspended' ? (
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/membri/${m.id}?action=resume`}>
                              Riattiva
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/membri/${m.id}?action=edit`}>
                            Modifica
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
