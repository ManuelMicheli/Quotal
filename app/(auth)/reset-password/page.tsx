/**
 * Stand-alone password-reset page (no-JS fallback for the inline dialog
 * available from /login).
 */
import Link from 'next/link'

import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { AuthForm } from '@/components/shared/auth-form'

export default function ResetPasswordPage() {
  return (
    <AuthForm
      title="Reimposta la password"
      description="Inserisci la tua email: ti invieremo un link per impostare una nuova password."
      footer={
        <p>
          Ti sei ricordato la password?{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Torna al login
          </Link>
        </p>
      }
    >
      <ResetPasswordForm />
    </AuthForm>
  )
}
