-- Extend workout_plans to model a weekly split.
--
-- - `split` is a freeform label for the overall structure (e.g. "PPL 5x",
--   "Upper/Lower 4x", "Full body 3x"). Optional.
-- - `days` replaces the flat `exercises` jsonb. Each entry is
--   { id, label, day_of_week?, exercises: [...], notes? } so the trainer
--   can group exercises by training day. The old `exercises` column was
--   only added moments ago and never populated in production, so we drop
--   it instead of carrying a dead field.

alter table public.workout_plans
  add column if not exists split text;

alter table public.workout_plans
  add column if not exists days jsonb not null default '[]'::jsonb;

alter table public.workout_plans
  drop column if exists exercises;

comment on column public.workout_plans.split is
  'Free-form label for the weekly split (e.g. "PPL 5x", "Upper/Lower 4x").';
comment on column public.workout_plans.days is
  'Ordered training days: array of { id, label, day_of_week?, exercises[], notes? }.';
