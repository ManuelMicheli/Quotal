/**
 * Read-only helpers that surface the connected Stripe account's status to
 * the owner. The MVP is single-tenant: the Stripe account whose secret key
 * lives in `STRIPE_SECRET_KEY` is the gym's own account, so we just pull the
 * account, balance, and recent payouts directly.
 *
 * **Server only.** Never import from a client component.
 */
import 'server-only'

import type Stripe from 'stripe'

import { getStripe } from '@/lib/stripe/server'

export type StripeAccountSnapshot = {
  configured: boolean
  /** `true` if Stripe SDK call failed (e.g. invalid key). */
  error: string | null
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
  error: null,
  account: null,
  balance: null,
  payouts: [],
}

function centsToEur(amount: number): number {
  return Math.round(amount) / 100
}

export async function getStripeAccountSnapshot(): Promise<StripeAccountSnapshot> {
  let stripe: Stripe
  try {
    stripe = getStripe()
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  try {
    const [account, balance, payouts] = await Promise.all([
      stripe.accounts.retrieveCurrent(),
      stripe.balance.retrieve(),
      stripe.payouts.list({ limit: 5 }),
    ])

    const eur = (b: Stripe.Balance['available'][number] | undefined) =>
      b ? centsToEur(b.amount) : 0
    const eurAvail = balance.available.find((b) => b.currency === 'eur')
    const eurPending = balance.pending.find((b) => b.currency === 'eur')

    return {
      configured: true,
      error: null,
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
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
