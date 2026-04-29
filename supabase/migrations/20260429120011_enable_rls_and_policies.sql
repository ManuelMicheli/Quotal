-- =============================================================================
-- Row Level Security: enable on every business table and define policies.
-- Conventions:
--   - All policies are scoped to the `authenticated` role. anon has no access.
--   - service_role bypasses RLS by default and is used for system-only inserts
--     (cron, webhooks).
--   - auth.uid() is wrapped in (select auth.uid()) per Supabase performance
--     advisor 0003.
-- =============================================================================

-- Enable RLS on all business tables
alter table public.gyms enable row level security;
alter table public.profiles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.subscription_suspensions enable row level security;
alter table public.access_logs enable row level security;
alter table public.notifications_sent enable row level security;
alter table public.sepa_mandates enable row level security;

-- =============================================================================
-- GYMS: every user sees only their own gym
-- =============================================================================
create policy "Users see their own gym"
  on public.gyms for select
  to authenticated
  using (id = public.current_gym_id());

create policy "Owners can update their gym"
  on public.gyms for update
  to authenticated
  using (id = public.current_gym_id() and public.is_owner_or_staff())
  with check (id = public.current_gym_id() and public.is_owner_or_staff());

-- =============================================================================
-- PROFILES
-- =============================================================================
create policy "Users see profiles in their gym"
  on public.profiles for select
  to authenticated
  using (gym_id = public.current_gym_id());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Owners can update any profile in their gym"
  on public.profiles for update
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners can insert profiles in their gym"
  on public.profiles for insert
  to authenticated
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners can delete profiles in their gym"
  on public.profiles for delete
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff() and id != (select auth.uid()));

-- =============================================================================
-- SUBSCRIPTION_PLANS: everyone in gym sees plans, only owners/staff manage
-- =============================================================================
create policy "Members see plans in their gym"
  on public.subscription_plans for select
  to authenticated
  using (gym_id = public.current_gym_id());

create policy "Owners manage plans"
  on public.subscription_plans for all
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

-- =============================================================================
-- SUBSCRIPTIONS: members see their own, owners/staff see all
-- =============================================================================
create policy "Members see their own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (member_id = (select auth.uid()));

create policy "Owners see all subscriptions in gym"
  on public.subscriptions for select
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners manage subscriptions"
  on public.subscriptions for all
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

-- =============================================================================
-- PAYMENTS: members see their own, owners/staff see all
-- =============================================================================
create policy "Members see their own payments"
  on public.payments for select
  to authenticated
  using (member_id = (select auth.uid()));

create policy "Owners see all payments in gym"
  on public.payments for select
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners manage payments"
  on public.payments for all
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

-- =============================================================================
-- SUBSCRIPTION_SUSPENSIONS: only owners/staff manage
-- =============================================================================
create policy "Owners manage suspensions"
  on public.subscription_suspensions for all
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Members see their own suspensions"
  on public.subscription_suspensions for select
  to authenticated
  using (member_id = (select auth.uid()));

-- =============================================================================
-- ACCESS_LOGS: members see their own, owners/staff see all.
-- Inserts happen only via service_role (turnstile Edge Function in Phase 08).
-- =============================================================================
create policy "Members see their own access logs"
  on public.access_logs for select
  to authenticated
  using (member_id = (select auth.uid()));

create policy "Owners see all access logs"
  on public.access_logs for select
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

-- =============================================================================
-- NOTIFICATIONS_SENT: managed exclusively by service_role (cron, webhooks).
-- Authenticated users have no read/write access. Explicit deny policy for
-- linter clarity ("RLS enabled but no policies" -> resolved with explicit deny).
-- =============================================================================
create policy "Deny all to client roles"
  on public.notifications_sent
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on policy "Deny all to client roles" on public.notifications_sent is
  'Notifications are written by the cron Edge Function using service_role, which bypasses RLS. Authenticated users have no read or write access by design.';

-- =============================================================================
-- SEPA_MANDATES: members see their own, owners/staff see all.
-- Mutations happen only via service_role in Stripe webhook handlers (Phase 05).
-- =============================================================================
create policy "Members see their own mandates"
  on public.sepa_mandates for select
  to authenticated
  using (member_id = (select auth.uid()));

create policy "Owners see all mandates"
  on public.sepa_mandates for select
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());
