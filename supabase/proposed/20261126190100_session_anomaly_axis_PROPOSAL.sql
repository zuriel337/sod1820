-- Traffic wave 26.11.2026, proposal P3 (PROPOSAL, NOT APPLIED): a separate ANOMALY evidence axis. Apply only on an explicit ZURIEL approval of this exact file
-- (CLAUDE.md 0.4), as ONE transaction. Owner: traffic_intelligence_law v12 ("SESSION ANOMALY: HUMAN != NORMAL and ANOMALY != BOT ... orthogonal evidence axis ...
-- must never auto-reclassify Clean Human/Bot/Unknown"). EXTEND_EXISTING: one read-only function over the existing events table; no table, column, cron or cache.
-- It does NOT change is_bot, suspected_bot, clean_classification, entrances, engaged or bounces, and nothing calls it to filter. A short visit is evidence, not a bot.
-- Flags (neutral names): 'api_referer_not_site' (P2 evidence says the browser's API calls carried an external Referer), 'source_claim_conflicts_api_referer'
-- (arrival says a non-direct source but the API Referer is external: a genuine visitor's API calls carry the site as Referer), 'single_page_no_action_under_3s'.
-- Only sessions with at least one flag are returned. Callable by service_role only (admin surfaces read it through their existing server paths).
-- Rollback: 20261126190100_session_anomaly_axis_ROLLBACK.sql.
do $migration$
begin
  perform set_config('lock_timeout', '3s', true);
  if to_regprocedure('public.fn_ti_report_day(timestamp with time zone)') is null then
    raise exception 'fn_ti_report_day is missing; this file depends on the existing reporting-day helper' using errcode = 'P0001';
  end if;
end
$migration$;

create or replace function public.fn_ti_session_anomaly_v1(p_from date, p_to date)
returns table(session_id text, reporting_day date, page_views integer, interactions integer, engagement_events integer, duration_s numeric, flags text[])
language sql
stable
set search_path to 'public', 'pg_temp'
as $function$
  with base as (
    select e.* from public.events e
    where e.session_id is not null
      and (p_from is null or public.fn_ti_report_day(e.ts) >= p_from)
      and (p_to   is null or public.fn_ti_report_day(e.ts) <= p_to)
  ), s as (
    select b.session_id,
      public.fn_ti_report_day(min(b.ts)) as reporting_day,
      (count(*) filter (where b.surface = 'page' and b.event_type = 'view'))::int as page_views,
      (count(*) filter (where b.event_type in ('search','cross_search','use','save','journey','add','open')))::int as interactions,
      (count(*) filter (where b.event_type = 'engagement'))::int as engagement_events,
      (extract(epoch from (max(b.ts) - min(b.ts))))::numeric as duration_s,
      bool_or(b.props #>> '{_request_evidence,referer}' = 'external') as api_referer_external,
      max(b.props->>'source') filter (where b.surface = 'arrival' and b.event_type = 'source') as arrival_source
    from base b group by b.session_id
  )
  select s.session_id, s.reporting_day, s.page_views, s.interactions, s.engagement_events, round(s.duration_s, 1),
    array_remove(array[
      case when s.api_referer_external then 'api_referer_not_site' end,
      case when s.api_referer_external and coalesce(s.arrival_source, 'direct') <> 'direct' then 'source_claim_conflicts_api_referer' end,
      case when s.page_views = 1 and s.interactions = 0 and s.engagement_events = 0 and s.duration_s < 3 then 'single_page_no_action_under_3s' end
    ], null)
  from s
  where s.api_referer_external or (s.page_views = 1 and s.interactions = 0 and s.engagement_events = 0 and s.duration_s < 3);
$function$;

revoke all on function public.fn_ti_session_anomaly_v1(date, date) from public, anon, authenticated;
grant execute on function public.fn_ti_session_anomaly_v1(date, date) to service_role;
