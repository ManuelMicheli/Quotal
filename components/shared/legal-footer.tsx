/**
 * Legal footer used across landing/auth/legal pages.
 *
 * Displays the company identification line required for Italian e-commerce
 * (Codice del Consumo, art. 49) plus links to the four legal pages and a
 * "Cookie preferences" trigger.
 */
import Link from 'next/link'

import { Logo } from '@/components/shared/logo'
import { LEGAL_CONFIG, legalEntityLine } from '@/lib/legal/config'

const LINKS: { href: string; label: string }[] = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/termini', label: 'Termini' },
  { href: '/cookie-policy', label: 'Cookie Policy' },
]

export function LegalFooter() {
  const c = LEGAL_CONFIG.company
  return (
    <footer className="relative z-10 border-t border-border/60 bg-background/60 px-5 py-12 text-sm text-muted-foreground sm:px-8 sm:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              aria-label="Quotal"
              className="inline-flex w-fit rounded-md focus-glow"
            >
              <Logo size="sm" />
            </Link>
            <p className="max-w-md text-pretty leading-relaxed">
              Gestione abbonamenti palestra, pagamenti e accessi.
              <br />
              Made in Italy.
            </p>
          </div>

          <nav
            aria-label="Pagine legali"
            className="flex flex-wrap items-center gap-x-1 gap-y-2"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <hr className="border-border/60" />

        <div className="flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">{c.name}</p>
            <p>{legalEntityLine()}</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {c.email ? (
                <a
                  href={`mailto:${c.email}`}
                  className="text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {c.email}
                </a>
              ) : null}
              {c.email && c.pec ? <span aria-hidden>·</span> : null}
              {c.pec ? <span>PEC: {c.pec}</span> : null}
            </p>
          </div>
          <p className="tabular text-muted-foreground/80">
            © {new Date().getFullYear()} {c.name}. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  )
}
