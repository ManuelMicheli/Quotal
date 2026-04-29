-- stripe_events_processed: idempotency ledger for incoming webhooks
create table if not exists public.stripe_events_processed (
  id text primary key,                       -- stripe event.id, e.g. evt_...
  type text not null,
  api_version text,
  livemode boolean not null default false,
  processed_at timestamptz not null default now(),
  payload jsonb
);

create index if not exists stripe_events_processed_type_idx
  on public.stripe_events_processed(type, processed_at desc);

alter table public.stripe_events_processed enable row level security;

create policy stripe_events_processed_owner_select on public.stripe_events_processed
  for select using (public.is_owner_or_staff());

comment on table public.stripe_events_processed is
  'Idempotency ledger for Stripe webhook events. Insert once on first processing.';
