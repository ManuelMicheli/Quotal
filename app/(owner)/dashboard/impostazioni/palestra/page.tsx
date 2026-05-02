/**
 * Gym settings — name, P.IVA, address, brand color.
 *
 * Loads the gym row server-side and hands it to a client form. The form
 * round-trips through `updateGymSettingsAction` for validation + revalidation.
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GymSettingsForm } from '@/components/owner/gym-settings-form'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { getCurrentGym } from '@/lib/queries/gym'

export default async function GymSettingsPage() {
  const gym = await getCurrentGym()
  if (!gym) notFound()

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
          <PageHeaderHeading>Palestra</PageHeaderHeading>
          <PageHeaderDescription>
            Dati che appariranno su ricevute, fatture e comunicazioni ai membri.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <GymSettingsForm gym={gym} />
    </div>
  )
}
