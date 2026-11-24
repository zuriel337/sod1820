-- Traffic Intelligence v11 — implementation fix of fn_human_entrances for measurement v2 (PROPOSAL, NOT APPLIED).
-- Package: docs/reviews/measurement-root-cause-20261124/README.md. Apply only on an explicit ZURIEL approval of this exact file.
--
-- Contract: traffic_intelligence_law v11 (active rule, md5 525452c0…), sections 4 (Bounce), 8 (one canonical source),
-- the 7.8 behavioural filter ("raw = net + suspected"), the 7.9 Attribution Decomposition and the 1.9 Clean Traffic note
-- (v3 rules unchanged). No contract text changes. ingest_event is not touched, so the guard of PR #1545
-- (ingest_event md5 1b0f1f4b…) is not affected and the order of application against #1545 does not matter.
--
-- Root cause: the v2 envelope (#1366, 15.11.2026 22:00 UTC) refuses p_via (ingest_event raises "invalid measurement
-- envelope" when p_via is not null); the source of a v2 visit is carried once per session by arrival/source.
-- fn_human_entrances still read events.via only, so for a v2 single-view session suspected_bot evaluated to NULL and
-- refresh_traffic_daily_range_v1 dropped the session from entrances (not suspected_bot) AND from suspected (suspected_bot).
-- Measured 15–24.11: 1,350 of 2,481 sessions (54%) were missing from both; bounces = 0 every day.
--
-- What changes (implementation only):
--   1. source = coalesce(events.via, the session's arrival/source token) — the same via() value, through its v2 carrier;
--   2. rule v2 (direct + no country + single view + no interaction) is evaluated only where country evidence is
--      collected (a non-v2 landing); the v2 envelope never carries country, so the clause is not evaluable there;
--   3. rule v3 (direct + numeric landing + single view + no interaction) is unchanged;
--   4. suspected_bot is never NULL: unevaluable evidence = not suspected (raw = net + suspected holds again).
-- Proven before writing (read-only simulation, 24.11.2026): 65,989 sessions 8.7–14.11 — 0 changes to suspected_bot,
-- 0 changes to source, 0 to classification_reason; 15–24.11 — 1,350 NULLs resolved, 90 suspected by rule v3, 30 without
-- an arrival event (not suspected).
--
-- One transaction, guarded:
--   a. both functions must be the exact live definitions read on 24.11.2026;
--   b. traffic_daily rows from 1.11 are copied to analytics_cache (provenance, existing table) before anything changes;
--   c. the function is replaced; the pre-15.11 output (sessions, suspected_bot, source, reason) must be identical;
--   d. traffic_daily is recomputed for 15.11 → today with the unchanged refresh function;
--   e. post-checks: no NULL suspected_bot from 15.11, and traffic_daily entrances + suspected = sessions per day.
-- Do not run between 03:00 and 03:20 UTC (g3-telemetry-retention-120d-daily prunes events then).
-- Rollback: 20261124210000_human_entrances_v2_source_ROLLBACK.sql. Acceptance: ..._ACCEPTANCE.sql (read only).

do $migration$
declare
  v_fhe constant regprocedure := 'public.fn_human_entrances(date,date)'::regprocedure;
  v_refresh constant regprocedure := 'public.refresh_traffic_daily_range_v1(date,date)'::regprocedure;
  v_before text;
  v_after text;
  v_nulls bigint;
  v_bad_days bigint;
  v_new constant text := $fhe$
CREATE OR REPLACE FUNCTION public.fn_human_entrances(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(session_id text, day date, first_ts timestamp with time zone, landing_path text, source text, device text, country text, visitor text, is_logged_in boolean, views integer, interactions integer, searches integer, engaged boolean, bounce boolean, suspected_bot boolean, classification_reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
$fhe$;
begin
  -- a. exact live definitions (read 24.11.2026)
  if md5(pg_get_functiondef(v_fhe)) <> 'bdb2647a22c4d1c53cfc84d808a59b86' then
    raise exception 'Unexpected fn_human_entrances definition %', md5(pg_get_functiondef(v_fhe));
  end if;
  if md5(pg_get_functiondef(v_refresh)) <> 'b299c5feb8f8f39ecc96a9ae238b8cca' then
    raise exception 'Unexpected refresh_traffic_daily_range_v1 definition %', md5(pg_get_functiondef(v_refresh));
  end if;

  -- b. provenance: the rows this fix recomputes, as they were (existing analytics_cache; never overwritten)
  insert into public.analytics_cache(cache_key, payload, computed_at)
  select 'traffic_daily_before_v2_source_fix_20261124',
         jsonb_build_object('reason', 'traffic_intelligence_law v11 implementation fix; rows before recompute',
                            'rows', jsonb_agg(to_jsonb(t) order by t.day)), now()
  from public.traffic_daily t where t.day >= date '2026-11-01';
  -- (a duplicate key means the fix was already applied once: the insert fails and the transaction stops)

  -- c. replace, with identical output before the v2 envelope
  select md5(string_agg(h.session_id || '|' || coalesce(h.suspected_bot::text, '-') || '|' || coalesce(h.source, '-')
                        || '|' || coalesce(h.classification_reason, '-'), ',' order by h.session_id))
    into v_before from public.fn_human_entrances(date '2026-07-01', date '2026-11-14') h;
  execute v_new;
  select md5(string_agg(h.session_id || '|' || coalesce(h.suspected_bot::text, '-') || '|' || coalesce(h.source, '-')
                        || '|' || coalesce(h.classification_reason, '-'), ',' order by h.session_id))
    into v_after from public.fn_human_entrances(date '2026-07-01', date '2026-11-14') h;
  if v_before is distinct from v_after then
    raise exception 'Pre-15.11 output changed (% -> %)', v_before, v_after;
  end if;

  -- d. recompute the affected days with the unchanged refresh
  perform public.refresh_traffic_daily_range_v1(date '2026-11-15', current_date);

  -- e. post-checks
  select count(*) into v_nulls from public.fn_human_entrances(date '2026-11-15', current_date) h where h.suspected_bot is null;
  if v_nulls <> 0 then raise exception 'suspected_bot still NULL for % sessions', v_nulls; end if;
  select count(*) into v_bad_days
  from public.traffic_daily t
  join (select h.day, count(*) n from public.fn_human_entrances(date '2026-11-14', current_date + 1) h
        where h.day between date '2026-11-15' and current_date group by h.day) f on f.day = t.day
  where t.entrances + t.suspected <> f.n;
  if v_bad_days <> 0 then raise exception 'raw <> net + suspected on % days', v_bad_days; end if;
end;
$migration$;
