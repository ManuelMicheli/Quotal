'use client'

/**
 * Filters for the subscriptions list. URL-driven, like the members filter.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
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
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s.value}
            type="button"
            size="sm"
            variant={currentStatus === s.value ? 'default' : 'outline'}
            className={cn(
              'rounded-full',
              currentStatus === s.value ? '' : 'bg-background',
            )}
            onClick={() =>
              applyParams((p) => {
                if (s.value === 'all') p.delete('status')
                else p.set('status', s.value)
                p.delete('filter')
              })
            }
          >
            {s.label}
          </Button>
        ))}
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
