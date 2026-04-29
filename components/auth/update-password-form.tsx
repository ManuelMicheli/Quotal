'use client'

/**
 * "Set a new password" form. Reached from the email link delivered by
 * `resetPasswordAction`. The auth callback exchanges the recovery code
 * for a session, so by the time we render here `auth.getUser()` is valid.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { updatePasswordAction } from '@/app/actions/auth'
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
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from '@/lib/validations/auth'

export function UpdatePasswordForm() {
  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '', password_confirm: '' },
  })

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(values: UpdatePasswordInput) {
    setError(null)
    const formData = new FormData()
    formData.set('password', values.password)
    formData.set('password_confirm', values.password_confirm)

    startTransition(async () => {
      const result = await updatePasswordAction(formData)
      // Successful update redirects, so we only land here on failure.
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nuova password</FormLabel>
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

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Aggiornamento…' : 'Aggiorna password'}
        </Button>
      </form>
    </Form>
  )
}
