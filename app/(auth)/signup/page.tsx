/**
 * Member signup page — premium dark.
 *
 * Owners are NOT created here — see `/onboarding-titolare` for the one-shot
 * owner setup flow.
 */
import Link from 'next/link'

import { AuthDivider } from '@/components/auth/auth-divider'
import { AuthShell } from '@/components/auth/auth-shell'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata = {
  title: 'Registrati',
}

type SearchParams = Promise<{ error?: string }>

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const initialError = error ? decodeURIComponent(error) : undefined

  return (
    <AuthShell>
      <div className="w-full">
        <QuotalLogoCard />

        <div className="space-y-2 text-center">
          <h1 className="font-display text-[28px] font-medium leading-tight text-white md:text-[32px]">
            Crea un account Quotal
          </h1>
          <p className="text-sm text-zinc-400">
            Hai già un account?{' '}
            <Link
              href="/login"
              className="font-medium text-zinc-100 transition-colors hover:text-teal-400"
            >
              Accedi
            </Link>
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <OAuthButtons />
          <AuthDivider label="oppure" />
          <SignupForm initialError={initialError} />
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-zinc-500">
          Iscrivendoti, accetti i nostri{' '}
          <Link
            href="/termini"
            className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
          >
            Termini
          </Link>{' '}
          e la{' '}
          <Link
            href="/privacy"
            className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  )
}
