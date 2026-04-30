/**
 * Global 404. Branded, links back to the right destination based on the
 * user's role inferred from the URL hint (best-effort — the user might not
 * be signed in here).
 */
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'

export const metadata = {
  title: 'Pagina non trovata',
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-7xl text-muted-foreground sm:text-8xl">
        404
      </p>
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
        Pagina non trovata
      </h1>
      <p className="max-w-md text-muted-foreground">
        L&apos;indirizzo che hai inserito non esiste o è stato spostato.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/">Torna alla home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Accedi</Link>
        </Button>
      </div>
      <p className="mt-12 text-xs text-muted-foreground">
        © {new Date().getFullYear()} {APP_NAME}
      </p>
    </div>
  )
}
