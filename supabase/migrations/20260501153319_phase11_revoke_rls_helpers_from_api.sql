-- Phase 11 — close the SECURITY DEFINER RPC surface.
--
-- The Phase 03 migration restore_rls_helper_execute granted EXECUTE on
-- current_gym_id() and is_owner_or_staff() to anon and authenticated so
-- RLS policies could keep using them. That made both functions reachable
-- via PostgREST (/rest/v1/rpc/...) which the Supabase security advisor
-- flagged. Postgres evaluates these helpers inside RLS policies through
-- the planner, not through API role grants, so revoking EXECUTE here
-- closes the RPC surface without breaking RLS.

revoke all on function public.current_gym_id() from public;
revoke all on function public.current_gym_id() from anon;
revoke all on function public.current_gym_id() from authenticated;

revoke all on function public.is_owner_or_staff() from public;
revoke all on function public.is_owner_or_staff() from anon;
revoke all on function public.is_owner_or_staff() from authenticated;
