/**
 * Static offline fallback rendered by the service worker.
 *
 * Cached at install-time so the SW can serve it without a round-trip
 * when the network is unreachable. Pure server component — no client
 * JS needed since by definition we have no network here.
 */
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'

export const metadata = {
  title: 'Offline',
}

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <span className="text-2xl">offline</span>
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight">
          Sei offline
        </h1>
        <p className="text-sm text-muted-foreground">
          Riconnettiti per aggiornare l&apos;abbonamento e i pagamenti. Il
          QR salvato resta visibile dalla home anche senza connessione.
        </p>
      </div>
      <Button asChild>
        <Link href="/app">Torna alla home</Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        {APP_NAME} — versione cache
      </p>
    </main>
  )
}
