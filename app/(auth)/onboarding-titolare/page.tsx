/**
 * Public owner onboarding page.
 *
 * Self-service signup for a new gym (multi-tenant). Provisions a brand-new
 * gym row + owner user via `ownerOnboardingAction`. No env-var gate — abuse
 * is bounded by the rate limiter on the action and by VAT/email/slug
 * uniqueness checks.
 */
import { OnboardingShell } from '@/components/auth/onboarding-shell'
import { OwnerOnboardingForm } from '@/components/auth/owner-onboarding-form'
import { AuthForm } from '@/components/shared/auth-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Crea la tua palestra',
}

export default async function OwnerOnboardingPage() {
  return (
    <OnboardingShell>
      <AuthForm
        title="Configura la tua palestra"
        description="Crea il tuo account titolare e attiva subito la palestra su Quotal."
      >
        <OwnerOnboardingForm />
      </AuthForm>
    </OnboardingShell>
  )
}
