'use client'

/**
 * Header for inner member pages.
 *
 * Mobile: sticky glass bar with back chevron + tight title — iOS-style.
 * Tablet+: flat, large display title.
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
        'sticky top-0 z-30 -mx-5 flex items-center gap-3 border-b border-border/50 bg-background/65 px-5 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/45',
        'md:static md:-mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none md:supports-[backdrop-filter]:bg-transparent',
      )}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}
    >
      {showBack ? (
        <button
          type="button"
          onClick={() => router.back()}
          className="tap-shrink ring-soft -ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:h-10 md:w-10"
          aria-label="Torna indietro"
        >
          <ChevronLeftIcon size={18} aria-hidden="true" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="heading-display truncate text-2xl md:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground md:text-sm">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
