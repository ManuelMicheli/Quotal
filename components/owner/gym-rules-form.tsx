'use client'

/**
 * Form for the operating rules section of `gyms.settings`:
 *   - grace period (days),
 *   - max suspensions per year (days),
 *   - notification triggers (multi-select among 7 / 3 / 0 days before expiry).
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import { updateGymRulesAction } from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { GymSettings } from '@/lib/domain-types'
import {
  gymRulesSchema,
  type GymRulesInput,
} from '@/lib/validations/owner'

const NOTIFICATION_DAYS = [7, 3, 0] as const

export function GymRulesForm({ settings }: { settings: GymSettings }) {
  const router = useRouter()
  const form = useForm<GymRulesInput>({
    resolver: zodResolver(gymRulesSchema) as unknown as Resolver<GymRulesInput>,
    defaultValues: {
      gracePeriodDays: settings.gracePeriodDays,
      maxSuspensionDaysPerYear: settings.maxSuspensionDaysPerYear,
      expiryNotificationDays: settings.expiryNotificationDays,
    },
  })
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: GymRulesInput) {
    startTransition(async () => {
      const r = await updateGymRulesAction(values)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Salvato.')
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tolleranze</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="gracePeriodDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodo di grazia (giorni)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Giorni in cui il membro può ancora entrare dopo la
                    scadenza.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxSuspensionDaysPerYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite sospensioni annuali (giorni)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Cumulato per anno solare per ogni membro.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifiche scadenza</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="expiryNotificationDays"
              render={({ field }) => {
                const value = (field.value ?? []) as number[]
                function toggle(day: number) {
                  const next = value.includes(day)
                    ? value.filter((d) => d !== day)
                    : [...value, day].sort((a, b) => b - a)
                  field.onChange(next)
                }
                return (
                  <FormItem>
                    <FormLabel>Quando inviare il promemoria</FormLabel>
                    <FormDescription>
                      Seleziona uno o più momenti rispetto alla scadenza.
                    </FormDescription>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {NOTIFICATION_DAYS.map((day) => {
                        const checked = value.includes(day)
                        return (
                          <label
                            key={day}
                            className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggle(day)}
                            />
                            <span className="leading-tight">
                              <span className="block font-medium">
                                {day === 0
                                  ? 'Il giorno della scadenza'
                                  : `${day} giorni prima`}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {day === 0
                                  ? 'Ultimo richiamo prima del blocco.'
                                  : 'Email automatica dal sistema.'}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvataggio…' : 'Salva regole'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
