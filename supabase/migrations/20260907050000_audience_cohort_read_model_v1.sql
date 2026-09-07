-- SITE_WIDE_OBSERVABILITY_SEO_REMEDIATION_V1 (2026-09-07)
-- Audience cohort read-model — EXTEND_EXISTING, no new table/owner.
--
-- ZURIEL's audience-segmentation requirement (added mid-audit, dispatch 2449a551): Product
-- Intelligence needs behavioral/provenance cohorts — Core/Historical, Or-Geula acquired/engaged,
-- Dimension-Five acquired/engaged, cross-surface migration — WITHOUT a new owner/table, and
-- without inferring sensitive religious identity from behavior.
--
-- events.surface already carries "or-geula" and "dim5" as live values (confirmed 2026-09-07:
-- 15.8k / 641 events resp. in a 30-day window), and sod_id/person_id are populated on ~100%/99.9%
-- of rows. So this is a pure read-model VIEW over the existing events table — no new table, no
-- new owner, still under traffic_intelligence_law. It stays behavioral/provenance-only: it buckets
-- WHERE a person's events fell (or-geula surface / dim5 surface / everything else = core), never
-- WHAT the content meant, and it is never joined against identity/PII fields. Do not extend this
-- view to infer religious identity, belief, or affiliation from behavior — it answers "which
-- product surface did this sod_id touch," nothing else.
--
-- Server-only read model (mirrors traffic_daily's own grant posture: no anon/authenticated SELECT).
-- Consumed by admin/Product Intelligence tooling via service_role, same as traffic_daily/events.

create or replace view public.audience_cohort_v1
with (security_invoker = true) as
with bucketed as (
  select
    e.sod_id,
    e.ts,
    case
      when e.surface = 'or-geula' then 'or_geula'
      when e.surface = 'dim5'     then 'dim5'
      else 'core'
    end as cohort_bucket
  from public.events e
  where e.sod_id is not null
    and coalesce(e.is_bot, false) = false
),
agg as (
  select
    sod_id,
    min(ts) as first_seen_ts,
    max(ts) as last_seen_ts,
    count(*) filter (where cohort_bucket = 'core')     as core_events,
    count(*) filter (where cohort_bucket = 'or_geula') as or_geula_events,
    count(*) filter (where cohort_bucket = 'dim5')     as dim5_events,
    min(ts) filter (where cohort_bucket = 'core')     as core_first_ts,
    min(ts) filter (where cohort_bucket = 'or_geula') as or_geula_first_ts,
    min(ts) filter (where cohort_bucket = 'dim5')     as dim5_first_ts
  from bucketed
  group by sod_id
)
select
  sod_id,
  first_seen_ts,
  last_seen_ts,
  core_events,
  or_geula_events,
  dim5_events,
  -- acquisition_surface = which bucket this sod_id's very first recorded event fell into.
  case
    when first_seen_ts = or_geula_first_ts then 'or_geula'
    when first_seen_ts = dim5_first_ts     then 'dim5'
    else 'core'
  end as acquisition_surface,
  (core_events > 0)     as core_engaged,
  (or_geula_events > 0) as or_geula_engaged,
  (dim5_events > 0)     as dim5_engaged,
  -- cross_surface_migrant = touched more than one of the three buckets, ever.
  (
    (core_events > 0)::int + (or_geula_events > 0)::int + (dim5_events > 0)::int
  ) > 1 as cross_surface_migrant
from agg;

comment on view public.audience_cohort_v1 is
  'SITE_WIDE_OBSERVABILITY_SEO_REMEDIATION_V1: behavioral/provenance-based audience cohorts '
  '(Core/Or-Geula/Dim5 + cross-surface migration), derived from events.surface + sod_id. '
  'Extends existing Traffic Intelligence (traffic_intelligence_law) — not a new owner. '
  'Never join against identity/PII to infer religious identity or belief.';

revoke all on public.audience_cohort_v1 from anon, authenticated;
grant select on public.audience_cohort_v1 to service_role;
