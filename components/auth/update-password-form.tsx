'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { updatePasswordAction } from '@/app/actions/auth'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthSubmitButton } from '@/components/auth/auth-submit-button'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
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
  const password = useWatch({ control: form.control, name: 'password' })

  function onSubmit(values: UpdatePasswordInput) {
    setError(null)
    const formData = new FormData()
    formData.set('password', values.password)
    formData.set('password_confirm', values.password_confirm)

    startTransition(async () => {
      const result = await updatePasswordAction(formData)
      if (result && !result.ok) setError(result.error)
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
      <div className="space-y-2">
        <AuthInput
          label="Nuova password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          autoFocus
          hint="Minimo 8 caratteri, almeno una maiuscola e un numero."
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <PasswordStrengthMeter password={password ?? ''} />
      </div>

      <AuthInput
        label="Conferma password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••••"
        {...form.register('password_confirm')}
        error={form.formState.errors.password_confirm?.message}
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

      <AuthSubmitButton pending={pending}>Aggiorna password</AuthSubmitButton>
    </motion.form>
  )
}
