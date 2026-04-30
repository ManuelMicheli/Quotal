-- Phase 09: extend notification type vocabulary.
-- The original constraint from Phase 02 didn't include the owner-side digest
-- types or the monthly report. Replace it in-place; existing rows (none in
-- prod yet) keep validating because the new set is a superset.

alter table public.notifications_sent
  drop constraint if exists notifications_sent_type_check;

alter table public.notifications_sent
  add constraint notifications_sent_type_check check (type in (
    -- Member-facing
    'expiry_7d', 'expiry_3d', 'expiry_today',
    'post_expiry_3d',
    'sepa_failed', 'sepa_succeeded',
    'welcome', 'receipt',
    'subscription_renewed',
    'subscription_suspended', 'subscription_resumed',
    -- Owner-facing
    'monthly_owner_report',
    'daily_digest_owner',
    'payment_failed_owner',
    'new_member_owner'
  ));

-- Owners may also need a non-subscription idempotency window. Track the
-- "logical day" via a generated column so we can build a unique index that
-- prevents two daily digests in the same calendar day. Generated columns
-- treat the expression as immutable per row, which lets us index it.
alter table public.notifications_sent
  add column if not exists sent_on_date date
    generated always as ((sent_at at time zone 'Europe/Rome')::date) stored;

create unique index if not exists notifications_sent_owner_daily_idx
  on public.notifications_sent (gym_id, member_id, type, sent_on_date)
  where subscription_id is null;

comment on column public.notifications_sent.type is
  'Phase 09: covers member-facing reminders, payment events, and owner-side digests.';
comment on column public.notifications_sent.sent_on_date is
  'Phase 09: stored generated column = sent_at in Europe/Rome, used by owner-daily idempotency idx.';
