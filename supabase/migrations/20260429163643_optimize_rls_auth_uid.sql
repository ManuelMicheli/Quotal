-- Per Supabase performance advisor 0003: wrap auth.uid() in `(select ...)`
-- so PostgreSQL evaluates it once per query rather than once per row.
-- Drop and recreate each affected policy.

-- profiles
drop policy "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy "Owners can delete profiles in their gym" on public.profiles;
create policy "Owners can delete profiles in their gym"
  on public.profiles for delete
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff() and id != (select auth.uid()));

-- subscriptions
drop policy "Members see their own subscriptions" on public.subscriptions;
create policy "Members see their own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (member_id = (select auth.uid()));

-- payments
drop policy "Members see their own payments" on public.payments;
create policy "Members see their own payments"
  on public.payments for select
  to authenticated
  using (member_id = (select auth.uid()));

-- subscription_suspensions
drop policy "Members see their own suspensions" on public.subscription_suspensions;
create policy "Members see their own suspensions"
  on public.subscription_suspensions for select
  to authenticated
  using (member_id = (select auth.uid()));

-- access_logs
drop policy "Members see their own access logs" on public.access_logs;
create policy "Members see their own access logs"
  on public.access_logs for select
  to authenticated
  using (member_id = (select auth.uid()));

-- sepa_mandates
drop policy "Members see their own mandates" on public.sepa_mandates;
create policy "Members see their own mandates"
  on public.sepa_mandates for select
  to authenticated
  using (member_id = (select auth.uid()));
