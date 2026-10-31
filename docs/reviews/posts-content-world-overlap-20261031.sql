-- READ ONLY. Diagnostic audience overlap over the EXISTING events pipeline.
-- One event stream only: do not UNION visitor_events and double-count dual writes.
-- Fixed audit window; change only window_end for a fresh replay. Times are UTC.
-- No identifiers, private content or inferred person labels leave the query.
-- is_bot=false is the stored event filter, NOT a fresh human-verification claim.
-- Current Post membership is NOT an as-of-event historical classification.
with params as (
  select timestamptz '2026-10-31 08:20:52.235267+00' as window_end
), public_dim5 as (
  select id,slug from public.posts
  where author='בדרך לנצח'
    and categories @> array['מימד חמש']::text[]
    and not(coalesce(tags,'{}'::text[]) && array['טיוטה','פורום']::text[])
), measured as (
  select e.surface,e.event_type,e.props,
    case when e.person_id is not null then 'person:'||e.person_id::text
      when nullif(e.sod_id,'') is not null then 'browser:'||e.sod_id
      else null end as actor,
    e.person_id is null as browser_only,
    exists(select 1 from public_dim5 p where p.slug=e.props->>'slug'
      and (e.surface<>'post' or e.props->>'source_ref'='posts:'||p.id::text)) as current_series_match
  from public.events e cross join params
  where e.ts>=params.window_end-interval '30 days' and e.ts<params.window_end
    and e.is_bot is false
    and e.surface in ('or-geula','dim5','post','posts')
), signals as (
  select *,
    surface='or-geula' and event_type in ('story_open','play') as or_geula_open,
    surface='dim5' and event_type='click' as legacy_dim5_click,
    (
      surface='dim5' and event_type='click' and current_series_match
      or surface='post' and event_type='open' and current_series_match
        and props->'content_series' @> '["dimension-five"]'::jsonb
      or surface='posts' and event_type='open' and props->>'slug'='series:dimension-five'
        and props->'content_series' @> '["dimension-five"]'::jsonb
        and exists(select 1 from public_dim5)
    ) as current_series_entry
  from measured
), actors as (
  select actor,bool_or(or_geula_open) as or_geula,
    bool_or(legacy_dim5_click) as legacy_dim5,
    bool_or(current_series_entry) as current_dim5
  from signals where actor is not null group by actor
)
select jsonb_build_object(
  'window',jsonb_build_object('from_utc',window_end-interval '30 days','to_utc',window_end,
    'project_timezone','Asia/Jerusalem'),
  'unit','distinct existing linked measurement identity; browser identity only as fallback; not verified accounts',
  'legacy_feed_overlap',(select jsonb_build_object(
    'dim5_activity_only_observed',count(*) filter(where legacy_dim5 and not or_geula),
    'or_geula_activity_only_observed',count(*) filter(where or_geula and not legacy_dim5),
    'both_observed',count(*) filter(where legacy_dim5 and or_geula),
    'any_observed',count(*) filter(where legacy_dim5 or or_geula)) from actors),
  'current_public_series_overlap',(select jsonb_build_object(
    'dim5_activity_only_observed',count(*) filter(where current_dim5 and not or_geula),
    'or_geula_activity_only_observed',count(*) filter(where or_geula and not current_dim5),
    'both_observed',count(*) filter(where current_dim5 and or_geula),
    'any_observed',count(*) filter(where current_dim5 or or_geula)) from actors),
  'coverage',(select jsonb_build_object(
    'legacy_dim5_click_events',count(*) filter(where legacy_dim5_click),
    'legacy_dim5_clicks_matching_current_series',count(*) filter(where legacy_dim5_click and current_series_match),
    'legacy_dim5_membership_unresolved_events',count(*) filter(where legacy_dim5_click and not current_series_match),
    'post_route_open_events',count(*) filter(where surface='post' and event_type='open'),
    'series_catalog_open_events',count(*) filter(where surface='posts' and event_type='open'),
    'positive_events_without_identity',count(*) filter(where (or_geula_open or legacy_dim5_click or current_series_entry) and actor is null),
    'positive_events_with_browser_fallback',count(*) filter(where (or_geula_open or legacy_dim5_click or current_series_entry) and browser_only and actor is not null)) from signals),
  'limits',jsonb_build_array(
    'Opening/clicking is not confirmed reading, preference, Follow or delivery consent.',
    'Not observed in another world is not disinterest; other surfaces and failed/blocked telemetry are not measured.',
    'Impressions, automatic story_view, feed_view and lifecycle events are excluded from positive entries.',
    'Repeated opens and legacy play/story_open pairs count once per measurement identity in each set.',
    'Legacy slug mapping uses current public metadata; no historical membership snapshot is invented.',
    'No affinity weights, audience store, person labels, model calls, subscribers or live event writes.')
) as audience_evidence
from params;
