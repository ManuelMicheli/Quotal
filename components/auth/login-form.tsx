'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { loginAction } from '@/app/actions/auth'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthSubmitButton } from '@/components/auth/auth-submit-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { fadeUp, listStagger } from '@/lib/motion'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'

export function LoginForm({ initialError }: { initialError?: string }) {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  })

  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(
    initialError ?? null,
  )

  function onSubmit(values: LoginInput) {
    setServerError(null)
    const formData = new FormData()
    formData.set('email', values.email)
    formData.set('password', values.password)

    startTransition(async () => {
      const result = await loginAction(formData)
      if (result && !result.ok) setServerError(result.error)
    })
  }

  return (
    <motion.form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      variants={listStagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={fadeUp}>
        <AuthInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="alan.turing@example.com"
          autoFocus
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="password"
            className="text-foreground/85 block text-sm font-medium"
          >
            Password
          </label>
          <Link
            href="/reset-password"
            className="text-muted-foreground hover:text-accent text-xs font-medium transition-colors"
          >
            Password dimenticata?
          </Link>
        </div>
        <AuthInput
          id="password"
          hideLabel
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          minLength={8}
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
      </motion.div>

      <AnimatePresence>
        {serverError ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            className="overflow-hidden"
          >
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={fadeUp}>
        <AuthSubmitButton pending={pending}>Accedi</AuthSubmitButton>
      </motion.div>
    </motion.form>
  )
}
