-- Tenant root: one row per gym in the SaaS. Multi-tenant ready, single-row in MVP.
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  vat_number text,                    -- P.IVA
  fiscal_code text,                   -- CF (per ditte individuali)
  address text,
  city text,
  province text,
  postal_code text,
  country text default 'IT',
  email text not null,
  phone text,
  logo_url text,
  brand_color text default '#0F766E',
  stripe_account_id text,             -- Stripe Connect, future multi-tenant
  settings jsonb not null default '{
    "gracePeriodDays": 3,
    "maxSuspensionDaysPerYear": 60,
    "expiryNotificationDays": [7, 3, 0],
    "postExpiryNotificationDays": [3],
    "currency": "EUR",
    "locale": "it-IT"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gyms_slug_idx on public.gyms(slug);
