# Email setup (Resend)

Quotal sends transactional email through [Resend](https://resend.com). All
templates live under `emails/` and render via React Email; the dispatcher
in `lib/notifications/dispatcher.ts` handles fan-out (email + push) and
idempotency.

## 1. Create the Resend account & API key

1. Go to <https://resend.com/signup> and create an account.
2. Open **Settings → API Keys** and create a key with `send_emails`
   permission. Copy it (it starts with `re_…`).
3. Paste it into `.env.local`:

   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxx
   ```

Without this key, the dispatcher logs a warning and skips the send (it
never throws). The build still passes with placeholders.

## 2. Verify your sending domain

Resend requires DNS verification before you can send from a custom
domain (the sandbox `onboarding@resend.dev` works without it but is
rate-limited and not branded).

1. **Add the domain** in Resend → Domains → Add domain. Use the same
   domain you serve the app from (e.g. `quotal.it`).
2. **Add DNS records** at your DNS provider:
   - **SPF** — `TXT @  v=spf1 include:amazonses.com ~all`
   - **DKIM** — Resend gives you 3 CNAME records pointing to
     `dkim*.amazonses.com`. Paste them verbatim.
   - **DMARC** — `TXT _dmarc  v=DMARC1; p=none; rua=mailto:postmaster@quotal.it`
     (start with `p=none`; tighten to `quarantine` after a week of clean
     reports).
3. Wait up to 24h for propagation. Resend marks the domain as **Verified**
   when all three checks pass.
4. Update `RESEND_FROM_EMAIL` to use the verified domain:

   ```env
   RESEND_FROM_EMAIL=Quotal <noreply@quotal.it>
   RESEND_REPLY_TO=support@quotal.it
   ```

## 3. Resend webhook (optional but recommended)

Resend posts delivery events (`email.delivered`, `email.bounced`,
`email.complained`, `email.opened`) to your app — Quotal stores them on
`notifications_sent.delivery_status` so the owner can see who actually
received the mail.

1. Resend → Webhooks → Add endpoint.
2. URL: `https://<your-domain>/api/webhooks/resend`.
3. Subscribe to: `email.delivered`, `email.bounced`, `email.complained`,
   `email.opened`.
4. Copy the signing secret (`whsec_…`) and paste it into `.env.local`:

   ```env
   RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxx
   ```

When the secret is unset, the endpoint accepts requests without
verification — fine for dev, **must be configured in production**.

## 4. Local preview

The dispatcher is server-only and never invokes Resend at build time, but
you can render every template to HTML for visual inspection:

```bash
node scripts/verify-email.mjs
# Output → tmp/email-previews/*.html
```

Open any of the produced files in a browser to check copy + layout.

## 5. Sending a test email manually

After setting `RESEND_API_KEY` + `RESEND_FROM_EMAIL`, the dispatcher will
send for real. Trigger one from any server-side context, e.g. inside a
short script or a route handler:

```ts
import { dispatchNotification } from '@/lib/notifications/dispatcher'

await dispatchNotification({
  type: 'welcome',
  recipient_id: '<a real profile.id>',
  data: { plan: { name: 'Mensile' }, end_date: '2026-05-29' },
})
```

The result includes the Resend message id (or a `skipped` reason).

## 6. Limits & throttling

Resend's free tier is **100 emails/day, 3000/month**. For a single
medium gym (~200 members) the daily expiry-reminder cron will easily
fit; the monthly digest doubles up but stays well under. Upgrade plan
when you onboard the second / third gym.

The dispatcher writes a row to `notifications_sent` for every send
attempt (including ones that were skipped due to opt-outs or missing
config), giving you a single audit trail you can query for delivery
metrics:

```sql
select type, channel, delivery_status, count(*)
  from public.notifications_sent
 where sent_at > now() - interval '7 days'
 group by 1, 2, 3
 order by 1;
```
