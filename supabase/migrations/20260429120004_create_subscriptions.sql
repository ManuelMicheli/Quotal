-- Active and historical subscriptions. status = active | expired | suspended | cancelled.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  start_date date not null,
  end_date date not null,
  original_end_date date not null,    -- end_date without suspension extensions
  status text not null check (status in ('active', 'expired', 'suspended', 'cancelled')),
  auto_renew boolean not null default false,
  payment_method text check (payment_method in ('card', 'sepa', 'cash', 'bank_transfer')),
  suspension_days_used integer not null default 0,
  stripe_subscription_id text,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint end_date_after_start check (end_date >= start_date)
);

create index subscriptions_gym_id_idx on public.subscriptions(gym_id);
create index subscriptions_member_id_idx on public.subscriptions(member_id);
create index subscriptions_status_idx on public.subscriptions(gym_id, status);
create index subscriptions_end_date_idx on public.subscriptions(end_date) where status = 'active';
