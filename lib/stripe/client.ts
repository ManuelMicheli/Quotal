/**
 * Client-side Stripe.js loader.
 *
 * Memoizes the `loadStripe(...)` promise so re-renders share a single
 * pending fetch. Throws a clear error if the publishable key is missing —
 * this happens before any UI mounts so the developer sees it instantly.
 */
import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (stripePromise) return stripePromise
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey || publishableKey.length === 0) {
    throw new Error(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY non configurata. Aggiungila in `.env.local`.',
    )
  }
  stripePromise = loadStripe(publishableKey)
  return stripePromise
}
