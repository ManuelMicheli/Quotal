-- Phase 09: per-member notification channel preferences.
--
-- One row per member. Booleans default to true (opt-out model — Italian
-- transactional emails for membership lifecycle are reasonable to send
-- without explicit opt-in, push needs explicit browser permission anyway).
-- The dispatcher reads this row before sending; missing row = all-on.

create table if not exists public.notification_preferences (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  -- Channel master toggles
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  -- Per-event toggles (member side)
  email_expiry_reminders boolean not null default true,
  email_payment_receipts boolean not null default true,
  email_payment_failures boolean not null default true,
  email_lifecycle_changes boolean not null default true,  -- suspended/resumed/renewed/welcome
  push_expiry_reminders boolean not null default true,
  push_payment_events boolean not null default true,
  -- Owner-side toggles (only meaningful when profile.role in owner/staff)
  email_daily_digest boolean not null default true,
  email_payment_failed_alert boolean not null default true,
  email_new_member_alert boolean not null default false,  -- noisy by default
  email_monthly_report boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Phase 09: per-member channel + per-event opt-out flags. Missing row = all defaults (all-on except new_member_alert).';

create index if not exists idx_notification_preferences_gym_id
  on public.notification_preferences (gym_id);

alter table public.notification_preferences enable row level security;

-- A member can read/write their own preferences row.
create policy notification_preferences_select_own
  on public.notification_preferences
  for select
  using (member_id = (select auth.uid()));

create policy notification_preferences_insert_own
  on public.notification_preferences
  for insert
  with check (
    member_id = (select auth.uid())
    and gym_id = current_gym_id()
  );

create policy notification_preferences_update_own
  on public.notification_preferences
  for update
  using (member_id = (select auth.uid()))
  with check (
    member_id = (select auth.uid())
    and gym_id = current_gym_id()
  );

create policy notification_preferences_delete_own
  on public.notification_preferences
  for delete
  using (member_id = (select auth.uid()));

-- Owners/staff can read all preferences in their gym (so the dispatcher
-- running under SSR client can honor opt-outs). They cannot write — only
-- the member can change their own settings.
create policy notification_preferences_select_owner_gym
  on public.notification_preferences
  for select
  using (is_owner_or_staff() and gym_id = current_gym_id());

-- updated_at trigger.
create or replace function public.set_notification_preferences_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.set_notification_preferences_updated_at() from public, anon, authenticated;

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_notification_preferences_updated_at();
