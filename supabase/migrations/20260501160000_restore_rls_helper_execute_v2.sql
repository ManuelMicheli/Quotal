-- Revert phase11_revoke_rls_helpers_from_api.
--
-- That migration assumed Postgres evaluated current_gym_id() and
-- is_owner_or_staff() inside RLS without consulting EXECUTE grants. It does
-- not — RLS policies invoke functions as the calling role, so revoking
-- EXECUTE from anon/authenticated breaks every SELECT/UPDATE on protected
-- tables with "permission denied for function current_gym_id".
--
-- These helpers only return data the caller could already access (their own
-- gym_id, their own role-derived boolean). Re-granting EXECUTE to anon and
-- authenticated is the only way to keep RLS functional. The Supabase
-- advisor warning ("anon_security_definer_function_executable") is the
-- accepted trade-off — the linter cannot tell the function returns only
-- the caller's own data.

grant execute on function public.current_gym_id() to anon, authenticated;
grant execute on function public.is_owner_or_staff() to anon, authenticated;
