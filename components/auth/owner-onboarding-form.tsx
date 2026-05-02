'use client'

/**
 * Owner onboarding form — multi-section setup for the very first gym.
 *
 * Walks the titolare through:
 *   1. Account — full name, email, password
 *   2. Palestra — name, P.IVA, address, etc.
 *
 * Submits to `ownerOnboardingAction` which uses the service-role client
 * to create the owner immediately (no email confirm step) and updates
 * the seeded gym row with the real data.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, UserRound } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { ownerOnboardingAction } from '@/app/actions/auth'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
import { Stepper, type Step } from '@/components/shared/stepper'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { fadeUp, listStagger, spring } from '@/lib/motion'
import {
  ownerOnboardingSchema,
  type OwnerOnboardingInput,
} from '@/lib/validations/auth'

const STEPS: Step[] = [
  { id: 'account', title: 'Account titolare', description: 'I tuoi dati' },
  { id: 'gym', title: 'Dati palestra', description: 'Sede e fatturazione' },
]

const ACCOUNT_FIELDS = ['full_name', 'email', 'password'] as const
const GYM_FIELDS = [
  'gym_name',
  'gym_vat_number',
  'gym_address',
  'gym_city',
  'gym_province',
  'gym_postal_code',
  'gym_phone',
] as const

export function OwnerOnboardingForm() {
  const form = useForm<OwnerOnboardingInput>({
    resolver: zodResolver(ownerOnboardingSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      gym_name: '',
      gym_vat_number: '',
      gym_address: '',
      gym_city: '',
      gym_province: '',
      gym_postal_code: '',
      gym_phone: '',
    },
    mode: 'onBlur',
  })

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const password = useWatch({ control: form.control, name: 'password' })

  // Derive step status from filled fields — purely visual, not a wizard.
  const watched = useWatch({ control: form.control })
  const errors = form.formState.errors

  const accountComplete = useMemo(
    () =>
      ACCOUNT_FIELDS.every(
        (k) => Boolean(watched?.[k]) && !errors[k],
      ),
    [watched, errors],
  )
  const gymStarted = useMemo(
    () => GYM_FIELDS.some((k) => Boolean(watched?.[k])),
    [watched],
  )

  const currentStep = !accountComplete ? 0 : gymStarted ? 1 : 1

  function onSubmit(values: OwnerOnboardingInput) {
    setError(null)
    const formData = new FormData()
    Object.entries(values).forEach(([k, v]) => {
      formData.set(k, String(v))
    })

    startTransition(async () => {
      const result = await ownerOnboardingAction(formData)
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
      className="space-y-8"
    >
      <Stepper steps={STEPS} current={currentStep} />

      <Form {...form}>
        <motion.form
          variants={listStagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-8"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <motion.section
            variants={fadeUp}
            className="glass-strong rounded-2xl p-6 md:p-8"
          >
            <header className="mb-6 flex items-center gap-3">
              <div className="bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
                <UserRound className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-foreground text-base font-semibold tracking-tight">
                  Account titolare
                </h2>
                <p className="text-muted-foreground text-xs">
                  Userai queste credenziali per accedere a Quotal.
                </p>
              </div>
            </header>

            <div className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="name"
                        placeholder="Mario Rossi"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        placeholder="titolare@palestra.it"
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimo 8 caratteri, almeno una maiuscola e un numero.
                    </FormDescription>
                    <FormMessage />
                    <PasswordStrengthMeter password={password ?? ''} />
                  </FormItem>
                )}
              />
            </div>
          </motion.section>

          <motion.section
            variants={fadeUp}
            className="glass-strong rounded-2xl p-6 md:p-8"
          >
            <header className="mb-6 flex items-center gap-3">
              <div className="bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Building2 className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-foreground text-base font-semibold tracking-tight">
                  Dati palestra
                </h2>
                <p className="text-muted-foreground text-xs">
                  Servono per fatture, scontrini e pagamenti.
                </p>
              </div>
            </header>

            <div className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="gym_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome palestra</FormLabel>
                    <FormControl>
                      <Input placeholder="Quotal Fitness Club" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gym_vat_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>P.IVA</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="12345678901"
                        maxLength={11}
                        className="font-mono tracking-wider"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gym_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="street-address"
                        placeholder="Via Roma 1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="gym_city"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Città</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="address-level2"
                          placeholder="Milano"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gym_province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prov.</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={2}
                          placeholder="MI"
                          autoComplete="address-level1"
                          className="uppercase"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="gym_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CAP</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          maxLength={5}
                          autoComplete="postal-code"
                          placeholder="20100"
                          className="font-mono tracking-wider"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gym_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono palestra</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          autoComplete="tel"
                          placeholder="+39 02 1234567"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </motion.section>

          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                className="overflow-hidden"
              >
                <Alert variant="destructive">
                  <AlertTitle>Configurazione non completata</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={pending}
              variant="accent"
              size="xl"
              className="elev-2 w-full font-semibold"
            >
              {pending ? 'Configurazione…' : 'Crea il mio account titolare'}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Procedendo accetti i nostri Termini e l’informativa Privacy.
            </p>
          </motion.div>
        </motion.form>
      </Form>
    </motion.div>
  )
}
