-- Phase 10 — GDPR primitives.
--
-- 1. Soft-delete column on `profiles` so we can satisfy Art. 17 (right to be
--    forgotten) without violating Italian fiscal retention (10 years for
--    payments). The actual scrubbing of PII is performed by the
--    `requestAccountDeletionAction` server action (see app/actions/legal.ts);
--    payments rows are intentionally left untouched.
--
-- 2. `data_export_requests`: append-only audit trail of every Art. 20
--    (portability) export the member triggers. Lets the titolare prove
--    "we honoured every export request" if the Garante asks.
--
-- 3. `account_deletion_requests`: same idea for Art. 17 — the action queues
--    the request, the titolare clears it once the soft-delete + scrub has
--    been performed. RLS lets each member see their own queue, plus
--    owners/staff can see every queue entry on their dashboard.

-- ---------------------------------------------------------------------------
-- 1. profiles.deleted_at
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Phase 10 — GDPR Art. 17 soft-delete marker. PII on this row should be scrubbed; payments are kept for fiscal retention.';

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;

-- ---------------------------------------------------------------------------
-- 2. data_export_requests (Art. 20 — portability)
-- ---------------------------------------------------------------------------

create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  download_path text,        -- Supabase Storage path inside the `exports` bucket
  expires_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'failed')),
  error text
);

comment on table public.data_export_requests is
  'Phase 10 — Audit log of every GDPR data-export request. Created by exportMyDataAction.';

create index if not exists data_export_requests_member_id_idx
  on public.data_export_requests (member_id, requested_at desc);

alter table public.data_export_requests enable row level security;

-- Members can read their own export requests, owners/staff can see all
-- requests for their gym.
drop policy if exists "members read own export requests"
  on public.data_export_requests;
create policy "members read own export requests"
  on public.data_export_requests
  for select
  using (
    member_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'staff')
        and p.gym_id = data_export_requests.gym_id
    )
  );

-- No client-side write policy — only server actions using service role
-- insert/update rows. RLS denies every other write by default.

-- ---------------------------------------------------------------------------
-- 3. account_deletion_requests (Art. 17 — right to be forgotten)
-- ---------------------------------------------------------------------------

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  notes text
);

comment on table public.account_deletion_requests is
  'Phase 10 — Queue of GDPR Art. 17 deletion requests. The titolare processes them manually within 30 days as required.';

create index if not exists account_deletion_requests_member_id_idx
  on public.account_deletion_requests (member_id, requested_at desc);

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (gym_id, status);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "members read own deletion requests"
  on public.account_deletion_requests;
create policy "members read own deletion requests"
  on public.account_deletion_requests
  for select
  using (
    member_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'staff')
        and p.gym_id = account_deletion_requests.gym_id
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Storage bucket for export ZIPs
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

-- Members can read only their own export files (path prefix = their user id).
drop policy if exists "members read own exports" on storage.objects;
create policy "members read own exports"
  on storage.objects
  for select
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
