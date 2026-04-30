/**
 * "Set a new password" page. Reached from the email link sent by
 * `resetPasswordAction`. Middleware allows the route as public; the
 * server action refuses if no recovery session is present.
 */
import { AuthShell } from '@/components/auth/auth-shell'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'
import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export const metadata = {
  title: 'Imposta nuova password',
}

export default function UpdatePasswordPage() {
  return (
    <AuthShell>
      <div className="w-full">
        <QuotalLogoCard />

        <div className="space-y-2 text-center">
          <h1 className="font-display text-[28px] font-medium leading-tight text-white md:text-[32px]">
            Imposta nuova password
          </h1>
          <p className="text-sm text-zinc-400">
            Scegli una password sicura per il tuo account.
          </p>
        </div>

        <div className="mt-10">
          <UpdatePasswordForm />
        </div>
      </div>
    </AuthShell>
  )
}
