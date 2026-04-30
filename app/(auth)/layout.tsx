/**
 * Auth-area layout — centred card on a soft brand background, no nav.
 *
 * Used by login, signup, reset-password, update-password, and the one-shot
 * owner onboarding. Keeps the visual language tight so the auth flow feels
 * like a single experience.
 */
import Link from 'next/link'

import { Logo } from '@/components/shared/logo'
import { APP_NAME } from '@/lib/constants'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <Link
        href="/"
        className="mb-8 inline-flex items-center justify-center"
        aria-label="Quotal — torna alla home"
      >
        <Logo size="md" />
      </Link>

      <main className="w-full max-w-[420px]">{children}</main>

      <footer className="mt-10 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <nav className="flex gap-3">
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
