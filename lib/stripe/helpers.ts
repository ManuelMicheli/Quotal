/**
 * Server-side Stripe helpers — domain glue between Stripe and our DB.
 *
 * Each helper takes a Supabase admin (service-role) client so the caller
 * decides the trust boundary. Lazy in the sense that they don't perform any
 * Stripe call until invoked; safe to import from server actions and route
 * handlers without any side effects.
 */
import 'server-only'

import { randomBytes } from 'node:crypto'
import type Stripe from 'stripe'

import { getStripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/lib/domain-types'

export type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Generate a URL-safe, unguessable token for `payment_sessions.token`.
 *
 * 32 random bytes → 43-char base64url string. Plenty of entropy and short
 * enough to fit in URLs and emails comfortably.
 */
export function generatePaymentSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Look up (or create on demand) the Stripe Customer for a given member.
 *
 * Persists the `stripe_customer_id` back onto `profiles` so subsequent calls
 * are O(1). The Stripe Customer is the durable anchor for the SEPA mandate
 * (PaymentMethod) used for off-session renewals.
 */
export async function getOrCreateStripeCustomer(
  member: Profile,
  admin: AdminClient = createAdminClient(),
  /**
   * Optional Connect account id. When set, the Stripe Customer is created on
   * (and lives only on) the connected account — this is the "direct charge"
   * model. Without it the customer is created on the platform account
   * (legacy single-tenant behaviour).
   */
  stripeAccountId?: string | null,
): Promise<string> {
  if (member.stripe_customer_id) return member.stripe_customer_id

  const stripe = getStripe()
  const customer = await stripe.customers.create(
    {
      email: member.email,
      name: member.full_name,
      metadata: {
        profile_id: member.id,
        gym_id: member.gym_id,
      },
    },
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  )

  const { error } = await admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', member.id)
  if (error) {
    // Best effort: the Stripe Customer exists, but we failed to persist the
    // mapping. Surface for the caller to log; the next call will simply
    // create a new Stripe Customer (Stripe doesn't dedupe by email).
    throw new Error(
      `Stripe Customer creato (${customer.id}) ma errore salvataggio profilo: ${error.message}`,
    )
  }
  return customer.id
}

/**
 * Map Stripe payment_method types we accept to our `payment_method` column.
 */
export function stripePaymentMethodToDb(
  stripeMethod: string | null | undefined,
): 'card' | 'sepa' | null {
  if (stripeMethod === 'card') return 'card'
  if (stripeMethod === 'sepa_debit') return 'sepa'
  return null
}

/**
 * Pull a clean failure reason from a Stripe PaymentIntent or Charge.
 */
export function extractFailureReason(
  pi: Stripe.PaymentIntent | Stripe.Charge,
): string {
  if ('last_payment_error' in pi && pi.last_payment_error) {
    const err = pi.last_payment_error
    return err.message ?? err.code ?? err.type ?? 'unknown'
  }
  if ('failure_message' in pi && pi.failure_message) return pi.failure_message
  if ('failure_code' in pi && pi.failure_code) return pi.failure_code
  return 'unknown'
}
