-- ANONYMOUS_IDENTITY_UNIFICATION_AUDIT — reproducibility script.
-- Every query here is copy-pasted verbatim from the queries actually run live
-- against project linswmnnkjxvweumprav on 2026-09-03 to produce the headline
-- 30-day numbers (76% / 96% unlinked) in the audit report. Read-only
-- (SELECT/EXPLAIN only) — safe to re-run any time to check drift.
--
-- Run these as service-role/postgres (matches how the audit ran them — no RLS
-- surprises). Each block is independent; run them separately.

-- ── 1) Top-level population sizes (30d + lifetime) ──────────────────────────
select 'events_30d' as src, count(*) n, count(distinct sod_id) distinct_sod_id, count(distinct session_id) distinct_session, count(distinct person_id) distinct_person
from public.events where ts >= now() - interval '30 days'
union all
select 'visitor_events_30d', count(*), count(distinct visitor_id), null, null
from public.visitor_events where created_at >= now() - interval '30 days'
union all
select 'identity_edges_total', count(*), count(distinct sod_id), null, count(distinct person_id)
from public.identity_edges
union all
select 'persons_total', count(*), null, null, count(distinct person_id)
from public.persons
union all
select 'site_visits_30d', count(*), count(distinct visitor), null, null
from public.site_visits where ts >= now() - interval '30 days'
union all
select 'journey_ab_log_30d', count(*), count(distinct visitor_id), null, null
from public.journey_ab_log where created_at >= now() - interval '30 days';

-- ── 2) visitor_events split: post_exp (sod_id-namespace) vs generic (sod_vid-namespace) ──
select
  (section='post_exp') as is_post_exp_sodid_namespace,
  count(*) n, count(distinct visitor_id) distinct_visitors
from public.visitor_events
where created_at >= now() - interval '30 days'
group by 1;

-- ── 3) THE headline number: bridging coverage for "generic" (sod_vid-namespace) ──
-- visitor_events.visitor_id (story_open/story_view/search/cross_search/compute/share/
-- research/journey-old/whatsapp-join — everything NOT post_exp) over the last 30 days.
-- Result on 2026-09-03: total_generic_vids=40410, bridged_via_legacy_seed=378 (0.9%),
-- directly_equals_a_sod_id=9222 (22.8%) → unlinked ≈ 40410-378-9222 = 30810 (~76.2%).
with generic_vids as (
  select distinct visitor_id from public.visitor_events
  where created_at >= now() - interval '30 days' and section is distinct from 'post_exp'
)
select
  count(*) as total_generic_vids,
  count(*) filter (where exists (
    select 1 from public.identity_edges ie where ie.legacy_id = g.visitor_id and ie.kind='legacy_seed'
  )) as bridged_via_legacy_seed,
  count(*) filter (where exists (
    select 1 from public.events e where e.sod_id = g.visitor_id
  )) as directly_equals_a_sod_id
from generic_vids g;

-- ── 4) Same check for site_visits.visitor (the "sod_visitor" namespace, visits.js) ──
-- Result on 2026-09-03: total=39978, bridged=1230 (3.1%), coincidental=374 (0.9%)
-- → unlinked ≈ 96%.
with sv as (
  select distinct visitor from public.site_visits where ts >= now() - interval '30 days'
)
select
  count(*) as total_site_visits_visitors,
  count(*) filter (where exists (select 1 from public.identity_edges ie where ie.legacy_id = sv.visitor and ie.kind='legacy_seed')) as bridged_via_legacy_seed,
  count(*) filter (where exists (select 1 from public.events e where e.sod_id = sv.visitor)) as directly_equals_a_sod_id
from sv;

-- ── 5) Same check for journey_ab_log.visitor_id (the "sod_visitor_id" namespace, old JourneyPage) ──
-- Result on 2026-09-03: total=14, bridged=8 (57%), coincidental=0 → unlinked=6 (43%).
-- Note the tiny population (14 visitors/30d) — this old page is barely used;
-- JourneyPageV2 already uses events/sod_id correctly and is not part of this gap.
with j as (
  select distinct visitor_id from public.journey_ab_log where created_at >= now() - interval '30 days'
)
select
  count(*) as total_journey_ab_visitors,
  count(*) filter (where exists (select 1 from public.identity_edges ie where ie.legacy_id = j.visitor_id and ie.kind='legacy_seed')) as bridged_via_legacy_seed,
  count(*) filter (where exists (select 1 from public.events e where e.sod_id = j.visitor_id)) as directly_equals_a_sod_id
from j;

-- ── 6) identity_edges kind breakdown (shows 'device' — resolve_person's own sod_id→
--       person_id edge — dominates; 'legacy_seed' is a small minority; 'login' tiny) ──
select kind, count(*) from public.identity_edges group by kind order by 2 desc;
