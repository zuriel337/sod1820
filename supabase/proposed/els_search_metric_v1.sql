-- PROPOSED reference query (read-only), NOT APPLIED. Source of record for the ELS search metric (traffic_intelligence_law v12 draft).
-- It reads only the engine span that els-search-bridge labels with resources.els_activity; the root and the gate span of the
-- same trace carry no label, so one trace is never counted three times. It is the SQL twin of countElsSearches()
-- (src/lib/research/researchActivityContract2029.js); test/els-activity-e2e.test.mjs asserts the two agree.
--   search_<kind>  one UI search = one distinct search_id (Classic: a group of verify_batch calls), otherwise one page call
--                  that opens a search (no continuation cursor). Interactive origin only.
--   scanner_runs   automatic adaptive-scanner starts. Never an interactive search.
--   verify_calls   single-occurrence verification (els:verify) and verify_batch calls not attributable to a search.
-- Spans written before the label existed have no els_activity and are simply not countable (UNAVAILABLE, not zero).
with engine as (
  select r.trace_id, r.identity_class, s.capability, s.started_at, s.resources->'els_activity' as a
  from public.op_trace_roots r
  join public.op_trace_spans s on s.trace_id = r.trace_id and s.kind = 'db_rpc' and s.resources ? 'els_activity'
  where r.capability like 'els:%' and r.outcome = 'success'
),
typed as (
  select trace_id, identity_class, capability, started_at, a->>'origin' as origin, a->>'search_kind' as kind,
         a->>'search_id' as search_id, coalesce((a->>'search_start')::boolean, false) as search_start
  from engine where a->>'schema' = '1'
),
searches as (
  select coalesce('id:' || search_id, 'trace:' || trace_id::text) as k,
         case when (array_agg(kind order by started_at))[1] in ('regular', 'cross', 'forms') then (array_agg(kind order by started_at))[1] else 'unspecified' end as kind
  from typed
  where origin = 'interactive' and capability <> 'els:verify' and (search_id is not null or (capability = 'els:page' and search_start))
  group by 1
)
select 'search_' || kind as metric, count(*) as n from searches group by kind
union all select 'scanner_runs', count(*) from typed where origin = 'scanner' and search_start
union all select 'verify_calls', count(*) from typed where origin = 'interactive' and (capability = 'els:verify' or (capability = 'els:verify_batch' and search_id is null))
order by 1;
