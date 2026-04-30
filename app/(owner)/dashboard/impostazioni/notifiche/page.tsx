/**
 * `/dashboard/impostazioni/notifiche` — owner notification preferences.
 *
 * Lets the titolare opt out of any of the owner-side emails (daily
 * digest, payment-failed alerts, new-member alerts, monthly report).
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { OwnerNotificationPreferencesForm } from '@/components/owner/owner-notification-preferences-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireOwnerOrStaff } from '@/lib/auth'
import { getNotificationPreferences } from '@/lib/queries/notifications'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notifiche',
}

export default async function OwnerNotificationsSettingsPage() {
  const profile = await requireOwnerOrStaff()
  const prefs = await getNotificationPreferences(profile.id)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard/impostazioni"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon size={14} /> Impostazioni
      </Link>
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Configurazione</p>
        <h1 className="font-display text-3xl tracking-tight">Notifiche</h1>
        <p className="text-sm text-muted-foreground">
          Scegli quali email ricevere. Le impostazioni sono per-utente:
          ogni titolare e collaboratore decide da sé.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Le tue preferenze</CardTitle>
        </CardHeader>
        <CardContent>
          <OwnerNotificationPreferencesForm initial={prefs} />
        </CardContent>
      </Card>
    </div>
  )
}
