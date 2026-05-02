/**
 * Create-member form. Loads the active plans server-side so the dropdown
 * is server-rendered with stable data.
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { MemberForm } from '@/components/owner/member-form'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { getActiveSubscriptionPlans } from '@/lib/queries/owner'

export default async function NewMemberPage() {
  const plans = await getActiveSubscriptionPlans()

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link href="/dashboard/membri">
          <ArrowLeftIcon className="size-3.5" />
          Torna alla lista
        </Link>
      </Button>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Membri</PageHeaderEyebrow>
          <PageHeaderHeading>Nuovo membro</PageHeaderHeading>
          <PageHeaderDescription>
            Aggiungi un membro alla palestra. Riceverà un&apos;email con un link
            per impostare la sua password.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <MemberForm mode="create" plans={plans} />
    </div>
  )
}
