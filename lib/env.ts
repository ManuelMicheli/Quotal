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
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    APP_URL: process.env.APP_URL,
    ENABLE_OWNER_ONBOARDING: process.env.ENABLE_OWNER_ONBOARDING,
  },
  // Skip validation when running in CI / build with no real env (e.g. Docker
  // build phase). Set SKIP_ENV_VALIDATION=true in those contexts.
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === 'true' ||
    process.env.SKIP_ENV_VALIDATION === '1',
  emptyStringAsUndefined: true,
})
