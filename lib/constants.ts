/**
 * Application-wide constants for Quotal.
 *
 * Brand strings, role and status enums, and default gym settings.
 * Keep in sync with `02_database_schema.md` enums when DB schema lands.
 */

export const APP_NAME = 'Quotal'
export const APP_DESCRIPTION = 'Gestione abbonamenti per palestre indipendenti'
export const APP_TAGLINE = 'La quota associativa, semplificata'

export const ROLES = {
  OWNER: 'owner',
  STAFF: 'staff',
  MEMBER: 'member',
} as const
export type Role = (typeof ROLES)[keyof typeof ROLES]

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS]

export const PAYMENT_METHODS = {
  CARD: 'card',
  SEPA: 'sepa',
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
} as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]

/**
 * Default config palestra (in attesa di configurazione runtime).
 *
 * Will be overridden per-gym via `gyms.settings` JSONB in Phase 02+.
 */
export const DEFAULT_GYM_SETTINGS = {
  /** Giorni di tolleranza post-scadenza prima del blocco accesso. */
  gracePeriodDays: 3,
  /** Limite cumulativo sospensioni annuali. */
  maxSuspensionDaysPerYear: 60,
  /** Giorni prima della scadenza per email di promemoria. */
  expiryNotificationDays: [7, 3, 0],
  /** Giorni dopo la scadenza per email di follow-up. */
  postExpiryNotificationDays: [3],
} as const
