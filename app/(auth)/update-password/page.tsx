/**
 * "Set a new password" page. Reached from the email link sent by
 * `resetPasswordAction`. The middleware allows it as a public route, but
 * `updatePasswordAction` will refuse if no recovery session is present.
 */
import { UpdatePasswordForm } from '@/components/auth/update-password-form'
import { AuthForm } from '@/components/shared/auth-form'

export default function UpdatePasswordPage() {
  return (
    <AuthForm
      title="Imposta una nuova password"
      description="Scegli una nuova password per il tuo account Quotal."
    >
      <UpdatePasswordForm />
    </AuthForm>
  )
}
