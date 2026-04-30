'use client'

/**
 * Member signup form.
 *
 * On success the server returns `{ ok: true, message }` (no redirect — the
 * user must confirm their email first). We swap the form for a
 * confirmation panel that tells them to check their inbox.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { signupAction } from '@/app/actions/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { signupSchema, type SignupInput } from '@/lib/validations/auth'

export function SignupForm() {
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      password_confirm: '',
      // `terms` is intentionally omitted from defaultValues so RHF treats it
      // as undefined until the user clicks; Zod's literal(true) will then
      // surface the validation error as expected.
    } as Partial<SignupInput> as SignupInput,
    mode: 'onSubmit',
  })

  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState<string | null>(null)

  function onSubmit(values: SignupInput) {
    setServerError(null)
    const formData = new FormData()
    formData.set('full_name', values.full_name)
    formData.set('email', values.email)
    if (values.phone) formData.set('phone', values.phone)
    formData.set('password', values.password)
    formData.set('password_confirm', values.password_confirm)
    formData.set('terms', values.terms ? 'true' : 'false')

    // Pass through the honeypot field — empty for humans, filled by bots.
    const honeypot = (
      document.getElementById('quotal-signup-website-hp') as
        | HTMLInputElement
        | null
    )?.value
    if (honeypot) formData.set('website', honeypot)

    startTransition(async () => {
      const result = await signupAction(formData)
      if (result.ok) {
        setConfirmationSent(result.message ?? 'Controlla la tua email.')
      } else {
        setServerError(result.error)
      }
    })
  }

  if (confirmationSent) {
    return (
      <Alert>
        <AlertTitle>Controlla la tua casella email</AlertTitle>
        <AlertDescription>{confirmationSent}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        {/*
          Honeypot. Real humans never see/fill this; spam bots that submit
          every field do. The server action treats a non-empty value as a
          bot and silently no-ops.
        */}
        <input
          id="quotal-signup-website-hp"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            opacity: 0,
            height: 0,
            width: 0,
            pointerEvents: 'none',
          }}
        />

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Mario Rossi" {...field} />
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
                  placeholder="nome@esempio.it"
                  {...field}
                />
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
              <FormLabel>Telefono (opzionale)</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+39 333 1234567"
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Minimo 8 caratteri, almeno una maiuscola e un numero.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password_confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conferma password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              </FormControl>
              <div className="grid gap-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  Accetto i Termini di servizio e l’informativa Privacy
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Registrazione…' : 'Crea account'}
        </Button>
      </form>
    </Form>
  )
}
