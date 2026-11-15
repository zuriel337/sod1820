-- Read-only RUM cohort query for the Post pages (public.events, surface='performance', event_type='web_vital'; hard document loads only).
-- One row per sample_id, `final` preferred. Edit the two timestamps (the 7 days before and the 7 days after the alias move; same weekdays) and keep the exclusion list:
-- windows polluted by synthetic browsers must not enter any comparison. events.device is NULL on every row, so this is ALL devices; do not read it as mobile.
with v as (
  select props->>'sample_id' as sid, props->>'phase' as phase, ts, path,
         nullif(props->>'lcp_ms','')::numeric as lcp, nullif(props->>'ttfb_ms','')::numeric as ttfb, nullif(props->>'fcp_ms','')::numeric as fcp,
         nullif(props->>'cls','')::numeric as cls, nullif(props->>'inp_ms','')::numeric as inp
  from events
  where surface = 'performance' and event_type = 'web_vital'
    and ts >= timestamptz '2026-11-01 00:00+00'               -- :window_from
    and ts <  timestamptz '2026-11-16 00:00+00'               -- :window_to
    and not (ts >= timestamptz '2026-11-15 01:00+00' and ts < timestamptz '2026-11-15 04:30+00')   -- browser audit of the URL-continuity task
    and not (ts >= timestamptz '2026-11-15 13:20+00' and ts < timestamptz '2026-11-15 20:00+00')   -- lab and verification browsers of this task (extend if more are run)
), d as (
  select distinct on (sid) * from v where sid is not null order by sid, (phase = 'final') desc, ts desc
), p as (
  select *, case when path = '/post/:item' then '1 post at /post/:slug'
                 when path ~ '^/[֐-׿]' then '2 post at original address (Hebrew slug)'
                 when path = '/post' then '4 post library index'
                 else '3 other pages' end as page_kind
  from d
)
select page_kind, count(*) as n,
  round(percentile_cont(0.5)  within group (order by ttfb)::numeric) as ttfb_p50, round(percentile_cont(0.75) within group (order by ttfb)::numeric) as ttfb_p75,
  round(percentile_cont(0.5)  within group (order by fcp)::numeric)  as fcp_p50,  round(percentile_cont(0.75) within group (order by fcp)::numeric)  as fcp_p75,
  round(percentile_cont(0.5)  within group (order by lcp)::numeric)  as lcp_p50,  round(percentile_cont(0.75) within group (order by lcp)::numeric)  as lcp_p75,
  round(percentile_cont(0.75) within group (order by cls)::numeric, 3) as cls_p75, round(percentile_cont(0.75) within group (order by inp)::numeric) as inp_p75
from p group by page_kind order by page_kind;
