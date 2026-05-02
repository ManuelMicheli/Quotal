/**
 * Member PWA — read-only detail of a single workout plan.
 *
 * Header shows the title, optional split label and active badge. Body lists
 * each training day as its own card with weekday chip, day notes and the
 * exercise breakdown.
 */
import {
  CalendarIcon,
  ClockIcon,
  DumbbellIcon,
  RepeatIcon,
} from 'lucide-react'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/member/page-header'
import { Badge } from '@/components/ui/badge'
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
            <Badge variant="success">Attiva</Badge>
          ) : (
            <Badge variant="outline">Archiviata</Badge>
          )
        }
      />

      {plan.notes ? (
        <section className="ring-soft rounded-3xl bg-card p-5 md:p-6">
          <p className="eyebrow">Note del trainer</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {plan.notes}
          </p>
        </section>
      ) : null}

      {days.length === 0 ? (
        <div className="ring-soft rounded-3xl bg-card p-10 text-center text-sm text-muted-foreground">
          Nessun giorno di allenamento configurato.
        </div>
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
                <article className="ring-soft overflow-hidden rounded-3xl bg-card">
                  <header className="flex flex-col gap-1 px-5 pb-3 pt-5 md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="bg-foreground text-background number flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold">
                          {String(dayIdx + 1).padStart(2, '0')}
                        </span>
                        <h2 className="heading-display text-xl md:text-2xl">
                          {day.label || `Giorno ${dayIdx + 1}`}
                        </h2>
                      </div>
                      {weekday ? (
                        <Badge variant="outline" className="gap-1">
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
                  </header>

                  <div className="px-5 pb-5 md:px-6">
                    {exercises.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
                        Nessun esercizio per questo giorno.
                      </p>
                    ) : (
                      <ol className="flex flex-col gap-2">
                        {exercises.map((ex, exIdx) => {
                          const rest = formatRest(ex.rest_seconds)
                          return (
                            <li
                              key={exIdx}
                              className="ring-soft tap-shrink rounded-2xl bg-background/60 p-3.5"
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="number text-xs font-semibold text-muted-foreground">
                                  {String(exIdx + 1).padStart(2, '0')}
                                </span>
                                <h3 className="text-sm font-semibold tracking-tight">
                                  {ex.name}
                                </h3>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {typeof ex.sets === 'number' && ex.sets > 0 ? (
                                  <span className="inline-flex items-center gap-1">
                                    <DumbbellIcon className="size-3.5" />
                                    <span className="tabular">
                                      {ex.sets} serie
                                    </span>
                                  </span>
                                ) : null}
                                {ex.reps ? (
                                  <span className="inline-flex items-center gap-1">
                                    <RepeatIcon className="size-3.5" />
                                    <span className="tabular">{ex.reps}</span>
                                  </span>
                                ) : null}
                                {rest ? (
                                  <span className="inline-flex items-center gap-1">
                                    <ClockIcon className="size-3.5" />
                                    <span className="tabular">
                                      Recupero {rest}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                              {ex.notes ? (
                                <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                                  {ex.notes}
                                </p>
                              ) : null}
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
