'use client'

/**
 * Top-level error boundary. Catches anything that bubbles up from a
 * Server / Client Component below this point. The `reset` callback re-tries
 * the failing render — useful for transient blips (eg a Supabase 5xx).
 */
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Hook for Sentry / posthog when wired in production. Logs to console
    // in dev so the developer sees the trace in the terminal too.
    console.error('[error.tsx]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-7xl text-destructive sm:text-8xl">!</p>
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
        Qualcosa è andato storto
      </h1>
      <p className="max-w-md text-muted-foreground">
        Si è verificato un errore inatteso. Riprova fra qualche istante.
        {error.digest ? (
          <>
            <br />
            <span className="text-xs">ID errore: {error.digest}</span>
          </>
        ) : null}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset}>Riprova</Button>
        <Button asChild variant="outline">
          <Link href="/">Torna alla home</Link>
        </Button>
      </div>
    </div>
  )
}
