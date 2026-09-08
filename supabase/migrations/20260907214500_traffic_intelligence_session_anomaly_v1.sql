-- SESSION_ANOMALY_INTELLIGENCE_V1 — one additive, server-only fn_ti_* read model.
-- Order: work_log 77451f4e-0bf2-4934-b852-b9d5024d18cf (GPT/ZURIEL dispatch).
-- Stacked on the LIVE-but-unmerged v6 lineage (branch claude/traffic-intel-v6-clean-
-- composition @ a5d188df021bf3121200cb93b622a5acb003a68a). Orthogonal evidence axis only:
-- no bot reclassification, no blocking, no recommendation suppression, no UI, no new
-- table/store, no change to Clean v1 (fn_ti_clean_classification), fn_human_entrances,
-- fn_ti_entity_demand, fn_ti_session_metrics, traffic_daily, demand functions/tables,
-- recommendations, or edges. HUMAN != NORMAL; ANOMALY != BOT: this function only ranks
-- a session's own navigation shape against a trailing behavioral baseline. It never
-- reads/writes country, referrer, person/account identity, or Clean classification as an
-- input to any threshold or band — those are exposed only as read-only CONTEXT alongside
-- the score, and clean_classification/clean_evidence come straight from the frozen
-- fn_ti_clean_classification untouched.
CREATE OR REPLACE FUNCTION public.fn_ti_session_anomaly(
  p_from date,
  p_to date,
  p_baseline_days integer DEFAULT 30
)
RETURNS TABLE(
  session_id text,
  reporting_day date,
  page_views integer,
  unique_paths integer,
  burst_transitions integer,
  fast_nav_transitions integer,
  depth_tier text,
  breadth_tier text,
  burst_tier text,
  fast_navigation_tier text,
  anomaly_axis_count_p95 integer,
  anomaly_axis_count_p99 integer,
  anomaly_axis_count_p999 integer,
  anomaly_band text,
  anomaly_pattern text,
  anomaly_reasons text[],
  anomaly_version text,
  span_seconds numeric,
  median_transition_seconds numeric,
  switch_lt1_rate numeric,
  switch_lt5_rate numeric,
  strong_research_actions integer,
  engaged_ms numeric,
  clean_classification text,
  clean_evidence jsonb,
  baseline_from date,
  baseline_to date,
  baseline_days integer,
  baseline_sessions integer,
  baseline_thresholds jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if p_baseline_days is null or p_baseline_days < 7 or p_baseline_days > 90 then
    raise exception 'p_baseline_days must be between 7 and 90 (got %)', p_baseline_days;
  end if;

  return query
  with bounds as (
    -- Columns are deliberately renamed away from the p_from/p_to/p_baseline_days
    -- parameter names and away from this function's own RETURNS TABLE column names
    -- (baseline_from/baseline_to/baseline_days) — reusing either causes PL/pgSQL to
    -- raise "column reference is ambiguous" wherever this CTE is later joined bare.
    select p_from as t_from, p_to as t_to, p_baseline_days as t_baseline_days,
      (p_to - (p_baseline_days - 1)) as t_baseline_from,
      p_to as t_baseline_to
  ),
  scan as (
    -- Widened raw-event scan window: covers both the baseline and target ranges plus a
    -- 1-day guard on the near side and a 2-day guard on the far side, so a session
    -- straddling a UTC/reporting-day boundary is never truncated. This does not change
    -- session/identity logic — it only ensures every event of a candidate session is read
    -- before per-session aggregation.
    select least(t_from, t_baseline_from) as scan_from, greatest(t_to, t_baseline_to) as scan_to
    from bounds
  ),
  raw as (
    select e.session_id, e.ts, e.path, e.event_type, e.surface, e.props
    from public.events e, scan s
    where e.session_id is not null
      and e.ts >= (s.scan_from - interval '1 day')
      and e.ts <  (s.scan_to   + interval '2 day')
  ),
  -- Canonical PAGE_VIEW only (surface='page' AND event_type='view') — same definition as
  -- fn_ti_session_metrics' page_views, not fn_human_entrances' all-surface legacy views.
  -- Every column below is explicitly alias-qualified (r./p. etc), never bare, because
  -- "session_id" (and several other names here) is also this function's own OUT/RETURNS
  -- TABLE column name — an unqualified reference is ambiguous between that PL/pgSQL
  -- variable and the CTE's table column, per the same pitfall fixed above for bounds.
  pv as (
    select r.session_id, r.ts, r.path,
      lag(r.ts) over (partition by r.session_id order by r.ts) as prev_ts,
      lag(r.path) over (partition by r.session_id order by r.ts) as prev_path
    from raw r where r.surface='page' and r.event_type='view'
  ),
  sess_page as materialized (
    select p.session_id,
      min(p.ts) as first_page_ts,
      max(p.ts) as last_page_ts,
      count(*)::int as page_views,
      count(distinct p.path)::int as unique_paths,
      -- burst / fast_navigation: raw counts of DISTINCT-PATH transitions under the gap
      -- threshold. Both are inclusive raw counts (fast_navigation's <5s window contains
      -- burst's <1s window) — not mutually exclusive, per spec.
      count(*) filter (where p.prev_ts is not null and p.path is distinct from p.prev_path and extract(epoch from p.ts-p.prev_ts) < 1)::int as burst,
      count(*) filter (where p.prev_ts is not null and p.path is distinct from p.prev_path and extract(epoch from p.ts-p.prev_ts) < 5)::int as fast_navigation,
      count(*) filter (where p.prev_ts is not null and p.path is distinct from p.prev_path)::int as path_switches,
      (percentile_cont(0.5) within group (order by extract(epoch from p.ts-p.prev_ts)) filter (where p.prev_ts is not null))::numeric as median_transition_seconds
    from pv p group by p.session_id
  ),
  sess_extra as materialized (
    select r.session_id,
      count(*) filter (where r.event_type in ('search','cross_search','save','use','journey','share','share_story'))::int as strong_research_actions,
      coalesce(sum((r.props->>'engaged_ms')::numeric) filter (where r.event_type='engagement'),0) as engaged_ms
    from raw r group by r.session_id
  ),
  -- Candidate session = has >=1 canonical page view (inner join requires a sess_page row).
  -- Session's reporting day = fn_ti_report_day of its FIRST canonical page view, per spec.
  sess as materialized (
    select sp.*, se.strong_research_actions, se.engaged_ms,
      public.fn_ti_report_day(sp.first_page_ts) as first_page_reporting_day,
      extract(epoch from sp.last_page_ts - sp.first_page_ts) as span_seconds
    from sess_page sp join sess_extra se on se.session_id = sp.session_id
  ),
  baseline as (
    select s.* from sess s, bounds b
    where s.first_page_reporting_day between b.t_baseline_from and b.t_baseline_to
  ),
  -- Four scored axes only, all empirical against the baseline, computed once (MATERIALIZED
  -- so it is not re-evaluated per target row). Country/referrer/via/person/account/Clean
  -- classification play no part here.
  thresholds as materialized (
    select
      count(*)::int as baseline_sessions,
      percentile_cont(0.95)  within group (order by bl.page_views)      as views_p95,
      percentile_cont(0.99)  within group (order by bl.page_views)      as views_p99,
      percentile_cont(0.999) within group (order by bl.page_views)      as views_p999,
      percentile_cont(0.95)  within group (order by bl.unique_paths)    as paths_p95,
      percentile_cont(0.99)  within group (order by bl.unique_paths)    as paths_p99,
      percentile_cont(0.999) within group (order by bl.unique_paths)    as paths_p999,
      percentile_cont(0.95)  within group (order by bl.burst)           as burst_p95,
      percentile_cont(0.99)  within group (order by bl.burst)           as burst_p99,
      percentile_cont(0.999) within group (order by bl.burst)           as burst_p999,
      percentile_cont(0.95)  within group (order by bl.fast_navigation) as fastnav_p95,
      percentile_cont(0.99)  within group (order by bl.fast_navigation) as fastnav_p99,
      percentile_cont(0.999) within group (order by bl.fast_navigation) as fastnav_p999
    from baseline bl
  ),
  target as (
    select s.* from sess s, bounds b
    where s.first_page_reporting_day between b.t_from and b.t_to
  ),
  -- Clean v1 is frozen and untouched; called ONLY over the (much smaller) target window
  -- widened by 1 day each side — not the full baseline window, which would needlessly
  -- reclassify tens of thousands of baseline-only sessions never returned by this call.
  -- Clean v1's own date-filtering/classification logic is not modified in any way.
  clean as materialized (
    select cc.session_id, cc.clean_classification, cc.clean_evidence
    from public.fn_ti_clean_classification(
      (select (t_from - interval '1 day')::date from bounds),
      (select (t_to   + interval '1 day')::date from bounds)
    ) cc
  ),
  tiered as (
    select
      t.*,
      th.baseline_sessions, th.views_p95, th.views_p99, th.views_p999,
      th.paths_p95, th.paths_p99, th.paths_p999,
      th.burst_p95, th.burst_p99, th.burst_p999,
      th.fastnav_p95, th.fastnav_p99, th.fastnav_p999,
      case when t.page_views>=th.views_p999 then 'p999' when t.page_views>=th.views_p99 then 'p99' when t.page_views>=th.views_p95 then 'p95' else 'normal' end as depth_tier,
      case when t.unique_paths>=th.paths_p999 then 'p999' when t.unique_paths>=th.paths_p99 then 'p99' when t.unique_paths>=th.paths_p95 then 'p95' else 'normal' end as breadth_tier,
      case when t.burst>=th.burst_p999 then 'p999' when t.burst>=th.burst_p99 then 'p99' when t.burst>=th.burst_p95 then 'p95' else 'normal' end as burst_tier,
      case when t.fast_navigation>=th.fastnav_p999 then 'p999' when t.fast_navigation>=th.fastnav_p99 then 'p99' when t.fast_navigation>=th.fastnav_p95 then 'p95' else 'normal' end as fast_navigation_tier
    from target t cross join thresholds th
  ),
  scored as (
    select
      ti.*,
      ((ti.depth_tier='p999')::int + (ti.breadth_tier='p999')::int + (ti.burst_tier='p999')::int + (ti.fast_navigation_tier='p999')::int) as p999_count,
      ((ti.depth_tier='p99')::int  + (ti.breadth_tier='p99')::int  + (ti.burst_tier='p99')::int  + (ti.fast_navigation_tier='p99')::int)  as p99_count,
      ((ti.depth_tier='p95')::int  + (ti.breadth_tier='p95')::int  + (ti.burst_tier='p95')::int  + (ti.fast_navigation_tier='p95')::int)  as p95_count
    from tiered ti
  )
  select
    s.session_id,
    s.first_page_reporting_day as reporting_day,
    s.page_views, s.unique_paths, s.burst as burst_transitions, s.fast_navigation as fast_nav_transitions,
    s.depth_tier, s.breadth_tier, s.burst_tier, s.fast_navigation_tier,
    s.p95_count as anomaly_axis_count_p95,
    s.p99_count as anomaly_axis_count_p99,
    s.p999_count as anomaly_axis_count_p999,
    case
      when s.baseline_sessions < 500 then 'insufficient_baseline'
      when s.p999_count>=2 or (s.p999_count>=1 and s.p99_count>=2) then 'extreme'
      when s.p99_count>=2 or s.p999_count>=1 then 'high'
      when s.p99_count>=1 or s.p95_count>=3 then 'elevated'
      else 'normal'
    end as anomaly_band,
    case
      when s.baseline_sessions < 500 then 'insufficient_baseline'
      when array_length(array_remove(array[
        case when s.depth_tier<>'normal' then 'DEPTH_'||upper(s.depth_tier) end,
        case when s.breadth_tier<>'normal' then 'BREADTH_'||upper(s.breadth_tier) end,
        case when s.burst_tier<>'normal' then 'BURST_'||upper(s.burst_tier) end,
        case when s.fast_navigation_tier<>'normal' then 'FAST_NAV_'||upper(s.fast_navigation_tier) end
      ], null), 1) is null then 'normal'
      else array_to_string(array_remove(array[
        case when s.depth_tier<>'normal' then 'DEPTH_'||upper(s.depth_tier) end,
        case when s.breadth_tier<>'normal' then 'BREADTH_'||upper(s.breadth_tier) end,
        case when s.burst_tier<>'normal' then 'BURST_'||upper(s.burst_tier) end,
        case when s.fast_navigation_tier<>'normal' then 'FAST_NAV_'||upper(s.fast_navigation_tier) end
      ], null), '+')
    end as anomaly_pattern,
    case when s.baseline_sessions < 500 then array[]::text[] else array_remove(array[
        case when s.depth_tier<>'normal' then 'DEPTH_'||upper(s.depth_tier) end,
        case when s.breadth_tier<>'normal' then 'BREADTH_'||upper(s.breadth_tier) end,
        case when s.burst_tier<>'normal' then 'BURST_'||upper(s.burst_tier) end,
        case when s.fast_navigation_tier<>'normal' then 'FAST_NAV_'||upper(s.fast_navigation_tier) end
      ], null)
    end as anomaly_reasons,
    'session_anomaly_v1' as anomaly_version,
    s.span_seconds,
    s.median_transition_seconds,
    case when s.path_switches>0 then round(s.burst::numeric/s.path_switches,4) else null end as switch_lt1_rate,
    case when s.path_switches>0 then round(s.fast_navigation::numeric/s.path_switches,4) else null end as switch_lt5_rate,
    s.strong_research_actions,
    s.engaged_ms,
    c.clean_classification,
    c.clean_evidence,
    (select t_baseline_from from bounds) as baseline_from,
    (select t_baseline_to from bounds) as baseline_to,
    (select t_baseline_days from bounds) as baseline_days,
    s.baseline_sessions,
    jsonb_build_object(
      'depth_p95', s.views_p95, 'depth_p99', s.views_p99, 'depth_p999', s.views_p999,
      'breadth_p95', s.paths_p95, 'breadth_p99', s.paths_p99, 'breadth_p999', s.paths_p999,
      'burst_p95', s.burst_p95, 'burst_p99', s.burst_p99, 'burst_p999', s.burst_p999,
      'fast_navigation_p95', s.fastnav_p95, 'fast_navigation_p99', s.fastnav_p99, 'fast_navigation_p999', s.fastnav_p999
    ) as baseline_thresholds
  from scored s
  left join clean c on c.session_id = s.session_id;
end
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_ti_session_anomaly(date, date, integer) FROM PUBLIC;
