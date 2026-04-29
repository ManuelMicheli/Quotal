'use client'

/**
 * Create / edit dialog for a single subscription plan.
 *
 * The price input is shown to the user in euros (decimals) but normalised to
 * integer cents before the server action sees it — `lib/format.formatCurrency`
 * always reads cents.
 */
import * as React from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import type { SubscriptionPlan } from '@/lib/domain-types'
import {
  planSchema,
  type PlanInput,
} from '@/lib/validations/owner'

type PlanFormValues = {
  name: string
  description?: string
  duration_days: number
  /** Euros (decimal) — converted to cents on submit. */
  price_eur: number
  is_active: boolean
}

export function PlanDialog({
  open,
  onOpenChange,
  plan,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  plan: SubscriptionPlan | null
  onSave: (values: PlanInput) => Promise<boolean>
}) {
  const form = useForm<PlanFormValues>({
    defaultValues: {
      name: '',
      description: '',
      duration_days: 30,
      price_eur: 0,
      is_active: true,
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: plan?.name ?? '',
        description: plan?.description ?? '',
        duration_days: plan?.duration_days ?? 30,
        price_eur: plan ? plan.price_cents / 100 : 0,
        is_active: plan?.is_active ?? true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan?.id])

  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: PlanFormValues) {
    const input: PlanInput = {
      name: values.name,
      description: values.description ?? undefined,
      duration_days: Number(values.duration_days),
      price_cents: Math.round(Number(values.price_eur) * 100),
      is_active: values.is_active,
    }
    const parsed = planSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      if (issue) {
        const path0 = String(issue.path[0] ?? 'name')
        const fieldName: keyof PlanFormValues =
          path0 === 'price_cents'
            ? 'price_eur'
            : path0 === 'name' ||
                path0 === 'description' ||
                path0 === 'duration_days' ||
                path0 === 'is_active'
              ? path0
              : 'name'
        form.setError(fieldName, { type: 'validate', message: issue.message })
      }
      return
    }
    startTransition(async () => {
      const ok = await onSave(parsed.data)
      if (ok) form.reset()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? 'Modifica piano' : 'Nuovo piano'}</DialogTitle>
          <DialogDescription>
            I campi modificati si applicano solo ai nuovi abbonamenti — non
            cambiano automaticamente quelli già attivi.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="es. Mensile" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="duration_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durata (giorni) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      30 = mensile, 90 = trimestrale, 365 = annuale.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price_eur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezzo (€) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvataggio…' : 'Salva piano'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
