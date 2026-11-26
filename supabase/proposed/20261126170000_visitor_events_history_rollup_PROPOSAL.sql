-- Anonymous history roll-up of public.visitor_events into the existing history table public.traffic_history (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL and a data write on the shared DB). Apply as ONE transaction.
-- URGENT TIMING: fn_telemetry_retention_120d already deletes visitor_events rows older than 120 days every night at 03:10 UTC (124,422 rows since 28.10).
-- Every night that passes before this file runs removes one more day from what can still be summarised. Package:
-- docs/reviews/db-capacity-audit-20261126/APPROVAL-REQUESTS-20261126.md.
--
-- Owner: traffic_intelligence_law v12 ("Long-term canonical traffic totals stay in traffic_daily/traffic_history", admin_retention_preview) - EXTEND_EXISTING:
-- the same table and the same unique key (period, granularity, source) that refresh_site_visits_history_v1 already uses for 'site_visits_legacy'.
-- No new table, column, cron or store. Every existing reader of traffic_history filters by an explicit source ('ga', 'jetpack', 'site_visits_legacy',
-- 'ga:country:%'), so the new source family is invisible to them (read from the live definitions of traffic_history_combined, admin_traffic_unified,
-- fn_ti_activity_pulse2029, admin_measurement_gap, fn_provider_freshness_watch, fn_ti_ga_country_daily).
-- What is stored (daily, Israel time): source = 'visitor_events_legacy:<section>:<event_type>', views = number of events, visitors = number of distinct
-- visitors, sessions = NULL - and ONLY for a group (day x section x event type) with at least 5 distinct visitors. A group with fewer than 5 distinct
-- visitors is NOT stored at all: neither its visitor count nor its event count (ZURIEL 26.11.2026, small-cell suppression). Read-only dry run on the live
-- table (26.11.2026 01:50 UTC): 3,634 groups; 1,677 stored (371,657 of 382,625 events, 97.1%); 1,957 hidden (10,968 events, 2.9%).
-- What is NEVER stored: visitor_id, slug, meta, any address, user agent, referrer, path or free text. section and event_type are checked against a strict
-- lowercase-token pattern; the 107 live pairs were scanned for identifiers (uuid-like, '@', 6+ digits): none.
-- The earliest day is marked partial in its note (the nightly deletion had already begun on it). Re-running never lowers an existing day (a group that later falls
-- below 5 visitors because raw rows were deleted simply stops appearing in the result; the row already stored is kept).
-- This does not stop or change the 120-day deletion and does not archive any raw row; it preserves only the anonymous daily shape.
-- Rollback: 20261126170000_visitor_events_history_rollup_ROLLBACK.sql (deletes only the rows this file wrote, by source prefix).
create or replace function public.refresh_visitor_events_history_v1(p_from date, p_to date)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  n int;
  v_first date;
begin
  if p_from is null or p_to is null then return 0; end if;
  if p_from > p_to then raise exception 'invalid visitor_events history range'; end if;
  select (min(created_at) at time zone 'Asia/Jerusalem')::date into v_first from public.visitor_events;

  with d as (
    select (ve.created_at at time zone 'Asia/Jerusalem')::date as dy, ve.section, ve.event_type, ve.visitor_id
      from public.visitor_events ve
     where (ve.created_at at time zone 'Asia/Jerusalem')::date between p_from and p_to
       and ve.section ~ '^[a-z0-9_-]{1,40}$' and ve.event_type ~ '^[a-z0-9_:.-]{1,60}$'
  )
  insert into public.traffic_history (period, granularity, views, visitors, sessions, source, note)
  select dy, 'day', count(*)::int,
         count(distinct visitor_id)::int,
         null::int,
         'visitor_events_legacy:' || section || ':' || event_type,
         case when dy = v_first
              then 'Legacy visitor_events daily count by section and event type; anonymous (no visitor id, no address). First day may be partial: the 120-day raw deletion had already begun.'
              else 'Legacy visitor_events daily count by section and event type; anonymous (no visitor id, no address).' end
    from d
   group by dy, section, event_type
  having count(distinct visitor_id) >= 5
  on conflict (period, granularity, source) do update set
    views = excluded.views, visitors = excluded.visitors, sessions = excluded.sessions, note = excluded.note
  where excluded.views >= public.traffic_history.views;

  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function public.refresh_visitor_events_history_v1(date, date) from public, anon, authenticated;
grant execute on function public.refresh_visitor_events_history_v1(date, date) to service_role;

-- One-time backfill of every day that still exists (dates are Israel days; visitor_events is closed to writes since 20.11.2026).
select public.refresh_visitor_events_history_v1(date '2026-07-01', date '2026-11-21');

-- Verification (read-only, run after applying). Expected: rows about 1.7K (1,677 at the dry run; fewer if a night's deletion removed days meanwhile),
-- events_total about 371K (97% of the raw rows), visitors_below_5 = 0 (no small cell), no other source touched.
--   select count(*) as rows, sum(views) as events_total, min(period) as first_day, max(period) as last_day,
--          count(*) filter (where visitors < 5 or visitors is null) as visitors_below_5
--     from public.traffic_history where source like 'visitor_events_legacy:%';
--   select (select count(*) from public.visitor_events) as raw_rows_now;   -- events_total <= raw rows at the time of the run (hidden groups are not counted)
