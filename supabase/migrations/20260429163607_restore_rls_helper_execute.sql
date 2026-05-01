-- The previous migration revoked EXECUTE on all SECURITY DEFINER functions.
-- However, current_gym_id() and is_owner_or_staff() are referenced inside
-- RLS policies, which evaluate as the calling role. Without EXECUTE, every
-- SELECT/UPDATE against tables protected by those policies fails with
-- "permission denied for function".
--
-- These two helpers only return data the caller could already access:
--   - current_gym_id(): the user's own gym_id (also visible from profiles)
--   - is_owner_or_staff(): a boolean derived from the user's own role
-- Re-granting EXECUTE to anon and authenticated is therefore safe and the
-- only way to keep the policies functional. The Supabase advisor will still
-- warn ("anon_security_definer_function_executable") because they remain
-- exposed via /rpc; this is accepted: the linter cannot tell that the
-- function returns only the caller's own data.
grant execute on function public.current_gym_id() to anon, authenticated;
grant execute on function public.is_owner_or_staff() to anon, authenticated;
