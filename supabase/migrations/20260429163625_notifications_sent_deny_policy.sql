-- notifications_sent is managed exclusively by service_role (cron jobs in
-- Phase 09 and webhook handlers). RLS is enabled and we intentionally have
-- no policy granting access to authenticated/anon — those roles see nothing.
-- We add an explicit no-op restrictive policy purely for documentation /
-- linter clarity ("RLS Enabled No Policy" -> resolved with explicit deny).
create policy "Deny all to client roles"
  on public.notifications_sent
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on policy "Deny all to client roles" on public.notifications_sent is
  'Notifications are written by the cron Edge Function using service_role, which bypasses RLS. Authenticated users have no read or write access by design.';
