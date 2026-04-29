/**
 * Login page.
 *
 * Server component — only loads the role-aware copy and the client form.
 * Middleware bounces signed-in users away before they reach this page,
 * but the components are stateless so re-rendering is cheap.
 */
import Link from 'next/link'

import { LoginForm } from '@/components/auth/login-form'
import { AuthForm } from '@/components/shared/auth-form'

type SearchParams = Promise<{ role?: string }>

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { role } = await searchParams
  const isOwnerCopy = role === 'owner'

  return (
    <AuthForm
      title={isOwnerCopy ? 'Accedi come titolare' : 'Bentornato'}
      description={
        isOwnerCopy
          ? 'Gestisci abbonamenti, pagamenti e membri della tua palestra.'
          : 'Accedi al tuo abbonamento e visualizza il tuo stato.'
      }
      footer={
        <div className="flex flex-col gap-1">
          <p>
            Non hai ancora un account?{' '}
            <Link
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Registrati
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm />
    </AuthForm>
  )
}
