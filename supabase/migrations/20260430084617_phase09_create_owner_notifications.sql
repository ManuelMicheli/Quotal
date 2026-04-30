-- Phase 09: in-app notifications surfaced via the dashboard bell-icon.
--
-- Distinct from notifications_sent (which is the outbound idempotency log).
-- This table powers the "centro notifiche" inside /dashboard. One row per
-- thing the owner/staff needs to see; cron + business events insert here.

create table if not exists public.owner_notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'member_subscription_expiring',
    'payment_failed',
    'new_member_signup',
    'monthly_report_ready',
    'sepa_mandate_revoked',
    'cash_close_pending'
  )),
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.owner_notifications is
  'Phase 09: in-app notifications for the owner/staff dashboard bell-icon centre.';

create index if not exists idx_owner_notifications_unread
  on public.owner_notifications (recipient_id, read_at)
  where read_at is null;

create index if not exists idx_owner_notifications_recipient_recent
  on public.owner_notifications (recipient_id, created_at desc);

alter table public.owner_notifications enable row level security;

-- Recipient can read + mark-as-read their own notifications.
create policy owner_notifications_select_own
  on public.owner_notifications
  for select
  using (recipient_id = (select auth.uid()));

create policy owner_notifications_update_own
  on public.owner_notifications
  for update
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- No insert/delete via REST — those happen from the SSR/cron layer
-- using the service-role client, which bypasses RLS. Keeping it that way
-- means clients can't seed fake notifications.
