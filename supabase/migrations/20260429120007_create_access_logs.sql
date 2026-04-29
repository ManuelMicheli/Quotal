-- Per-access audit log for the turnstile (Phase 08). Captures even unknown badges.
create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete set null,
  badge_uid text,                     -- captured even when member_id is null (unknown badge)
  accessed_at timestamptz not null default now(),
  granted boolean not null,
  denial_reason text,                 -- 'no_active_subscription' | 'expired' | 'suspended' | 'unknown_badge' | ...
  device_id text,                     -- identifies the turnstile / tablet
  metadata jsonb default '{}'::jsonb
);

create index access_logs_gym_id_idx on public.access_logs(gym_id, accessed_at desc);
create index access_logs_member_id_idx on public.access_logs(member_id, accessed_at desc);
create index access_logs_granted_idx on public.access_logs(gym_id, granted, accessed_at desc);
