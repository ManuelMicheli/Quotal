/**
 * Stripe Connect helpers — multi-tenant payment routing.
 *
 * Each gym connects its own Stripe Express account. Payments for that gym's
 * subscriptions are charged on the connected account directly via the
 * `Stripe-Account` header so funds, refunds, and disputes flow into the
 * gym's own ledger and payouts go to its own IBAN.
 *
 * **Server only.**
 */
import 'server-only'

import type Stripe from 'stripe'

import { env } from '@/lib/env'
import { getStripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Compute Quotal's platform fee for a given gross amount, in cents. Returns
 * 0 when the fee is disabled in env. Round half-up to avoid sending 0 fees
 * on tiny amounts when QUOTAL_APPLICATION_FEE_BPS would mathematically
 * round to zero — anything below 1 cent is just dropped.
 */
export function computeApplicationFee(amountCents: number): number {
  const bps = env.QUOTAL_APPLICATION_FEE_BPS
  if (!bps || bps <= 0 || amountCents <= 0) return 0
  // bps / 10000 = fraction. e.g. 200 bps → 2%.
  const fee = Math.round((amountCents * bps) / 10000)
  return Math.max(0, fee)
}

/**
 * Resolve the connected Stripe account id for a gym, or null if the gym has
 * not finished Connect onboarding. Used by every Stripe API call that mutates
 * money so the right tenant's ledger is hit.
 */
export async function getGymStripeAccountId(
  gymId: string,
  admin: AdminClient = createAdminClient(),
): Promise<string | null> {
  const { data } = await admin
    .from('gyms')
    .select('stripe_account_id')
    .eq('id', gymId)
    .maybeSingle()
  return data?.stripe_account_id ?? null
}

/**
 * Create a fresh Express account for a gym and return the id. The caller is
 * responsible for persisting it to `gyms.stripe_account_id`. We default to
 * Italian companies + EUR since that is the only market the MVP serves.
 */
export async function createConnectAccount(input: {
  email: string
  gymName: string
  country?: string
}): Promise<Stripe.Account> {
  const stripe = getStripe()
  return stripe.accounts.create({
    type: 'express',
    country: input.country ?? 'IT',
    email: input.email,
    business_profile: {
      name: input.gymName,
      mcc: '7997', // Membership clubs (sports, recreation, athletic)
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
      sepa_debit_payments: { requested: true },
    },
    settings: {
      payouts: {
        schedule: { interval: 'daily' },
      },
    },
  })
}

/**
 * Mint a one-shot Stripe-hosted onboarding URL for the connected account so
 * the owner can submit KYC, banking details, etc. The URL expires quickly,
 * so we always create a new one when the owner clicks "connetti / continua".
 */
export async function createOnboardingLink(input: {
  accountId: string
  refreshUrl: string
  returnUrl: string
}): Promise<Stripe.AccountLink> {
  const stripe = getStripe()
  return stripe.accountLinks.create({
    account: input.accountId,
    refresh_url: input.refreshUrl,
    return_url: input.returnUrl,
    type: 'account_onboarding',
  })
}

/**
 * Retrieve a connected account snapshot. Used to refresh charges/payouts
 * status after the owner completes the Stripe-hosted onboarding flow.
 */
export async function retrieveConnectAccount(
  accountId: string,
): Promise<Stripe.Account> {
  const stripe = getStripe()
  return stripe.accounts.retrieve(accountId)
}
