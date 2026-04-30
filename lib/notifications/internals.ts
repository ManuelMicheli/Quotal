/**
 * Internal re-exports — keeps the dispatcher module purely focused on
 * orchestration while still being able to lazy-pull the Resend wrapper
 * with one import statement.
 */
export {
  isResendConfigured,
  getFromAddress,
  getReplyToAddress,
  getResend,
  ResendNotConfiguredError,
} from '@/lib/email/client'

/**
 * Marker constant — referenced by the dispatcher's `void` statement so
 * tree-shaking won't drop the email/client side-effect on the server.
 * Pure documentation; no runtime effect.
 */
export const EMAIL_FROM_FALLBACK = '__quotal_resend_marker__'
