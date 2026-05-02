'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { signupAction } from '@/app/actions/auth'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthSubmitButton } from '@/components/auth/auth-submit-button'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { fadeUp, listStagger, scaleIn } from '@/lib/motion'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'

export function SignupForm({
  initialError,
  gymSlug,
}: {
  initialError?: string
  gymSlug: string
}) {
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      password_confirm: '',
      gym_slug: gymSlug,
      terms: true,
    },
    mode: 'onSubmit',
  })

  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(
    initialError ?? null,
  )
  const [confirmationSent, setConfirmationSent] = useState<string | null>(null)
  const password = useWatch({ control: form.control, name: 'password' })

  function onSubmit(values: SignupInput) {
    setServerError(null)
    const formData = new FormData()
    formData.set('full_name', values.full_name)
    formData.set('email', values.email)
    if (values.phone) formData.set('phone', values.phone)
    formData.set('password', values.password)
    formData.set('password_confirm', values.password_confirm)
    formData.set('gym_slug', gymSlug)
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
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="bg-success-soft border-success/20 flex flex-col items-center gap-3 rounded-xl border px-5 py-7 text-center"
        role="status"
      >
        <div className="bg-success/15 ring-success/30 flex size-11 items-center justify-center rounded-full ring-1">
          <CheckCircle2 className="text-success size-5" aria-hidden="true" />
        </div>
        <p className="text-foreground font-semibold">
          Controlla la tua casella email
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {confirmationSent}
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

      <motion.div variants={fadeUp}>
        <AuthInput
          label="Nome completo"
          autoComplete="name"
          autoFocus
          placeholder="Mario Rossi"
          {...form.register('full_name')}
          error={form.formState.errors.full_name?.message}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <AuthInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="alan.turing@example.com"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <AuthInput
          label="Telefono (opzionale)"
          type="tel"
          autoComplete="tel"
          placeholder="+39 333 1234567"
          {...form.register('phone')}
          error={form.formState.errors.phone?.message}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-2">
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
        {serverError ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            className="overflow-hidden"
          >
            <Alert variant="destructive">
              <AlertTitle>Non è stato possibile creare l’account</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={fadeUp}>
        <AuthSubmitButton pending={pending}>Crea account</AuthSubmitButton>
      </motion.div>
    </motion.form>
  )
}
