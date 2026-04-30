-- This trigger function is invoked only by the BEFORE INSERT trigger on
-- profiles. Public RPC exposure is not intentional — revoke EXECUTE so
-- the database advisor stops flagging it.
revoke execute on function public.set_default_badge_uid() from public;
revoke execute on function public.set_default_badge_uid() from anon;
revoke execute on function public.set_default_badge_uid() from authenticated;
