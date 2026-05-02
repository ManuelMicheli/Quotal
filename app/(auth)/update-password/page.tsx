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
    <AuthShell width="md">
      <div className="glass-strong w-full rounded-2xl p-7 md:p-9">
        <QuotalLogoCard />

        <div className="space-y-3 text-center">
          <p className="eyebrow">Sicurezza account</p>
          <h1 className="heading-display text-foreground text-balance text-4xl md:text-[2.5rem]">
            Imposta nuova password
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Scegli una password sicura per il tuo account.
          </p>
        </div>

        <div className="mt-8">
          <UpdatePasswordForm />
        </div>
      </div>
    </AuthShell>
  )
}
