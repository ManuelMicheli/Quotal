/**
 * Read-only helpers that surface a gym's connected Stripe account state to
 * the owner.
 *
 * Multi-tenant: each gym owns its own Stripe Express account whose id is
 * stored in `gyms.stripe_account_id`. The platform Stripe key (the one in
 * `STRIPE_SECRET_KEY`) is the *platform* account; we use it together with
 * the `Stripe-Account` header to read the connected account.
 *
 * **Server only.** Never import from a client component.
 */
import 'server-only'

import type Stripe from 'stripe'

import { getCurrentGym } from '@/lib/queries/gym'
import { getStripe } from '@/lib/stripe/server'

export type StripeAccountSnapshot = {
  /** True once both the platform key and the gym's Stripe account are set up. */
  configured: boolean
  /** True once the gym has a `stripe_account_id` saved (Connect onboarding started). */
  connected: boolean
  /** `non-null` if the Stripe SDK call failed (e.g. invalid key). */
  error: string | null
  /** Cached gym slug used to build links back into the dashboard. */
  gym: { id: string; name: string } | null
  account: {
    id: string
    /** True once Stripe has approved the KYC and the account can charge cards. */
    charges_enabled: boolean
    /** True once the gym can receive money to its bank account. */
    payouts_enabled: boolean
    /** True for "details_submitted": the owner has completed the onboarding form. */
    details_submitted: boolean
    /** "live" once the account has been activated, otherwise "test"/"none". */
    livemode: 'live' | 'test' | 'unknown'
    /** Country ISO-2 (e.g. "IT"). */
    country: string | null
    /** Default currency (e.g. "eur"). */
    default_currency: string | null
    /** Business name on the Stripe account, if any. */
    business_name: string | null
    /** Email used at signup, if any. */
    email: string | null
    /**
     * Outstanding requirements that block charges/payouts (ID upload, IBAN,
     * tax info, etc.). Empty array = nothing to do.
     */
    requirements_currently_due: string[]
    requirements_past_due: string[]
    requirements_disabled_reason: string | null
  } | null
  balance: {
    available_eur: number
    pending_eur: number
  } | null
  payouts: Array<{
    id: string
    amount_eur: number
    status: string
    arrival_date: string
  }>
}

const empty: StripeAccountSnapshot = {
  configured: false,
  connected: false,
  error: null,
  gym: null,
  account: null,
  balance: null,
  payouts: [],
}

function centsToEur(amount: number): number {
  return Math.round(amount) / 100
}

export async function getStripeAccountSnapshot(): Promise<StripeAccountSnapshot> {
  const gym = await getCurrentGym()
  const gymHeader = gym ? { id: gym.id, name: gym.name } : null

  let stripe: Stripe
  try {
    stripe = getStripe()
  } catch (err) {
    return {
      ...empty,
      gym: gymHeader,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  if (!gym?.stripe_account_id) {
    // Platform key works, but this gym hasn't connected its own account yet.
    return {
      ...empty,
      configured: true,
      connected: false,
      gym: gymHeader,
    }
  }

  const accountId = gym.stripe_account_id

  try {
    const opts = { stripeAccount: accountId } as const
    const [account, balance, payouts] = await Promise.all([
      stripe.accounts.retrieve(accountId),
      stripe.balance.retrieve({}, opts),
      stripe.payouts.list({ limit: 5 }, opts),
    ])

    const eur = (b: Stripe.Balance['available'][number] | undefined) =>
      b ? centsToEur(b.amount) : 0
    const eurAvail = balance.available.find((b) => b.currency === 'eur')
    const eurPending = balance.pending.find((b) => b.currency === 'eur')

    return {
      configured: true,
      connected: true,
      error: null,
      gym: gymHeader,
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled ?? false,
        payouts_enabled: account.payouts_enabled ?? false,
        details_submitted: account.details_submitted ?? false,
        livemode:
          account.charges_enabled && account.payouts_enabled
            ? 'live'
            : account.details_submitted
              ? 'test'
              : 'unknown',
        country: account.country ?? null,
        default_currency: account.default_currency ?? null,
        business_name:
          account.business_profile?.name ??
          account.settings?.dashboard?.display_name ??
          null,
        email: account.email ?? null,
        requirements_currently_due: account.requirements?.currently_due ?? [],
        requirements_past_due: account.requirements?.past_due ?? [],
        requirements_disabled_reason:
          account.requirements?.disabled_reason ?? null,
      },
      balance: {
        available_eur: eur(eurAvail),
        pending_eur: eur(eurPending),
      },
      payouts: payouts.data.map((p) => ({
        id: p.id,
        amount_eur: centsToEur(p.amount),
        status: p.status,
        arrival_date: new Date(p.arrival_date * 1000).toISOString(),
      })),
    }
  } catch (err) {
    return {
      ...empty,
      configured: true,
      connected: true,
      gym: gymHeader,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
