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
import { SearchIcon } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
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
  // The search field is uncontrolled-ish: we keep local state but reset it
  // when the URL search param changes (e.g. user hits "back"). Using `key`
  // on the input subtree forces React to remount when the URL value changes
  // — cleaner than calling setState inside a useEffect.
  const [searchValue, setSearchValue] = React.useState(currentSearch)

  function applyParams(updater: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    updater(params)
    params.delete('page')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  // Debounced search
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
    // We intentionally only react to searchValue changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={currentFilter === f.value ? 'default' : 'outline'}
            className={cn(
              'rounded-full',
              currentFilter === f.value ? '' : 'bg-background',
            )}
            onClick={() =>
              applyParams((p) => {
                if (f.value === 'all') p.delete('filter')
                else p.set('filter', f.value)
              })
            }
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="relative max-w-md" key={`search-${currentSearch}`}>
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Cerca per nome, email o telefono…"
          className="pl-9"
        />
      </div>
    </div>
  )
}
