'use client'

/**
 * Owner dashboard error boundary. Wrapped inside the dashboard layout so the
 * sidebar stays visible — only the main content gets replaced.
 */
import { AlertTriangleIcon } from 'lucide-react'
import { useEffect } from 'react'

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
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-12 text-center">
      <AlertTriangleIcon className="size-10 text-destructive" />
      <h1 className="font-display text-2xl tracking-tight">
        Errore in dashboard
      </h1>
      <p className="text-muted-foreground">
        Qualcosa non ha funzionato. Riprova: spesso è un&apos;intermittenza
        del database.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          ID errore: {error.digest}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={reset}>Riprova</Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Torna in panoramica</a>
        </Button>
      </div>
    </div>
  )
}
