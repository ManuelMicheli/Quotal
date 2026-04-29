/**
 * Auth-area layout — centred card on a soft brand background, no nav.
 *
 * Used by login, signup, reset-password, update-password, and the one-shot
 * owner onboarding. Keeps the visual language tight so the auth flow feels
 * like a single experience.
 */
import Link from 'next/link'

import { Logo } from '@/components/shared/logo'

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

      <footer className="mt-10 text-xs text-muted-foreground">
        &copy; 2026 Quotal
      </footer>
    </div>
  )
}
