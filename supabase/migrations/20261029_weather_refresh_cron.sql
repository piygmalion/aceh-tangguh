-- BE-83: pg_cron is the primary weather cache refresh.
-- GitHub Actions weather-refresh.yml stays as a slow fallback (every 6 hours)
-- plus workflow_dispatch. Do not put a bearer value in this file.
-- Backend applies this migration after GO, and only after
-- 20261027_overlay_live_pg_cron.sql is applied and proven.
-- The owner adds Vault secret weather_cron_secret in the dashboard
-- (same value as Vercel WEATHER_CRON_SECRET). Until that row exists, the job returns
-- without calling net.http_post.
-- btrim the Vault value before the Bearer header. A trailing newline fails
-- the route compare and the refresh returns 401.

-- pg_cron, pg_net, and the cron grants come from
-- 20261027_overlay_live_pg_cron.sql, which must be applied first.
-- Re-running the grants fails with 2BP01 under Supabase's pg_cron event trigger.

select cron.unschedule(jobid)
from cron.job
where jobname = 'weather-refresh-hourly';

select cron.schedule(
  'weather-refresh-hourly',
  '7 * * * *',
  $weather_refresh$
  do $weather_job$
  begin
    -- Missing or blank vault secret: do nothing. Never post without Authorization.
    if not exists (
      select decrypted_secret from vault.decrypted_secrets where name = 'weather_cron_secret'
      and decrypted_secret is not null
      and btrim(decrypted_secret) <> ''
    ) then
      return;
    end if;

    perform net.http_post(
      url := 'https://aceh-tangguh.vercel.app/api/weather/refresh',
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select btrim(decrypted_secret) from vault.decrypted_secrets where name = 'weather_cron_secret'
        )
      ),
      timeout_milliseconds := 70000
    );
  end
  $weather_job$;
  $weather_refresh$
);

-- Rollback: unschedule this job only. Do not drop pg_cron or pg_net
-- (shared with overlay-live-refresh). Do not delete weather_forecasts rows.
-- select cron.unschedule(jobid)
-- from cron.job
-- where jobname = 'weather-refresh-hourly';
