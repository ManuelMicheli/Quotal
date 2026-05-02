/**
 * Subscription plans editor.
 *
 * Loads every plan (active + inactive) for the gym and renders the client-
 * side editor. The editor handles create/update/toggle/reorder via server
 * actions.
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { PlansEditor } from '@/components/owner/plans-editor'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { getSubscriptionPlans } from '@/lib/queries/owner'

export const dynamic = 'force-dynamic'

export default async function PlansSettingsPage() {
  const plans = await getSubscriptionPlans()

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
          <PageHeaderHeading>Piani abbonamento</PageHeaderHeading>
          <PageHeaderDescription>
            I membri sceglieranno tra questi piani. Nuovi piani richiedono di
            essere riassegnati ai membri esistenti — nessun rinnovo retroattivo.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <PlansEditor plans={plans} />
    </div>
  )
}
