-- Phase 05: Stripe payments
-- 1) profiles.stripe_customer_id  (one-shot account, multi-tenant later)
alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.profiles.stripe_customer_id is
  'Stripe Customer id (cus_...). Created lazily on first SEPA SetupIntent.';

-- 2) payments: add failed_at + helpful indexes
alter table public.payments
  add column if not exists failed_at timestamptz;

create index if not exists payments_member_status_idx
  on public.payments(member_id, status);

create index if not exists payments_stripe_pi_idx
  on public.payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- 3) sepa_mandates: store stripe_setup_intent_id for traceability
alter table public.sepa_mandates
  add column if not exists stripe_setup_intent_id text;

create unique index if not exists sepa_mandates_stripe_pm_uidx
  on public.sepa_mandates(stripe_payment_method_id);
