-- Phase 09 hardening: set the search_path on the trigger fn so the
-- Supabase database linter (lint 0011) is satisfied. Without this, the
-- function inherits whatever search_path the caller has, which could be
-- exploited if a privileged role with a custom path ever invokes it.

create or replace function public.set_notification_preferences_updated_at()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_notification_preferences_updated_at() from public, anon, authenticated;
