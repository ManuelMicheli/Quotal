-- Phase 09: track Resend delivery status per outbound email.
-- Updated by the /api/webhooks/resend handler when Resend POSTs delivery
-- events (delivered/bounced/complained/opened). Stored as plain text so we
-- don't need to maintain another enum.

alter table public.notifications_sent
  add column if not exists delivery_status text,
  add column if not exists delivery_updated_at timestamptz;

comment on column public.notifications_sent.delivery_status is
  'Phase 09: Resend webhook event name (e.g. email.delivered, email.bounced).';

create index if not exists idx_notifications_sent_resend_message_id
  on public.notifications_sent (resend_message_id)
  where resend_message_id is not null;
