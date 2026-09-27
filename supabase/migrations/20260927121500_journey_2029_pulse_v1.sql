-- Journey 2029 Pulse v1
-- OWNER CHECK=EXTEND_EXISTING: redefine the existing public.journey_pulse() projection only.
-- Legacy keys stay backward-compatible for the transitional JourneyPageV2.
-- New 2029 fields read ONLY events.surface='journey_2029' + event_type='start'.
-- No new analytics table/store. No Legacy Journey data enters the 2029 metric.

create or replace function public.journey_pulse()
returns jsonb
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $function$
  with
  tz as (
    select timezone('Asia/Jerusalem', now()) as now_il
  ),
  starts_today_raw as (
    select
      coalesce(
        nullif(e.person_id::text, ''),
        nullif(e.sod_id, ''),
        nullif(e.session_id, '')
      ) as actor_key,
      coalesce(
        nullif(e.props->>'journey_instance', ''),
        nullif(e.journey_id, ''),
        concat_ws(
          ':',
          coalesce(e.session_id, 'session'),
          coalesce(e.props->>'journey_kind', 'general_research'),
          coalesce(e.props->>'journey_mode', 'organic'),
          coalesce(e.props->>'source_surface', 'unknown'),
          coalesce(e.props->>'root_type', 'unknown')
        )
      ) as journey_key,
      coalesce(nullif(e.props->>'journey_kind', ''), 'general_research') as journey_kind
    from public.events e, tz
    where e.surface = 'journey_2029'
      and e.event_type = 'start'
      and coalesce(e.is_bot, false) = false
      and public.fn_ti_report_day(e.ts) = tz.now_il::date
  ),
  starts_today as (
    select distinct actor_key, journey_key, journey_kind
    from starts_today_raw
    where actor_key is not null
      and journey_key is not null
  ),
  starts_7d_raw as (
    select
      coalesce(
        nullif(e.person_id::text, ''),
        nullif(e.sod_id, ''),
        nullif(e.session_id, '')
      ) as actor_key,
      public.fn_ti_report_day(e.ts) as report_day,
      coalesce(
        nullif(e.props->>'journey_instance', ''),
        nullif(e.journey_id, ''),
        concat_ws(
          ':',
          coalesce(e.session_id, 'session'),
          coalesce(e.props->>'journey_kind', 'general_research'),
          coalesce(e.props->>'journey_mode', 'organic'),
          coalesce(e.props->>'source_surface', 'unknown'),
          coalesce(e.props->>'root_type', 'unknown')
        )
      ) as journey_key
    from public.events e, tz
    where e.surface = 'journey_2029'
      and e.event_type = 'start'
      and coalesce(e.is_bot, false) = false
      and public.fn_ti_report_day(e.ts) between (tz.now_il::date - 6) and tz.now_il::date
  ),
  starts_7d as (
    select distinct actor_key, report_day, journey_key
    from starts_7d_raw
    where actor_key is not null
      and journey_key is not null
  ),
  kind_counts as (
    select journey_kind, count(*)::bigint as n
    from starts_today
    group by journey_kind
  )
  select jsonb_build_object(
    -- Transitional Legacy JourneyPageV2 compatibility fields. These are NOT Journey 2029 metrics.
    'researchers_today', (
      select count(distinct ve.visitor_id)
      from public.visitor_events ve, tz
      where ve.section in ('number','journey')
        and ve.created_at >= now() - interval '30 hours'
        and timezone('Asia/Jerusalem', ve.created_at)::date = tz.now_il::date
    ),
    'journeys_today', (
      select count(*)
      from public.events e, tz
      where e.surface='journey'
        and e.event_type='start'
        and coalesce(e.is_bot, false)=false
        and e.ts >= now() - interval '30 hours'
        and timezone('Asia/Jerusalem', e.ts)::date = tz.now_il::date
    ),
    'recent_numbers', (
      select coalesce(jsonb_agg(r.slug order by r.mx desc), '[]'::jsonb)
      from (
        select ve.slug, max(ve.created_at) as mx
        from public.visitor_events ve
        where ve.section='number'
          and ve.slug ~ '^[0-9]{2,5}$'
          and ve.created_at >= now() - interval '4 hours'
        group by ve.slug
        order by mx desc
        limit 10
      ) r
    ),

    -- Canonical Journey 2029 public aggregate.
    'journey_2029_people_today', (
      select count(distinct actor_key) from starts_today
    ),
    'journey_2029_starts_today', (
      select count(*) from starts_today
    ),
    'journey_2029_starts_7d', (
      select count(*) from starts_7d
    ),
    'journey_2029_by_kind_today', (
      select coalesce(jsonb_object_agg(journey_kind, n), '{}'::jsonb)
      from kind_counts
    )
  );
$function$;

comment on function public.journey_pulse() is
  'Journey Pulse aggregate. Legacy fields remain transitional; Journey 2029 fields count only deduped journey_2029/start events using canonical Traffic reporting day. Returns counts only; never returns search/person/private payload.';

-- SECURITY DEFINER public API: explicit least-privilege execution surface.
revoke all on function public.journey_pulse() from public;
grant execute on function public.journey_pulse() to anon, authenticated, service_role;
