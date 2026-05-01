/**
 * Login page — premium dark redesign.
 *
 * Renders the silky shell, the Q logo card, OAuth buttons, an "or" divider,
 * and the email/password form. Both the form and the OAuth button group
 * read the optional `next` param so we can resume an interrupted route.
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
    <AuthShell>
      <div className="w-full">
        <QuotalLogoCard />

        <div className="space-y-2 text-center">
          <h1 className="font-display text-[28px] font-medium leading-tight text-white md:text-[32px]">
            {isOwnerCopy ? 'Accedi come titolare' : 'Bentornato'}
          </h1>
          <p className="text-sm text-zinc-400">
            Hai una palestra?{' '}
            <Link
              href="/onboarding-titolare"
              className="font-medium text-zinc-100 transition-colors hover:text-teal-400"
            >
              Registrala
            </Link>
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <OAuthButtons next={next} />
          <AuthDivider label="oppure" />
          <LoginForm initialError={initialError} />
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-zinc-500">
          Sei un iscritto? Usa il link di iscrizione condiviso dalla tua palestra.
        </p>
      </div>
    </AuthShell>
  )
}
