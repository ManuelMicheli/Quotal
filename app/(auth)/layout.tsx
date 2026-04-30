/**
 * Auth-area layout — centred card on a soft aurora background, no nav.
 *
 * Used by login, signup, reset-password, update-password, and the one-shot
 * owner onboarding. Keeps the visual language tight so the auth flow feels
 * like a single experience.
 */
import Link from 'next/link'

import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { APP_NAME } from '@/lib/constants'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-10 md:py-16">
      <div
        aria-hidden="true"
        className="bg-aurora pointer-events-none fixed inset-x-0 top-0 h-[70vh]"
      />
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none fixed inset-0 opacity-40 mix-blend-multiply"
      />

      <div className="absolute right-4 top-4 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <Link
        href="/"
        className="relative mb-10 inline-flex items-center justify-center"
        aria-label="Quotal — torna alla home"
      >
        <Logo size="md" />
      </Link>

      <main className="relative w-full max-w-[440px]">{children}</main>

      <footer className="relative mt-12 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <nav className="flex gap-4">
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
        <p>
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </footer>
    </div>
  )
}
