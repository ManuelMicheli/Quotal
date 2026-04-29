/**
 * Member signup page.
 *
 * Owners are NOT created here — see `/onboarding-titolare` for the one-shot
 * owner setup flow.
 */
import Link from 'next/link'

import { SignupForm } from '@/components/auth/signup-form'
import { AuthForm } from '@/components/shared/auth-form'

export default function SignupPage() {
  return (
    <AuthForm
      title="Crea il tuo account"
      description="Registrati per gestire il tuo abbonamento dalla palestra."
      footer={
        <p>
          Hai già un account?{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Accedi
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthForm>
  )
}
