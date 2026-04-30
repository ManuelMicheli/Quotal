'use client'

/**
 * Header for inner member pages.
 *
 * Sticky on scroll, shows an optional back button (router.back()) plus a
 * title. Uses `useRouter` so the back button preserves the navigation
 * stack — matches platform expectations on iOS/Android PWAs.
 */
import { ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  subtitle,
  showBack = true,
  action,
}: {
  title: string
  subtitle?: string
  showBack?: boolean
  action?: React.ReactNode
}) {
  const router = useRouter()
  return (
    <header
      className={cn(
        'sticky top-0 z-30 -mx-4 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur',
      )}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      {showBack ? (
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Torna indietro"
        >
          <ChevronLeftIcon size={20} aria-hidden="true" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
