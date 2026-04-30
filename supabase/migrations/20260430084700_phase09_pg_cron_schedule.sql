-- Phase 09: pg_cron schedule for the Quotal cron jobs.
--
-- This migration is intentionally idempotent and **safe to skip in
-- environments without pg_cron / pg_net enabled**. The MCP-managed
-- Supabase project for development does NOT have these extensions
-- installed; running this migration there will fail with a clear error.
--
-- For production (or any project where pg_cron is enabled), run this
-- once after the Phase 09 migrations to wire the schedules.
--
-- After scheduling, the only piece of operator config left is to set
-- the secrets the SQL functions need:
--
--     alter database postgres set "app.settings.app_url" = 'https://quotal.it';
--     alter database postgres set "app.settings.cron_secret" = '<value>';
--
-- These read inside the schedule via current_setting(). Re-run only
-- after you change them — pg_cron picks up the new value on the next
-- tick, no re-schedule needed.
--
-- pg_net is required for net.http_post.

do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) and exists (
    select 1 from pg_extension where extname = 'pg_net'
  ) then
    -- Cleanup any prior schedules so this migration is re-runnable.
    perform cron.unschedule(jobname)
      from cron.job
     where jobname like 'quotal-%';

    -- 1. Daily at 00:30 Europe/Rome → mark expired subscriptions.
    perform cron.schedule(
      'quotal-update-expired-subscriptions',
      '30 22 * * *',  -- UTC 22:30 ≈ 00:30 Europe/Rome (winter); adjust seasonally if needed
      $sql$
        select net.http_post(
          url := current_setting('app.settings.app_url') || '/api/cron/update-expired',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $sql$
    );

    -- 2. Daily at 08:00 Europe/Rome → owner digest.
    perform cron.schedule(
      'quotal-owner-digest',
      '0 6 * * *',  -- UTC 06:00 ≈ 08:00 Europe/Rome (winter)
      $sql$
        select net.http_post(
          url := current_setting('app.settings.app_url') || '/api/cron/owner-digest',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $sql$
    );

    -- 3. Daily at 09:00 Europe/Rome → expiry reminders + post-expiry.
    perform cron.schedule(
      'quotal-notify-expiring',
      '0 7 * * *',  -- UTC 07:00 ≈ 09:00 Europe/Rome (winter)
      $sql$
        select net.http_post(
          url := current_setting('app.settings.app_url') || '/api/cron/notify-expiring',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $sql$
    );

    -- 4. Daily at 09:15 Europe/Rome → retry failed SEPA payments.
    perform cron.schedule(
      'quotal-retry-sepa',
      '15 7 * * *',
      $sql$
        select net.http_post(
          url := current_setting('app.settings.app_url') || '/api/cron/retry-sepa',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $sql$
    );

    raise notice 'Quotal cron jobs scheduled.';
  else
    raise notice 'pg_cron and/or pg_net not installed — skipping cron schedule. Enable both extensions in the Supabase dashboard then re-run.';
  end if;
end
$$;
