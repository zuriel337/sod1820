-- Local fixture for the 24.11.2026 fn_human_entrances v2-source fix. Live column set of public.events, traffic_daily and
-- analytics_cache (only the columns the functions use), and the two functions EXACTLY as read live on 24.11.2026.
create table public.events(event_id uuid default gen_random_uuid(), ts timestamptz not null, sod_id text, person_id uuid,
  session_id text, surface text, event_type text, path text, ref_host text, via text, app_context text, device text,
  journey_id text, depth_reached smallint, utm jsonb, is_bot boolean default false, props jsonb, ingest_at timestamptz default now())
  partition by range(ts);
create table public.events_all partition of public.events for values from ('2000-01-01') to ('2100-01-01');
create table public.traffic_daily(day date primary key, entrances int, engaged int, bounces int, views int, visitors int,
  searches int, bots int, updated_at timestamptz, suspected int);
create table public.analytics_cache(cache_key text primary key, payload jsonb, computed_at timestamptz default now());

-- fn_human_entrances, live 24.11.2026 (md5 bdb2647a22c4d1c53cfc84d808a59b86)
CREATE OR REPLACE FUNCTION public.fn_human_entrances(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(session_id text, day date, first_ts timestamp with time zone, landing_path text, source text, device text, country text, visitor text, is_logged_in boolean, views integer, interactions integer, searches integer, engaged boolean, bounce boolean, suspected_bot boolean, classification_reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select e.* from public.events e
    where e.session_id is not null
      and (p_from is null or e.ts::date >= p_from)
      and (p_to   is null or e.ts::date <= p_to)
  ),
  sess as (
    select session_id,
      bool_or(is_bot) any_bot,
      count(*) filter (where event_type='view') views,
      count(*) filter (where event_type in ('search','cross_search','use','save','journey','add','open')) interactions,
      count(*) filter (where event_type in ('search','cross_search')) searches
    from base group by session_id
  ),
  ent as (select session_id, views, interactions, searches from sess where any_bot=false and views>=1),
  land as (
    select distinct on (b.session_id)
      b.session_id, b.ts first_ts,
      -- #1461: measurement v2 stores a privacy LABEL in events.path ('/number/:value') and the
      -- projected public identity in props.measurement.page_path ('/number/104'). Use the
      -- identity when present so entity demand / Metatron / Raziel see v2 landings again.
      -- Verified live 20.11.2026 over 30d: suspected_bot unchanged for 6,207/6,207 sessions.
      coalesce(b.props->'measurement'->>'page_path', b.path) landing_path, b.via source, b.device,
      (b.props->>'country') country, coalesce(b.person_id::text, b.sod_id) visitor,
      (b.person_id is not null) is_logged_in
    from base b join ent e2 using(session_id)
    where b.event_type='view'
    order by b.session_id, b.ts asc
  ),
  joined as (
    select l.session_id, l.first_ts::date dd, l.first_ts, l.landing_path, l.source, l.device, l.country,
           l.visitor, l.is_logged_in, e.views, e.interactions, e.searches,
           (e.views>=2) engaged, (e.views=1 and e.interactions=0) bounce,
           (
             (l.source='direct' and l.country is null and e.views=1 and e.interactions=0)
             or
             (l.source='direct' and e.views=1 and e.interactions=0
               and (l.landing_path='/numbers' or l.landing_path like '/number/%'))
           ) suspected_bot
    from ent e join land l using(session_id)
  )
  select j.session_id, j.dd, j.first_ts, j.landing_path, j.source, j.device, j.country,
         j.visitor, j.is_logged_in, j.views, j.interactions, j.searches, j.engaged, j.bounce,
         j.suspected_bot,
         case
           when j.suspected_bot and j.source='direct' and j.country is null and j.views=1 and j.interactions=0
             then 'direct + no_country + single_view + no_interaction (rule v2 preserved)'
           when j.suspected_bot and j.source='direct' and j.views=1 and j.interactions=0
                and (j.landing_path='/numbers' or j.landing_path like '/number/%')
             then 'direct + numeric_landing + single_view + no_interaction (rule v3)'
           else null
         end
  from joined j;
$function$;

-- refresh_traffic_daily_range_v1, live 24.11.2026 (md5 b299c5feb8f8f39ecc96a9ae238b8cca)
CREATE OR REPLACE FUNCTION public.refresh_traffic_daily_range_v1(p_from date, p_to date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  n int;
begin
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'invalid traffic refresh range';
  end if;

  insert into public.traffic_daily(day,entrances,engaged,bounces,views,visitors,searches,bots,suspected,updated_at)
  select agg.d, agg.entrances, agg.engaged, agg.bounces, agg.views, agg.visitors, agg.searches,
         coalesce(bt.bots,0), agg.suspected, now()
  from (
    select h.day d,
      count(*) filter (where not h.suspected_bot) entrances,
      count(*) filter (where h.engaged and not h.suspected_bot) engaged,
      count(*) filter (where h.bounce and not h.suspected_bot) bounces,
      coalesce(sum(h.views) filter (where not h.suspected_bot),0) views,
      count(distinct h.visitor) filter (where not h.suspected_bot) visitors,
      coalesce(sum(h.searches) filter (where not h.suspected_bot),0) searches,
      count(*) filter (where h.suspected_bot) suspected
    from public.fn_human_entrances(p_from-1,p_to+1) h
    where h.day between p_from and p_to
    group by h.day
  ) agg
  left join (
    select ev.ts::date d, count(distinct ev.session_id) bots
    from public.events ev
    where ev.is_bot and ev.ts::date between p_from and p_to
    group by ev.ts::date
  ) bt on bt.d=agg.d
  on conflict(day) do update set
    entrances=excluded.entrances, engaged=excluded.engaged, bounces=excluded.bounces,
    views=excluded.views, visitors=excluded.visitors, searches=excluded.searches,
    bots=excluded.bots, suspected=excluded.suspected, updated_at=now();

  get diagnostics n=row_count;
  return n;
end;
$function$
;
