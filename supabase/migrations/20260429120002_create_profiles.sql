-- Extends auth.users with gym membership, role, and member metadata.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  role text not null check (role in ('owner', 'staff', 'member')),
  full_name text not null,
  email text not null,
  phone text,
  fiscal_code text,                   -- optional, only required for invoice
  birth_date date,
  address text,
  city text,
  province text,
  postal_code text,
  avatar_url text,
  badge_uid text unique,              -- RFID/NFC/QR badge for turnstile
  notes text,                         -- internal staff notes, never shown to member
  is_problematic boolean not null default false,
  problematic_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_gym_id_idx on public.profiles(gym_id);
create index profiles_role_idx on public.profiles(gym_id, role);
create index profiles_badge_uid_idx on public.profiles(badge_uid) where badge_uid is not null;
