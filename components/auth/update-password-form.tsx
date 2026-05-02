'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { updatePasswordAction } from '@/app/actions/auth'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthSubmitButton } from '@/components/auth/auth-submit-button'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { fadeUp, listStagger } from '@/lib/motion'
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
      variants={listStagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={fadeUp} className="space-y-2">
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
      </motion.div>

      <motion.div variants={fadeUp}>
        <AuthInput
          label="Conferma password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          {...form.register('password_confirm')}
          error={form.formState.errors.password_confirm?.message}
        />
      </motion.div>

      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            className="overflow-hidden"
          >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={fadeUp}>
        <AuthSubmitButton pending={pending}>Aggiorna password</AuthSubmitButton>
      </motion.div>
    </motion.form>
  )
}
