/**
 * Barrel export — keeps the dispatcher's `import * as templates` clean.
 *
 * The keys here MUST match the `NotificationType` strings used by the
 * dispatcher and stored in `notifications_sent.type`. Renaming a key
 * without updating the dispatcher map is a runtime bug that build won't
 * catch on its own — keep the union and this file in sync.
 */
import WelcomeEmail from './welcome'
import Expiry7dEmail from './expiry-7d'
import Expiry3dEmail from './expiry-3d'
import ExpiryTodayEmail from './expiry-today'
import PostExpiry3dEmail from './post-expiry-3d'
import SepaFailedEmail from './sepa-failed'
import SepaSucceededEmail from './sepa-succeeded'
import ReceiptEmail from './receipt'
import SubscriptionRenewedEmail from './subscription-renewed'
import SubscriptionSuspendedEmail from './subscription-suspended'
import SubscriptionResumedEmail from './subscription-resumed'
import DailyDigestOwnerEmail from './daily-digest-owner'
import PaymentFailedOwnerEmail from './payment-failed-owner'
import NewMemberOwnerEmail from './new-member-owner'
import MonthlyOwnerReportEmail from './monthly-owner-report'

export const templates = {
  welcome: WelcomeEmail,
  expiry_7d: Expiry7dEmail,
  expiry_3d: Expiry3dEmail,
  expiry_today: ExpiryTodayEmail,
  post_expiry_3d: PostExpiry3dEmail,
  sepa_failed: SepaFailedEmail,
  sepa_succeeded: SepaSucceededEmail,
  receipt: ReceiptEmail,
  subscription_renewed: SubscriptionRenewedEmail,
  subscription_suspended: SubscriptionSuspendedEmail,
  subscription_resumed: SubscriptionResumedEmail,
  daily_digest_owner: DailyDigestOwnerEmail,
  payment_failed_owner: PaymentFailedOwnerEmail,
  new_member_owner: NewMemberOwnerEmail,
  monthly_owner_report: MonthlyOwnerReportEmail,
} as const

export type TemplateKey = keyof typeof templates

export {
  WelcomeEmail,
  Expiry7dEmail,
  Expiry3dEmail,
  ExpiryTodayEmail,
  PostExpiry3dEmail,
  SepaFailedEmail,
  SepaSucceededEmail,
  ReceiptEmail,
  SubscriptionRenewedEmail,
  SubscriptionSuspendedEmail,
  SubscriptionResumedEmail,
  DailyDigestOwnerEmail,
  PaymentFailedOwnerEmail,
  NewMemberOwnerEmail,
  MonthlyOwnerReportEmail,
}
