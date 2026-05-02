/**
 * `/app/profilo/notifiche` — member notification preferences.
 *
 * Two cards: "abilita push" toggle (browser permission flow), and the
 * channel + per-event preference form. Owner-side toggles are exposed
 * separately under /dashboard/impostazioni/notifiche.
 */
import { BellIcon, SlidersHorizontalIcon } from 'lucide-react'

import { EnablePushButton } from '@/components/member/enable-push-button'
import { NotificationPreferencesForm } from '@/components/member/notification-preferences-form'
import { PageHeader } from '@/components/member/page-header'
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
    <div className="flex flex-col gap-5 md:gap-8">
      <PageHeader title="Notifiche" subtitle={profile.email} showBack />

      <div className="grid gap-5 md:gap-6 lg:grid-cols-12">
        <section className="ring-soft overflow-hidden rounded-3xl bg-card lg:col-span-5 lg:self-start">
          <div className="flex items-start gap-3 px-5 pt-5 md:px-6">
            <span className="bg-accent-soft text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
              <BellIcon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold tracking-tight">
                Notifiche push
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Avvisi sul telefono anche con la PWA chiusa.
              </p>
            </div>
          </div>
          <div className="px-5 pb-5 pt-4 md:px-6">
            <EnablePushButton vapidPublicKey={vapidPublic} />
          </div>
        </section>

        <section className="ring-soft overflow-hidden rounded-3xl bg-card lg:col-span-7">
          <div className="flex items-start gap-3 px-5 pt-5 md:px-6">
            <span className="bg-info-soft text-info flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
              <SlidersHorizontalIcon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold tracking-tight">
                Cosa vuoi ricevere
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Personalizza email e push per ogni tipo di evento.
              </p>
            </div>
          </div>
          <div className="px-5 pb-5 pt-4 md:px-6">
            <NotificationPreferencesForm initial={prefs} />
          </div>
        </section>
      </div>
    </div>
  )
}
