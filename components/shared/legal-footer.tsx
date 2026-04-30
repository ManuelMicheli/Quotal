/**
 * Legal footer used across landing/auth/legal pages.
 *
 * Displays the company identification line required for Italian e-commerce
 * (Codice del Consumo, art. 49) plus links to the four legal pages and a
 * "Cookie preferences" trigger.
 */
import Link from 'next/link'

import { LEGAL_CONFIG, legalEntityLine } from '@/lib/legal/config'

export function LegalFooter() {
  const c = LEGAL_CONFIG.company
  return (
    <footer className="border-t border-border/60 bg-muted/40 px-6 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{c.name}</p>
          <p>{legalEntityLine()}</p>
          <p className="space-x-2">
            {c.email ? (
              <a
                href={`mailto:${c.email}`}
                className="underline-offset-4 hover:underline"
              >
                {c.email}
              </a>
            ) : null}
            {c.pec ? (
              <>
                <span aria-hidden>·</span>
                <span>PEC: {c.pec}</span>
              </>
            ) : null}
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/termini" className="hover:text-foreground">
            Termini
          </Link>
          <Link href="/cookie-policy" className="hover:text-foreground">
            Cookie Policy
          </Link>
        </nav>
      </div>

      <p className="mx-auto mt-6 max-w-5xl text-xs">
        © {new Date().getFullYear()} {c.name}. Tutti i diritti riservati.
      </p>
    </footer>
  )
}
