-- GA4 server-side sync schedule v1
-- OWNER CHECK: EXTEND_EXISTING traffic_intelligence_law
-- Reuses existing secure sync-key + service-account pattern and existing traffic_history.
-- No new table/store/analytics owner.

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'ga4-daily-server-sync' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
end $$;

select cron.schedule(
  'ga4-daily-server-sync',
  '27 5 * * *',
  $cron$
    select net.http_post(
      url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/ga-sync-server',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-gsc-key', (select sync_key from public.gsc_secrets())
      ),
      body := jsonb_build_object('days', 7)
    );
  $cron$
);
