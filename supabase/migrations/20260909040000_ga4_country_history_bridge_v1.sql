-- GA4 country-history bridge v1
-- OWNER: traffic_intelligence_law (EXTEND_EXISTING)
-- Purpose: persist GA4 daily country slices inside the existing traffic_history store
-- without changing source='ga' total-history semantics or creating a parallel analytics table.
-- Canonical segment key format: ga:country:<ISO-3166-1 alpha-2>.

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
  if not exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'not authorized';
  end if;

  if v_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid country id';
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

-- Callable only by signed-in callers; the function itself additionally requires admin.
revoke all on function public.ingest_ga_country_daily(jsonb, text) from public;
revoke all on function public.ingest_ga_country_daily(jsonb, text) from anon;
grant execute on function public.ingest_ga_country_daily(jsonb, text) to authenticated;

comment on function public.ingest_ga_country_daily(jsonb, text) is
  'Traffic Intelligence GA4 country-slice ingest. Admin-gated; persists into existing traffic_history as ga:country:<ISO2>.';


create or replace function public.fn_ti_ga_country_daily(
  p_country_id text,
  p_from date default null,
  p_to date default null
)
returns table(
  day date,
  views integer,
  users integer,
  sessions integer,
  source text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    th.period as day,
    th.views,
    th.visitors as users,
    th.sessions,
    th.source
  from public.traffic_history th
  where upper(btrim(coalesce(p_country_id, ''))) ~ '^[A-Z]{2}$'
    and th.granularity = 'day'
    and th.source = 'ga:country:' || upper(btrim(p_country_id))
    and (p_from is null or th.period >= p_from)
    and (p_to is null or th.period <= p_to)
  order by th.period;
$$;

-- fn_ti_* agent/read contract: server-side only unless a later product projection explicitly needs access.
revoke all on function public.fn_ti_ga_country_daily(text, date, date) from public;
revoke all on function public.fn_ti_ga_country_daily(text, date, date) from anon;
revoke all on function public.fn_ti_ga_country_daily(text, date, date) from authenticated;
grant execute on function public.fn_ti_ga_country_daily(text, date, date) to postgres;

comment on function public.fn_ti_ga_country_daily(text, date, date) is
  'Traffic Intelligence server-only daily GA4 country reader over traffic_history segmented source keys.';
