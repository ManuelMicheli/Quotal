/**
 * Edit a single workout plan: title, notes, exercises, active flag. Includes
 * a destructive "Elimina" button.
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DeleteWorkoutPlanButton } from '@/components/owner/delete-workout-plan-button'
import { WorkoutPlanForm } from '@/components/owner/workout-plan-form'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { getWorkoutPlanById } from '@/lib/queries/owner'

export const dynamic = 'force-dynamic'

export default async function EditWorkoutPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const plan = await getWorkoutPlanById(id)
  if (!plan) notFound()

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
          <PageHeaderEyebrow>Modifica scheda</PageHeaderEyebrow>
          <PageHeaderHeading>{plan.title}</PageHeaderHeading>
        </PageHeaderContent>
        <PageHeaderActions>
          <DeleteWorkoutPlanButton
            planId={plan.id}
            redirectTo="/dashboard/schede"
          />
        </PageHeaderActions>
      </PageHeader>
      <WorkoutPlanForm
        mode="edit"
        plan={plan}
        member={{
          id: plan.member.id,
          full_name: plan.member.full_name,
          email: plan.member.email,
        }}
      />
    </div>
  )
}
