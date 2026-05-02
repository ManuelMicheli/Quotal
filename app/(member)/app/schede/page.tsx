/**
 * Member PWA — list of workout plans assigned to the current member.
 *
 * Active plans first, then archived ones. Each card links to the detail
 * view with the full exercise list.
 */
import { CalendarIcon, ClipboardListIcon, DumbbellIcon } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { requireMember } from '@/lib/auth'
import type { WorkoutDay, WorkoutExercise } from '@/lib/domain-types'
import { formatDate } from '@/lib/format'
import { getMemberWorkoutPlans } from '@/lib/queries/member'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Schede',
}

export default async function MemberWorkoutPlansPage() {
  const profile = await requireMember()
  const plans = await getMemberWorkoutPlans(profile.id)

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <PageHeader
        title="Schede"
        subtitle="I tuoi programmi di allenamento"
        showBack={false}
      />

      {plans.length === 0 ? (
        <div className="ring-soft rounded-3xl bg-card">
          <EmptyState
            icon={<ClipboardListIcon />}
            title="Nessuna scheda ancora"
            description="Quando il tuo trainer creerà una scheda per te la troverai qui."
          />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const days = (plan.days ?? []) as WorkoutDay[]
            const exerciseCount = days.reduce(
              (sum, d) =>
                sum + ((d.exercises ?? []) as WorkoutExercise[]).length,
              0,
            )
            return (
              <li key={plan.id}>
                <Link
                  href={`/app/schede/${plan.id}`}
                  className="tap-shrink hover-lift ring-soft group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl bg-card p-5 transition-all"
                >
                  {plan.is_active ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-50"
                      style={{
                        background:
                          'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 28%, transparent), transparent)',
                      }}
                    />
                  ) : null}
                  <div className="relative flex items-start justify-between gap-3">
                    <span className="bg-accent-soft text-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                      <DumbbellIcon size={18} />
                    </span>
                    {plan.is_active ? (
                      <Badge variant="success">Attiva</Badge>
                    ) : (
                      <Badge variant="outline">Archiviata</Badge>
                    )}
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <h2 className="heading-display truncate text-xl">
                      {plan.title}
                    </h2>
                    {plan.split ? (
                      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                        {plan.split}
                      </p>
                    ) : null}
                  </div>
                  <div className="relative flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <DumbbellIcon className="size-3.5" />
                      <span className="tabular">
                        {days.length}
                        {' '}
                        {days.length === 1 ? 'giorno' : 'giorni'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular">
                        {exerciseCount}
                        {' '}
                        {exerciseCount === 1 ? 'es.' : 'es.'}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      <span className="tabular">
                        {formatDate(plan.updated_at, 'short')}
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
