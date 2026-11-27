create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') $$;
create table public.traffic_history(id bigserial primary key, period date not null, granularity text not null, views integer, visitors integer, source text not null, note text, created_at timestamptz default now(), sessions integer,
  unique (period, granularity, source));
-- existing rows (outside the window), two with notes as live
insert into public.traffic_history(period,granularity,views,visitors,sessions,source,note) values
 ('2026-06-14','day',100,50,60,'ga',null),('2026-11-08','day',10,5,6,'ga',null),('2026-11-12','day',1000,200,300,'ga','צפיות כפולות'),('2026-11-12','day',500,100,150,'ga:country:IL','צפיות כפולות'),('2026-11-08','day',5,3,4,'ga:country:IL',null);
-- the live writers, verbatim
CREATE OR REPLACE FUNCTION public.ingest_ga_daily(p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.ingest_ga_country_daily(p_rows jsonb, p_country_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
