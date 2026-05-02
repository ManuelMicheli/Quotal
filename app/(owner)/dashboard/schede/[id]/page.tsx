/**
 * Edit a single workout plan: title, notes, exercises, active flag. Includes
 * a destructive "Elimina" button.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DeleteWorkoutPlanButton } from '@/components/owner/delete-workout-plan-button'
import { WorkoutPlanForm } from '@/components/owner/workout-plan-form'
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
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/schede"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Torna alle schede
        </Link>
        <DeleteWorkoutPlanButton
          planId={plan.id}
          redirectTo="/dashboard/schede"
        />
      </div>
      <header>
        <p className="text-sm text-muted-foreground">Modifica scheda</p>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">
          {plan.title}
        </h1>
      </header>
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
