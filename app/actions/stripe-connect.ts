'use server'

/**
 * Server actions for the per-gym Stripe Connect flow.
 *
 * Each gym owns a Stripe Express account whose id is stored in
 * `gyms.stripe_account_id`. These actions:
 *   - provision a new connected account if the gym does not have one
 *   - mint a fresh Stripe-hosted onboarding URL
 *   - refresh the cached charges/payouts capability flags after the owner
 *     finishes onboarding
 *
 * Mutations are scoped to the caller's gym via `requireOwnerOrStaff()` plus
 * RLS — even using the admin client we always pin updates to that gym id.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireOwnerOrStaff } from '@/lib/auth'
import { env } from '@/lib/env'
import {
  createConnectAccount,
  createOnboardingLink,
  retrieveConnectAccount,
} from '@/lib/stripe/connect'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type StripeConnectActionResult =
  | { ok: true; redirectUrl?: string }
  | { ok: false; error: string }

const RETURN_PATH = '/dashboard/impostazioni/stripe/return'
const REFRESH_PATH = '/dashboard/impostazioni/stripe?refresh=1'

function appOrigin(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
}

/**
 * Either create the gym's Connect account (first time) or just mint a fresh
 * onboarding link (returning user). On success we `redirect()` to Stripe's
 * hosted onboarding URL — the caller never sees a return value because the
 * redirect throws NEXT_REDIRECT.
 */
export async function connectStripeAction(): Promise<StripeConnectActionResult> {
  const profile = await requireOwnerOrStaff()
  const supabase = await createClient()

  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .select('id, name, email, country, stripe_account_id')
    .eq('id', profile.gym_id)
    .maybeSingle()

  if (gymError || !gym) {
    return { ok: false, error: 'Palestra non trovata.' }
  }

  let accountId = gym.stripe_account_id

  if (!accountId) {
    let account
    try {
      account = await createConnectAccount({
        email: gym.email,
        gymName: gym.name,
        country: gym.country ?? 'IT',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        error: `Creazione account Stripe non riuscita: ${message}`,
      }
    }

    // Persist via the admin client because the column is service-role-only
    // by convention even though the policy permits owner updates.
    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('gyms')
      .update({ stripe_account_id: account.id })
      .eq('id', gym.id)

    if (updateError) {
      // Best-effort cleanup — leaving the account orphan would block the
      // next try since Stripe does not allow recreating with the same email.
      // Stripe Express accounts can be deleted only in test mode, so we
      // surface the error and let the operator follow up.
      return {
        ok: false,
        error:
          'Impossibile salvare l’account Stripe. Riprova fra qualche istante.',
      }
    }

    accountId = account.id
  }

  let link
  try {
    link = await createOnboardingLink({
      accountId,
      refreshUrl: `${appOrigin()}${REFRESH_PATH}`,
      returnUrl: `${appOrigin()}${RETURN_PATH}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      error: `Onboarding link non disponibile: ${message}`,
    }
  }

  redirect(link.url)
}

/**
 * Re-fetch the connected account from Stripe and update the gym's cached
 * charges/payouts flags. Called by the return route after the owner closes
 * the Stripe-hosted onboarding tab.
 */
export async function refreshStripeStatusAction(): Promise<StripeConnectActionResult> {
  const profile = await requireOwnerOrStaff()
  const supabase = await createClient()

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, stripe_account_id')
    .eq('id', profile.gym_id)
    .maybeSingle()

  if (!gym?.stripe_account_id) {
    return { ok: false, error: 'Account Stripe non collegato.' }
  }

  try {
    await retrieveConnectAccount(gym.stripe_account_id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Lettura stato Stripe fallita: ${message}` }
  }

  // The status is read live from Stripe each render (no cached column yet),
  // so all we need to do is bust the page cache.
  revalidatePath('/dashboard/impostazioni/stripe')
  return { ok: true }
}
