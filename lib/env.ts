/**
 * Type-safe runtime environment variable validation.
 *
 * Uses `@t3-oss/env-nextjs` + zod. Importing this module from server code
 * validates server vars; importing from client code only validates the
 * `NEXT_PUBLIC_*` subset.
 */
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    APP_URL: z.string().url().default('http://localhost:3000'),
    /**
     * Set to "true" to expose `/onboarding-titolare`. The titolare flips this
     * to "false" once the first owner exists, so the route can never be
     * abused to escalate privileges in production.
     */
    ENABLE_OWNER_ONBOARDING: z
      .enum(['true', 'false'])
      .default('false'),
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
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    APP_URL: process.env.APP_URL,
    ENABLE_OWNER_ONBOARDING: process.env.ENABLE_OWNER_ONBOARDING,
    QR_TOKEN_SECRET: process.env.QR_TOKEN_SECRET,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    ACCESS_CONTROL_ADAPTER: process.env.ACCESS_CONTROL_ADAPTER,
    ACCESS_CONTROL_BASE_URL: process.env.ACCESS_CONTROL_BASE_URL,
    ACCESS_CONTROL_API_KEY: process.env.ACCESS_CONTROL_API_KEY,
  },
  // Skip validation when running in CI / build with no real env (e.g. Docker
  // build phase). Set SKIP_ENV_VALIDATION=true in those contexts.
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === 'true' ||
    process.env.SKIP_ENV_VALIDATION === '1',
  emptyStringAsUndefined: true,
})
