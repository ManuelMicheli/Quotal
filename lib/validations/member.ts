/**
 * Zod schemas for member-facing actions and forms.
 *
 * Reuses helpers from `validations/owner.ts` style: optional-string
 * normalisation, codice fiscale, postal code, province validators.
 * Each schema is the source of truth for both the RHF resolver on the
 * client and the server action re-validation on the server.
 */
import { z } from 'zod'

import { isValidCodiceFiscale } from '@/lib/format'

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))

const optionalCodiceFiscale = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined))
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
// Profile self-update
// ---------------------------------------------------------------------------

export const updateMemberProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Inserisci nome e cognome'),
  phone: optionalString,
  birth_date: optionalString,
  address: optionalString,
  city: optionalString,
  province: provinceSchema,
  postal_code: postalCodeSchema,
  fiscal_code: optionalCodiceFiscale,
})
export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>

// ---------------------------------------------------------------------------
// Push subscription registration (Phase 09 send pipeline ships later — we
// only persist subscriptions for now).
// ---------------------------------------------------------------------------

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url('Endpoint push non valido'),
  keys: z.object({
    p256dh: z.string().min(1, 'Chiave p256dh mancante'),
    auth: z.string().min(1, 'Chiave auth mancante'),
  }),
  user_agent: optionalString,
})
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>

// ---------------------------------------------------------------------------
// Notification preferences (Phase 09)
// ---------------------------------------------------------------------------

/**
 * Member-side preference toggles. Owners/staff also have additional flags
 * (digest, owner alerts) but those are exposed in a separate dashboard page.
 */
export const memberNotificationPreferencesSchema = z.object({
  email_enabled: z.boolean(),
  push_enabled: z.boolean(),
  email_expiry_reminders: z.boolean(),
  email_payment_receipts: z.boolean(),
  email_payment_failures: z.boolean(),
  email_lifecycle_changes: z.boolean(),
  push_expiry_reminders: z.boolean(),
  push_payment_events: z.boolean(),
})
export type MemberNotificationPreferencesInput = z.infer<
  typeof memberNotificationPreferencesSchema
>

/**
 * Owner-side preference toggles — superset of the member toggles plus
 * the owner-only flags.
 */
export const ownerNotificationPreferencesSchema =
  memberNotificationPreferencesSchema.extend({
    email_daily_digest: z.boolean(),
    email_payment_failed_alert: z.boolean(),
    email_new_member_alert: z.boolean(),
    email_monthly_report: z.boolean(),
  })
export type OwnerNotificationPreferencesInput = z.infer<
  typeof ownerNotificationPreferencesSchema
>
