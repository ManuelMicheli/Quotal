-- =============================================================================
-- workout_plans: trainer-authored programs assigned to a single member.
--
-- The owner (or staff) creates a plan from the dashboard, picks the member,
-- fills in a free-form notes field, and (optionally) a structured list of
-- exercises stored as JSONB. The member sees the assigned plans in their
-- PWA under the "Schede" tab.
--
-- Multi-tenancy + RLS:
--   - gym_id mirrors the owner's gym so RLS scopes by current_gym_id().
--   - Members read their own rows (member_id = auth.uid()).
--   - Owners / staff manage every row in their gym.
-- =============================================================================

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  notes text,
  exercises jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workout_plans is
  'Trainer-authored workout programs assigned to a single member. Member reads their own; owner/staff manage all in gym.';
comment on column public.workout_plans.exercises is
  'Optional structured exercises: array of {name, sets, reps, rest_seconds?, notes?}. Free-form `notes` covers the unstructured case.';

create index workout_plans_member_id_idx
  on public.workout_plans (member_id, created_at desc);
create index workout_plans_gym_id_idx
  on public.workout_plans (gym_id, created_at desc);

create trigger workout_plans_updated_at
  before update on public.workout_plans
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.workout_plans enable row level security;

create policy "Members see their own workout plans"
  on public.workout_plans for select
  to authenticated
  using (member_id = (select auth.uid()));

create policy "Owners see all workout plans in gym"
  on public.workout_plans for select
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners manage workout plans"
  on public.workout_plans for all
  to authenticated
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());
