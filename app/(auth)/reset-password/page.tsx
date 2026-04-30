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
    <AuthShell>
      <div className="w-full">
        <QuotalLogoCard />

        <div className="space-y-2 text-center">
          <h1 className="font-display text-[28px] font-medium leading-tight text-white md:text-[32px]">
            Reimposta la password
          </h1>
          <p className="text-sm text-zinc-400">
            Inserisci la tua email. Ti invieremo un link per reimpostare la
            password.
          </p>
        </div>

        <div className="mt-10">
          <ResetPasswordForm />
        </div>

        <p className="mt-8 text-center text-sm text-zinc-400">
          Ti sei ricordato la password?{' '}
          <Link
            href="/login"
            className="font-medium text-zinc-100 transition-colors hover:text-teal-400"
          >
            Torna al login
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
