# Cron jobs

Quotal exposes five cron-callable HTTP endpoints under `/api/cron/*`:

| Endpoint                                | Cadence (Europe/Rome) | What it does                                                                  |
| --------------------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `POST /api/cron/update-expired`         | 00:30 daily           | Calls `update_expired_subscriptions()` to flip past-grace-period subs.        |
| `POST /api/cron/purge-deleted-accounts` | 03:00 daily           | Auto-anonymises GDPR deletion requests pending > 30 days (Phase 11).          |
| `POST /api/cron/owner-digest`           | 08:00 daily           | Inserts in-app notifications + sends `daily_digest_owner` email per gym.      |
| `POST /api/cron/notify-expiring`        | 09:00 daily           | Sends `expiry_7d`/`expiry_3d`/`expiry_today`/`post_expiry_3d` reminders.      |
| `POST /api/cron/retry-sepa`             | 09:15 daily           | Retries failed SEPA payments (≤3 attempts via Stripe).                        |

There's also a generic `POST /api/cron/dispatch` that accepts a JSON
body matching `DispatchInput` — useful for ad-hoc / one-off sends from
external schedulers or for testing.

## Authentication

All endpoints require:

```
Authorization: Bearer <CRON_SECRET>
```

(Plain `<CRON_SECRET>` without the `Bearer ` prefix and the legacy
`x-cron-secret` header are also accepted.)

If `CRON_SECRET` is not set on the server, the endpoints return **503
fail-closed** — they never accept anonymous requests.

Generate the secret via:

```bash
openssl rand -hex 32
```

…and add to `.env.local`:

```env
CRON_SECRET=<long random hex string>
```

## Schedule with Supabase pg_cron

The cron schedule lives in
`supabase/migrations/20260430084700_phase09_pg_cron_schedule.sql`. It is
**idempotent** and re-runnable: the migration first unschedules every
`quotal-*` job and recreates them.

The migration is a no-op on projects without `pg_cron` and `pg_net`
installed (it logs a NOTICE). For the production project, enable both
via the Supabase dashboard → **Database → Extensions** → search for
`pg_cron` and `pg_net`, then re-apply the migration.

Once enabled, set the two settings the schedule reads via
`current_setting()`:

```sql
alter database postgres set "app.settings.app_url" = 'https://quotal.it';
alter database postgres set "app.settings.cron_secret" = '<your CRON_SECRET>';
```

(`alter database … set` persists across pg_cron worker restarts.)

Verify the schedule:

```sql
select jobid, jobname, schedule, command
  from cron.job
 where jobname like 'quotal-%';
```

Trigger a job manually:

```sql
select cron.run_job((select jobid from cron.job where jobname = 'quotal-notify-expiring'));
```

## Schedule alternatives

If you don't want to enable `pg_cron`/`pg_net`, you can drive the same
endpoints from any external scheduler:

- **Vercel Cron** — add to `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/cron/update-expired",         "schedule": "30 22 * * *" },
      { "path": "/api/cron/purge-deleted-accounts", "schedule": "0 1 * * *" },
      { "path": "/api/cron/owner-digest",           "schedule": "0 6 * * *" },
      { "path": "/api/cron/notify-expiring",        "schedule": "0 7 * * *" },
      { "path": "/api/cron/retry-sepa",             "schedule": "15 7 * * *" }
    ]
  }
  ```
  Vercel adds an `Authorization: Bearer <VERCEL_CRON_SECRET>` header
  automatically — set `CRON_SECRET` in your Vercel project to match.

- **GitHub Actions** — a single workflow with `schedule` triggers can
  curl each endpoint with the secret.

- **Supabase Edge Functions** — if you'd rather drive cron from Deno
  Edge Functions (e.g. to keep all serverless work inside Supabase),
  schedule them with pg_cron and have each function `fetch()` the Next
  endpoint. The auth flow is identical.

## Smoke testing

Local dev:

```bash
# In one terminal
npm run dev

# In another
CRON_SECRET=test-secret-1234567890abcdef node scripts/verify-cron-endpoints.mjs
```

Each endpoint is hit twice (without secret → expect 401/503; with secret
→ expect 200/500 depending on environment readiness).

Dry-run notify-expiring without sending:

```bash
curl -X POST 'http://localhost:3000/api/cron/notify-expiring?dry=1' \
  -H "Authorization: Bearer $CRON_SECRET"
```

The response lists scanned dates, candidate counts, and skips actual
dispatch.

## Failure modes

- **Resend not configured** — the dispatcher logs warnings but the
  notification row is still inserted (with `resend_message_id = null`
  and `metadata.results.email = { skipped: 'not_configured' }`). When
  you finally set `RESEND_API_KEY`, future dispatches send normally.

- **VAPID keys missing** — same pattern: push silently no-ops.

- **Idempotency** — the unique index on `(subscription_id, type)`
  guarantees a member can only get one of each reminder type per
  subscription. The owner daily digest uses the partial unique index
  on `(gym_id, member_id, type, sent_on_date)` to enforce one digest
  per recipient per day. Retrying a cron is always safe.

- **Stripe failure during SEPA retry** — the cron rolls forward,
  bumping `payments.retry_count`. After 3 failed retries the cron stops
  picking up the row; the owner is alerted via
  `payment_failed_owner` and can intervene manually (re-issue cash,
  wait for new mandate).
