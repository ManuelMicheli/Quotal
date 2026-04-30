'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { resetPasswordAction } from '@/app/actions/auth'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthSubmitButton } from '@/components/auth/auth-submit-button'
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
      if (result.ok) setSuccess(result.message ?? 'Email inviata.')
      else setError(result.error)
    })
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-3 rounded-xl bg-teal-500/10 px-4 py-6 text-center text-sm text-teal-100 ring-1 ring-teal-500/20"
        role="status"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-teal-500/15 ring-1 ring-teal-400/30">
          <Mail className="size-5 text-teal-300" aria-hidden="true" />
        </div>
        <p className="font-medium text-teal-100">Controlla la tua casella</p>
        <p className="text-teal-200/80">{success}</p>
      </motion.div>
    )
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

      {error ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20"
          role="alert"
        >
          {error}
        </motion.div>
      ) : null}

      <AuthSubmitButton pending={pending}>Invia link di reset</AuthSubmitButton>
    </motion.form>
  )
}
