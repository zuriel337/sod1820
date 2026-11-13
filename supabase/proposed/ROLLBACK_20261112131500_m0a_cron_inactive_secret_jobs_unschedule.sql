-- Rollback of 20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql.
-- Re-creates the four jobs exactly as they were (same names, schedules and commands) but INACTIVE and with the placeholder
-- __ROTATED__ instead of the old query secret, which was deliberately not kept anywhere. To make one usable again, put the NEW
-- secret in its command with cron.alter_job(...) and activate it - only with explicit approval.
do $$
declare v bigint;
begin
  if not exists (select 1 from cron.job where jobname = 'wa-deep-process') then
    v := cron.schedule('wa-deep-process', '* * * * *', $c$
  select net.http_post(
    url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-process?s=__ROTATED__',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$c$);
    perform cron.alter_job(v, active := false);
  end if;
  if not exists (select 1 from cron.job where jobname = 'wa-poll') then
    v := cron.schedule('wa-poll', '* * * * *', $c$
  select net.http_post(
    url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-poll?s=__ROTATED__',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$c$);
    perform cron.alter_job(v, active := false);
  end if;
  if not exists (select 1 from cron.job where jobname = 'wa-michael') then
    v := cron.schedule('wa-michael', '*/2 * * * *', $c$select net.http_get(url:='https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-michael?s=__ROTATED__', timeout_milliseconds:=55000);$c$);
    perform cron.alter_job(v, active := false);
  end if;
  if not exists (select 1 from cron.job where jobname = 'wa-gabriel') then
    v := cron.schedule('wa-gabriel', '* * * * *', $c$select net.http_get(url:='https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-gabriel?s=__ROTATED__', timeout_milliseconds:=55000);$c$);
    perform cron.alter_job(v, active := false);
  end if;
end $$;
