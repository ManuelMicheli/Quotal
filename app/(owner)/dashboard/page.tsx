/**
 * Owner / staff dashboard — placeholder until Phase 04.
 *
 * Server component. Calls `requireOwnerOrStaff()`, which redirects to /login
 * for anonymous users and to /app for members. Middleware also performs
 * this check, but the server-side guard makes the page robust to misrouting.
 */
import { LogoutButton } from '@/components/shared/logout-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireOwnerOrStaff } from '@/lib/auth'
import { ROLES } from '@/lib/constants'

export default async function OwnerDashboardPage() {
  const profile = await requireOwnerOrStaff()
  const isOwner = profile.role === ROLES.OWNER

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Accesso come {isOwner ? 'titolare' : 'staff'}
          </p>
          <h1 className="font-display text-4xl tracking-tight">
            Benvenuto, {profile.full_name}
          </h1>
        </div>
        <LogoutButton size="sm" />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard in arrivo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Stiamo costruendo la dashboard nella prossima fase: KPI, abbonati,
          incassi, pagamenti in scadenza. Per ora puoi solo accedere e uscire.
        </CardContent>
      </Card>
    </main>
  )
}
