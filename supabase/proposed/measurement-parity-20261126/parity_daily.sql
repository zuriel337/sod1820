-- 14-day measurement comparison gate (READ ONLY; decision 337, 26.11.2026). Run once a day (or any time) from execute_sql / a SQL console.
-- Nothing here writes. It compares the canonical stream (events, via ingest_event) with the parallel stream (site_visits) day by day, in Israel time,
-- and puts the edge bot counter (crawl_daily) next to site_visits bot rows. The gate rules and the tolerances are in
-- docs/reviews/db-capacity-audit-20261126/MEASUREMENT-PARITY-GATE.md. Replace the two "14" below to widen or narrow the window.
with days as (select d::date as dy from generate_series(current_date - 14, current_date - 1, interval '1 day') d),
sv as (
  select (ts at time zone 'Asia/Jerusalem')::date as dy,
         count(*) filter (where not is_bot) as human_rows,
         count(distinct visitor) filter (where not is_bot) as human_visitors,
         count(*) filter (where is_bot) as bot_rows
    from public.site_visits where ts >= (current_date - 15)::timestamptz group by 1),
ev as (
  select (ts at time zone 'Asia/Jerusalem')::date as dy, count(*) as page_views, count(distinct sod_id) as sods
    from public.events
   where ts >= (current_date - 15)::timestamptz and surface = 'page' and event_type = 'view' and not coalesce(is_bot, false) group by 1),
cd as (select crawl_daily.day as dy, sum(hits) as edge_bot_hits from public.crawl_daily where crawl_daily.day >= current_date - 14 group by 1)
select days.dy,
       sv.human_rows, ev.page_views,
       round(100.0 * (ev.page_views - sv.human_rows) / nullif(sv.human_rows, 0), 1) as rows_diff_pct,          -- gate: |x| <= 3
       sv.human_visitors, ev.sods,
       round(100.0 * (ev.sods - sv.human_visitors) / nullif(sv.human_visitors, 0), 1) as visitors_diff_pct,    -- gate: |x| <= 5
       sv.bot_rows, cd.edge_bot_hits
  from days left join sv using (dy) left join ev using (dy) left join cd using (dy)
 order by 1;

-- Dwell (median seconds on page, 30-minute cap) for the top pages, 7 days: gate |site_visits - events| <= 2 s on each of the top 8 pages.
with sv as (
  select path as p, ts, lead(ts) over (partition by visitor order by ts) as nts
    from public.site_visits where ts > now() - interval '7 days' and not is_bot and visitor is not null),
svd as (select p, count(*) as n, round((percentile_cont(0.5) within group (order by extract(epoch from nts - ts)))::numeric) as med_s
          from sv where nts is not null and nts - ts < interval '30 minutes' group by p),
ev as (
  select path as p, ts, lead(ts) over (partition by coalesce(session_id, sod_id) order by ts) as nts
    from public.events where ts > now() - interval '7 days' and surface = 'page' and event_type = 'view'
     and not coalesce(is_bot, false) and coalesce(session_id, sod_id) is not null),
evd as (select p, count(*) as n, round((percentile_cont(0.5) within group (order by extract(epoch from nts - ts)))::numeric) as med_s
          from ev where nts is not null and nts - ts < interval '30 minutes' group by p)
select coalesce(svd.p, evd.p) as page, svd.n as sv_n, svd.med_s as sv_med_s, evd.n as ev_n, evd.med_s as ev_med_s, abs(svd.med_s - evd.med_s) as med_diff_s
  from svd full join evd on evd.p = svd.p
 order by coalesce(svd.n, 0) + coalesce(evd.n, 0) desc limit 8;

-- Journeys: visitors/sessions with >= 4 page views in 24 hours. gate: events within 15% of site_visits.
select (select count(*) from (select visitor from public.site_visits where ts > now() - interval '24 hours' and not is_bot group by 1 having count(*) >= 4) q) as sv_journeys,
       (select count(*) from (select coalesce(session_id, sod_id) from public.events where ts > now() - interval '24 hours' and surface = 'page'
                                 and event_type = 'view' and not coalesce(is_bot, false) group by 1 having count(*) >= 4) q) as ev_journeys;
