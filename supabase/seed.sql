-- =============================================================================
-- Seed data: titolare's gym + base subscription plans.
-- Idempotent (uses ON CONFLICT) so it can be re-run during local resets.
-- =============================================================================

-- Inserisci la palestra del titolare
insert into public.gyms (
  id, name, slug, vat_number, email, address, city, province, postal_code, brand_color
) values (
  '00000000-0000-0000-0000-000000000001',
  'Palestra Esempio',                  -- TODO: replace with the real gym name
  'palestra-esempio',
  '12345678901',                       -- TODO: replace with the real P.IVA
  'titolare@palestra.it',
  'Via Roma 1',
  'Ossona',
  'MI',
  '20010',
  '#0F766E'
) on conflict (id) do nothing;

-- Inserisci i 3 piani di abbonamento base
insert into public.subscription_plans (gym_id, name, description, duration_days, price_cents, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'Mensile', 'Abbonamento mensile, scadenza dopo 30 giorni', 30, 4000, 1),
  ('00000000-0000-0000-0000-000000000001', 'Trimestrale', 'Abbonamento trimestrale, scadenza dopo 90 giorni', 90, 10000, 2),
  ('00000000-0000-0000-0000-000000000001', 'Annuale', 'Abbonamento annuale, scadenza dopo 365 giorni', 365, 36000, 3)
on conflict do nothing;
