'use client'

/**
 * Filters for the subscriptions list. URL-driven, like the members filter.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SubscriptionPlan } from '@/lib/domain-types'
import { cn } from '@/lib/utils'

const STATUSES = [
  { value: 'all', label: 'Tutti' },
  { value: 'active', label: 'Attivi' },
  { value: 'suspended', label: 'Sospesi' },
  { value: 'expired', label: 'Scaduti' },
  { value: 'cancelled', label: 'Annullati' },
] as const

export function SubscriptionsFilterBar({
  plans,
  currentStatus,
  currentPlan,
}: {
  plans: SubscriptionPlan[]
  currentStatus: string
  currentPlan: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = React.useTransition()

  function applyParams(updater: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    updater(params)
    params.delete('page')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const active = currentStatus === s.value
          return (
            <button
              key={s.value}
              type="button"
              onClick={() =>
                applyParams((p) => {
                  if (s.value === 'all') p.delete('status')
                  else p.set('status', s.value)
                  p.delete('filter')
                })
              }
              className={cn(
                'tap-shrink inline-flex h-8 items-center rounded-full border px-3.5 text-[0.8125rem] font-medium transition-all duration-200',
                active
                  ? 'border-foreground bg-foreground text-background shadow-[var(--shadow-1)]'
                  : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-secondary hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      <div className="ml-auto">
        <Select
          value={currentPlan || 'all'}
          onValueChange={(v) =>
            applyParams((p) => {
              if (v === 'all') p.delete('plan')
              else p.set('plan', v)
            })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tutti i piani" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i piani</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
