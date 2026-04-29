# Prompt 02 — Database Schema & RLS

## Contesto

Progetto Quotal inizializzato (prompt 01 completato). Ora costruisci tutto lo schema Supabase, le RLS policies, le funzioni SQL ausiliarie, e i seed data per la palestra del titolare.

**Multi-tenancy ready:** ogni tabella business ha `gym_id`. Le policy RLS filtrano per `gym_id` corrente dell'utente. Nel MVP avremo una sola riga in `gyms`, ma il codice è già pronto per N palestre.

## Pre-requisiti

- Progetto Supabase creato, credenziali in `.env.local`
- Supabase CLI installato (`npm install -D supabase`)
- `npx supabase init` eseguito nel repo
- `npx supabase link --project-ref <ref>` eseguito

## Task

### 1. Migration files

Crea le migration in `supabase/migrations/` numerate `YYYYMMDDHHMMSS_<nome>.sql`. Una migration per ogni tabella o gruppo logico, in ordine:

#### Migration 1: `gyms` (tenant root)

```sql
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
  stripe_account_id text,             -- per multi-tenant futuro (Stripe Connect)
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
```

#### Migration 2: `profiles` (estende auth.users)

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  role text not null check (role in ('owner', 'staff', 'member')),
  full_name text not null,
  email text not null,
  phone text,
  fiscal_code text,                   -- opzionale, richiesto solo per fattura
  birth_date date,
  address text,
  city text,
  province text,
  postal_code text,
  avatar_url text,
  badge_uid text unique,              -- ID univoco per tornello (RFID/NFC/QR)
  notes text,                         -- note interne titolare (mai mostrate al membro)
  is_problematic boolean not null default false,  -- flag per membri da attenzionare
  problematic_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_gym_id_idx on public.profiles(gym_id);
create index profiles_role_idx on public.profiles(gym_id, role);
create index profiles_badge_uid_idx on public.profiles(badge_uid) where badge_uid is not null;
```

#### Migration 3: `subscription_plans`

```sql
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  description text,
  duration_days integer not null check (duration_days > 0),
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  stripe_price_id text,               -- popolato dal prompt 05
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscription_plans_gym_id_idx on public.subscription_plans(gym_id, is_active);
```

#### Migration 4: `subscriptions`

```sql
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  start_date date not null,
  end_date date not null,
  original_end_date date not null,    -- end_date senza considerare sospensioni
  status text not null check (status in ('active', 'expired', 'suspended', 'cancelled')),
  auto_renew boolean not null default false,
  payment_method text check (payment_method in ('card', 'sepa', 'cash', 'bank_transfer')),
  suspension_days_used integer not null default 0,  -- cumulativo nel periodo
  stripe_subscription_id text,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint end_date_after_start check (end_date >= start_date)
);

create index subscriptions_gym_id_idx on public.subscriptions(gym_id);
create index subscriptions_member_id_idx on public.subscriptions(member_id);
create index subscriptions_status_idx on public.subscriptions(gym_id, status);
create index subscriptions_end_date_idx on public.subscriptions(end_date) where status = 'active';
```

#### Migration 5: `payments`

```sql
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
  receipt_number text,                -- numero progressivo ricevuta (es. "2026-0001")
  receipt_pdf_url text,
  invoice_number text,                -- numero progressivo fattura (se emessa)
  invoice_pdf_url text,
  notes text,
  paid_at timestamptz,
  created_by uuid references public.profiles(id),  -- titolare/staff se cash, null se Stripe
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_receipt_number_idx on public.payments(gym_id, receipt_number) where receipt_number is not null;
create unique index payments_invoice_number_idx on public.payments(gym_id, invoice_number) where invoice_number is not null;
create index payments_member_id_idx on public.payments(member_id);
create index payments_status_idx on public.payments(gym_id, status);
create index payments_paid_at_idx on public.payments(gym_id, paid_at desc);
```

#### Migration 6: `subscription_suspensions`

```sql
create table public.subscription_suspensions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id uuid not null references public.profiles(id),
  suspended_at timestamptz not null default now(),
  resumed_at timestamptz,
  days_added_to_end_date integer,     -- calcolato al resume
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index suspensions_subscription_id_idx on public.subscription_suspensions(subscription_id);
create index suspensions_active_idx on public.subscription_suspensions(subscription_id) where resumed_at is null;
```

#### Migration 7: `access_logs`

```sql
create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete set null,
  badge_uid text,                     -- catturato anche se member_id è null (badge sconosciuto)
  accessed_at timestamptz not null default now(),
  granted boolean not null,
  denial_reason text,                 -- 'no_active_subscription', 'expired', 'suspended', 'unknown_badge', etc.
  device_id text,                     -- identifica il tornello/tablet
  metadata jsonb default '{}'::jsonb
);

create index access_logs_gym_id_idx on public.access_logs(gym_id, accessed_at desc);
create index access_logs_member_id_idx on public.access_logs(member_id, accessed_at desc);
create index access_logs_granted_idx on public.access_logs(gym_id, granted, accessed_at desc);
```

#### Migration 8: `notifications_sent` (idempotency email)

```sql
create table public.notifications_sent (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  type text not null check (type in (
    'expiry_7d', 'expiry_3d', 'expiry_today',
    'post_expiry_3d',
    'sepa_failed', 'sepa_succeeded',
    'welcome', 'receipt', 'subscription_renewed',
    'subscription_suspended', 'subscription_resumed'
  )),
  channel text not null default 'email' check (channel in ('email', 'sms', 'push')),
  resend_message_id text,
  sent_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- Idempotency: stessa subscription, stesso tipo, una sola volta
create unique index notifications_sent_unique_idx on public.notifications_sent(subscription_id, type) where subscription_id is not null;
create index notifications_sent_member_idx on public.notifications_sent(member_id, sent_at desc);
```

#### Migration 9: `sepa_mandates`

```sql
create table public.sepa_mandates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  stripe_mandate_id text not null unique,
  stripe_payment_method_id text not null,
  iban_last4 text not null,
  bank_code text,
  status text not null check (status in ('pending', 'active', 'revoked', 'failed')),
  signed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sepa_mandates_member_idx on public.sepa_mandates(member_id, status);
```

#### Migration 10: Helper functions e trigger

```sql
-- updated_at automatico
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Applica a tutte le tabelle con updated_at
create trigger gyms_updated_at before update on public.gyms for each row execute function public.handle_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger subscription_plans_updated_at before update on public.subscription_plans for each row execute function public.handle_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.handle_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.handle_updated_at();
create trigger sepa_mandates_updated_at before update on public.sepa_mandates for each row execute function public.handle_updated_at();

-- Funzione per ottenere gym_id dell'utente corrente (usata in RLS)
create or replace function public.current_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid();
$$;

-- Funzione per verificare se l'utente è owner/staff
create or replace function public.is_owner_or_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'staff')
  );
$$;

-- Funzione per generare numero ricevuta progressivo
create or replace function public.generate_receipt_number(p_gym_id uuid)
returns text
language plpgsql
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_count integer;
  v_number text;
begin
  select count(*) + 1 into v_count
  from public.payments
  where gym_id = p_gym_id
    and receipt_number like v_year || '-%';
  
  v_number := v_year || '-' || lpad(v_count::text, 4, '0');
  return v_number;
end;
$$;

-- Auto-update subscription status basato su date (chiamata da cron job nel prompt 09)
create or replace function public.update_expired_subscriptions()
returns void
language plpgsql
security definer
as $$
begin
  update public.subscriptions
  set status = 'expired'
  where status = 'active'
    and end_date < current_date;
end;
$$;
```

#### Migration 11: RLS Policies

```sql
-- Abilita RLS su tutte le tabelle
alter table public.gyms enable row level security;
alter table public.profiles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.subscription_suspensions enable row level security;
alter table public.access_logs enable row level security;
alter table public.notifications_sent enable row level security;
alter table public.sepa_mandates enable row level security;

-- GYMS: ognuno vede solo il proprio gym
create policy "Users see their own gym"
  on public.gyms for select
  using (id = public.current_gym_id());

create policy "Owners can update their gym"
  on public.gyms for update
  using (id = public.current_gym_id() and public.is_owner_or_staff());

-- PROFILES
create policy "Users see profiles in their gym"
  on public.profiles for select
  using (gym_id = public.current_gym_id());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Owners can update any profile in their gym"
  on public.profiles for update
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners can insert profiles in their gym"
  on public.profiles for insert
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners can delete profiles in their gym"
  on public.profiles for delete
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff() and id != auth.uid());

-- SUBSCRIPTION_PLANS: tutti vedono i piani del proprio gym, solo owner modifica
create policy "Members see plans in their gym"
  on public.subscription_plans for select
  using (gym_id = public.current_gym_id());

create policy "Owners manage plans"
  on public.subscription_plans for all
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

-- SUBSCRIPTIONS: membro vede le proprie, owner vede tutte
create policy "Members see their own subscriptions"
  on public.subscriptions for select
  using (member_id = auth.uid());

create policy "Owners see all subscriptions in gym"
  on public.subscriptions for select
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners manage subscriptions"
  on public.subscriptions for all
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

-- PAYMENTS: membro vede i propri, owner vede tutti
create policy "Members see their own payments"
  on public.payments for select
  using (member_id = auth.uid());

create policy "Owners see all payments in gym"
  on public.payments for select
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Owners manage payments"
  on public.payments for all
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

-- SUBSCRIPTION_SUSPENSIONS: solo owner
create policy "Owners manage suspensions"
  on public.subscription_suspensions for all
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff())
  with check (gym_id = public.current_gym_id() and public.is_owner_or_staff());

create policy "Members see their own suspensions"
  on public.subscription_suspensions for select
  using (member_id = auth.uid());

-- ACCESS_LOGS: membro vede i propri, owner vede tutti
create policy "Members see their own access logs"
  on public.access_logs for select
  using (member_id = auth.uid());

create policy "Owners see all access logs"
  on public.access_logs for select
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());

-- Insert sui logs solo via service role (Edge Function tornello), no policy public

-- NOTIFICATIONS_SENT: solo system, nessuna policy pubblica (gestito da service role)
-- (nessuna policy = nessun accesso non-service-role, che è quello che vogliamo)

-- SEPA_MANDATES
create policy "Members see their own mandates"
  on public.sepa_mandates for select
  using (member_id = auth.uid());

create policy "Owners see all mandates"
  on public.sepa_mandates for select
  using (gym_id = public.current_gym_id() and public.is_owner_or_staff());
```

#### Migration 12: Auth trigger per profile auto-creation

```sql
-- Quando un nuovo utente si registra, crea automaticamente il profile
-- Il gym_id e role devono essere passati nei metadata del signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_role text;
begin
  -- Estrai gym_id e role dai metadata
  v_gym_id := (new.raw_user_meta_data->>'gym_id')::uuid;
  v_role := coalesce(new.raw_user_meta_data->>'role', 'member');
  
  -- Se non c'è gym_id nei metadata, prendi il primo (single-tenant MVP)
  if v_gym_id is null then
    select id into v_gym_id from public.gyms limit 1;
  end if;
  
  -- Crea profile
  insert into public.profiles (id, gym_id, role, full_name, email, phone)
  values (
    new.id,
    v_gym_id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 2. Seed data

Crea `supabase/seed.sql` con i dati iniziali della palestra del titolare:

```sql
-- Inserisci la palestra del titolare
insert into public.gyms (
  id, name, slug, vat_number, email, address, city, province, postal_code, brand_color
) values (
  '00000000-0000-0000-0000-000000000001',
  'Palestra Esempio',                  -- da sostituire col nome reale
  'palestra-esempio',
  '12345678901',                       -- da sostituire con P.IVA reale
  'titolare@palestra.it',
  'Via Roma 1',
  'Ossona',
  'MI',
  '20010',
  '#0F766E'
) on conflict (id) do nothing;

-- Inserisci i 3 piani di abbonamento
insert into public.subscription_plans (gym_id, name, description, duration_days, price_cents, sort_order)
values 
  ('00000000-0000-0000-0000-000000000001', 'Mensile', 'Abbonamento mensile, scadenza dopo 30 giorni', 30, 4000, 1),
  ('00000000-0000-0000-0000-000000000001', 'Trimestrale', 'Abbonamento trimestrale, scadenza dopo 90 giorni', 90, 10000, 2),
  ('00000000-0000-0000-0000-000000000001', 'Annuale', 'Abbonamento annuale, scadenza dopo 365 giorni', 365, 36000, 3)
on conflict do nothing;
```

### 3. Generazione tipi TypeScript

Dopo aver applicato tutte le migration:

```bash
npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
```

Sostituisci il placeholder creato nel prompt 01 con i tipi reali generati.

Aggiorna `lib/supabase/client.ts` e `lib/supabase/server.ts` per usare il tipo `Database`:

```ts
import type { Database } from './types'
// createBrowserClient<Database>(...)
// createServerClient<Database>(...)
```

### 4. Domain types helper

Crea `lib/domain-types.ts` con tipi convenience derivati dal DB:

```ts
import type { Database } from './supabase/types'

export type Gym = Database['public']['Tables']['gyms']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type SubscriptionSuspension = Database['public']['Tables']['subscription_suspensions']['Row']
export type AccessLog = Database['public']['Tables']['access_logs']['Row']
export type SepaMandate = Database['public']['Tables']['sepa_mandates']['Row']

// Tipi composti utili
export type SubscriptionWithPlan = Subscription & { plan: SubscriptionPlan }
export type MemberWithSubscription = Profile & { 
  active_subscription: SubscriptionWithPlan | null 
}
export type PaymentWithMember = Payment & { member: Profile }

// Settings type
export type GymSettings = {
  gracePeriodDays: number
  maxSuspensionDaysPerYear: number
  expiryNotificationDays: number[]
  postExpiryNotificationDays: number[]
  currency: string
  locale: string
}
```

### 5. Query helper

Crea `lib/queries/` con file separati per dominio. Per ora solo:

**`lib/queries/gym.ts`** — `getCurrentGym()` (server-only)
**`lib/queries/profile.ts`** — `getCurrentProfile()`, `getMemberById(id)`

Ogni query è una server function che usa il server client Supabase, ritorna tipo `Result<T, Error>` o `null`. Niente throw, errori sempre gestiti.

## Cosa NON fare

- Non creare la pagina di onboarding del titolare (lo fa il prompt 03)
- Non creare API routes per CRUD (vengono nei prompt 04+)
- Non aggiungere logica Stripe (prompt 05)

## Come testare

1. `npx supabase db push` applica tutte le migration senza errori
2. Nel Supabase Studio: tutte le tabelle visibili, RLS attive (icona lucchetto)
3. `npx supabase db reset` (in dev) e poi `npx supabase db push` ricostruiscono tutto da zero
4. Tipi generati in `lib/supabase/types.ts` riflettono lo schema
5. Build Next.js senza errori TS: `npm run build`

## Decisione tecnica importante

**Soft delete vs hard delete:** in questo MVP usiamo cascade hard delete per semplicità. Per la produzione futura considerare soft delete (`deleted_at`) almeno su `profiles` e `subscriptions` per audit trail. Decisione esplicita rimandata, non un bug.

**Numerazione ricevute:** la funzione `generate_receipt_number()` ha una race condition teorica. Per il volume del MVP (decine di transazioni al giorno) non è un problema. Quando andremo multi-tenant con volumi alti, useremo una sequence dedicata per gym o un advisory lock.
