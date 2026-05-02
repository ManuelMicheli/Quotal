/**
 * `/app/profilo/notifiche` — member notification preferences.
 *
 * Two cards: "abilita push" toggle (browser permission flow), and the
 * channel + per-event preference form. Owner-side toggles are exposed
 * separately under /dashboard/impostazioni/notifiche.
 */
import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { EnablePushButton } from '@/components/member/enable-push-button'
import { NotificationPreferencesForm } from '@/components/member/notification-preferences-form'
import { PageHeader } from '@/components/member/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireMember } from '@/lib/auth'
import { env } from '@/lib/env'
import { getNotificationPreferences } from '@/lib/queries/notifications'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notifiche',
}

export default async function MemberNotificationPreferencesPage() {
  const profile = await requireMember()
  const prefs = await getNotificationPreferences(profile.id)
  const vapidPublic = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title="Notifiche" subtitle={profile.email} showBack />

      <Link
        href="/app/profilo"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon size={14} /> Profilo
      </Link>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5 lg:self-start">
          <CardHeader>
            <CardTitle className="text-base">Notifiche push</CardTitle>
          </CardHeader>
          <CardContent>
            <EnablePushButton vapidPublicKey={vapidPublic} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Cosa vuoi ricevere</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesForm initial={prefs} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
