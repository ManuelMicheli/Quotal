# Stripe setup (Phase 05)

This document lists the exact actions needed before the Phase 05 payment
flow can be tested end-to-end against real Stripe test-mode infrastructure.

The codebase already builds and lints with empty/placeholder Stripe keys —
this guide is only required when you actually want to charge a card or
authorize a SEPA mandate.

## 1. Stripe account

1. Create a Stripe account (or sign in).
2. Confirm you are in **Test mode** (toggle in the dashboard top-right).
3. From <https://dashboard.stripe.com/test/apikeys>, copy:
   - **Publishable key** (`pk_test_…`)
   - **Secret key** (`sk_test_…`)

## 2. Local environment

Edit `.env.local` and fill in:

```
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=          # filled in step 4
```

The publishable key MUST start with `NEXT_PUBLIC_` so it's exposed to the
browser bundle.

## 3. SEPA Direct Debit

In Test mode, SEPA is enabled by default. In **Live** mode you must verify
your business at <https://dashboard.stripe.com/settings/payments>. The
codebase uses `payment_method_types: ['sepa_debit']` (not Card) — make sure
SEPA Direct Debit is listed in your settings.

Test IBANs:

| IBAN                      | Behavior                              |
| ------------------------- | ------------------------------------- |
| DE89370400440532013000    | Success                               |
| AT611904300234573201      | Setup fails / charge fails            |
| FR1420041010050500013M02606 | Setup succeeds, debit fails later   |

Test card (3DS-required):

| Card number              | Behavior        |
| ------------------------ | --------------- |
| 4242 4242 4242 4242      | Success (no 3DS) |
| 4000 0025 0000 3155      | Requires 3DS     |
| 4000 0000 0000 9995      | Declined         |

## 4. Webhook forwarding (local dev)

Install the Stripe CLI: <https://stripe.com/docs/stripe-cli>.

In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints `Ready! Your webhook signing secret is whsec_…`. Copy that
value into `STRIPE_WEBHOOK_SECRET` in `.env.local` and **restart the dev
server**.

Events the handler subscribes to:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `setup_intent.succeeded`
- `setup_intent.setup_failed`
- `charge.refunded`
- `charge.dispute.created`
- `mandate.updated`

When you forward via the CLI, all events are sent — the handler simply
acknowledges (returns 200) for unhandled types, which is correct.

For production, create a webhook endpoint in the dashboard at
<https://dashboard.stripe.com/test/webhooks/create> pointing to
`https://<your-domain>/api/webhooks/stripe`, subscribe to the seven events
above, and copy the signing secret into your hosting environment as
`STRIPE_WEBHOOK_SECRET`.

## 5. Sync plans → Stripe

We don't strictly need Stripe Products/Prices for one-time charges — the
PaymentIntent uses `amount` directly, in cents. The sync script is
provided as a convenience for when you want analytics in the Stripe
dashboard or plan to graduate to Stripe Subscriptions later.

```bash
STRIPE_SECRET_KEY=sk_test_... \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
NEXT_PUBLIC_SUPABASE_URL=https://frkngwpsctullsedhtbm.supabase.co \
node scripts/sync-stripe-prices.mjs
```

Stripe Prices are immutable — when you change a plan's price in the
dashboard, blank out `stripe_price_id` in the DB and re-run the script to
provision a new Price.

## 6. Verify the local pipeline

With the dev server running and the Stripe CLI forwarding webhooks, the
included smoke test confirms signature verification + idempotency:

```bash
STRIPE_WEBHOOK_SECRET=whsec_…  node scripts/verify-stripe.mjs
```

You should see:

```
OK  : missing signature → 400
OK  : bad signature   → 400
OK  : unhandled event evt_… → 200
OK  : replay → 200 (idempotent: "ok (duplicate)")
All webhook smoke tests passed.
```

## 7. Live-flow test (manual)

1. In `/dashboard`, create a member and a plan.
2. Open the member detail page → "Invia link pagamento" → pick a plan →
   "Genera link" → copy the URL.
3. Open the URL in an incognito window.
4. Submit:
   - **Card**: `4242 4242 4242 4242`, any future expiry, any CVC.
   - **SEPA**: `DE89370400440532013000`, name + email, tick consent.
5. With `stripe listen` running you'll see `payment_intent.succeeded`
   (card) or `setup_intent.succeeded` followed by `payment_intent.processing`
   (SEPA). The handler creates the subscription + payment row.
6. Check `/dashboard/pagamenti` — the row should appear with the
   correct method, status, and a generated `receipt_number`.

## 8. Refund

From the member's Pagamenti tab, click "Rimborsa" on a successful
payment. Stripe issues a refund; the `charge.refunded` webhook flips the
DB row to `status='refunded'` and cancels the linked subscription.

## 9. Manual SEPA renewal (Phase 09 cron preview)

Subscriptions where `auto_renew=true && payment_method='sepa'` show a
"Rinnova ora (SEPA)" button on the member page. The cron job will be
implemented in Phase 09; for now this lets the owner trigger a renewal
manually. The button creates a fresh `payment_session`, then a
PaymentIntent with `confirm: true, off_session: true` against the saved
SEPA PaymentMethod. The webhook handles success/failure as for any other
payment.

## API version

We pin `apiVersion: '2026-04-22.dahlia'` in `lib/stripe/server.ts`. This
matches the `stripe` SDK v22.x default. Bump it deliberately when
upgrading the SDK; otherwise Stripe's library could route requests to a
newer surface that we haven't validated.
