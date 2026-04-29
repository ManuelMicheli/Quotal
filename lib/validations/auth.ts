/**
 * Zod schemas for authentication flows.
 *
 * Used both server-side (Server Actions) and client-side (react-hook-form
 * resolver) so the validation rules and error messages stay in sync.
 *
 * Italian copy throughout — these messages are surfaced directly in the UI.
 */
import { z } from 'zod'

/**
 * Password policy: at least 8 chars, one uppercase, one digit.
 * Applied at signup, owner onboarding, and password reset.
 */
export const passwordSchema = z
  .string()
  .min(8, 'La password deve contenere almeno 8 caratteri')
  .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
  .regex(/[0-9]/, 'La password deve contenere almeno un numero')

export const loginSchema = z.object({
  email: z.string().email('Inserisci un indirizzo email valido'),
  password: z.string().min(1, 'Inserisci la tua password'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    full_name: z.string().min(2, 'Inserisci il tuo nome completo'),
    email: z.string().email('Inserisci un indirizzo email valido'),
    phone: z.string().optional(),
    password: passwordSchema,
    password_confirm: z.string(),
    terms: z.literal(true, {
      message: 'Devi accettare i Termini e l’informativa Privacy',
    }),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Le password non coincidono',
    path: ['password_confirm'],
  })
export type SignupInput = z.infer<typeof signupSchema>

export const resetPasswordSchema = z.object({
  email: z.string().email('Inserisci un indirizzo email valido'),
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Le password non coincidono',
    path: ['password_confirm'],
  })
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>

export const ownerOnboardingSchema = z.object({
  full_name: z.string().min(2, 'Inserisci il nome del titolare'),
  email: z.string().email('Inserisci un indirizzo email valido'),
  password: passwordSchema,
  gym_name: z.string().min(2, 'Inserisci il nome della palestra'),
  gym_vat_number: z
    .string()
    .regex(/^\d{11}$/, 'La P.IVA deve essere di 11 cifre'),
  gym_address: z.string().min(2, 'Inserisci l’indirizzo'),
  gym_city: z.string().min(2, 'Inserisci la città'),
  gym_province: z
    .string()
    .length(2, 'La provincia deve essere di 2 lettere'),
  gym_postal_code: z.string().regex(/^\d{5}$/, 'Il CAP deve essere di 5 cifre'),
  gym_phone: z.string().min(6, 'Inserisci un numero di telefono valido'),
})
export type OwnerOnboardingInput = z.infer<typeof ownerOnboardingSchema>
