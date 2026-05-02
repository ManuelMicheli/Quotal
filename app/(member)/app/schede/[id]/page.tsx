/**
 * Member PWA — read-only detail of a single workout plan.
 *
 * Header shows the title, optional split label and active badge. Body lists
 * each training day as its own card with weekday chip, day notes and the
 * exercise breakdown.
 */
import { CalendarIcon, ClockIcon, DumbbellIcon, RepeatIcon } from 'lucide-react'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/member/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireMember } from '@/lib/auth'
import type { WorkoutDay, WorkoutExercise } from '@/lib/domain-types'
import { formatDate } from '@/lib/format'
import { getMemberWorkoutPlan } from '@/lib/queries/member'

export const dynamic = 'force-dynamic'

const WEEKDAY_LABELS = [
  '',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica',
] as const

function formatRest(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || seconds <= 0) return null
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export default async function MemberWorkoutPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await requireMember()
  const plan = await getMemberWorkoutPlan(profile.id, id)
  if (!plan) notFound()

  const days = (plan.days ?? []) as WorkoutDay[]

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <PageHeader
        title={plan.title}
        subtitle={
          plan.split
            ? `${plan.split} · Aggiornata ${formatDate(plan.updated_at, 'short')}`
            : `Aggiornata ${formatDate(plan.updated_at, 'short')}`
        }
        action={
          plan.is_active ? (
            <Badge
              variant="outline"
              className="bg-success/10 text-success border-success/20"
            >
              Attiva
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-muted text-muted-foreground"
            >
              Archiviata
            </Badge>
          )
        }
      />

      {plan.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Note del trainer</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {plan.notes}
          </CardContent>
        </Card>
      ) : null}

      {days.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nessun giorno di allenamento configurato.
          </CardContent>
        </Card>
      ) : (
        <ol className="flex flex-col gap-4">
          {days.map((day, dayIdx) => {
            const exercises = (day.exercises ?? []) as WorkoutExercise[]
            const weekday =
              typeof day.day_of_week === 'number' &&
              day.day_of_week >= 1 &&
              day.day_of_week <= 7
                ? WEEKDAY_LABELS[day.day_of_week]
                : null
            return (
              <li key={day.id ?? dayIdx}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {day.label || `Giorno ${dayIdx + 1}`}
                      </CardTitle>
                      {weekday ? (
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1"
                        >
                          <CalendarIcon className="size-3" />
                          {weekday}
                        </Badge>
                      ) : null}
                    </div>
                    {day.notes ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {day.notes}
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {exercises.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        Nessun esercizio per questo giorno.
                      </p>
                    ) : (
                      <ol className="flex flex-col gap-2">
                        {exercises.map((ex, exIdx) => {
                          const rest = formatRest(ex.rest_seconds)
                          return (
                            <li
                              key={exIdx}
                              className="rounded-lg border border-border bg-background/50 p-3"
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                  {String(exIdx + 1).padStart(2, '0')}
                                </span>
                                <h3 className="text-sm font-semibold">
                                  {ex.name}
                                </h3>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {typeof ex.sets === 'number' && ex.sets > 0 ? (
                                  <span className="inline-flex items-center gap-1">
                                    <DumbbellIcon className="size-3.5" />
                                    {ex.sets} serie
                                  </span>
                                ) : null}
                                {ex.reps ? (
                                  <span className="inline-flex items-center gap-1">
                                    <RepeatIcon className="size-3.5" />
                                    {ex.reps}
                                  </span>
                                ) : null}
                                {rest ? (
                                  <span className="inline-flex items-center gap-1">
                                    <ClockIcon className="size-3.5" />
                                    Recupero {rest}
                                  </span>
                                ) : null}
                              </div>
                              {ex.notes ? (
                                <p className="mt-2 whitespace-pre-wrap text-xs">
                                  {ex.notes}
                                </p>
                              ) : null}
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
