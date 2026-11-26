-- Exact bodies of the live functions as read on 26.11.2026 (prosrc), wrapped in the signatures of the live definitions. Used only by the isolated real-Postgres test.
create or replace function public.fn_human_entrances(p_from date, p_to date)
returns table(session_id text, day date, first_ts timestamptz, landing_path text, source text, device text, country text, visitor text, is_logged_in boolean,
  views integer, interactions integer, searches integer, engaged boolean, bounce boolean, suspected_bot boolean, classification_reason text)
language sql stable as $function$
  -- v2_source_fix_20261124 (traffic_intelligence_law v11, implementation only): source falls back to the session's
  -- arrival/source token (the v2 envelope refuses p_via); rule v2 needs collected country evidence (non-v2 landing);
  -- suspected_bot is never NULL, so raw = net + suspected. Pre-15.11 output verified identical (65,989 sessions).
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
      count(*) filter (where event_type in ('search','cross_search')) searches,
      max(props->>'source') filter (where surface='arrival' and event_type='source') arrival_source
    from base group by session_id
  ),
  ent as (select session_id, views, interactions, searches, arrival_source from sess where any_bot=false and views>=1),
  land as (
    select distinct on (b.session_id)
      b.session_id, b.ts first_ts,
      -- #1461: measurement v2 stores a privacy LABEL in events.path ('/number/:value') and the
      -- projected public identity in props.measurement.page_path ('/number/104'). Use the
      -- identity when present so entity demand / Metatron / Raziel see v2 landings again.
      -- Verified live 20.11.2026 over 30d: suspected_bot unchanged for 6,207/6,207 sessions.
      coalesce(b.props->'measurement'->>'page_path', b.path) landing_path,
      coalesce(b.via, e2.arrival_source) source, b.device,
      (b.props->>'country') country, coalesce(b.person_id::text, b.sod_id) visitor,
      (b.person_id is not null) is_logged_in,
      coalesce(b.props ? 'measurement', false) landing_v2
    from base b join ent e2 using(session_id)
    where b.event_type='view'
    order by b.session_id, b.ts asc
  ),
  joined as (
    select l.session_id, l.first_ts::date dd, l.first_ts, l.landing_path, l.source, l.device, l.country,
           l.visitor, l.is_logged_in, l.landing_v2, e.views, e.interactions, e.searches,
           (e.views>=2) engaged, (e.views=1 and e.interactions=0) bounce,
           coalesce((
             (l.source='direct' and l.country is null and e.views=1 and e.interactions=0 and not l.landing_v2)
             or
             (l.source='direct' and e.views=1 and e.interactions=0
               and (l.landing_path='/numbers' or l.landing_path like '/number/%'))
           ), false) suspected_bot
    from ent e join land l using(session_id)
  )
  select j.session_id, j.dd, j.first_ts, j.landing_path, j.source, j.device, j.country,
         j.visitor, j.is_logged_in, j.views, j.interactions, j.searches, j.engaged, j.bounce,
         j.suspected_bot,
         case
           when j.suspected_bot and j.source='direct' and j.country is null and j.views=1 and j.interactions=0
                and not j.landing_v2
             then 'direct + no_country + single_view + no_interaction (rule v2 preserved)'
           when j.suspected_bot and j.source='direct' and j.views=1 and j.interactions=0
                and (j.landing_path='/numbers' or j.landing_path like '/number/%')
             then 'direct + numeric_landing + single_view + no_interaction (rule v3)'
           else null
         end
  from joined j;
$function$;

create or replace function public.fn_ti_session_metrics(p_from date, p_to date)
returns table(session_id text, reporting_day date, legacy_views integer, page_views integer, interactions integer, page_engaged boolean, page_bounce boolean,
  clean_classification text, clean_evidence jsonb)
language sql stable as $function$
  with base as (
    select e.* from public.events e
    where e.session_id is not null
      and (p_from is null or public.fn_ti_report_day(e.ts) >= p_from)
      and (p_to   is null or public.fn_ti_report_day(e.ts) <= p_to)
  ),
  sess as (
    select
      session_id,
      min(ts) filter (where event_type='view') as first_view_ts,
      count(*) filter (where event_type='view') as legacy_views,
      count(*) filter (where surface='page' and event_type='view') as page_views,
      count(*) filter (where event_type in ('search','cross_search','use','save','journey','add','open')) as interactions
    from base
    group by session_id
  ),
  c as (
    select session_id, clean_classification, clean_evidence
    from public.fn_ti_clean_classification(
      (coalesce(p_from, current_date) - interval '1 day')::date,
      (coalesce(p_to,   current_date) + interval '1 day')::date
    )
  )
  select
    s.session_id,
    public.fn_ti_report_day(coalesce(s.first_view_ts, now())) as reporting_day,
    s.legacy_views,
    s.page_views,
    s.interactions,
    (s.page_views >= 2) as page_engaged,
    (s.page_views = 1 and s.interactions = 0) as page_bounce,
    c.clean_classification,
    c.clean_evidence
  from sess s
  left join c using(session_id)
  where s.legacy_views >= 1;
$function$;
