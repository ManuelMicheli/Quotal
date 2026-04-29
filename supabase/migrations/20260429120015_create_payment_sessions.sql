-- payment_sessions: one row per "send pay link" / "renew flow" attempt
create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  token text not null unique,
  status text not null check (status in ('pending', 'completed', 'expired', 'cancelled', 'failed')),
  payment_method text check (payment_method in ('card', 'sepa')),
  stripe_payment_intent_id text,
  stripe_setup_intent_id text,
  amount_cents integer not null check (amount_cents >= 0),
  auto_renew boolean not null default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  completed_at timestamptz,
  failure_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists payment_sessions_token_idx on public.payment_sessions(token);
create index if not exists payment_sessions_member_status_idx on public.payment_sessions(member_id, status);
create index if not exists payment_sessions_gym_idx on public.payment_sessions(gym_id, created_at desc);
create index if not exists payment_sessions_pi_idx on public.payment_sessions(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists payment_sessions_si_idx on public.payment_sessions(stripe_setup_intent_id) where stripe_setup_intent_id is not null;

alter table public.payment_sessions enable row level security;

create policy payment_sessions_owner_select on public.payment_sessions
  for select using (
    public.is_owner_or_staff() and gym_id = public.current_gym_id()
  );

create policy payment_sessions_owner_insert on public.payment_sessions
  for insert with check (
    public.is_owner_or_staff() and gym_id = public.current_gym_id()
  );

create policy payment_sessions_owner_update on public.payment_sessions
  for update using (
    public.is_owner_or_staff() and gym_id = public.current_gym_id()
  );

create policy payment_sessions_member_select on public.payment_sessions
  for select using (
    member_id = auth.uid()
  );

comment on table public.payment_sessions is
  'Stripe payment-session attempts. The public /pay/[token] page is served via service role.';
