/**
 * Layout for legal pages (`/privacy`, `/termini`, `/cookie-policy`).
 *
 * Plain typography wrapper — no auth, no chrome. Linked from:
 *   - the public footer in landing/auth screens
 *   - the privacy section of the member profile page
 *   - the cookie banner ("Scopri di più")
 */
import Link from 'next/link'

import { LegalFooter } from '@/components/shared/legal-footer'
import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 px-6 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
        <div className="flex w-full items-center justify-between gap-4 md:px-4 lg:px-8">
          <Link href="/" aria-label="Torna alla home Quotal">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-4 text-sm text-muted-foreground md:flex">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/termini" className="hover:text-foreground">
                Termini
              </Link>
              <Link href="/cookie-policy" className="hover:text-foreground">
                Cookie
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="w-full flex-1 px-6 py-12 md:px-12 md:py-16 lg:px-20 lg:py-20 xl:px-32">
        <article className="prose prose-stone dark:prose-invert max-w-4xl">
          {children}
        </article>
      </main>

      <LegalFooter />
    </div>
  )
}
