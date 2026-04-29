'use client'

/**
 * URL-driven filter bar for the payments registry.
 *
 * Method/status are chip-style toggles; the date range is two `<input
 * type="date">` controls. Every change pushes a new URL via `router.replace`
 * inside a `useTransition` so the page re-renders on the server without
 * blocking the user's input.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const METHODS = [
  { value: 'all', label: 'Tutti' },
  { value: 'card', label: 'Carta' },
  { value: 'sepa', label: 'SEPA' },
  { value: 'cash', label: 'Contanti' },
  { value: 'bank_transfer', label: 'Bonifico' },
] as const

const STATUSES = [
  { value: 'all', label: 'Tutti gli stati' },
  { value: 'succeeded', label: 'Pagati' },
  { value: 'pending', label: 'In attesa' },
  { value: 'failed', label: 'Falliti' },
  { value: 'refunded', label: 'Rimborsati' },
] as const

export function PaymentsFilterBar({
  currentMethod,
  currentStatus,
  currentFrom,
  currentTo,
}: {
  currentMethod: string
  currentStatus: string
  currentFrom: string
  currentTo: string
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {METHODS.map((m) => (
          <Button
            key={m.value}
            type="button"
            size="sm"
            variant={currentMethod === m.value ? 'default' : 'outline'}
            className={cn(
              'rounded-full',
              currentMethod === m.value ? '' : 'bg-background',
            )}
            onClick={() =>
              applyParams((p) => {
                if (m.value === 'all') p.delete('method')
                else p.set('method', m.value)
              })
            }
          >
            {m.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
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
                })
              }
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="payments-from" className="text-xs text-muted-foreground">
              Da
            </Label>
            <Input
              id="payments-from"
              type="date"
              defaultValue={currentFrom}
              onChange={(e) =>
                applyParams((p) => {
                  if (e.target.value) p.set('from', e.target.value)
                  else p.delete('from')
                })
              }
              className="h-9 w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="payments-to" className="text-xs text-muted-foreground">
              A
            </Label>
            <Input
              id="payments-to"
              type="date"
              defaultValue={currentTo}
              onChange={(e) =>
                applyParams((p) => {
                  if (e.target.value) p.set('to', e.target.value)
                  else p.delete('to')
                })
              }
              className="h-9 w-40"
            />
          </div>
          {currentFrom || currentTo || currentMethod !== 'all' || currentStatus !== 'all' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                applyParams((p) => {
                  p.delete('method')
                  p.delete('status')
                  p.delete('from')
                  p.delete('to')
                })
              }
            >
              Azzera filtri
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
