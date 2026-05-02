/**
 * Stand-alone reset-password page.
 *
 * Sends a magic link via `resetPasswordAction`; the link lands on
 * `/auth/callback?next=/update-password` to swap the recovery code for a
 * session before the user picks a new password.
 */
import Link from 'next/link'

import { AuthShell } from '@/components/auth/auth-shell'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata = {
  title: 'Reimposta password',
}

export default function ResetPasswordPage() {
  return (
    <AuthShell width="md">
      <div className="glass-strong w-full rounded-2xl p-7 md:p-9">
        <QuotalLogoCard />

        <div className="space-y-3 text-center">
          <p className="eyebrow">Recupero account</p>
          <h1 className="heading-display text-foreground text-balance text-4xl md:text-[2.5rem]">
            Reimposta la password
          </h1>
          <p className="text-muted-foreground text-pretty mx-auto max-w-sm text-sm leading-relaxed">
            Inserisci la tua email. Ti invieremo un link per reimpostare la
            password.
          </p>
        </div>

        <div className="mt-8">
          <ResetPasswordForm />
        </div>
      </div>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Ti sei ricordato la password?{' '}
        <Link
          href="/login"
          className="text-foreground hover:text-accent font-medium transition-colors"
        >
          Torna al login
        </Link>
      </p>
    </AuthShell>
  )
}
