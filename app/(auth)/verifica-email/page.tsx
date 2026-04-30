/**
 * Bridge page shown right after signup. Rendered as a fallback for the
 * inline confirmation state in `<SignupForm>` — used when the user
 * navigates here directly via `?email=` after closing the tab.
 */
import { Mail } from 'lucide-react'
import Link from 'next/link'

import { AuthShell } from '@/components/auth/auth-shell'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'

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
    <AuthShell>
      <div className="w-full">
        <QuotalLogoCard />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-teal-500/15 ring-1 ring-teal-400/30">
            <Mail className="size-5 text-teal-300" aria-hidden="true" />
          </div>

          <h1 className="font-display text-[28px] font-medium leading-tight text-white md:text-[32px]">
            Controlla la tua email
          </h1>

          <p className="max-w-sm text-sm text-zinc-400">
            {email ? (
              <>
                Abbiamo inviato un link di verifica a{' '}
                <span className="font-mono text-[13px] text-zinc-200">
                  {email}
                </span>
                . Clicca sul link per attivare il tuo account.
              </>
            ) : (
              'Abbiamo inviato un link di verifica al tuo indirizzo email. Clicca sul link per attivare il tuo account.'
            )}
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-100 transition-colors hover:text-teal-400"
          >
            Torna al login
          </Link>
          <Link
            href="/signup"
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Cambia indirizzo email
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}
