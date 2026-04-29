-- Phase 06: extend payments + add daily_close_reports for cash flow.
-- 1) Refund linkage (allows nota di rimborso → original payment).
-- 2) Receipt PDF storage path (separate from receipt_pdf_url; the path is the
--    canonical pointer in the bucket — the URL is a short-lived signed URL).
-- 3) Daily-close report table — one row per (gym_id, close_date).

alter table public.payments
  add column if not exists refund_of_payment_id uuid references public.payments(id) on delete set null,
  add column if not exists receipt_pdf_path text,
  add column if not exists invoice_pdf_path text;

-- Unique receipt_number per gym (gaps OK, but no duplicates).
create unique index if not exists payments_gym_receipt_number_uniq
  on public.payments (gym_id, receipt_number)
  where receipt_number is not null;

create unique index if not exists payments_gym_invoice_number_uniq
  on public.payments (gym_id, invoice_number)
  where invoice_number is not null;

create table if not exists public.daily_close_reports (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  close_date date not null,
  closed_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id) on delete set null,
  total_cents integer not null default 0,
  cash_cents integer not null default 0,
  card_cents integer not null default 0,
  sepa_cents integer not null default 0,
  bank_transfer_cents integer not null default 0,
  transactions_count integer not null default 0,
  pdf_path text,
  notes text,
  unique (gym_id, close_date)
);

alter table public.daily_close_reports enable row level security;

drop policy if exists "owners read own daily close reports" on public.daily_close_reports;
create policy "owners read own daily close reports"
  on public.daily_close_reports
  for select
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

drop policy if exists "owners insert own daily close reports" on public.daily_close_reports;
create policy "owners insert own daily close reports"
  on public.daily_close_reports
  for insert
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

drop policy if exists "owners update own daily close reports" on public.daily_close_reports;
create policy "owners update own daily close reports"
  on public.daily_close_reports
  for update
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create index if not exists daily_close_reports_gym_date_idx
  on public.daily_close_reports (gym_id, close_date desc);

comment on column public.payments.refund_of_payment_id is
  'Phase 06: when this row is a refund (status=refunded, amount_cents<0), points back to the original succeeded payment.';
comment on column public.payments.receipt_pdf_path is
  'Phase 06: storage path inside the private receipts bucket (e.g. <gym_id>/receipts/2026-0001.pdf).';
comment on column public.payments.invoice_pdf_path is
  'Phase 06: storage path inside the private receipts bucket for the fattura PDF.';
comment on table public.daily_close_reports is
  'Phase 06: one row per (gym, day) created when the owner closes cassa.';
