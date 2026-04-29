-- Catalog of subscription plans offered by each gym (Mensile, Trimestrale, Annuale, ...).
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  description text,
  duration_days integer not null check (duration_days > 0),
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  stripe_price_id text,               -- populated in Phase 05
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscription_plans_gym_id_idx on public.subscription_plans(gym_id, is_active);
