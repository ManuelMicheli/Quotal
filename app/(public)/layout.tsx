/**
 * Public route group — no auth required.
 *
 * Hosts the `/pay/[token]` flow plus its `/success` and `/failed` screens.
 * Members never log in to pay; the token is the trust boundary, gated
 * server-side via `payment_sessions.token`.
 */
import Link from 'next/link'

import { LegalFooter } from '@/components/shared/legal-footer'
import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div
        aria-hidden="true"
        className="bg-mesh pointer-events-none fixed inset-0 -z-10 opacity-90"
      />
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none fixed inset-0 -z-10 opacity-30 mix-blend-multiply"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[42rem] bg-aurora-soft"
      />

      <header className="relative z-10 px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Torna alla home Quotal"
            className="rounded-md focus-glow"
          >
            <Logo size="sm" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>

      <LegalFooter />
    </div>
  )
}
