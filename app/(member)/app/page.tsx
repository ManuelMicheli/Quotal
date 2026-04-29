/**
 * Member PWA home — placeholder until Phase 07.
 *
 * Server component. Calls `requireMember()`, which redirects to /login for
 * anonymous users and to /dashboard for owners/staff.
 */
import { LogoutButton } from '@/components/shared/logout-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireMember } from '@/lib/auth'

export default async function MemberAppPage() {
  const profile = await requireMember()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Il tuo abbonamento</p>
          <h1 className="font-display text-3xl tracking-tight">
            Ciao, {profile.full_name}
          </h1>
        </div>
        <LogoutButton size="sm" />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>App membro in arrivo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Qui troverai presto lo stato dell’abbonamento, lo storico dei
          pagamenti e il QR per l’accesso alla palestra.
        </CardContent>
      </Card>
    </main>
  )
}
