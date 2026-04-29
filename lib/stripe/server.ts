/**
 * Server-side Stripe SDK singleton.
 *
 * **NEVER import this from a client component.** It uses `STRIPE_SECRET_KEY`,
 * which must remain server-only. The `server-only` import will fail loudly if
 * a future client component tries to pull it in.
 *
 * Lazy factory: the secret key is resolved on first call, so the rest of the
 * app builds and runs while the env var is still a placeholder. Any caller
 * that actually triggers a Stripe API call without the key set will throw a
 * clear, actionable error.
 *
 * API version is pinned to `2026-04-22.dahlia` — the version baked into the
 * `stripe` SDK we ship (v22.x). Keep it pinned, then bump deliberately when
 * upgrading the SDK so we don't get silently switched to a newer behavior.
 */
import 'server-only'

import Stripe from 'stripe'

import { env } from '@/lib/env'

/** Pinned Stripe API version. Update intentionally when upgrading the SDK. */
export const STRIPE_API_VERSION = '2026-04-22.dahlia' as const

let _stripe: Stripe | null = null

/**
 * Return a configured `Stripe` instance, throwing a clear error if the secret
 * key is not set. Memoized — the SDK is cheap to construct, but having a
 * single shared instance avoids any chance of subtle config drift.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const secretKey = env.STRIPE_SECRET_KEY
  if (!secretKey || secretKey.length === 0) {
    throw new Error(
      'STRIPE_SECRET_KEY non configurata. Aggiungila in `.env.local` e riavvia il server.',
    )
  }
  _stripe = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: { name: 'Quotal', version: '0.1.0' },
  })
  return _stripe
}

/**
 * Read the webhook signing secret, or throw a clear error if absent.
 *
 * The webhook handler calls this lazily so unrelated code paths don't fail to
 * build/start when only the regular Stripe key is set.
 */
export function getWebhookSecret(): string {
  const secret = env.STRIPE_WEBHOOK_SECRET
  if (!secret || secret.length === 0) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET non configurata. Vedi `docs/stripe-setup.md`.',
    )
  }
  return secret
}
