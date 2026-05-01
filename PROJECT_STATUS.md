# Quotal — Project Status

Italian SaaS for gym subscription management. Single-tenant MVP, PWA member +
owner dashboard, Stripe SEPA/card + cash, Resend transactional email,
web-push, access control, GDPR-compliant.

This is the canonical post-Phase-10 reference document. Keep updated when
the schema or external dependencies change.

---

## 1. Phases & commits

All commits live on `main` except Phase 10, which is on `feat/10-polish`
awaiting review.

| Phase | Description | Commit |
| --- | --- | --- |
| 00 | Project foundation (Next.js 15 + TS strict + Tailwind v4 + shadcn) | `3981690` |
| 02 | Database schema with RLS + seed data | `233f4bf` (merge `ef264f0`) |
| 03 | Auth, roles, role-based redirect | `c50acdc` (merge `1534e0e`) |
| 04 | Owner dashboard (KPIs, members, subscriptions, payments, accesses) | `02524d6` (merge `caff297`) |
| 05 | Stripe payments (SEPA, card, webhooks, idempotency) | `086d8d1` (merge `7dd5717`) |
| 06 | Cash payments + PDF receipts + daily cash report | `a1bc8e7` (merge `be0bb13`) |
| 07 | Member PWA (subscription view, QR badge, profile, offline shell) | `d714f16` (merge `efc95db`) |
| 08 | Access control adapter (mock + REST), entry verify endpoint | `d5247f2` (merge `ad0d455`) |
| 09 | Notifications, React Email templates, daily cron, web-push | `44d64ed` (merge `0531aed`) |
| 10 | GDPR, security headers, rate limiting, UX polish | branch `feat/10-polish` |

(Phase 01 was the schema-design prompt — no separate commit.)

---

## 2. Required environment variables

Copy `.env.local.example` to `.env.local` for development; in production set
the same keys in the Vercel dashboard. Variables marked **(prod live)** must
use the live (not test) credentials when going live.

### Supabase (always required)

- `NEXT_PUBLIC_SUPABASE_URL` — `https://frkngwpsctullsedhtbm.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon JWT
- `SUPABASE_SERVICE_ROLE_KEY` — server-only

### Stripe (Phase 05+)

- `STRIPE_SECRET_KEY` **(prod live)** — `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` — `whsec_...` (rotates per environment)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` **(prod live)** — `pk_live_...`

### Resend (Phase 09+)

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — must match a verified domain in production
- `RESEND_REPLY_TO` — optional
- `RESEND_WEBHOOK_SECRET` — optional, signs delivery webhooks

### Web Push / VAPID (Phase 09)

- `VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value, exposed to the SW)
- `VAPID_PRIVATE_KEY`

Generate via `node scripts/gen-vapid.mjs`.

### Cron (Phase 09)

- `CRON_SECRET` — bearer token sent by pg_cron to `/api/cron/*`. Generate
  with `openssl rand -hex 32`. Empty value disables cron auth (fail-closed).

### Access control (Phase 08)

- `ACCESS_CONTROL_ADAPTER` — `mock` | `rest` (default `mock`)
- `ACCESS_CONTROL_BASE_URL` — vendor API for `rest` adapter
- `ACCESS_CONTROL_API_KEY` — bearer for `rest` adapter
- `QR_TOKEN_SECRET` — HMAC secret for member QR JWTs (32+ bytes)

### App / misc

- `APP_URL` — public origin. Auto-derived from `VERCEL_PROJECT_PRODUCTION_URL`
  / `VERCEL_URL` when unset.
- `NEXT_PUBLIC_APP_URL` — same as `APP_URL`, exposed to the client bundle so
  the invite-link card renders the right origin.
- `QUOTAL_APPLICATION_FEE_BPS` — platform fee taken from every Connect
  charge, in basis points (`200` = 2.00%, default `200`, `0` to disable).
- `CSP_REPORT_ONLY` — set to `true` for the first 24h after deploy to log
  CSP violations without blocking, then unset to enforce.

---

## 3. Manual setup steps (in order)

1. **Supabase project** — `frkngwpsctullsedhtbm` already provisioned.
   Capture the URL, anon key, and service-role key from
   `Project Settings → API`. Confirm `pg_cron` extension is enabled
   (`Database → Extensions`). Apply all migrations from `supabase/migrations/`
   (Supabase CLI: `npx supabase db push --linked`).

2. **Service-role key** — copy into `SUPABASE_SERVICE_ROLE_KEY` (Vercel
   environment, *not* in code). Audit: `lib/supabase/admin.ts` is the only
   file allowed to import it.

3. **Stripe keys** — activate live mode (requires document verification,
   1-3 business days). Sync prices: `STRIPE_SECRET_KEY=sk_live_…
   npx tsx scripts/sync-stripe-prices.ts`. Configure the production webhook
   `https://quotal.it/api/webhooks/stripe` with events:
   `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `setup_intent.succeeded`, `setup_intent.setup_failed`, `charge.refunded`,
   `mandate.updated`. Save the resulting `STRIPE_WEBHOOK_SECRET` in Vercel.

4. **Resend domain** — verify `quotal.it` (DNS records SPF, DKIM, DMARC).
   See `docs/email-setup.md`. Without verification, `RESEND_FROM_EMAIL`
   must remain on the sandbox `onboarding@resend.dev`.

5. **VAPID keypair** — `node scripts/gen-vapid.mjs`. Save the public key in
   both `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the private
   key in `VAPID_PRIVATE_KEY`.

6. **CRON_SECRET** — `openssl rand -hex 32`. Save in Vercel env, then update
   the pg_cron jobs in Supabase to send `Authorization: Bearer <secret>` on
   every dispatch (see `supabase/migrations/20260430084700_phase09_pg_cron_schedule.sql`).

7. **Legal config** — populate `lib/legal/config.ts` with the real company
   data (name, P.IVA, sede legale, REA, PEC). See `docs/legal-setup.md`.

---

## 4. First-deploy checklist

1. `git checkout main && git merge --no-ff feat/10-polish` then `git push`.
2. Vercel: connect the repo, set every env var listed in §2, hook the
   custom domain `quotal.it` (Vercel-managed DNS).
3. After the first build, set `CSP_REPORT_ONLY=true` and watch the
   browser console for 24h on real traffic. Then unset to enforce.
4. Smoke-test via `curl -I https://quotal.it/` to confirm HSTS + CSP arrive.
5. Run the manual end-to-end test in §5.

---

## 5. End-to-end smoke test

1. **Owner signup** — visit `/onboarding-titolare` (publicly available),
   create a new gym + owner. Login lands on `/dashboard`.
2. **Connect Stripe** — `/dashboard/impostazioni/stripe` → "Connetti Stripe"
   → complete the Express onboarding on Stripe. Status badge flips to
   "Operativo" once charges + payouts are enabled.
3. **Create plan** — `/dashboard/impostazioni/piani` adds a plan. Sync
   prices: `STRIPE_SECRET_KEY=sk_… npx tsx scripts/sync-stripe-prices.ts`.
4. **Invite member** — `/dashboard/membri` shows the public signup link;
   open it in a private window to register a new member account.
5. **Member payment** — register a cash payment from the member detail
   page; verify the receipt PDF lands in Storage. For SEPA/card, send a
   pay-link and complete the flow on the member side. Confirm the platform
   fee (default 2%) shows up on the platform's Stripe balance.
6. **Email preview** — `/dashboard/impostazioni/notifiche` shows current
   preferences. Open the React Email preview server (`npm exec react-email
   dev --port 3001`) for a visual sanity check on each template.
7. **Member PWA + QR** — log out, log in as the member, install the PWA on
   a phone, open the home tab, generate the QR. Scan via tablet at
   `/access` (after creating an access device + token in Impostazioni →
   Dispositivi). Verify the access log row appears in `/dashboard/ingressi`.

---

## 6. Known caveats (deferred work)

These are explicitly *not* in the MVP scope. Track in the issue tracker
when you start building them.

- **Camera-based QR scanning** in the kiosk — currently the access page
  only accepts a manual badge UID input or an upstream RFID reader. To
  enable phone-PWA + camera-tablet flows, integrate a JS QR library
  (`@zxing/library`) into `/access`.
- **Monthly PDF report (titolare)** — the React Email template
  `monthly-owner-report.tsx` exists, but the PDF version (with charts) is
  pending.
- **Accountant export ZIP** — CSV export exists at
  `/api/owner/payments/export`. Adding the ZIP-with-PDFs combo for the
  accountant is post-MVP.
- **Sentry / observability** — error boundaries log to console only. Wire
  `@sentry/nextjs` before the first paying customer.
- **Multi-tenant** — the schema has `gym_id` everywhere but the auth flow,
  the legal footer, and the gym/profile resolution all assume "the one and
  only gym". Multi-tenant requires a dedicated `gyms` selection screen and
  a tenant-aware login.
- **Dark mode** — design tokens already include the `.dark` palette; the
  `next-themes` toggle is unwired. Easy add when wanted.
- **i18n** — Italian-only. Strings are colocated, refactoring to `next-intl`
  is a follow-up.
- **Iubenda Cookie Solution** — the in-app banner is informational only
  (no profilation cookies). If analytics are introduced later, swap to
  Iubenda or Cookiebot.
- **Account deletion: scheduled cron-purge** — currently a manual
  owner-side action via `/dashboard/impostazioni/gdpr-richieste`. A
  cron-based purger that auto-anonymises after 30 days is post-MVP.
- **Rate limiter — Redis backend** — current implementation is in-memory
  per Lambda. Acceptable for one-gym MVP; before scaling, swap for
  `@upstash/ratelimit`.

---

## 7. File map

```
app/
├── (auth)/             — login, signup, password flows, owner onboarding
├── (legal)/            — /privacy, /termini, /cookie-policy   (Phase 10)
├── (member)/app/       — member PWA
├── (owner)/dashboard/  — owner dashboard
├── (public)/pay/       — token-gated payment flow
├── access/             — kiosk page (Phase 08)
├── actions/            — Server Actions (auth, owner, member, legal, payments)
├── api/                — REST endpoints (cron, webhooks, access verify, etc.)
├── error.tsx · global-error.tsx · not-found.tsx
├── layout.tsx · page.tsx
├── robots.ts · sitemap.ts                                    (Phase 10)
lib/
├── access/             — Phase 08 hardware adapters
├── auth.ts             — requireUser/requireMember/requireOwnerOrStaff
├── email/              — Resend client
├── legal/config.ts     — LEGAL_CONFIG  (Phase 10)
├── notifications/      — Phase 09 dispatcher + push
├── queries/            — server-only RLS-scoped reads
├── security/rate-limit.ts                                    (Phase 10)
├── supabase/           — server, client, admin, types
└── validations/        — Zod schemas
components/
├── auth/  · member/  · owner/  · payment/  · shared/  · ui/
├── shared/cookie-banner.tsx · legal-footer.tsx               (Phase 10)
├── owner/gdpr-deletion-table.tsx · gdpr-exports-table.tsx    (Phase 10)
└── member/privacy-actions.tsx                                 (Phase 10)
emails/                  — React Email templates
supabase/migrations/     — SQL migrations (+ Phase 10 GDPR tables)
docs/                    — operational documentation
```
