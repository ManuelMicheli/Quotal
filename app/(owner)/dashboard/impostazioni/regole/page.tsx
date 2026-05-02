/**
 * Operating-rules settings: grace period, suspension cap, notification days.
 * Stored in `gyms.settings` JSONB.
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GymRulesForm } from '@/components/owner/gym-rules-form'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
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
          <PageHeaderHeading>Regole operative</PageHeaderHeading>
          <PageHeaderDescription>
            Tolleranza scadenza, limite sospensioni e promemoria automatici.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <GymRulesForm settings={settings} />
    </div>
  )
}
