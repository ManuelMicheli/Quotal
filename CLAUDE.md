# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Quotal** — Italian SaaS for gym subscription management. Multi-tenant (each gym = its own row + connected Stripe Express account), PWA member + owner dashboard, Stripe Connect direct charges with platform application fee (SEPA/card + cash), Resend transactional email, web-push notifications, access control, GDPR compliance.

`PROJECT_STATUS.md` is the canonical post-Phase-10 reference (env vars, manual setup steps, deploy checklist, end-to-end smoke test, deferred work). Read it before working on phases / external dependencies / deploy.

## Commands

```bash
npm run dev          # Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint (eslint-config-next + TS rules)
```

No test runner configured. Verification scripts live in `scripts/`:

```bash
npx tsx scripts/verify-receipt-pdf.ts       # PDF render smoke test
node   scripts/verify-stripe.mjs            # Stripe price sync sanity check
node   scripts/verify-cron-endpoints.mjs    # Cron route auth check
node   scripts/verify-access-control.mjs    # Access adapter smoke (mock)
node   scripts/gen-vapid.mjs                # New VAPID keypair
STRIPE_SECRET_KEY=sk_...  npx tsx scripts/sync-stripe-prices.ts   # Sync subscription_plans → Stripe prices
npx supabase db push --linked               # Apply migrations to linked Supabase project
npm exec react-email dev --port 3001        # Visual preview of email templates
```

Env var validation is strict (`@t3-oss/env-nextjs` + zod in `lib/env.ts`). Set `SKIP_ENV_VALIDATION=true` to bypass during builds with placeholder env.

## Architecture

### Stack

- Next.js 16 App Router, React 19, TS strict, Tailwind v4, shadcn/radix UI primitives
- Supabase (Postgres + RLS + Auth + Storage + pg_cron)
- Stripe (SEPA mandates, card, webhooks)
- Resend (React Email templates), web-push (VAPID)
- `@react-pdf/renderer` for receipt PDFs

Path alias: `@/*` → repo root.

### Route groups (`app/`)

- `(auth)/` — login, signup (`/signup?gym=<slug>`), password reset, **`onboarding-titolare`** (public — provisions a new gym + owner account)
- `(owner)/dashboard/` — KPIs, members, subscriptions, payments, accesses, settings (plans, devices, GDPR, notifications)
- `(member)/app/` — member PWA: subscription view, QR badge, profile, offline shell
- `(public)/pay/` — token-gated public payment flow
- `(legal)/` — privacy, termini, cookie-policy
- `access/` — kiosk page (Phase 08 access control)
- `actions/` — Server Actions (`auth.ts`, `owner.ts`, `member.ts`, `payments.ts`, `access.ts`, `legal.ts`)
- `api/` — REST routes: `cron/{dispatch,notify-expiring,owner-digest,retry-sepa,update-expired}`, `webhooks/{stripe,resend}`, `access/`, `member/`, `owner/`, `health`

### Auth + role enforcement

Three roles: `owner`, `staff`, `member` (`lib/constants.ts`). Enforcement is two-layered:

1. **Middleware** (`middleware.ts` → `lib/supabase/middleware.ts`) refreshes session on every non-static request. Matcher excludes `_next/static`, `_next/image`, PWA assets (`manifest.webmanifest`, `sw.js`), and common static asset extensions.
2. **Server-side guards** in `lib/auth.ts` — `requireUser()`, `requireProfile()`, `requireOwnerOrStaff()`, `requireMember()` — `redirect()` on failure. Server Components and Server Actions MUST call these even though middleware already redirects, since parallel routes can be reached without going through middleware.

`dashboardPathForRole(role)` resolves the post-login destination (members → `/app`, others → `/dashboard`).

### Supabase clients (`lib/supabase/`)

Three flavors — pick the right one:

- `client.ts` — browser client, anon key. RLS enforced.
- `server.ts` → `createClient()` — server components/actions/route handlers, anon key, reads cookies. RLS enforced.
- `middleware.ts` → `updateSession()` — used by root middleware only (refreshes auth cookies).
- **`admin.ts`** → `createAdminClient()` — service-role JWT, **bypasses RLS**. `server-only` guarded. Currently only `app/(auth)/onboarding-titolare/page.tsx` may use it (creating the very first owner via `auth.admin.createUser({ email_confirm: true })`). Audit before adding new callers.

`Database` types in `lib/supabase/types.ts` regenerate via Supabase CLI.

### Data access pattern

Server-only RLS-scoped reads in `lib/queries/` (`access.ts`, `gym.ts`, `member.ts`, `notifications.ts`, `owner.ts`, `profile.ts`). All mutations flow through Server Actions in `app/actions/` (Zod-validated via `lib/validations/`). Never call Supabase from client components except for realtime channels.

### Database (Supabase migrations)

33 migrations under `supabase/migrations/` (apply with `npx supabase db push --linked`). Core tables: `gyms`, `profiles`, `subscription_plans`, `subscriptions`, `payments`, `subscription_suspensions`, `access_logs`, `notifications_sent`, `sepa_mandates`, `payment_sessions`, `stripe_events_processed` (idempotency), `push_subscriptions`, `access_devices`, `notification_preferences`, `owner_notifications` (inbox).

Notable Postgres functions invoked from app code:

- `process_successful_payment(...)` — atomically applies a successful payment to a subscription (cash + Stripe paths converge here).
- `register_cash_payment(...)` — cash payment + receipt issuance.
- `record_failed_payment(...)`, `record_refund(...)` — Stripe webhook side-effects.
- `handle_new_user` trigger — creates `profiles` row on `auth.users` insert.

RLS is enabled on every business table; policies in `..._enable_rls_and_policies.sql`. SECURITY DEFINER functions are hardened in `..._harden_security_definer_functions.sql`.

### Stripe + payments (Connect, multi-tenant)

`lib/stripe/` wraps the SDK. Each gym owns its own Stripe Express account (`gyms.stripe_account_id`); `lib/stripe/connect.ts` provides `createConnectAccount`, `createOnboardingLink`, `getGymStripeAccountId`, and `computeApplicationFee`. Every PaymentIntent / SetupIntent / Customer / Refund / billing-portal call passes `{ stripeAccount }` so funds flow into the connected account; the platform keeps `QUOTAL_APPLICATION_FEE_BPS` (basis points, default 200 = 2%) via `application_fee_amount`.

The webhook (`app/api/webhooks/stripe/route.ts`) listens to platform + Connect events on the same endpoint; when `event.account` is set the handlers thread it through any `stripe.*.retrieve` call. Required webhook events: `payment_intent.{succeeded,payment_failed}`, `setup_intent.{succeeded,setup_failed}`, `charge.refunded`, `charge.dispute.created`, `mandate.updated`. Enable "Listen to events on Connected accounts" on the endpoint. Sync `subscription_plans` → Stripe prices via `scripts/sync-stripe-prices.ts` (still operates on the platform account; per-gym Stripe Products are deferred).

### Notifications (Phase 09)

`lib/notifications/dispatcher.ts` is the single send pipeline (email via Resend, web-push via VAPID). Templates in `emails/` (React Email). Cron routes under `app/api/cron/*` are auth-gated by `CRON_SECRET` (bearer token, `lib/notifications/cron-auth.ts`) and called from pg_cron jobs defined in `..._phase09_pg_cron_schedule.sql`. Owner inbox state lives in `owner_notifications` (`lib/notifications/owner-inbox.ts`). Preference storage: `notification_preferences`.

### Access control (Phase 08)

Pluggable hardware adapter selected via `ACCESS_CONTROL_ADAPTER` env (`mock` | `rest`). `lib/access/adapter-factory.ts` returns the right impl from `lib/access/adapters/`. Verify endpoint always runs the full DB pipeline (`lib/access/evaluate.ts`) — adapter only owns the *physical* grant/lock action. Member QR is a JWT signed with `QR_TOKEN_SECRET` (`lib/qr.ts`); device/token auth in `lib/access/device-auth.ts`; replay-protection via `lib/access/idempotency.ts`.

### Security headers + CSP (Phase 10)

`next.config.ts` builds an explicit CSP and emits HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. CSP allows Stripe (`js.stripe.com`, `hooks.stripe.com`), Supabase (REST + Storage + Realtime via `wss://*.supabase.co`), Resend, Google Fonts, plus `data:` / `blob:` for QR data URLs and PDF object URLs. `'unsafe-inline'` on `script-src` is required by Next.js bootstrap + React hydration data (per-request nonce middleware is post-MVP). Set `CSP_REPORT_ONLY=true` for the first 24h after deploy.

Rate limiting in `lib/security/rate-limit.ts` is **in-memory per Lambda** (swap for `@upstash/ratelimit` before scaling).

### Legal / GDPR (Phase 10)

Company data in `lib/legal/config.ts` (must be populated per `docs/legal-setup.md`). Member-side privacy actions in `components/member/privacy-actions.tsx`; owner-side deletion + export queues in `components/owner/gdpr-deletion-table.tsx` / `gdpr-exports-table.tsx`. Migration `..._phase10_profiles_deleted_at_and_export_requests.sql` adds soft-delete + export request tables. Account deletion is currently a **manual** owner-side action (`/dashboard/impostazioni/gdpr-richieste`) — cron-based 30-day auto-purge is post-MVP.

## Conventions

- All UI strings are **Italian**. No i18n framework; refactoring to `next-intl` is post-MVP.
- Server Components by default. `"use client"` only when interactivity is required.
- Server Actions in `app/actions/*.ts` are the only sanctioned mutation path from the UI. Validate input with Zod schemas from `lib/validations/`.
- Currency stored in **cents** (integer). Date math uses `date-fns`.
- Read `PROJECT_STATUS.md` §6 ("Known caveats") before adding features that look missing — most are deliberately deferred.
