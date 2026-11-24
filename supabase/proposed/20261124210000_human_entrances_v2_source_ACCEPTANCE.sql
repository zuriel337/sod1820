-- Read-only acceptance for 20261124210000_human_entrances_v2_source_PROPOSAL.sql, to run on live right after the apply.
-- Every query is a SELECT. Expected values are from the read-only simulation of 24.11.2026 (README, section 6).

-- 1. The live function is the fix, and no session has a NULL classification from 15.11.
select position('v2_source_fix_20261124' in pg_get_functiondef('public.fn_human_entrances(date,date)'::regprocedure)) > 0 as fix_live,
       (select count(*) from public.fn_human_entrances(date '2026-11-15', current_date) where suspected_bot is null) as null_suspected; -- expect true, 0

-- 2. raw = net + suspected per day (the 7.8 contract invariant), and bounces are no longer zero.
select t.day, f.sessions, t.entrances, t.suspected, t.entrances + t.suspected = f.sessions as invariant_ok, t.bounces, t.engaged
from public.traffic_daily t
join (select day, count(*) sessions from public.fn_human_entrances(date '2026-11-14', current_date + 1)
      where day between date '2026-11-15' and current_date group by day) f using (day)
order by t.day; -- expect invariant_ok true every day; 16.11 ≈ 241 entrances / 14 suspected / 145 bounces (simulation)

-- 3. The same days before the fix, as kept in analytics_cache.
select r.day, r.entrances, r.suspected, r.bounces
from public.analytics_cache c, jsonb_populate_recordset(null::public.traffic_daily, c.payload->'rows') r
where c.cache_key = 'traffic_daily_before_v2_source_fix_20261124' and r.day >= date '2026-11-15' order by r.day;

-- 4. Independent cross-check against the second first-party meter (site_visits, track_visit) and GA4, same PT day.
select to_char(d, 'MM-DD') d, fp_sessions, sv_human_visitors, ga_sessions
from (select (ts at time zone 'America/Los_Angeles')::date d, count(distinct session_id) fp_sessions
      from public.events where surface = 'page' and event_type = 'view' and ts >= date '2026-11-16' group by 1) e
left join (select (ts at time zone 'America/Los_Angeles')::date d, count(distinct visitor) filter (where not is_bot) sv_human_visitors
      from public.site_visits where ts >= date '2026-11-16' group by 1) v using (d)
left join (select period::date d, sessions ga_sessions from public.traffic_history where source = 'ga' and granularity = 'day') g using (d)
order by d;

-- 5. Downstream readers that call fn_human_entrances now see the v2 single-view sessions (no code change needed):
--    admin_entries_breakdown, admin_entries_day_detail, admin_funnel, admin_traffic_insights, fn_ti_entity_demand,
--    fn_ti_entity_demand_sessions, fn_ti_surface_activity, fn_ti_clean_classification, fn_raziel_research_intel.
select count(*) as v2_single_view_sessions_visible
from public.fn_human_entrances(current_date - 7, current_date) where views = 1 and interactions = 0; -- expect > 0
