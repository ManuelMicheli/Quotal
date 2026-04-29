-- =============================================================================
-- Helper functions and triggers
-- =============================================================================

-- Generic updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to all tables with updated_at
create trigger gyms_updated_at before update on public.gyms for each row execute function public.handle_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger subscription_plans_updated_at before update on public.subscription_plans for each row execute function public.handle_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.handle_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.handle_updated_at();
create trigger sepa_mandates_updated_at before update on public.sepa_mandates for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- Returns gym_id of the currently authenticated user (used by RLS policies).
-- SECURITY DEFINER because it must read profiles even when the caller's row
-- is not yet visible (chicken-and-egg with the profiles policy).
-- -----------------------------------------------------------------------------
create or replace function public.current_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Returns true if the current user has owner or staff role.
-- SECURITY DEFINER for the same reason as current_gym_id().
-- -----------------------------------------------------------------------------
create or replace function public.is_owner_or_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'staff')
  );
$$;

-- -----------------------------------------------------------------------------
-- Generate the next progressive receipt number "YYYY-NNNN" for a gym.
-- Theoretical race condition acceptable at MVP volume; revisit with a
-- per-gym sequence when scaling.
-- -----------------------------------------------------------------------------
create or replace function public.generate_receipt_number(p_gym_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_count integer;
  v_number text;
begin
  select count(*) + 1 into v_count
  from public.payments
  where gym_id = p_gym_id
    and receipt_number like v_year || '-%';

  v_number := v_year || '-' || lpad(v_count::text, 4, '0');
  return v_number;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cron-driven status update: any active subscription whose end_date has passed
-- is moved to 'expired'. Called from a Supabase scheduled function in Phase 09.
-- -----------------------------------------------------------------------------
create or replace function public.update_expired_subscriptions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
  set status = 'expired'
  where status = 'active'
    and end_date < current_date;
end;
$$;
