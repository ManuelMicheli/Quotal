'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { loginAction } from '@/app/actions/auth'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthSubmitButton } from '@/components/auth/auth-submit-button'
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="alan.turing@example.com"
        autoFocus
        {...form.register('email')}
        error={form.formState.errors.email?.message}
      />

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-300"
          >
            Password
          </label>
          <Link
            href="/reset-password"
            className="text-xs text-zinc-400 transition-colors hover:text-teal-400"
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
      </div>

      {serverError ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20"
          role="alert"
        >
          {serverError}
        </motion.div>
      ) : null}

      <AuthSubmitButton pending={pending}>Accedi</AuthSubmitButton>
    </motion.form>
  )
}
