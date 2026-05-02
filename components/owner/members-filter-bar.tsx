'use client'

/**
 * Filter chips + search box for the members list.
 *
 * State is held in the URL (search params), so:
 *   - the server can read filters and run the right query, and
 *   - back/forward navigation just works.
 *
 * `useTransition` keeps the input snappy while the server re-renders.
 */
import { SearchIcon, XIcon } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const FILTERS = [
  { value: 'all', label: 'Tutti' },
  { value: 'active', label: 'Attivi' },
  { value: 'expiring', label: 'In scadenza' },
  { value: 'expired', label: 'Scaduti' },
  { value: 'suspended', label: 'Sospesi' },
  { value: 'no_subscription', label: 'Senza abbonamento' },
] as const

export function MembersFilterBar({
  currentFilter,
  currentSearch,
}: {
  currentFilter: string
  currentSearch: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = React.useTransition()
  const [searchValue, setSearchValue] = React.useState(currentSearch)

  function applyParams(updater: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    updater(params)
    params.delete('page')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  React.useEffect(() => {
    const trimmed = searchValue.trim()
    if (trimmed === currentSearch) return
    const handle = window.setTimeout(() => {
      applyParams((p) => {
        if (trimmed) p.set('search', trimmed)
        else p.delete('search')
      })
    }, 300)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-md" key={`search-${currentSearch}`}>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Cerca per nome, email o telefono…"
          className="pl-9 pr-9"
        />
        {searchValue ? (
          <button
            type="button"
            onClick={() => setSearchValue('')}
            aria-label="Pulisci ricerca"
            className="tap-shrink absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {FILTERS.map((f) => {
          const active = currentFilter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() =>
                applyParams((p) => {
                  if (f.value === 'all') p.delete('filter')
                  else p.set('filter', f.value)
                })
              }
              className={cn(
                'tap-shrink inline-flex h-8 items-center rounded-full border px-3.5 text-[0.8125rem] font-medium transition-all duration-200',
                active
                  ? 'border-foreground bg-foreground text-background shadow-[var(--shadow-1)]'
                  : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-secondary hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
