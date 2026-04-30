-- Phase 09: track SEPA retry attempts so the cron job stops after N tries.
-- Defaults to 0 for existing rows. Bumped by the retry-failed-sepa cron each
-- time it kicks off a new PaymentIntent against the same mandate.

alter table public.payments
  add column if not exists retry_count integer not null default 0;

comment on column public.payments.retry_count is
  'Phase 09: incremented by retry-failed-sepa cron. Cron stops when >= 3.';

create index if not exists idx_payments_failed_sepa_for_retry
  on public.payments (failed_at, retry_count)
  where status = 'failed' and payment_method = 'sepa';
