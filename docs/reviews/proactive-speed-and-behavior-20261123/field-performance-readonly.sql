-- SOD1820 / existing canonical events — aggregate field performance evidence (READ ONLY).
-- No new table, no writes, no PII, no fabricated zeros.
-- RUM is hard document navigation ONLY; it cannot prove SPA route transitions or save persistence.
-- Capture 72h by route + device + collector build, then compare like-for-like only.
-- The same build label is an emitted asset label, NOT necessarily a Git SHA.
with input as (
  select
    props->>'build' as build_label,
    props->>'initial_path' as route,
    props->>'device_class' as device,
    props->>'measurement_scope' as measurement_scope,
    nullif(props->>'lcp_ms','')::numeric as lcp_ms,
    nullif(props->>'inp_ms','')::numeric as inp_ms,
    nullif(props->>'cls','')::numeric as cls,
    nullif(props->>'ttfb_ms','')::numeric as ttfb_ms,
    nullif(props->>'fcp_ms','')::numeric as fcp_ms
  from public.events
  where event_type='web_vital'
    and ts >= now() - interval '72 hours'
    and is_bot is distinct from true
    and props->>'measurement_scope'='document_navigation_hard_load_only'
    and props->>'initial_path' is not null
    and props->>'device_class' in ('mobile','desktop')
    and props->>'build' is not null
)
select build_label, route, device, measurement_scope,
       count(*) as samples,
       count(lcp_ms) as lcp_n,
       round(percentile_cont(.75) within group(order by lcp_ms)::numeric) as lcp_p75_ms,
       count(inp_ms) as inp_n,
       round(percentile_cont(.75) within group(order by inp_ms)::numeric) as inp_p75_ms,
       count(cls) as cls_n,
       round(percentile_cont(.75) within group(order by cls)::numeric,4) as cls_p75,
       count(ttfb_ms) as ttfb_n,
       round(percentile_cont(.75) within group(order by ttfb_ms)::numeric) as ttfb_p75_ms,
       count(fcp_ms) as fcp_n,
       round(percentile_cont(.75) within group(order by fcp_ms)::numeric) as fcp_p75_ms
from input
group by build_label,route,device,measurement_scope
order by samples desc,route,device
limit 150;
