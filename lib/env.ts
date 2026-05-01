/**
 * Type-safe runtime environment variable validation.
 *
 * Uses `@t3-oss/env-nextjs` + zod. Importing this module from server code
 * validates server vars; importing from client code only validates the
 * `NEXT_PUBLIC_*` subset.
 */
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Auto-derive the public app URL from Vercel-injected env vars when
 * `NEXT_PUBLIC_APP_URL` is not set explicitly. Production deployments resolve
 * to the stable production domain; previews use the per-deployment URL so the
 * email redirect lands on the same preview that issued it.
 */
const inferredAppUrl =
  process.env.VERCEL_ENV === 'production' &&
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).optional(),
    /**
     * Optional `Reply-To` header (e.g. `support@quotal.it`). Falls back to
     * `RESEND_FROM_EMAIL` if unset.
     */
    RESEND_REPLY_TO: z.string().email().optional(),
    /**
     * Resend webhook signing secret. Optional: when unset the
     * `/api/webhooks/resend` endpoint accepts requests without verification
     * (useful in dev). In production, set this to the value Resend prints
     * when you create the webhook.
     */
    RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
    APP_URL: z.string().url().default('http://localhost:3000'),
    /**
     * Shared secret used by Supabase pg_cron / Edge Functions to invoke
     * Phase 09 cron endpoints (`/api/cron/...`). Sent as `Authorization:
     * Bearer ...`. Optional in dev — if unset, the cron endpoints reject
     * every request (fail-closed) since there's no way to authenticate.
     */
    CRON_SECRET: z.string().min(16).optional(),
    /**
     * HMAC secret used to sign the JWT embedded in the member access QR
     * (Phase 07). The tornello (Phase 08) verifies this signature before
     * granting entry. Optional in dev — a deterministic dev fallback is
     * derived from `NEXT_PUBLIC_SUPABASE_URL` so localhost just works, but
     * production MUST set a real 32+ byte secret.
     */
    QR_TOKEN_SECRET: z.string().min(16).optional(),
    /**
     * VAPID keypair for web-push (Phase 09 send pipeline). Stored here
     * because the SW needs the public key at registration time. Optional
     * until Phase 09 — the subscribe endpoint short-circuits if missing.
     */
    VAPID_PRIVATE_KEY: z.string().min(1).optional(),
    /**
     * Phase 08 access-control hardware adapter. `mock` is the only
     * "thinking-only" backend (no physical command sent — useful for the
     * QR + tablet MVP where the tablet itself is the gate). `rest` proxies
     * grant/lock commands to a generic vendor HTTP API after a successful
     * decision. The verify endpoint always runs the full DB pipeline; the
     * adapter only owns the *physical action*.
     */
    ACCESS_CONTROL_ADAPTER: z.enum(['mock', 'rest']).default('mock'),
    /** Base URL for the REST-adapter vendor API, e.g. https://gateway.local. */
    ACCESS_CONTROL_BASE_URL: z.string().url().optional(),
    /** Bearer token sent as `Authorization: Bearer ...` to the REST adapter. */
    ACCESS_CONTROL_API_KEY: z.string().min(1).optional(),
    /**
     * Quotal platform fee applied to every Connect charge, in basis points
     * (1 bps = 0.01%). Default 200 = 2.00%. Charged via Stripe's
     * `application_fee_amount` so the gym's payout is automatically net of
     * the platform's cut. Set to 0 to disable (zero-fee mode).
     */
    QUOTAL_APPLICATION_FEE_BPS: z.coerce.number().int().min(0).max(2000).default(200),
    /**
     * Sentry server-side DSN. Optional — when unset the SDK no-ops on the
     * server. The browser bundle uses `NEXT_PUBLIC_SENTRY_DSN` (set both to
     * the same value).
     */
    SENTRY_DSN: z.string().url().optional(),
    /**
     * Environment label sent with every event (e.g. `production`,
     * `preview`, `development`). Falls back to `VERCEL_ENV`, then to
     * `NODE_ENV`.
     */
    SENTRY_ENVIRONMENT: z.string().min(1).optional(),
    /**
     * Auth token used by `@sentry/nextjs` at build time to upload source
     * maps. Required only on the production build that should produce
     * symbolicated stack traces; CI / local builds can omit it.
     */
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    /** Sentry org slug, used together with `SENTRY_AUTH_TOKEN`. */
    SENTRY_ORG: z.string().min(1).optional(),
    /** Sentry project slug, used together with `SENTRY_AUTH_TOKEN`. */
    SENTRY_PROJECT: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    /**
     * Stripe.js publishable key (`pk_test_…` / `pk_live_…`).
     *
     * Optional at build time so the project still compiles without real
     * Stripe credentials. The `<Elements>` provider in
     * `components/payment/payment-elements-provider.tsx` throws a clear
     * error if it's missing at runtime.
     */
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    /**
     * VAPID public key (uncompressed P-256 base64url). Read by the SW push
     * subscription flow on the client. Optional in MVP — without it the
     * "abilita notifiche" flow stays disabled.
     */
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
    /**
     * Sentry browser DSN. Same value as `SENTRY_DSN` — exposed to the
     * client bundle so `instrumentation-client.ts` can initialise.
     */
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? inferredAppUrl,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_REPLY_TO: process.env.RESEND_REPLY_TO,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    APP_URL: process.env.APP_URL ?? inferredAppUrl,
    QR_TOKEN_SECRET: process.env.QR_TOKEN_SECRET,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    ACCESS_CONTROL_ADAPTER: process.env.ACCESS_CONTROL_ADAPTER,
    ACCESS_CONTROL_BASE_URL: process.env.ACCESS_CONTROL_BASE_URL,
    ACCESS_CONTROL_API_KEY: process.env.ACCESS_CONTROL_API_KEY,
    QUOTAL_APPLICATION_FEE_BPS: process.env.QUOTAL_APPLICATION_FEE_BPS,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  },
  // Skip validation when running in CI / build with no real env (e.g. Docker
  // build phase). Set SKIP_ENV_VALIDATION=true in those contexts.
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === 'true' ||
    process.env.SKIP_ENV_VALIDATION === '1',
  emptyStringAsUndefined: true,
})
