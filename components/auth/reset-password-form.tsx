'use client'

/**
 * Stand-alone reset-password form, used by the dedicated /reset-password
 * page (the same flow is also available as a dialog from /login).
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { resetPasswordAction } from '@/app/actions/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '@/lib/validations/auth'

export function ResetPasswordForm() {
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  })

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function onSubmit(values: ResetPasswordInput) {
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.set('email', values.email)

    startTransition(async () => {
      const result = await resetPasswordAction(formData)
      if (result.ok) {
        setSuccess(result.message ?? 'Email inviata.')
      } else {
        setError(result.error)
      }
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

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Invio…' : 'Invia link di reset'}
        </Button>
      </form>
    </Form>
  )
}
