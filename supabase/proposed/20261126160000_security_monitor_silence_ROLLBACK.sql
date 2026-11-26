-- Rollback of 20261126160000_security_monitor_silence_PROPOSAL.sql (NOT APPLIED; only after an explicit ZURIEL approval).
-- Restores the exact check_security_spike read live on 26.11.2026 (md5 of prosrc 052ef5209cc75deced4fb572a5587762). security_alerts / work_log rows written
-- by the silence check stay as provenance. Apply as ONE transaction.
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='public.check_security_spike()'::regprocedure) <> '6905846f7032672afb43a8677aa5ab36' then
    raise exception 'check_security_spike is not the monitor-silence version; reconcile before rolling back';
  end if;
end
$guard$;

create or replace function public.check_security_spike()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_total int; v_country text; v_count int;
begin
  select count(*) into v_total from security_log where ts > now()-interval '1 hour';
  select country, count(*) into v_country, v_count from security_log
    where ts > now()-interval '1 hour' group by country order by count(*) desc limit 1;
  if v_total >= 150 or coalesce(v_count,0) >= 100 then
    insert into public.security_alerts (total, top_country, top_country_count, note)
    values (v_total, v_country, v_count,
      format('ספייק פריצות: %s בשעה האחרונה (שיא %s מ-%s)', v_total, v_count, v_country));
  end if;
end; $function$;
