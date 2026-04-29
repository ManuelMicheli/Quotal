'use client'

/**
 * Owner onboarding form — large multi-section form for the very first setup.
 *
 * Walks the titolare through:
 *   1. Account — full name, email, password
 *   2. Palestra — name, P.IVA, address, etc.
 *
 * Submits to `ownerOnboardingAction` which uses the service-role client
 * to create the owner immediately (no email confirm step) and updates
 * the seeded gym row with the real data.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { ownerOnboardingAction } from '@/app/actions/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Separator } from '@/components/ui/separator'
import {
  ownerOnboardingSchema,
  type OwnerOnboardingInput,
} from '@/lib/validations/auth'

export function OwnerOnboardingForm() {
  const form = useForm<OwnerOnboardingInput>({
    resolver: zodResolver(ownerOnboardingSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      gym_name: '',
      gym_vat_number: '',
      gym_address: '',
      gym_city: '',
      gym_province: '',
      gym_postal_code: '',
      gym_phone: '',
    },
  })

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(values: OwnerOnboardingInput) {
    setError(null)
    const formData = new FormData()
    Object.entries(values).forEach(([k, v]) => {
      formData.set(k, String(v))
    })

    startTransition(async () => {
      const result = await ownerOnboardingAction(formData)
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-6"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <section className="flex flex-col gap-4">
          <header>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Account titolare
            </h3>
          </header>

          <FormField
            control={form.control}
            name="full_name"
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

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="titolare@palestra.it"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>
                  Minimo 8 caratteri, almeno una maiuscola e un numero.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <header>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dati palestra
            </h3>
          </header>

          <FormField
            control={form.control}
            name="gym_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome palestra</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gym_vat_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>P.IVA</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="12345678901"
                    maxLength={11}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gym_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="street-address"
                    placeholder="Via Roma 1"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="gym_city"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
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
              name="gym_province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prov.</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={2}
                      placeholder="MI"
                      autoComplete="address-level1"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="gym_postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAP</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      maxLength={5}
                      autoComplete="postal-code"
                      placeholder="20010"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gym_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono palestra</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      autoComplete="tel"
                      placeholder="+39 02 1234567"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Configurazione…' : 'Crea il mio account titolare'}
        </Button>
      </form>
    </Form>
  )
}
