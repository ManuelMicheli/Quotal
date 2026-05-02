'use client'

/**
 * Form for editing gym anagrafica fields (name, P.IVA, address, brand color).
 *
 * RHF + Zod resolver. Pre-fills from the loaded gym row. Calls the server
 * action and surfaces field-level errors via `setError`.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import { updateGymSettingsAction } from '@/app/actions/owner'
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
import type { Gym } from '@/lib/domain-types'
import {
  gymSettingsSchema,
  type GymSettingsInput,
} from '@/lib/validations/owner'

export function GymSettingsForm({ gym }: { gym: Gym }) {
  const router = useRouter()
  const form = useForm<GymSettingsInput>({
    resolver: zodResolver(gymSettingsSchema) as unknown as Resolver<GymSettingsInput>,
    defaultValues: {
      name: gym.name ?? '',
      vat_number: gym.vat_number ?? '',
      address: gym.address ?? '',
      city: gym.city ?? '',
      province: gym.province ?? '',
      postal_code: gym.postal_code ?? '',
      phone: gym.phone ?? '',
      email: gym.email ?? '',
      brand_color: gym.brand_color ?? '',
    },
  })
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: GymSettingsInput) {
    startTransition(async () => {
      const result = await updateGymSettingsAction(values)
      if (!result.ok) {
        toast.error(result.error)
        if (result.fieldErrors) {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            form.setError(name as keyof GymSettingsInput, {
              type: 'server',
              message,
            })
          }
        }
        return
      }
      toast.success(result.message ?? 'Salvato.')
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Anagrafica</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nome palestra *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vat_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>P.IVA</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="11 cifre"
                      maxLength={11}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      {...field}
                      value={field.value ?? ''}
                    />
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
          <CardContent className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Via e numero civico</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Città</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAP</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={5}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={2}
                      {...field}
                      value={field.value ?? ''}
                      placeholder="MI"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="brand_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colore principale</FormLabel>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input
                        type="color"
                        {...field}
                        value={field.value ?? '#0F766E'}
                        className="size-10 cursor-pointer p-1"
                      />
                    </FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="#0F766E"
                      className="max-w-[140px]"
                    />
                  </div>
                  <FormDescription>
                    Usato per accenti e bottoni nelle email ai membri.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? 'Salvataggio…' : 'Salva modifiche'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
