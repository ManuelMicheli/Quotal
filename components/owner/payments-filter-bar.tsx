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

function chipClass(active: boolean) {
  return cn(
    'tap-shrink inline-flex h-8 items-center rounded-full border px-3.5 text-[0.8125rem] font-medium transition-all duration-200',
    active
      ? 'border-foreground bg-foreground text-background shadow-[var(--shadow-1)]'
      : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-secondary hover:text-foreground',
  )
}

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
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-1)]">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Metodo</p>
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() =>
                applyParams((p) => {
                  if (m.value === 'all') p.delete('method')
                  else p.set('method', m.value)
                })
              }
              className={chipClass(currentMethod === m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Stato</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() =>
                  applyParams((p) => {
                    if (s.value === 'all') p.delete('status')
                    else p.set('status', s.value)
                  })
                }
                className={chipClass(currentStatus === s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payments-from" className="eyebrow">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payments-to" className="eyebrow">
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
