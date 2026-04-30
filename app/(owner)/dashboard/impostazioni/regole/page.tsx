/**
 * Operating-rules settings: grace period, suspension cap, notification days.
 * Stored in `gyms.settings` JSONB.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GymRulesForm } from '@/components/owner/gym-rules-form'
import { DEFAULT_GYM_SETTINGS } from '@/lib/constants'
import type { GymSettings } from '@/lib/domain-types'
import { getCurrentGym } from '@/lib/queries/gym'

export const dynamic = 'force-dynamic'

export default async function GymRulesPage() {
  const gym = await getCurrentGym()
  if (!gym) notFound()

  const stored = (gym.settings ?? {}) as Partial<GymSettings>
  const settings: GymSettings = {
    gracePeriodDays:
      stored.gracePeriodDays ?? DEFAULT_GYM_SETTINGS.gracePeriodDays,
    maxSuspensionDaysPerYear:
      stored.maxSuspensionDaysPerYear ??
      DEFAULT_GYM_SETTINGS.maxSuspensionDaysPerYear,
    expiryNotificationDays:
      stored.expiryNotificationDays ??
      [...DEFAULT_GYM_SETTINGS.expiryNotificationDays],
    postExpiryNotificationDays:
      stored.postExpiryNotificationDays ??
      [...DEFAULT_GYM_SETTINGS.postExpiryNotificationDays],
    currency: stored.currency ?? 'EUR',
    locale: stored.locale ?? 'it-IT',
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard/impostazioni"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Tutte le impostazioni
        </Link>
      </div>
      <header>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">Regole operative</h1>
        <p className="text-sm text-muted-foreground">
          Tolleranza scadenza, limite sospensioni e promemoria automatici.
        </p>
      </header>
      <GymRulesForm settings={settings} />
    </div>
  )
}
