'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { resetPasswordAction } from '@/app/actions/auth'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthSubmitButton } from '@/components/auth/auth-submit-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { fadeUp, listStagger, scaleIn } from '@/lib/motion'
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
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="bg-accent-soft border-accent/20 flex flex-col items-center gap-3 rounded-xl border px-5 py-7 text-center"
        role="status"
      >
        <div className="bg-accent/15 ring-accent/30 flex size-11 items-center justify-center rounded-full ring-1">
          <Mail className="text-accent size-5" aria-hidden="true" />
        </div>
        <p className="text-foreground font-semibold">Controlla la tua casella</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {success}
        </p>
      </motion.div>
    )
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
        <AuthSubmitButton pending={pending}>Invia link di reset</AuthSubmitButton>
      </motion.div>
    </motion.form>
  )
}
