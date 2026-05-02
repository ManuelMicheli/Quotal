/**
 * Zod schemas for the owner dashboard server actions and forms.
 *
 * Used both client-side (RHF resolver) and server-side (Server Actions). The
 * messages are Italian and surfaced directly to the user.
 */
import { z } from 'zod'

import { isValidCodiceFiscale } from '@/lib/format'

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))

/** Codice fiscale optional: empty is fine, otherwise must be valid. */
const optionalCodiceFiscale = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine(
    (v) => v === undefined || isValidCodiceFiscale(v),
    'Codice fiscale non valido',
  )

const provinceSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined))
  .refine(
    (v) => v === undefined || /^[A-Z]{2}$/.test(v),
    'La provincia deve essere di 2 lettere',
  )

const postalCodeSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine(
    (v) => v === undefined || /^\d{5}$/.test(v),
    'Il CAP deve essere di 5 cifre',
  )

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const PAYMENT_METHOD_VALUES = [
  'card',
  'sepa',
  'cash',
  'bank_transfer',
] as const

export const memberBaseSchema = z.object({
  full_name: z.string().trim().min(2, 'Inserisci nome e cognome'),
  email: z.string().email('Inserisci un indirizzo email valido'),
  phone: optionalString,
  birth_date: optionalString,
  address: optionalString,
  city: optionalString,
  province: provinceSchema,
  postal_code: postalCodeSchema,
  fiscal_code: optionalCodiceFiscale,
  badge_uid: optionalString,
  notes: optionalString,
})

export const createMemberSchema = memberBaseSchema.extend({
  create_subscription: z.boolean().optional().default(false),
  plan_id: optionalString,
  payment_method: z.enum(PAYMENT_METHOD_VALUES).optional(),
  start_date: optionalString,
})
export type CreateMemberInput = z.infer<typeof createMemberSchema>

export const updateMemberSchema = memberBaseSchema.extend({
  is_problematic: z.boolean().optional(),
  problematic_reason: optionalString,
})
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export const renewSubscriptionSchema = z.object({
  member_id: z.string().uuid('ID membro non valido'),
  plan_id: z.string().uuid('Seleziona un piano'),
  payment_method: z.enum(PAYMENT_METHOD_VALUES, {
    message: 'Seleziona un metodo di pagamento',
  }),
  start_date: z.string().min(1, 'Inserisci la data di inizio'),
})
export type RenewSubscriptionInput = z.infer<typeof renewSubscriptionSchema>

export const suspendSubscriptionSchema = z.object({
  subscription_id: z.string().uuid('ID abbonamento non valido'),
  reason: optionalString,
})
export type SuspendSubscriptionInput = z.infer<typeof suspendSubscriptionSchema>

export const resumeSubscriptionSchema = z.object({
  subscription_id: z.string().uuid('ID abbonamento non valido'),
})
export type ResumeSubscriptionInput = z.infer<typeof resumeSubscriptionSchema>

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const planSchema = z.object({
  name: z.string().trim().min(2, 'Inserisci il nome del piano'),
  description: optionalString,
  duration_days: z
    .number({ message: 'Inserisci la durata in giorni' })
    .int('La durata deve essere un numero intero')
    .min(1, 'La durata minima è di 1 giorno'),
  price_cents: z
    .number({ message: 'Inserisci il prezzo' })
    .int('Il prezzo deve essere un numero intero (in centesimi)')
    .min(0, 'Il prezzo non può essere negativo'),
  is_active: z.boolean().optional().default(true),
})
export type PlanInput = z.infer<typeof planSchema>

// ---------------------------------------------------------------------------
// Gym + settings
// ---------------------------------------------------------------------------

export const gymSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Inserisci il nome della palestra'),
  vat_number: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^\d{11}$/.test(v),
      'La P.IVA deve essere di 11 cifre',
    ),
  address: optionalString,
  city: optionalString,
  province: provinceSchema,
  postal_code: postalCodeSchema,
  phone: optionalString,
  email: z.string().email('Inserisci un indirizzo email valido'),
  brand_color: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^#[0-9A-Fa-f]{6}$/.test(v),
      'Inserisci un colore HEX valido (es. #0F766E)',
    ),
})
export type GymSettingsInput = z.infer<typeof gymSettingsSchema>

// ---------------------------------------------------------------------------
// Workout plans
// ---------------------------------------------------------------------------

export const workoutExerciseSchema = z.object({
  name: z.string().trim().min(1, 'Inserisci il nome dell’esercizio'),
  sets: z
    .number({ message: 'Numero serie non valido' })
    .int()
    .min(1)
    .max(99)
    .optional(),
  reps: z.string().trim().min(1).optional(),
  rest_seconds: z
    .number({ message: 'Riposo non valido' })
    .int()
    .min(0)
    .max(3600)
    .optional(),
  notes: z.string().trim().min(1).optional(),
})
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>

export const workoutDaySchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, 'Inserisci un’etichetta per il giorno'),
  day_of_week: z.number().int().min(1).max(7).optional(),
  notes: z.string().trim().min(1).optional(),
  exercises: z.array(workoutExerciseSchema).default([]),
})
export type WorkoutDayInput = z.infer<typeof workoutDaySchema>

export const workoutPlanSchema = z.object({
  member_id: z.string().uuid('ID membro non valido'),
  title: z.string().trim().min(2, 'Inserisci un titolo'),
  split: optionalString,
  notes: optionalString,
  days: z.array(workoutDaySchema).default([]),
  is_active: z.boolean().optional().default(true),
})
export type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>

export const updateWorkoutPlanSchema = workoutPlanSchema.omit({
  member_id: true,
})
export type UpdateWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>

export const gymRulesSchema = z.object({
  gracePeriodDays: z
    .number({ message: 'Inserisci un numero' })
    .int('Inserisci un numero intero di giorni')
    .min(0, 'Il periodo di grazia non può essere negativo')
    .max(60, 'Il periodo di grazia massimo è 60 giorni'),
  maxSuspensionDaysPerYear: z
    .number({ message: 'Inserisci un numero' })
    .int('Inserisci un numero intero di giorni')
    .min(0, 'Il limite non può essere negativo')
    .max(365, 'Il limite massimo è 365 giorni'),
  expiryNotificationDays: z.array(
    z.number().int().min(0).max(30),
  ),
})
export type GymRulesInput = z.infer<typeof gymRulesSchema>
