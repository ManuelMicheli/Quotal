/**
 * Shared notification types — kept in a separate file so the dispatcher,
 * push helper, and UI bits can import them without pulling in
 * server-only dependencies (Resend SDK, web-push, react-email render).
 */

/**
 * Every kind of notification the app sends. Mirrored exactly in the
 * `notifications_sent.type` CHECK constraint and in `emails/index.ts`
 * `templates`. Keep all three in sync.
 */
export type NotificationType =
  // Member-facing
  | 'welcome'
  | 'expiry_7d'
  | 'expiry_3d'
  | 'expiry_today'
  | 'post_expiry_3d'
  | 'sepa_failed'
  | 'sepa_succeeded'
  | 'receipt'
  | 'subscription_renewed'
  | 'subscription_suspended'
  | 'subscription_resumed'
  // Owner-facing
  | 'daily_digest_owner'
  | 'payment_failed_owner'
  | 'new_member_owner'
  | 'monthly_owner_report'

export const ALL_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'welcome',
  'expiry_7d',
  'expiry_3d',
  'expiry_today',
  'post_expiry_3d',
  'sepa_failed',
  'sepa_succeeded',
  'receipt',
  'subscription_renewed',
  'subscription_suspended',
  'subscription_resumed',
  'daily_digest_owner',
  'payment_failed_owner',
  'new_member_owner',
  'monthly_owner_report',
] as const

export type NotificationChannel = 'email' | 'push' | 'in_app'

export type NotificationAttachment = {
  filename: string
  /** Base64-encoded body, OR a Buffer / Uint8Array. */
  content: string | Buffer | Uint8Array
}

/** Result returned from `dispatchNotification`. */
export type DispatchResult =
  | { skipped: true; reason: 'already_sent' | 'opted_out' | 'no_recipient' }
  | {
      sent: true
      channels: {
        email?: { id: string | null } | { skipped: 'not_configured' | 'opted_out' }
        push?: { sent: number; failed: number } | { skipped: 'not_configured' | 'opted_out' | 'no_subscriptions' }
      }
    }
  | { error: true; message: string }

/**
 * Map from notification type → which preference flag controls it for
 * each channel. Missing entry = always send (e.g. receipts default to
 * always-on because they're legal records).
 */
export type ChannelPreferenceFlags = {
  email?:
    | 'email_expiry_reminders'
    | 'email_payment_receipts'
    | 'email_payment_failures'
    | 'email_lifecycle_changes'
    | 'email_daily_digest'
    | 'email_payment_failed_alert'
    | 'email_new_member_alert'
    | 'email_monthly_report'
  push?: 'push_expiry_reminders' | 'push_payment_events'
}

export const NOTIFICATION_PREFERENCE_MAP: Record<
  NotificationType,
  ChannelPreferenceFlags
> = {
  welcome: { email: 'email_lifecycle_changes' },
  expiry_7d: {
    email: 'email_expiry_reminders',
    push: 'push_expiry_reminders',
  },
  expiry_3d: {
    email: 'email_expiry_reminders',
    push: 'push_expiry_reminders',
  },
  expiry_today: {
    email: 'email_expiry_reminders',
    push: 'push_expiry_reminders',
  },
  post_expiry_3d: {
    email: 'email_expiry_reminders',
    push: 'push_expiry_reminders',
  },
  sepa_failed: {
    email: 'email_payment_failures',
    push: 'push_payment_events',
  },
  sepa_succeeded: {
    email: 'email_lifecycle_changes',
    push: 'push_payment_events',
  },
  receipt: {
    // No flag — receipts are records, always sent.
    push: 'push_payment_events',
  },
  subscription_renewed: { email: 'email_lifecycle_changes' },
  subscription_suspended: { email: 'email_lifecycle_changes' },
  subscription_resumed: { email: 'email_lifecycle_changes' },
  daily_digest_owner: { email: 'email_daily_digest' },
  payment_failed_owner: { email: 'email_payment_failed_alert' },
  new_member_owner: { email: 'email_new_member_alert' },
  monthly_owner_report: { email: 'email_monthly_report' },
}
