/**
 * Member PWA — list of workout plans assigned to the current member.
 *
 * Active plans first, then archived ones. Each card links to the detail
 * view with the full exercise list.
 */
import { ClipboardListIcon, DumbbellIcon } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ClipboardListIcon className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Nessuna scheda ancora</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando il tuo trainer creerà una scheda per te la troverai
                qui.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
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
                  className="tap-shrink ring-floating block rounded-2xl bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold">
                        {plan.title}
                      </h2>
                      {plan.split ? (
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                          {plan.split}
                        </p>
                      ) : null}
                      <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <DumbbellIcon className="size-3.5" />
                        {days.length}{' '}
                        {days.length === 1 ? 'giorno' : 'giorni'}
                        <span aria-hidden="true">·</span>
                        {exerciseCount}{' '}
                        {exerciseCount === 1 ? 'esercizio' : 'esercizi'}
                        <span aria-hidden="true">·</span>
                        Aggiornata {formatDate(plan.updated_at, 'short')}
                      </p>
                    </div>
                    {!plan.is_active ? (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground"
                      >
                        Archiviata
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/20"
                      >
                        Attiva
                      </Badge>
                    )}
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
