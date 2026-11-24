-- Rollback of 20261124210000_human_entrances_v2_source_PROPOSAL.sql (NOT APPLIED; only after an explicit ZURIEL approval).
-- Restores the exact fn_human_entrances read live on 24.11.2026 (md5 bdb2647a22c4d1c53cfc84d808a59b86, checked below)
-- and the traffic_daily rows from 15.11 as they were before the fix (analytics_cache snapshot). The snapshot row is kept
-- as provenance and marked with the rollback time. Note: the hourly traffic-daily-refresh recomputes the last 7 days
-- with whatever function is live, so after a rollback those days return to the undercount that the fix removed.
do $rollback$
declare
  v_fhe constant regprocedure := 'public.fn_human_entrances(date,date)'::regprocedure;
  v_snapshot jsonb;
  v_old constant text := $fhe$
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
$function$
$fhe$;
begin
  if position('v2_source_fix_20261124' in pg_get_functiondef(v_fhe)) = 0 then
    raise exception 'fn_human_entrances is not the v2 source fix; nothing to roll back';
  end if;
  select payload into strict v_snapshot from public.analytics_cache where cache_key = 'traffic_daily_before_v2_source_fix_20261124';

  execute v_old;
  if md5(pg_get_functiondef(v_fhe)) <> 'bdb2647a22c4d1c53cfc84d808a59b86' then
    raise exception 'Restored definition differs from the live one read on 24.11.2026 (%)', md5(pg_get_functiondef(v_fhe));
  end if;

  update public.traffic_daily t set entrances = r.entrances, engaged = r.engaged, bounces = r.bounces, views = r.views,
    visitors = r.visitors, searches = r.searches, bots = r.bots, suspected = r.suspected, updated_at = r.updated_at
  from jsonb_populate_recordset(null::public.traffic_daily, v_snapshot->'rows') r
  where t.day = r.day and r.day >= date '2026-11-15';

  update public.analytics_cache set payload = payload || jsonb_build_object('rolled_back_at', now())
  where cache_key = 'traffic_daily_before_v2_source_fix_20261124';
end;
$rollback$;
