'use client'

/**
 * Owner dashboard error boundary. Wrapped inside the dashboard layout so the
 * sidebar stays visible — only the main content gets replaced.
 */
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'
import { useEffect } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard/error]', error)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl py-8">
      <EmptyState
        variant="hero"
        size="lg"
        icon={<AlertTriangleIcon className="text-destructive" />}
        title="Errore in dashboard"
        description={
          <span className="block">
            Qualcosa non ha funzionato. Riprova: spesso è un&apos;intermittenza
            del database.
            {error.digest ? (
              <span className="mt-2 block font-mono text-xs text-muted-foreground/70">
                ID errore: {error.digest}
              </span>
            ) : null}
          </span>
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={reset}>
              <RefreshCwIcon className="size-4" />
              Riprova
            </Button>
            <Button asChild variant="outline">
              <a href="/dashboard">Torna in panoramica</a>
            </Button>
          </div>
        }
      />
    </div>
  )
}
