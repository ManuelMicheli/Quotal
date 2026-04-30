/**
 * One-shot owner onboarding page.
 *
 * Disabled by default — opt-in via `ENABLE_OWNER_ONBOARDING=true`. Even when
 * enabled, the route refuses to proceed if any owner profile already exists
 * (defence in depth — see `ownerOnboardingAction`).
 *
 * Once the first owner is set up, flip the env var to `false` and redeploy.
 */
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { OwnerOnboardingForm } from '@/components/auth/owner-onboarding-form'
import { AuthForm } from '@/components/shared/auth-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ROLES } from '@/lib/constants'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function OwnerOnboardingPage() {
  // 1. Hard env-var gate. If the operator hasn't explicitly enabled the
  // route, render a friendly disabled state rather than 404 — gives a
  // useful hint to whoever is bootstrapping the app for the first time.
  if (env.ENABLE_OWNER_ONBOARDING !== 'true') {
    return (
      <AuthForm
        title="Onboarding titolare"
        description="Pagina disabilitata per sicurezza."
      >
        <Alert>
          <AlertTitle>Onboarding non disponibile</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Per attivare il setup iniziale del titolare, imposta la variabile
              d’ambiente{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                ENABLE_OWNER_ONBOARDING=true
              </code>{' '}
              e riavvia l’applicazione.
            </p>
            <p>
              Disattiva la variabile dopo il primo accesso per bloccare la
              creazione di altri titolari.
            </p>
          </AlertDescription>
        </Alert>
        <p className="text-sm">
          Hai già un account?{' '}
          <Link
            href="/login"
            className="font-medium underline-offset-4 hover:underline"
          >
            Accedi
          </Link>
        </p>
      </AuthForm>
    )
  }

  // 2. DB-level gate — refuse if an owner already exists. This catches the
  // case where ENABLE_OWNER_ONBOARDING was left on after the first setup.
  // Uses the admin client because the page renders anonymously (no session
  // yet) and we still need to read profiles.row count.
  try {
    const admin = createAdminClient()
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', ROLES.OWNER)
    if ((count ?? 0) > 0) {
      redirect('/login?error=owner_exists')
    }
  } catch (err) {
    // In Next.js 16, redirect() throws an Error whose `message` is
    // 'NEXT_REDIRECT' (and whose `digest` begins with 'NEXT_REDIRECT;…').
    // The previous check on `err.name` never matched and swallowed the
    // redirect. Match by message OR digest to be safe across versions.
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' ||
        (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err
    }
    return (
      <AuthForm
        title="Configurazione necessaria"
        description="La service role key Supabase non è configurata."
      >
        <Alert variant="destructive">
          <AlertTitle>SUPABASE_SERVICE_ROLE_KEY mancante</AlertTitle>
          <AlertDescription>
            Imposta la variabile d’ambiente{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{' '}
            nel file{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              .env.local
            </code>{' '}
            con il valore della service role chiave (Supabase Dashboard →
            Settings → API).
          </AlertDescription>
        </Alert>
      </AuthForm>
    )
  }

  return (
    <AuthForm
      title="Configura la tua palestra"
      description="Imposta il tuo account titolare e i dati della palestra. Questa pagina è disponibile solo al primo avvio."
    >
      <OwnerOnboardingForm />
    </AuthForm>
  )
}
