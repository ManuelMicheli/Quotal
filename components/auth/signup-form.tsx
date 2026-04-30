'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { signupAction } from '@/app/actions/auth'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthSubmitButton } from '@/components/auth/auth-submit-button'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'

export function SignupForm({ initialError }: { initialError?: string }) {
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      password_confirm: '',
      terms: true,
    },
    mode: 'onSubmit',
  })

  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(
    initialError ?? null,
  )
  const [confirmationSent, setConfirmationSent] = useState<string | null>(null)
  const password = form.watch('password')

  function onSubmit(values: SignupInput) {
    setServerError(null)
    const formData = new FormData()
    formData.set('full_name', values.full_name)
    formData.set('email', values.email)
    if (values.phone) formData.set('phone', values.phone)
    formData.set('password', values.password)
    formData.set('password_confirm', values.password_confirm)
    // Member signup implies acceptance — checkbox lives in the page footer copy.
    formData.set('terms', 'true')

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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl bg-teal-500/10 px-4 py-5 text-sm text-teal-200 ring-1 ring-teal-500/20"
        role="status"
      >
        <p className="mb-1 font-medium text-teal-100">
          Controlla la tua casella email
        </p>
        <p className="text-teal-200/80">{confirmationSent}</p>
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

      <AuthInput
        label="Nome completo"
        autoComplete="name"
        autoFocus
        placeholder="Mario Rossi"
        {...form.register('full_name')}
        error={form.formState.errors.full_name?.message}
      />

      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="alan.turing@example.com"
        {...form.register('email')}
        error={form.formState.errors.email?.message}
      />

      <AuthInput
        label="Telefono (opzionale)"
        type="tel"
        autoComplete="tel"
        placeholder="+39 333 1234567"
        {...form.register('phone')}
        error={form.formState.errors.phone?.message}
      />

      <div className="space-y-2">
        <AuthInput
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          minLength={8}
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

      <AuthSubmitButton pending={pending}>Crea account</AuthSubmitButton>
    </motion.form>
  )
}
