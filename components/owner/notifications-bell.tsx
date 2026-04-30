'use client'

/**
 * Owner top-bar bell — opens a popover listing the latest in-app
 * notifications. Mark-as-read happens on click (single) or via the
 * "segna tutte come lette" link.
 *
 * The unread count + initial list are passed from the server layout
 * so the bell renders with state on first paint. The dropdown mounts
 * client-side and re-fetches isn't critical for MVP — the layout
 * revalidates on every navigation.
 */
import { BellIcon, CheckIcon, ExternalLinkIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import {
  markAllOwnerNotificationsReadAction,
  markOwnerNotificationReadAction,
} from '@/app/actions/member'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { OwnerNotification } from '@/lib/domain-types'
import { formatRelativeDate } from '@/lib/format'

type Props = {
  initialNotifications: OwnerNotification[]
  initialUnread: number
}

const TYPE_LABEL: Record<string, string> = {
  member_subscription_expiring: 'Scadenze',
  payment_failed: 'Pagamento fallito',
  new_member_signup: 'Nuovo membro',
  monthly_report_ready: 'Report mensile',
  sepa_mandate_revoked: 'Mandato SEPA',
  cash_close_pending: 'Cassa',
}

export function OwnerNotificationsBell({
  initialNotifications,
  initialUnread,
}: Props) {
  const [notifications, setNotifications] = React.useState(initialNotifications)
  const [unread, setUnread] = React.useState(initialUnread)
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const handleMarkOne = (id: string) => {
    startTransition(async () => {
      const result = await markOwnerNotificationReadAction(id)
      if (result.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
          ),
        )
        setUnread((u) => Math.max(0, u - 1))
      }
    })
  }

  const handleMarkAll = () => {
    startTransition(async () => {
      const result = await markAllOwnerNotificationsReadAction()
      if (result.ok) {
        const now = new Date().toISOString()
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at ?? now })),
        )
        setUnread(0)
      }
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifiche${unread > 0 ? ` (${unread} non lette)` : ''}`}
          className="relative"
        >
          <BellIcon className="size-5" />
          {unread > 0 && (
            <span
              className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground"
              aria-hidden
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-medium">Notifiche</h3>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={pending}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Segna tutte come lette
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nessuna notifica al momento.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const isUnread = n.read_at === null
                return (
                  <li
                    key={n.id}
                    className={`flex flex-col gap-1 px-4 py-3 ${isUnread ? 'bg-accent/5' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] font-normal"
                          >
                            {TYPE_LABEL[n.type] ?? n.type}
                          </Badge>
                          {isUnread && (
                            <span className="size-2 rounded-full bg-accent" aria-label="Non letta" />
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          {formatRelativeDate(n.created_at)}
                        </p>
                      </div>
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => handleMarkOne(n.id)}
                          disabled={pending}
                          aria-label="Segna come letta"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          <CheckIcon className="size-4" />
                        </button>
                      )}
                    </div>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (isUnread) handleMarkOne(n.id)
                          setOpen(false)
                        }}
                        className="inline-flex w-fit items-center gap-1 text-xs text-accent transition-colors hover:underline"
                      >
                        Vai
                        <ExternalLinkIcon className="size-3" />
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
