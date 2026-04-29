-- Payment ledger: one row per payment attempt (cash, card, SEPA, bank transfer).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  payment_method text not null check (payment_method in ('card', 'sepa', 'cash', 'bank_transfer')),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  stripe_charge_id text,
  failure_reason text,
  receipt_number text,                -- progressive receipt number, e.g. "2026-0001"
  receipt_pdf_url text,
  invoice_number text,                -- progressive invoice number (if issued)
  invoice_pdf_url text,
  notes text,
  paid_at timestamptz,
  created_by uuid references public.profiles(id),  -- staff who logged a cash payment, null for Stripe
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_receipt_number_idx on public.payments(gym_id, receipt_number) where receipt_number is not null;
create unique index payments_invoice_number_idx on public.payments(gym_id, invoice_number) where invoice_number is not null;
create index payments_member_id_idx on public.payments(member_id);
create index payments_status_idx on public.payments(gym_id, status);
create index payments_paid_at_idx on public.payments(gym_id, paid_at desc);
