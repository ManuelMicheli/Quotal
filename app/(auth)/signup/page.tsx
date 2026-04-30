/**
 * Member signup page — premium dark.
 *
 * Multi-tenant: requires a `?gym=<slug>` query param so the new member is
 * linked to the right gym. Without it (or with an invalid slug) we render a
 * friendly hint asking the user to use the link the gym shared.
 *
 * Owners are NOT created here — see `/onboarding-titolare` for the public
 * gym-creation flow.
 */
import Link from 'next/link'

import { AuthDivider } from '@/components/auth/auth-divider'
import { AuthShell } from '@/components/auth/auth-shell'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'
import { SignupForm } from '@/components/auth/signup-form'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Registrati',
}

type SearchParams = Promise<{ error?: string; gym?: string }>

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error, gym: gymSlugParam } = await searchParams
  const initialError = error ? decodeURIComponent(error) : undefined
  const gymSlug = gymSlugParam?.trim().toLowerCase() || ''

  // Resolve the target gym server-side so we can show a tailored heading
  // (and refuse to render the form when the slug is missing/invalid).
  let gymName: string | null = null
  if (gymSlug) {
    const admin = createAdminClient()
    const { data: gym } = await admin
      .from('gyms')
      .select('name')
      .eq('slug', gymSlug)
      .maybeSingle()
    gymName = gym?.name ?? null
  }

  if (!gymSlug || !gymName) {
    return (
      <AuthShell>
        <div className="w-full">
          <QuotalLogoCard />

          <div className="space-y-2 text-center">
            <h1 className="font-display text-[28px] font-medium leading-tight text-white md:text-[32px]">
              Link iscrizione mancante
            </h1>
            <p className="text-sm text-zinc-400">
              Per registrarti come iscritto serve il link condiviso dalla tua
              palestra.
            </p>
          </div>

          <div className="mt-10 rounded-xl bg-zinc-900/60 p-5 text-sm text-zinc-300 ring-1 ring-zinc-800">
            <p className="mb-2 font-medium text-zinc-100">Cosa fare</p>
            <ul className="list-disc space-y-1 pl-5 text-zinc-400">
              <li>Chiedi al titolare il link diretto di iscrizione.</li>
              <li>
                Se sei un titolare, crea la tua palestra dalla{' '}
                <Link
                  href="/onboarding-titolare"
                  className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
                >
                  pagina dedicata
                </Link>
                .
              </li>
            </ul>
          </div>

          <p className="mt-8 text-center text-sm text-zinc-400">
            Hai già un account?{' '}
            <Link
              href="/login"
              className="font-medium text-zinc-100 transition-colors hover:text-teal-400"
            >
              Accedi
            </Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="w-full">
        <QuotalLogoCard />

        <div className="space-y-2 text-center">
          <h1 className="font-display text-[28px] font-medium leading-tight text-white md:text-[32px]">
            Iscriviti a {gymName}
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
          <SignupForm initialError={initialError} gymSlug={gymSlug} />
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
