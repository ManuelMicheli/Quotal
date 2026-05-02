/**
 * Create a new workout plan. Member is selected from the dropdown — defaults
 * from `?member=<id>` so the owner can deep-link from a member detail page.
 */
import Link from 'next/link'

import { WorkoutPlanForm } from '@/components/owner/workout-plan-form'
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
      <div>
        <Link
          href="/dashboard/schede"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Torna alle schede
        </Link>
      </div>
      <header>
        <p className="text-sm text-muted-foreground">Allenamenti</p>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">
          Nuova scheda
        </h1>
      </header>
      <WorkoutPlanForm
        mode="create"
        members={lightweight}
        defaultMemberId={sp.member ?? null}
      />
    </div>
  )
}
