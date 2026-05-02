/**
 * Public owner onboarding page.
 *
 * Self-service signup for a new gym (multi-tenant). Provisions a brand-new
 * gym row + owner user via `ownerOnboardingAction`. No env-var gate — abuse
 * is bounded by the rate limiter on the action and by VAT/email/slug
 * uniqueness checks.
 */
import Link from 'next/link'

import { OnboardingShell } from '@/components/auth/onboarding-shell'
import { OwnerOnboardingForm } from '@/components/auth/owner-onboarding-form'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Crea la tua palestra',
}

export default async function OwnerOnboardingPage() {
  return (
    <OnboardingShell>
      <div className="flex flex-col gap-10 py-6">
        <header className="flex flex-col items-center gap-4 text-center">
          <QuotalLogoCard />
          <p className="eyebrow">Crea la tua palestra</p>
          <h1 className="heading-display text-foreground text-balance text-4xl md:text-5xl">
            Configura la tua palestra
          </h1>
          <p className="text-muted-foreground text-pretty max-w-md text-base leading-relaxed">
            Crea il tuo account titolare e attiva subito la palestra su Quotal.
            Bastano due passaggi.
          </p>
        </header>

        <OwnerOnboardingForm />

        <p className="text-muted-foreground text-center text-sm">
          Hai già un account titolare?{' '}
          <Link
            href="/login?role=owner"
            className="text-foreground hover:text-accent font-medium transition-colors"
          >
            Accedi
          </Link>
        </p>
      </div>
    </OnboardingShell>
  )
}
