'use client'

/**
 * Form to create or update a member.
 *
 * React Hook Form + Zod resolver. Validation runs on the client, but the
 * server action re-validates everything before touching the DB — never
 * trust the wire.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import {
  createMemberAction,
  updateMemberAction,
} from '@/app/actions/owner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Profile, SubscriptionPlan } from '@/lib/domain-types'
import {
  createMemberSchema,
  updateMemberSchema,
  type CreateMemberInput,
  type UpdateMemberInput,
} from '@/lib/validations/owner'

type Mode = 'create' | 'edit'

type Props =
  | {
      mode: 'create'
      plans: SubscriptionPlan[]
    }
  | {
      mode: 'edit'
      member: Profile
    }

export function MemberForm(props: Props) {
  const router = useRouter()
  const isEdit = props.mode === 'edit'

  const defaultValues = isEdit
    ? {
        full_name: props.member.full_name,
        email: props.member.email,
        phone: props.member.phone ?? '',
        birth_date: props.member.birth_date ?? '',
        address: props.member.address ?? '',
        city: props.member.city ?? '',
        province: props.member.province ?? '',
        postal_code: props.member.postal_code ?? '',
        fiscal_code: props.member.fiscal_code ?? '',
        badge_uid: props.member.badge_uid ?? '',
        notes: props.member.notes ?? '',
        is_problematic: props.member.is_problematic,
        problematic_reason: props.member.problematic_reason ?? '',
      }
    : {
        full_name: '',
        email: '',
        phone: '',
        birth_date: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        fiscal_code: '',
        badge_uid: '',
        notes: '',
        create_subscription: false,
        plan_id: '',
        payment_method: undefined,
        start_date: new Date().toISOString().slice(0, 10),
      }

  const form = useForm<CreateMemberInput | UpdateMemberInput>({
    resolver: zodResolver(
      isEdit ? updateMemberSchema : createMemberSchema,
    ) as unknown as Resolver<CreateMemberInput | UpdateMemberInput>,
    defaultValues: defaultValues as never,
  })
  const [isPending, startTransition] = React.useTransition()
  // useWatch is the memoization-friendly counterpart to form.watch — same
  // value, same triggers, but won't trip the React Hooks lint rule.
  const watchCreate = useWatch({
    control: form.control,
    name: 'create_subscription' as never,
  }) as unknown as boolean | undefined

  function onSubmit(values: CreateMemberInput | UpdateMemberInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateMemberAction(
            (props as Extract<Props, { mode: 'edit' }>).member.id,
            values as UpdateMemberInput,
          )
        : await createMemberAction(values as CreateMemberInput)

      if (!result.ok) {
        toast.error(result.error)
        if (result.fieldErrors) {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            form.setError(name as never, { type: 'server', message })
          }
        }
        return
      }
      toast.success(result.message ?? 'Operazione completata.')
      if (!isEdit && result.data?.id) {
        router.push(`/dashboard/membri/${result.data.id}`)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Anagrafica</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name={'full_name' as never}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'email' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'phone' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'birth_date' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data di nascita</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'fiscal_code' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice fiscale</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="RSSMRA85M01H501Z" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indirizzo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name={'address' as never}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Via e numero civico</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'city' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Città</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'postal_code' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAP</FormLabel>
                  <FormControl>
                    <Input maxLength={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'province' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <FormControl>
                    <Input maxLength={2} {...field} placeholder="MI" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Note interne</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name={'badge_uid' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge UID (per tornello)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="es. 04A1B2C3D4E5F6" />
                  </FormControl>
                  <FormDescription>
                    Disponibile dopo l&apos;integrazione tornello (Phase 08).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'notes' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note interne</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>
                    Visibili solo a te e al tuo staff.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit ? (
              <>
                <FormField
                  control={form.control}
                  name={'is_problematic' as never}
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Membro problematico</FormLabel>
                        <FormDescription>
                          Mostra un avviso accanto al nome del membro.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={'problematic_reason' as never}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}
          </CardContent>
        </Card>

        {!isEdit ? (
          <Card>
            <CardHeader>
              <CardTitle>Iscrizione iniziale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name={'create_subscription' as never}
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Crea abbonamento subito</FormLabel>
                      <FormDescription>
                        Genera la prima subscription al momento della creazione.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              {watchCreate ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name={'plan_id' as never}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Piano</FormLabel>
                        <Select
                          value={field.value as string}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona piano" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(props as Extract<Props, { mode: 'create' }>).plans.map(
                              (p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} · {p.duration_days} gg
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={'payment_method' as never}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metodo</FormLabel>
                        <Select
                          value={(field.value as string | undefined) ?? ''}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Metodo pagamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Contanti</SelectItem>
                            <SelectItem value="bank_transfer">Bonifico</SelectItem>
                            <SelectItem value="card">Carta (Stripe)</SelectItem>
                            <SelectItem value="sepa">SEPA</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Carta/SEPA: il link Stripe arriva con Phase 05.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={'start_date' as never}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data inizio</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex justify-end gap-2">
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
                : 'Crea membro'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// Marker so consumers can know what mode looks like.
export type MemberFormMode = Mode
