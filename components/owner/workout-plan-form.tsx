'use client'

/**
 * Form to create or edit a workout plan with a weekly split.
 *
 * Structure:
 *   - Plan-level: member, title, split label, general notes, active flag.
 *   - Days array: each day has its own label + optional weekday + notes,
 *     and an inner array of exercises (sets/reps/rest/notes).
 *
 * Empty exercises (blank name) are stripped on submit so the trainer can
 * leave placeholder rows behind. Days with zero exercises are kept — the
 * label alone may carry meaning ("Riposo", "Cardio LISS").
 */
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import {
  useFieldArray,
  useForm,
  type Resolver,
} from 'react-hook-form'
import { toast } from 'sonner'

import {
  createWorkoutPlanAction,
  updateWorkoutPlanAction,
} from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type {
  Profile,
  WorkoutDay,
  WorkoutExercise,
  WorkoutPlan,
} from '@/lib/domain-types'
import {
  updateWorkoutPlanSchema,
  workoutPlanSchema,
  type UpdateWorkoutPlanInput,
  type WorkoutPlanInput,
} from '@/lib/validations/owner'

type CreateProps = {
  mode: 'create'
  members: Pick<Profile, 'id' | 'full_name' | 'email'>[]
  defaultMemberId?: string | null
}
type EditProps = {
  mode: 'edit'
  plan: WorkoutPlan
  member: Pick<Profile, 'id' | 'full_name' | 'email'>
}
type Props = CreateProps | EditProps

type ExerciseRow = {
  name: string
  sets: number | ''
  reps: string
  rest_seconds: number | ''
  notes: string
}

type DayRow = {
  id: string
  label: string
  /** "" when unset (Select can't hold null). 1..7 ISO weekday. */
  day_of_week: number | ''
  notes: string
  exercises: ExerciseRow[]
}

type FormValues = {
  member_id: string
  title: string
  split: string
  notes: string
  is_active: boolean
  days: DayRow[]
}

const WEEKDAYS = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
  { value: 7, label: 'Domenica' },
] as const

const SPLIT_PRESETS = [
  'Full body 3x',
  'Upper / Lower 4x',
  'Push / Pull / Legs 3x',
  'Push / Pull / Legs 6x',
  'Bro split 5x',
] as const

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyExercise(): ExerciseRow {
  return { name: '', sets: '', reps: '', rest_seconds: '', notes: '' }
}

function emptyDay(label = 'Giorno A'): DayRow {
  return {
    id: newId(),
    label,
    day_of_week: '',
    notes: '',
    exercises: [emptyExercise()],
  }
}

function rowsFromPlan(plan: WorkoutPlan): DayRow[] {
  const raw = (plan.days ?? []) as WorkoutDay[]
  if (!raw.length) return [emptyDay()]
  return raw.map((d) => ({
    id: d.id || newId(),
    label: d.label ?? '',
    day_of_week: typeof d.day_of_week === 'number' ? d.day_of_week : '',
    notes: d.notes ?? '',
    exercises:
      d.exercises && d.exercises.length
        ? d.exercises.map((e) => ({
            name: e.name ?? '',
            sets: typeof e.sets === 'number' ? e.sets : '',
            reps: e.reps ?? '',
            rest_seconds:
              typeof e.rest_seconds === 'number' ? e.rest_seconds : '',
            notes: e.notes ?? '',
          }))
        : [emptyExercise()],
  }))
}

export function WorkoutPlanForm(props: Props) {
  const router = useRouter()
  const isEdit = props.mode === 'edit'

  const defaultValues: FormValues = isEdit
    ? {
        member_id: props.plan.member_id,
        title: props.plan.title,
        split: props.plan.split ?? '',
        notes: props.plan.notes ?? '',
        is_active: props.plan.is_active,
        days: rowsFromPlan(props.plan),
      }
    : {
        member_id: props.defaultMemberId ?? '',
        title: '',
        split: '',
        notes: '',
        is_active: true,
        days: [emptyDay()],
      }

  const form = useForm<FormValues>({
    resolver: undefined as unknown as Resolver<FormValues>,
    defaultValues,
  })
  const dayArray = useFieldArray({
    control: form.control,
    name: 'days',
    keyName: 'fieldKey',
  })
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: FormValues) {
    const days = values.days.map((d): WorkoutDay => {
      const exercises = d.exercises
        .map((row): WorkoutExercise | null => {
          const name = row.name.trim()
          if (!name) return null
          const sets = row.sets === '' ? undefined : Number(row.sets)
          const rest =
            row.rest_seconds === '' ? undefined : Number(row.rest_seconds)
          const reps = row.reps.trim()
          const notes = row.notes.trim()
          return {
            name,
            sets:
              typeof sets === 'number' && !Number.isNaN(sets) ? sets : undefined,
            reps: reps || undefined,
            rest_seconds:
              typeof rest === 'number' && !Number.isNaN(rest) ? rest : undefined,
            notes: notes || undefined,
          }
        })
        .filter((e): e is WorkoutExercise => e !== null)

      const dow =
        d.day_of_week === '' ? undefined : Number(d.day_of_week)
      const dayNotes = d.notes.trim()
      return {
        id: d.id || newId(),
        label: d.label.trim() || 'Giorno',
        day_of_week:
          typeof dow === 'number' && !Number.isNaN(dow) ? dow : undefined,
        notes: dayNotes || undefined,
        exercises,
      }
    })

    if (isEdit) {
      const payload: UpdateWorkoutPlanInput = {
        title: values.title,
        split: values.split || undefined,
        notes: values.notes || undefined,
        days,
        is_active: values.is_active,
      }
      const parsed = updateWorkoutPlanSchema.safeParse(payload)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        if (issue) {
          toast.error(issue.message)
          form.setError('title', { type: 'validate', message: issue.message })
        }
        return
      }
      startTransition(async () => {
        const r = await updateWorkoutPlanAction(props.plan.id, parsed.data)
        if (!r.ok) {
          toast.error(r.error)
          return
        }
        toast.success(r.message ?? 'Scheda aggiornata.')
      })
    } else {
      if (!values.member_id) {
        form.setError('member_id', {
          type: 'required',
          message: 'Seleziona un membro',
        })
        return
      }
      const payload: WorkoutPlanInput = {
        member_id: values.member_id,
        title: values.title,
        split: values.split || undefined,
        notes: values.notes || undefined,
        days,
        is_active: values.is_active,
      }
      const parsed = workoutPlanSchema.safeParse(payload)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        if (issue) {
          toast.error(issue.message)
          form.setError('title', { type: 'validate', message: issue.message })
        }
        return
      }
      startTransition(async () => {
        const r = await createWorkoutPlanAction(parsed.data)
        if (!r.ok) {
          toast.error(r.error)
          return
        }
        toast.success(r.message ?? 'Scheda creata.')
        if (r.data?.id) {
          router.push(`/dashboard/schede/${r.data.id}`)
        } else {
          router.push('/dashboard/schede')
        }
      })
    }
  }

  function nextDayLabel(): string {
    const used = form.getValues('days').map((d) => d.label)
    for (const letter of 'ABCDEFGHIJ') {
      const candidate = `Giorno ${letter}`
      if (!used.includes(candidate)) return candidate
    }
    return `Giorno ${dayArray.fields.length + 1}`
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dati scheda</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isEdit ? (
              <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Assegnata a </span>
                <span className="font-medium">{props.member.full_name}</span>
                <span className="text-muted-foreground"> · {props.member.email}</span>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membro *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un membro" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {props.members.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Nessun membro disponibile.
                          </div>
                        ) : (
                          props.members.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.full_name} · {m.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="es. Forza – Settimana 1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="split"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Split settimanale</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        list="split-presets"
                        placeholder="es. Push / Pull / Legs 6x"
                      />
                    </FormControl>
                    <datalist id="split-presets">
                      {SPLIT_PRESETS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                    <FormDescription>
                      Etichetta libera che descrive la struttura della
                      settimana.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note generali</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      {...field}
                      placeholder="Riscaldamento, recuperi, indicazioni nutrizionali…"
                    />
                  </FormControl>
                  <FormDescription>
                    Visibile al membro insieme ai giorni di allenamento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <FormLabel className="text-sm">Scheda attiva</FormLabel>
                    <FormDescription>
                      Se disattivata, resta nello storico ma non compare in
                      evidenza per il membro.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">
            Giorni di allenamento
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dayArray.append(emptyDay(nextDayLabel()))}
            disabled={isPending}
          >
            <PlusIcon className="size-4" />
            Aggiungi giorno
          </Button>
        </div>

        {dayArray.fields.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Nessun giorno configurato. Aggiungine almeno uno.
            </CardContent>
          </Card>
        ) : null}

        {dayArray.fields.map((day, dayIdx) => (
          <DayCard
            key={day.fieldKey}
            form={form}
            dayIdx={dayIdx}
            isFirst={dayIdx === 0}
            isLast={dayIdx === dayArray.fields.length - 1}
            isPending={isPending}
            onMoveUp={() => dayArray.move(dayIdx, dayIdx - 1)}
            onMoveDown={() => dayArray.move(dayIdx, dayIdx + 1)}
            onRemove={() => dayArray.remove(dayIdx)}
          />
        ))}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? 'Salvataggio…'
              : isEdit
                ? 'Salva modifiche'
                : 'Crea scheda'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function DayCard({
  form,
  dayIdx,
  isFirst,
  isLast,
  isPending,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  form: ReturnType<typeof useForm<FormValues>>
  dayIdx: number
  isFirst: boolean
  isLast: boolean
  isPending: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const exerciseArray = useFieldArray({
    control: form.control,
    name: `days.${dayIdx}.exercises` as const,
    keyName: 'fieldKey',
  })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <GripVerticalIcon className="size-4 opacity-50" />
          Giorno {dayIdx + 1}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={isFirst || isPending}
            onClick={onMoveUp}
            aria-label="Sposta giorno su"
          >
            <ChevronUpIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={isLast || isPending}
            onClick={onMoveDown}
            aria-label="Sposta giorno giù"
          >
            <ChevronDownIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            disabled={isPending}
            aria-label="Rimuovi giorno"
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name={`days.${dayIdx}.label` as const}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Etichetta *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="es. Giorno A — Petto e Tricipiti"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`days.${dayIdx}.day_of_week` as const}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giorno della settimana</FormLabel>
                <Select
                  value={field.value === '' ? '' : String(field.value)}
                  onValueChange={(v) =>
                    field.onChange(v === '' || v === '0' ? '' : Number(v))
                  }
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Nessuno</SelectItem>
                    {WEEKDAYS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name={`days.${dayIdx}.notes` as const}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note del giorno</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  {...field}
                  placeholder="Focus della seduta, riscaldamento dedicato…"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Esercizi ({exerciseArray.fields.length})
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exerciseArray.append(emptyExerciseRow())}
            disabled={isPending}
          >
            <PlusIcon className="size-4" />
            Aggiungi esercizio
          </Button>
        </div>

        {exerciseArray.fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nessun esercizio.
          </p>
        ) : null}

        <div className="space-y-3">
          {exerciseArray.fields.map((row, idx) => (
            <div
              key={row.fieldKey}
              className="grid gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-12"
            >
              <div className="flex items-center justify-between gap-2 md:col-span-12">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  Esercizio {idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={idx === 0 || isPending}
                    onClick={() => exerciseArray.move(idx, idx - 1)}
                    aria-label="Sposta su"
                  >
                    <ChevronUpIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={
                      idx === exerciseArray.fields.length - 1 || isPending
                    }
                    onClick={() => exerciseArray.move(idx, idx + 1)}
                    aria-label="Sposta giù"
                  >
                    <ChevronDownIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => exerciseArray.remove(idx)}
                    disabled={isPending}
                    aria-label="Rimuovi esercizio"
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
              </div>
              <FormField
                control={form.control}
                name={`days.${dayIdx}.exercises.${idx}.name` as const}
                render={({ field }) => (
                  <FormItem className="md:col-span-6">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="es. Panca piana" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`days.${dayIdx}.exercises.${idx}.sets` as const}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Serie</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? ''
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`days.${dayIdx}.exercises.${idx}.reps` as const}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Ripetizioni</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="8-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={
                  `days.${dayIdx}.exercises.${idx}.rest_seconds` as const
                }
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Recupero (s)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={3600}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? ''
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`days.${dayIdx}.exercises.${idx}.notes` as const}
                render={({ field }) => (
                  <FormItem className="md:col-span-12">
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="es. Tempo 3-1-1, RPE 8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function emptyExerciseRow(): ExerciseRow {
  return { name: '', sets: '', reps: '', rest_seconds: '', notes: '' }
}
