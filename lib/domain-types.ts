/**
 * Domain types — convenience aliases derived from the auto-generated
 * `Database` type in `lib/supabase/types.ts`.
 *
 * Use these wherever you need a typed row anywhere in the app. They keep
 * imports short and create a single place to extend with composed types
 * (e.g. `SubscriptionWithPlan`).
 */
import type { Database } from './supabase/types'

// -----------------------------------------------------------------------------
// Single-row aliases — one per table.
// -----------------------------------------------------------------------------

export type Gym = Database['public']['Tables']['gyms']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type SubscriptionSuspension =
  Database['public']['Tables']['subscription_suspensions']['Row']
export type AccessLog = Database['public']['Tables']['access_logs']['Row']
export type SepaMandate = Database['public']['Tables']['sepa_mandates']['Row']
export type NotificationSent =
  Database['public']['Tables']['notifications_sent']['Row']
export type DailyCloseReport =
  Database['public']['Tables']['daily_close_reports']['Row']
export type PushSubscriptionRow =
  Database['public']['Tables']['push_subscriptions']['Row']

// -----------------------------------------------------------------------------
// Composed types — convenient shapes for joined queries.
// -----------------------------------------------------------------------------

export type SubscriptionWithPlan = Subscription & { plan: SubscriptionPlan }

export type MemberWithSubscription = Profile & {
  active_subscription: SubscriptionWithPlan | null
}

export type PaymentWithMember = Payment & { member: Profile }

// -----------------------------------------------------------------------------
// Settings JSONB shape — typed wrapper around `gyms.settings`.
// Keep in sync with `DEFAULT_GYM_SETTINGS` in `lib/constants.ts` and the
// jsonb default declared in the gyms migration.
// -----------------------------------------------------------------------------

export type GymSettings = {
  /** Tolerance days after expiry before access is blocked. */
  gracePeriodDays: number
  /** Cumulative annual cap on subscription suspensions. */
  maxSuspensionDaysPerYear: number
  /** Days before expiry to send reminder emails. */
  expiryNotificationDays: number[]
  /** Days after expiry to send follow-up emails. */
  postExpiryNotificationDays: number[]
  /** ISO 4217 currency code, e.g. "EUR". */
  currency: string
  /** BCP 47 locale tag, e.g. "it-IT". */
  locale: string
}
