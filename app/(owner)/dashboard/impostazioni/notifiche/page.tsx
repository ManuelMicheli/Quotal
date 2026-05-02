/**
 * `/dashboard/impostazioni/notifiche` — owner notification preferences.
 *
 * Lets the titolare opt out of any of the owner-side emails (daily
 * digest, payment-failed alerts, new-member alerts, monthly report).
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { OwnerNotificationPreferencesForm } from '@/components/owner/owner-notification-preferences-form'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
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
    <div className="flex flex-col gap-6 md:gap-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link href="/dashboard/impostazioni">
          <ArrowLeftIcon className="size-3.5" />
          Tutte le impostazioni
        </Link>
      </Button>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Impostazioni</PageHeaderEyebrow>
          <PageHeaderHeading>Notifiche</PageHeaderHeading>
          <PageHeaderDescription>
            Scegli quali email ricevere. Le impostazioni sono per-utente:
            ogni titolare e collaboratore decide da sé.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Le tue preferenze</CardTitle>
        </CardHeader>
        <CardContent>
          <OwnerNotificationPreferencesForm initial={prefs} />
        </CardContent>
      </Card>
    </div>
  )
}
