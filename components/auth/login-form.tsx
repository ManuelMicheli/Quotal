'use client'

/**
 * Login form — client component because we use react-hook-form for inline
 * validation and `useTransition` to keep the submit button responsive.
 *
 * Submits to the `loginAction` Server Action by hand-rolling a FormData
 * (rather than using a `<form action={...}>`) so we can:
 *   1. Run client-side Zod validation first
 *   2. Read the structured `ActionResult` and surface errors inline
 *
 * Successful login throws NEXT_REDIRECT inside the action, which Next
 * intercepts before it bubbles up — that's expected.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { loginAction } from '@/app/actions/auth'
import { ResetPasswordDialog } from '@/components/auth/reset-password-dialog'
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
import { loginSchema, type LoginInput } from '@/lib/validations/auth'

export function LoginForm() {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  })

  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  function onSubmit(values: LoginInput) {
    setServerError(null)
    const formData = new FormData()
    formData.set('email', values.email)
    formData.set('password', values.password)

    startTransition(async () => {
      const result = await loginAction(formData)
      // Successful login redirects, so we only land here on failure.
      if (result && !result.ok) {
        setServerError(result.error)
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <ResetPasswordDialog
                  defaultEmail={form.watch('email')}
                  trigger={
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Password dimenticata?
                    </button>
                  }
                />
              </div>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Accesso in corso…' : 'Accedi'}
        </Button>
      </form>
    </Form>
  )
}
