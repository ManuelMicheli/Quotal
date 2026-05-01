-- Phase 11 — auto-purge of pending GDPR deletion requests after 30 days.
--
-- The titolare's manual queue at /dashboard/impostazioni/gdpr-richieste is
-- still the primary path. This SQL function exists so a daily cron can
-- enforce the 30-day SLA (GDPR Art. 12 §3) when the titolare ignores or
-- delays the queue. It performs the same scrub as
-- `processAccountDeletionAction` in app/actions/legal.ts:
--
--   1. Soft-delete + scrub PII on profiles, leaving payments untouched
--      (Italian fiscal retention — 10-year obligation, art. 2220 c.c.).
--   2. Hard-delete ancillary PII rows (push_subscriptions,
--      notification_preferences) that don't have fiscal value.
--   3. Flip the deletion request to status='processed' with an audit note.
--
-- Returns the number of requests processed, so the cron route can log it.
-- Idempotent: a re-run only acts on rows still in `pending`.

create or replace function public.process_expired_deletion_requests(
  retention_days integer default 30
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(days => retention_days);
  processed_count integer := 0;
  rec record;
begin
  for rec in
    select id, member_id
      from public.account_deletion_requests
     where status = 'pending'
       and requested_at < cutoff
     order by requested_at asc
     for update skip locked
  loop
    -- 1. Scrub PII on profiles. Match the column list used by the manual
    --    server action (app/actions/legal.ts) so behaviour stays in sync.
    update public.profiles
       set full_name   = 'Utente eliminato',
           phone       = null,
           birth_date  = null,
           address     = null,
           city        = null,
           province    = null,
           postal_code = null,
           fiscal_code = null,
           notes       = null,
           avatar_url  = null,
           badge_uid   = null,
           deleted_at  = coalesce(deleted_at, now())
     where id = rec.member_id;

    -- 2. Best-effort cleanup of ancillary PII rows.
    delete from public.push_subscriptions
     where member_id = rec.member_id;
    delete from public.notification_preferences
     where member_id = rec.member_id;

    -- 3. Mark the request processed with a clear audit trail so the
    --    titolare can tell apart automatic vs manual processing.
    update public.account_deletion_requests
       set status       = 'processed',
           processed_at = now(),
           notes        = coalesce(notes, '') ||
                          case
                            when coalesce(notes, '') = '' then ''
                            else E'\n'
                          end ||
                          format(
                            'Auto-elaborata dopo %s giorni (SLA GDPR Art. 12 §3).',
                            retention_days
                          )
     where id = rec.id;

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;

revoke all on function public.process_expired_deletion_requests(integer) from public;
revoke all on function public.process_expired_deletion_requests(integer) from authenticated;
revoke all on function public.process_expired_deletion_requests(integer) from anon;

comment on function public.process_expired_deletion_requests(integer) is
  'Phase 11 — Auto-process pending GDPR deletion requests older than `retention_days` (default 30). SECURITY DEFINER; only callable by service_role. Returns the number of requests processed.';

-- ---------------------------------------------------------------------------
-- pg_cron schedule — daily at 03:00 Europe/Rome (UTC 01:00 winter).
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) and exists (
    select 1 from pg_extension where extname = 'pg_net'
  ) then
    perform cron.unschedule('quotal-purge-deleted-accounts')
      from cron.job
     where jobname = 'quotal-purge-deleted-accounts';

    perform cron.schedule(
      'quotal-purge-deleted-accounts',
      '0 1 * * *',  -- UTC 01:00 ≈ 03:00 Europe/Rome (winter)
      $sql$
        select net.http_post(
          url := current_setting('app.settings.app_url') || '/api/cron/purge-deleted-accounts',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $sql$
    );

    raise notice 'Quotal account-deletion auto-purge scheduled.';
  else
    raise notice 'pg_cron and/or pg_net not installed — skipping schedule.';
  end if;
end
$$;
