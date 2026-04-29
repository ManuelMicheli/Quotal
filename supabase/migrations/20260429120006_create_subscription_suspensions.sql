-- Audit log of suspensions on subscriptions. Used to compute total suspension days/year.
create table public.subscription_suspensions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id uuid not null references public.profiles(id),
  suspended_at timestamptz not null default now(),
  resumed_at timestamptz,
  days_added_to_end_date integer,     -- computed at resume time
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index suspensions_subscription_id_idx on public.subscription_suspensions(subscription_id);
create index suspensions_active_idx on public.subscription_suspensions(subscription_id) where resumed_at is null;
