/**
 * Member profile page — `/app/profilo`.
 *
 * Stacks five sections: profile (editable form), security (logout +
 * change password), privacy (GDPR placeholders), info app (version +
 * legal links — implemented in Phase 10).
 *
 * Server component for the data load; the form itself is a client
 * component (`ProfileForm`).
 */
import { KeyIcon } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { ProfileForm } from '@/components/member/profile-form'
import { LogoutButton } from '@/components/shared/logout-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireMember } from '@/lib/auth'
import { APP_NAME } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Profilo',
}

export default async function MemberProfilePage() {
  const profile = await requireMember()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Profilo"
        subtitle={profile.email}
        showBack={false}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">I tuoi dati</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sicurezza</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/reset-password">
              <KeyIcon size={16} />
              Cambia password
            </Link>
          </Button>
          <LogoutButton variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
            Esci
          </LogoutButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Esportazione e cancellazione dei tuoi dati saranno disponibili
            nelle prossime versioni dell&apos;app.
          </p>
          <p>
            Per richieste GDPR, scrivi a{' '}
            <a
              href="mailto:privacy@quotal.it"
              className="text-accent underline"
            >
              privacy@quotal.it
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Info app</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>{APP_NAME} v0.1.0</p>
          <p>© {new Date().getFullYear()} Quotal</p>
        </CardContent>
      </Card>
    </div>
  )
}
