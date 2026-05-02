/**
 * Login page — premium auth shell + glass card.
 *
 * Renders the aurora/mesh shell, the Q logo card, OAuth buttons, an "or"
 * divider, and the email/password form. Both the form and the OAuth button
 * group read the optional `next` param so we can resume an interrupted route.
 */
import Link from 'next/link'

import { AuthDivider } from '@/components/auth/auth-divider'
import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'

export const metadata = {
  title: 'Accedi',
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: 'Il link non è valido o è scaduto. Richiedine uno nuovo.',
  owner_exists:
    'Un titolare è già stato registrato. Effettua il login dalla pagina di accesso.',
}

type SearchParams = Promise<{
  next?: string
  error?: string
  role?: string
}>

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { next, error, role } = await searchParams
  const initialError = error
    ? (ERROR_MESSAGES[error] ?? decodeURIComponent(error))
    : undefined
  const isOwnerCopy = role === 'owner'

  return (
    <AuthShell width="md">
      <div className="glass-strong w-full rounded-2xl p-7 md:p-9">
        <QuotalLogoCard />

        <div className="space-y-3 text-center">
          <h1 className="heading-display text-foreground text-balance text-4xl md:text-[2.75rem]">
            {isOwnerCopy ? 'Accedi come titolare' : 'Bentornato'}
          </h1>
          <p className="text-muted-foreground text-sm">
            Hai una palestra?{' '}
            <Link
              href="/onboarding-titolare"
              className="text-foreground hover:text-accent font-medium transition-colors"
            >
              Registrala
            </Link>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <OAuthButtons next={next} />
          <AuthDivider label="oppure" />
          <LoginForm initialError={initialError} />
        </div>
      </div>

      <p className="text-muted-foreground mt-6 text-balance text-center text-xs leading-relaxed">
        Sei un iscritto? Usa il link di iscrizione condiviso dalla tua palestra.
      </p>
    </AuthShell>
  )
}
