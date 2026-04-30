-- Phase 07: web-push subscriptions per member device.
--
-- One row per (browser/device, member). The `endpoint` is the unique URL
-- the browser exposes for the push service (FCM/Mozilla autopush/etc.) —
-- already unique per device, so we use it as the upsert conflict target.
--
-- The send pipeline lives in Phase 09 (alongside email notifications);
-- Phase 07 stands up the subscribe/unsubscribe endpoints so the SW can
-- register without losing data when push is later enabled.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'Phase 07: web-push subscriptions per member device. Send pipeline lands in Phase 09.';

create index if not exists idx_push_subscriptions_member_id
  on public.push_subscriptions (member_id);
create index if not exists idx_push_subscriptions_gym_id
  on public.push_subscriptions (gym_id);

alter table public.push_subscriptions enable row level security;

-- Members manage their own subscriptions only.
create policy members_select_own_push_subscriptions
  on public.push_subscriptions
  for select
  using (member_id = (select auth.uid()));

create policy members_insert_own_push_subscriptions
  on public.push_subscriptions
  for insert
  with check (
    member_id = (select auth.uid())
    and gym_id = current_gym_id()
  );

create policy members_delete_own_push_subscriptions
  on public.push_subscriptions
  for delete
  using (member_id = (select auth.uid()));

-- Owners/staff can see all subscriptions in their gym (needed by the
-- Phase 09 send pipeline running under the SSR client).
create policy owner_staff_select_gym_push_subscriptions
  on public.push_subscriptions
  for select
  using (is_owner_or_staff() and gym_id = current_gym_id());
