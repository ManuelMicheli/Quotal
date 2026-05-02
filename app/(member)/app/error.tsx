'use client'

/**
 * Member PWA error boundary. Sits inside the member layout so the bottom
 * nav stays available — the user can still escape to a different tab.
 */
import { AlertTriangleIcon } from 'lucide-react'
import { useEffect } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
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
    <div className="ring-soft mx-auto mt-6 max-w-md rounded-3xl bg-card md:mt-12">
      <EmptyState
        icon={<AlertTriangleIcon className="text-destructive" />}
        title="Qualcosa è andato storto"
        description={
          error.digest
            ? `Prova a ricaricare. Se continua, controlla la connessione. ID errore: ${error.digest}`
            : 'Prova a ricaricare. Se continua, controlla la connessione.'
        }
        action={
          <Button onClick={reset} variant="accent" size="lg" className="rounded-full">
            Riprova
          </Button>
        }
      />
    </div>
  )
}
