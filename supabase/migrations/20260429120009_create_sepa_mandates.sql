-- SEPA Direct Debit mandates (signed via Stripe in Phase 05).
create table public.sepa_mandates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  stripe_mandate_id text not null unique,
  stripe_payment_method_id text not null,
  iban_last4 text not null,
  bank_code text,
  status text not null check (status in ('pending', 'active', 'revoked', 'failed')),
  signed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sepa_mandates_member_idx on public.sepa_mandates(member_id, status);
