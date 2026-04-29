-- =============================================================================
-- Lock down SECURITY DEFINER helpers from REST exposure.
--
-- generate_receipt_number, update_expired_subscriptions, and handle_new_user
-- are server-only utilities. We revoke EXECUTE from anon/authenticated/public
-- so they cannot be called via PostgREST `/rpc/*`. They remain callable from
-- triggers (handle_new_user) or service_role-issued queries.
--
-- current_gym_id and is_owner_or_staff are referenced inside RLS policies and
-- MUST remain executable by anon/authenticated for those policies to evaluate
-- successfully. Re-granting EXECUTE on those two is intentional. The Supabase
-- linter still flags them as `anon_security_definer_function_executable` /
-- `authenticated_security_definer_function_executable` (WARN); accepted because
-- both functions only return data the caller is already entitled to (their
-- own gym_id and a boolean derived from their own role).
-- =============================================================================
revoke execute on function public.current_gym_id() from anon, authenticated, public;
revoke execute on function public.is_owner_or_staff() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.generate_receipt_number(uuid) from anon, authenticated, public;
revoke execute on function public.update_expired_subscriptions() from anon, authenticated, public;

-- Re-grant the two RLS-critical helpers.
grant execute on function public.current_gym_id() to anon, authenticated;
grant execute on function public.is_owner_or_staff() to anon, authenticated;
