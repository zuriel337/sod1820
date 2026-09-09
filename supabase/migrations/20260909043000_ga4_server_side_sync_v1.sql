-- GA4 server-side sync v1
-- OWNER CHECK: EXTEND_EXISTING traffic_intelligence_law
-- Sole historical writer is the existing ingest_ga_daily / ingest_ga_country_daily RPC pair.
-- Browser-triggered historical writes are retired; only trusted service_role may execute these ingest primitives.
-- This is operational analytics ingestion, not a Human-Gate/canonical promotion path.
-- No new table/store/analytics owner.

create or replace function public.ingest_ga_daily(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare n integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  insert into public.traffic_history (period, granularity, views, visitors, sessions, source)
  select
    (e->>'date')::date,
    'day',
    (e->>'views')::int,
    nullif(e->>'users','')::int,
    nullif(e->>'sessions','')::int,
    'ga'
  from jsonb_array_elements(p_rows) e
  where coalesce((e->>'views')::int, 0) > 0
  on conflict (period, granularity, source)
    do update set
      views = excluded.views,
      visitors = coalesce(excluded.visitors, public.traffic_history.visitors),
      sessions = coalesce(excluded.sessions, public.traffic_history.sessions);

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.ingest_ga_daily(jsonb) from public;
revoke all on function public.ingest_ga_daily(jsonb) from anon;
revoke all on function public.ingest_ga_daily(jsonb) from authenticated;
grant execute on function public.ingest_ga_daily(jsonb) to service_role, postgres;

create or replace function public.ingest_ga_country_daily(
  p_rows jsonb,
  p_country_id text
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  n integer;
  v_country text := upper(btrim(coalesce(p_country_id, '')));
  v_source text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  if v_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid country id';
  end if;

  if v_country <> 'IL' then
    raise exception 'country segment not allowed';
  end if;

  v_source := 'ga:country:' || v_country;

  insert into public.traffic_history (
    period, granularity, views, visitors, sessions, source
  )
  select
    (e->>'date')::date,
    'day',
    (e->>'views')::int,
    nullif(e->>'users', '')::int,
    nullif(e->>'sessions', '')::int,
    v_source
  from jsonb_array_elements(p_rows) e
  where coalesce((e->>'views')::int, 0) > 0
  on conflict (period, granularity, source)
    do update set
      views = excluded.views,
      visitors = coalesce(excluded.visitors, public.traffic_history.visitors),
      sessions = coalesce(excluded.sessions, public.traffic_history.sessions);

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.ingest_ga_country_daily(jsonb, text) from public;
revoke all on function public.ingest_ga_country_daily(jsonb, text) from anon;
revoke all on function public.ingest_ga_country_daily(jsonb, text) from authenticated;
grant execute on function public.ingest_ga_country_daily(jsonb, text) to service_role, postgres;

-- Replace any prior schedule idempotently.
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
