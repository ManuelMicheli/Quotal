-- Phase 08: registry of physical access devices (turnstiles, tablets, RFID readers).
--
-- Each device authenticates against /api/access/verify with a long-lived
-- bearer token of the format `qd_<deviceId>_<secret>`. Only the SHA-256 hash
-- of <secret> is stored; the cleartext is shown to the owner exactly once
-- on creation. Rotating means generating a new secret + replacing the hash.
--
-- Multitenancy is enforced via `gym_id` + RLS — owners only see their own
-- devices. The verify endpoint runs under the service role (it has no
-- session) and trusts the signed token.

create table if not exists public.access_devices (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  device_type text not null check (
    device_type in ('turnstile', 'tablet', 'rfid_reader', 'other')
  ),
  -- SHA-256 hex of the device-secret half of the bearer token.
  -- Web Crypto only ships SHA-256 in edge runtimes; bcrypt would force
  -- a heavier dependency without meaningful gain for a long random secret.
  token_hash text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

comment on table public.access_devices is
  'Phase 08: physical devices (turnstile/tablet/rfid_reader) authorized to call /api/access/verify.';

create index if not exists idx_access_devices_gym_id
  on public.access_devices (gym_id);

alter table public.access_devices enable row level security;

-- Owners and staff can manage devices in their own gym.
create policy access_devices_select_own_gym
  on public.access_devices
  for select
  using (is_owner_or_staff() and gym_id = current_gym_id());

create policy access_devices_insert_own_gym
  on public.access_devices
  for insert
  with check (is_owner_or_staff() and gym_id = current_gym_id());

create policy access_devices_update_own_gym
  on public.access_devices
  for update
  using (is_owner_or_staff() and gym_id = current_gym_id())
  with check (gym_id = current_gym_id());

create policy access_devices_delete_own_gym
  on public.access_devices
  for delete
  using (is_owner_or_staff() and gym_id = current_gym_id());

-- Auto-generate a badge_uid for new member profiles when the owner doesn't
-- supply one. Uses the same `Q-<uuid>` shape as the QR endpoint so both
-- creation paths converge on a single canonical format.
create or replace function public.set_default_badge_uid()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.badge_uid is null and new.role = 'member' then
    new.badge_uid := 'Q-' || gen_random_uuid()::text;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_default_badge_uid on public.profiles;
create trigger profiles_default_badge_uid
  before insert on public.profiles
  for each row execute function public.set_default_badge_uid();
