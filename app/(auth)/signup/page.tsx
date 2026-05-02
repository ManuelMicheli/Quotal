/**
 * Member signup page — premium auth shell.
 *
 * Multi-tenant: requires a `?gym=<slug>` query param so the new member is
 * linked to the right gym. Without it (or with an invalid slug) we render a
 * friendly hint asking the user to use the link the gym shared.
 *
 * Owners are NOT created here — see `/onboarding-titolare` for the public
 * gym-creation flow.
 */
import { Info } from 'lucide-react'
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
      <AuthShell width="md">
        <div className="glass-strong w-full rounded-2xl p-7 md:p-9">
          <QuotalLogoCard />

          <div className="space-y-3 text-center">
            <h1 className="heading-display text-foreground text-balance text-4xl md:text-[2.5rem]">
              Link iscrizione mancante
            </h1>
            <p className="text-muted-foreground text-pretty text-sm leading-relaxed">
              Per registrarti come iscritto serve il link condiviso dalla tua
              palestra.
            </p>
          </div>

          <div className="bg-card/40 border-border/70 mt-8 rounded-xl border p-5 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2">
              <Info className="text-accent size-4" aria-hidden="true" />
              <p className="text-foreground text-sm font-medium">Cosa fare</p>
            </div>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>Chiedi al titolare il link diretto di iscrizione.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>
                  Se sei un titolare, crea la tua palestra dalla{' '}
                  <Link
                    href="/onboarding-titolare"
                    className="text-accent hover:text-accent/80 font-medium underline underline-offset-2 transition-colors"
                  >
                    pagina dedicata
                  </Link>
                  .
                </span>
              </li>
            </ul>
          </div>

          <p className="text-muted-foreground mt-8 text-center text-sm">
            Hai già un account?{' '}
            <Link
              href="/login"
              className="text-foreground hover:text-accent font-medium transition-colors"
            >
              Accedi
            </Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell width="md">
      <div className="glass-strong w-full rounded-2xl p-7 md:p-9">
        <QuotalLogoCard />

        <div className="space-y-3 text-center">
          <p className="eyebrow">Iscrizione palestra</p>
          <h1 className="heading-display text-foreground text-balance text-4xl md:text-[2.5rem]">
            Iscriviti a {gymName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Hai già un account?{' '}
            <Link
              href="/login"
              className="text-foreground hover:text-accent font-medium transition-colors"
            >
              Accedi
            </Link>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <OAuthButtons gymSlug={gymSlug} />
          <AuthDivider label="oppure" />
          <SignupForm initialError={initialError} gymSlug={gymSlug} />
        </div>
      </div>

      <p className="text-muted-foreground mt-6 text-balance text-center text-xs leading-relaxed">
        Iscrivendoti, accetti i nostri{' '}
        <Link
          href="/termini"
          className="text-foreground hover:text-accent underline underline-offset-2 transition-colors"
        >
          Termini
        </Link>{' '}
        e la{' '}
        <Link
          href="/privacy"
          className="text-foreground hover:text-accent underline underline-offset-2 transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  )
}
