'use client'

/**
 * Member PWA error boundary. Sits inside the member layout so the bottom
 * nav stays available — the user can still escape to a different tab.
 */
import { AlertTriangleIcon } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function MemberAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertTriangleIcon className="size-8 text-destructive" />
      <h1 className="font-display text-xl tracking-tight">
        Qualcosa è andato storto
      </h1>
      <p className="text-sm text-muted-foreground">
        Prova a ricaricare. Se continua, controlla la connessione.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          ID errore: {error.digest}
        </p>
      ) : null}
      <Button onClick={reset} className="w-full">
        Riprova
      </Button>
    </div>
  )
}
