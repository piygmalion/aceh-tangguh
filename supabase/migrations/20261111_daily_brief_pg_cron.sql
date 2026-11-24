-- Daily Brief primary scheduler. GitHub Actions daily-brief.yml stays manual
-- (workflow_dispatch only) so the two schedulers do not both POST.
-- Do not put a bearer value in this file. Do not apply this file to the live
-- database from the draft that adds it. Backend applies it only after a
-- separate GO that names the PR.
-- The owner adds Vault secret daily_brief_cron_secret in the dashboard
-- (same value as Vercel DAILY_BRIEF_CRON_SECRET). Until that row exists, the job returns
-- without calling net.http_post.
-- btrim the Vault value before the Bearer header. A trailing newline fails
-- the route compare and the refresh returns 401.
-- The route is idempotent per Jakarta brief_date (unique daily_briefs.brief_date
-- and a single claim on whatsapp_enqueued_at).

-- pg_cron, pg_net, and the cron grants come from
-- 20261027_overlay_live_pg_cron.sql, which must be applied first.
-- Re-running create extension or grant usage on schema cron fails with 2BP01.

select cron.unschedule(jobid)
from cron.job
where jobname = 'daily-brief-daily';

select cron.schedule(
  'daily-brief-daily',
  '0 0 * * *',
  $daily_brief$
  do $daily_brief_job$
  begin
    -- Missing or blank vault secret: do nothing. Never post without Authorization.
    if not exists (
      select decrypted_secret from vault.decrypted_secrets where name = 'daily_brief_cron_secret'
      and decrypted_secret is not null
      and btrim(decrypted_secret) <> ''
    ) then
      return;
    end if;

    perform net.http_post(
      url := 'https://aceh-tangguh.vercel.app/api/cron/daily-brief',
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select btrim(decrypted_secret) from vault.decrypted_secrets where name = 'daily_brief_cron_secret'
        )
      ),
      timeout_milliseconds := 70000
    );
  end
  $daily_brief_job$;
  $daily_brief$
);

-- Rollback: unschedule this job only. Do not drop pg_cron or pg_net
-- (shared with overlay-live-refresh and weather-refresh-hourly).
-- Do not delete daily_briefs rows.
-- select cron.unschedule(jobid)
-- from cron.job
-- where jobname = 'daily-brief-daily';
