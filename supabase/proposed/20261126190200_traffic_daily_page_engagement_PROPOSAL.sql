-- Traffic wave 26.11.2026, proposal P4 (PROPOSAL, NOT APPLIED): page / content / real engagement kept apart in traffic_daily, FROM THE FIRST FULL DAY AFTER APPLYING.
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4), as ONE transaction, AFTER 20261126190100 (it reads fn_ti_session_anomaly_v1).
-- Owner: traffic_intelligence_law v12, "VIEW TAXONOMY" (7.9.2026): PAGE_VIEW = surface 'page' and event_type 'view', distinct from CONTENT_VIEW; page_engaged / page_bounce
-- must be derived from page_views, not from the page + content duplication; "additive explicit page_views/page_engaged/page_bounce outputs while preserving legacy views".
-- fn_ti_session_metrics already derives them; traffic_daily (fed by fn_human_entrances, where views counts every surface) never received them. This file adds them, additively:
--   * four nullable columns on traffic_daily: page_views (sum of page views of the day's counted entrances), page_engaged (page_views >= 2), page_bounces (one page view and no
--     interaction), engagement_sessions (a page 'engagement' event with engaged_ms > 0), anomalous (P3 flagged; informational, never subtracted) -- 5 columns in total, see below;
--   * a cutover date stored in the existing analytics_cache (key traffic_daily_page_metrics_cutover) = the first full Israel day AFTER this file is applied;
--   * refresh_traffic_daily_range_v1 keeps its legacy statement byte for byte and fills the new columns only for days on or after the cutover. Earlier rows stay NULL.
-- No history is rewritten: the legacy columns (entrances, engaged, bounces, views, ...) are unchanged in meaning and value, readers of them keep working, and the series break of
-- the engaged rate (the legacy count calls every post visit engaged, because a visit emits a page view and a content view) is visible as NULL -> value at the cutover.
-- admin_entries_daily returns SETOF traffic_daily and therefore also returns the new columns; check the admin client before applying.
-- Cost (read-only measurement, 26.11.2026): fn_ti_session_metrics for 7 days = 1.08 s, fn_human_entrances for 8 days = 0.42 s, once an hour (cron traffic-daily-refresh).
-- Guard: md5(prosrc) of the live refresh_traffic_daily_range_v1 = 97616f75277d4e4b0eaa1c63c82967f5. Rollback: 20261126190200_traffic_daily_page_engagement_ROLLBACK.sql.
do $migration$
begin
  perform set_config('lock_timeout', '3s', true);
  if (select prosrc from pg_proc where proname = 'refresh_traffic_daily_range_v1' and pronamespace = 'public'::regnamespace) like '%traffic_daily_page_metrics_cutover%' then
    raise notice 'refresh_traffic_daily_range_v1 already is the P4 version; re-applying the same statements (idempotent)';
  elsif (select md5(prosrc) from pg_proc where proname = 'refresh_traffic_daily_range_v1' and pronamespace = 'public'::regnamespace) is distinct from '97616f75277d4e4b0eaa1c63c82967f5' then
    raise exception 'refresh_traffic_daily_range_v1 drift; independent review required, nothing changed' using errcode = 'P0001';
  end if;
  if to_regprocedure('public.fn_ti_session_anomaly_v1(date,date)') is null then
    raise exception 'apply 20261126190100_session_anomaly_axis_PROPOSAL.sql first' using errcode = 'P0001';
  end if;
  if to_regprocedure('public.fn_ti_session_metrics(date,date)') is null or to_regprocedure('public.fn_human_entrances(date,date)') is null then
    raise exception 'fn_ti_session_metrics or fn_human_entrances is missing' using errcode = 'P0001';
  end if;
end
$migration$;

alter table public.traffic_daily
  add column if not exists page_views integer,
  add column if not exists page_engaged integer,
  add column if not exists page_bounces integer,
  add column if not exists engagement_sessions integer,
  add column if not exists anomalous integer;

insert into public.analytics_cache(cache_key, payload, cache_kind, producer, computed_at)
values ('traffic_daily_page_metrics_cutover',
        jsonb_build_object('first_full_day', (((now() at time zone 'Asia/Jerusalem')::date) + 1)::text,
                           'meaning', 'traffic_daily.page_* columns are filled for days on or after this Israel day; earlier rows stay NULL (no history rewrite)',
                           'decision', 'ZURIEL 26.11.2026 P4'),
        'config', 'traffic_intelligence_law v12', now())
on conflict (cache_key) do nothing;

create or replace function public.refresh_traffic_daily_range_v1(p_from date, p_to date)
returns integer
language plpgsql
as $function$
declare
  n int;
  v_cut date;
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

  -- P4: page / content / real engagement, only from the cutover day on; earlier days are never touched.
  select (payload->>'first_full_day')::date into v_cut from public.analytics_cache where cache_key = 'traffic_daily_page_metrics_cutover';
  if v_cut is not null and p_to >= v_cut then
    update public.traffic_daily t
       set page_views = s.pv, page_engaged = s.pe, page_bounces = s.pb, engagement_sessions = s.es, anomalous = s.an
      from (
        select h.day d,
          coalesce(sum(m.page_views), 0)::int pv,
          (count(*) filter (where m.page_engaged))::int pe,
          (count(*) filter (where m.page_bounce))::int pb,
          (count(*) filter (where eg.session_id is not null))::int es,
          (count(*) filter (where an.session_id is not null))::int an
        from public.fn_human_entrances(greatest(p_from, v_cut) - 1, p_to + 1) h
        join public.fn_ti_session_metrics(greatest(p_from, v_cut) - 1, p_to + 1) m on m.session_id = h.session_id
        left join (
          select distinct e.session_id from public.events e
           where e.surface = 'page' and e.event_type = 'engagement' and e.session_id is not null
             and (e.props->>'engaged_ms') ~ '^[0-9]+$' and (e.props->>'engaged_ms')::numeric > 0
             and public.fn_ti_report_day(e.ts) between greatest(p_from, v_cut) - 1 and p_to + 1
        ) eg on eg.session_id = h.session_id
        left join public.fn_ti_session_anomaly_v1(greatest(p_from, v_cut) - 1, p_to + 1) an on an.session_id = h.session_id
        where not h.suspected_bot and h.day between greatest(p_from, v_cut) and p_to
        group by h.day
      ) s
     where t.day = s.d;
  end if;

  return n;
end;
$function$;
