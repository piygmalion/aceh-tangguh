-- BE-78: pg_cron is the primary overlay live refresh.
-- GitHub Actions overlay-live-refresh.yml stays as a delayed fallback.
-- Do not put a bearer value in this file. Backend applies this migration after GO.
-- The owner adds Vault secret overlay_cron_secret in the dashboard
-- (same value as Vercel OVERLAY_CRON_SECRET). Until that row exists, the job returns
-- without calling net.http_post.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.unschedule(jobid)
from cron.job
where jobname = 'overlay-live-refresh';

select cron.schedule(
  'overlay-live-refresh',
  '*/15 * * * *',
  $overlay_refresh$
  do $overlay_job$
  begin
    -- Missing or blank vault secret: do nothing. Never post without Authorization.
    if not exists (
      select decrypted_secret from vault.decrypted_secrets where name = 'overlay_cron_secret'
      and decrypted_secret is not null
      and btrim(decrypted_secret) <> ''
    ) then
      return;
    end if;

    perform net.http_post(
      url := 'https://aceh-tangguh.vercel.app/api/cron/overlay-live',
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'overlay_cron_secret'
        )
      ),
      timeout_milliseconds := 70000
    );
  end
  $overlay_job$;
  $overlay_refresh$
);
