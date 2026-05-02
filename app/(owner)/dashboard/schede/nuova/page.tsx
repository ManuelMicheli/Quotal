/**
 * Create a new workout plan. Member is selected from the dropdown — defaults
 * from `?member=<id>` so the owner can deep-link from a member detail page.
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { WorkoutPlanForm } from '@/components/owner/workout-plan-form'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { getMembersList } from '@/lib/queries/owner'

export const dynamic = 'force-dynamic'

export default async function NewWorkoutPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>
}) {
  const sp = await searchParams
  // Pull all members in the gym so the trainer can pick any of them. Page
  // size is generous because gyms with thousands of members are out of scope
  // for the MVP — paginate later if needed.
  const { members } = await getMembersList({ pageSize: 500 })
  const lightweight = members.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
  }))

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link href="/dashboard/schede">
          <ArrowLeftIcon className="size-3.5" />
          Torna alle schede
        </Link>
      </Button>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Allenamenti</PageHeaderEyebrow>
          <PageHeaderHeading>Nuova scheda</PageHeaderHeading>
        </PageHeaderContent>
      </PageHeader>
      <WorkoutPlanForm
        mode="create"
        members={lightweight}
        defaultMemberId={sp.member ?? null}
      />
    </div>
  )
}
