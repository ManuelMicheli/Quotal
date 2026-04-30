'use client'

/**
 * Member profile self-edit form.
 *
 * RHF + Zod resolver, mirrors the owner-side `MemberForm` shape but the
 * server action is `updateMemberProfileAction` (member-scoped, no role
 * change allowed). Email and badge UID are intentionally read-only here.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import * as React from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import { updateMemberProfileAction } from '@/app/actions/member'
import { Button } from '@/components/ui/button'
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
import type { Profile } from '@/lib/domain-types'
import {
  updateMemberProfileSchema,
  type UpdateMemberProfileInput,
} from '@/lib/validations/member'

export function ProfileForm({ profile }: { profile: Profile }) {
  const form = useForm<UpdateMemberProfileInput>({
    resolver: zodResolver(
      updateMemberProfileSchema,
    ) as unknown as Resolver<UpdateMemberProfileInput>,
    defaultValues: {
      full_name: profile.full_name,
      phone: profile.phone ?? '',
      birth_date: profile.birth_date ?? '',
      address: profile.address ?? '',
      city: profile.city ?? '',
      province: profile.province ?? '',
      postal_code: profile.postal_code ?? '',
      fiscal_code: profile.fiscal_code ?? '',
    } as never,
  })
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: UpdateMemberProfileInput) {
    startTransition(async () => {
      const result = await updateMemberProfileAction(values)
      if (!result.ok) {
        toast.error(result.error)
        if (result.fieldErrors) {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            form.setError(name as keyof UpdateMemberProfileInput, {
              type: 'server',
              message,
            })
          }
        }
        return
      }
      toast.success(result.message ?? 'Profilo aggiornato.')
      form.reset(values)
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name={'full_name' as never}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input value={profile.email} readOnly disabled />
          </FormControl>
          <FormDescription>
            Per cambiare email contatta la palestra.
          </FormDescription>
        </FormItem>

        <FormField
          control={form.control}
          name={'phone' as never}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefono</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+39 333 1234567"
                  {...field}
                />
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
                <Input
                  placeholder="RSSMRA85M01H501Z"
                  autoCapitalize="characters"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Necessario solo per le fatture intestate.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={'address' as never}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indirizzo</FormLabel>
              <FormControl>
                <Input autoComplete="street-address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name={'city' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Città</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level2" {...field} />
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
                  <Input
                    inputMode="numeric"
                    maxLength={5}
                    autoComplete="postal-code"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name={'province' as never}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provincia</FormLabel>
              <FormControl>
                <Input
                  maxLength={2}
                  autoCapitalize="characters"
                  placeholder="MI"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending || !form.formState.isDirty}
          className="w-full"
        >
          {isPending ? 'Salvataggio…' : 'Salva modifiche'}
        </Button>
      </form>
    </Form>
  )
}
