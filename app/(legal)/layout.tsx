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

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" aria-label="Torna alla home Quotal">
            <Logo />
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <article className="prose prose-stone max-w-none">{children}</article>
      </main>

      <LegalFooter />
    </div>
  )
}
