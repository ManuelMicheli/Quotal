/**
 * Auth-area layout — intentionally a pass-through.
 *
 * Each page in this group wraps itself with the appropriate shell:
 *   - login / signup / reset-password / update-password / verifica-email
 *     → `<AuthShell>` (premium dark, see `components/auth/auth-shell.tsx`)
 *   - onboarding-titolare → `<OnboardingShell>` (warm light, fits the rest
 *     of the owner app)
 */
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
