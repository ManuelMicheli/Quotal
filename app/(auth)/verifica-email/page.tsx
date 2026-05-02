/**
 * Bridge page shown right after signup. Rendered as a fallback for the
 * inline confirmation state in `<SignupForm>` — used when the user
 * navigates here directly via `?email=` after closing the tab.
 */
import Link from 'next/link'

import { AuthShell } from '@/components/auth/auth-shell'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'
import { VerifyEmailHero } from '@/components/auth/verify-email-hero'

export const metadata = {
  title: 'Controlla la tua email',
}

type SearchParams = Promise<{ email?: string }>

export default async function VerificaEmailPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { email } = await searchParams

  return (
    <AuthShell width="md">
      <div className="glass-strong w-full rounded-2xl p-7 md:p-9">
        <QuotalLogoCard />

        <VerifyEmailHero email={email} />

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link
            href="/login"
            className="text-foreground hover:text-accent text-sm font-medium transition-colors"
          >
            Torna al login
          </Link>
          <Link
            href="/signup"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Cambia indirizzo email
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground mt-6 text-balance text-center text-xs leading-relaxed">
        Non vedi l’email? Controlla anche la cartella spam o promozioni.
      </p>
    </AuthShell>
  )
}
