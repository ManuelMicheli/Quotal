/**
 * Layout for legal pages (`/privacy`, `/termini`, `/cookie-policy`).
 *
 * Editorial long-form wrapper — no auth, no chrome. Linked from:
 *   - the public footer in landing/auth screens
 *   - the privacy section of the member profile page
 *   - the cookie banner ("Scopri di più")
 */
import Link from 'next/link'

import { LegalFooter } from '@/components/shared/legal-footer'
import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

const NAV_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/termini', label: 'Termini' },
  { href: '/cookie-policy', label: 'Cookie' },
]

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[28rem] bg-aurora-soft"
      />

      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="Torna alla home Quotal"
            className="rounded-md focus-glow"
          >
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <nav className="hidden gap-1 sm:flex">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          {children}
        </div>
      </main>

      <LegalFooter />
    </div>
  )
}
