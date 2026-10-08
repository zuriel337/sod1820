-- G4_KPI_FUNNEL_AGGREGATION_V1
-- Turns the existing append-only events/subscribers sources into bounded, idempotent
-- daily projections.  No event trigger is introduced: refresh cost stays off ingest.

alter table public.daily_kpi enable row level security;
alter table public.journey_funnel_daily enable row level security;

revoke all on table public.daily_kpi from public, anon, authenticated;
revoke all on table public.journey_funnel_daily from public, anon, authenticated;
grant select, insert, update, delete on table public.daily_kpi to service_role;
grant select, insert, update, delete on table public.journey_funnel_daily to service_role;

create or replace function public.refresh_daily_kpi(
  p_from date default ((now() at time zone 'Asia/Jerusalem')::date - 1),
  p_to date default (now() at time zone 'Asia/Jerusalem')::date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_from date := least(coalesce(p_from, current_date), coalesce(p_to, current_date));
  v_to date := greatest(coalesce(p_from, current_date), coalesce(p_to, current_date));
  v_rows integer := 0;
begin
  if v_to - v_from > 120 then
    raise exception 'daily_kpi refresh is limited to 121 days';
  end if;

  with days as (
    select generate_series(v_from, v_to, interval '1 day')::date as day
  ),
  clean as (
    select session_id
    from public.fn_ti_clean_classification(v_from, v_to)
    where clean_eligible
  ),
  scoped as (
    select
      (e.ts at time zone 'Asia/Jerusalem')::date as day,
      e.ts,
      e.session_id,
      e.person_id,
      nullif(e.sod_id, '') as sod_id,
      coalesce(e.person_id::text, nullif(e.sod_id, '')) as person_key,
      e.surface,
      e.event_type
    from public.events e
    join clean c using (session_id)
    where e.ts >= (v_from::timestamp at time zone 'Asia/Jerusalem')
      and e.ts < ((v_to + 1)::timestamp at time zone 'Asia/Jerusalem')
  ),
  people_day as (
    select day, person_key, min(ts) as first_event_at,
           bool_or(person_id is not null) as has_person
    from scoped
    where person_key is not null
    group by day, person_key
  ),
  classified_people as (
    select p.*,
      case
        when p.has_person then coalesce(per.first_seen, per.created_at, p.first_event_at)
        else (
          select min(e0.ts) from public.events e0
          where e0.sod_id = p.person_key and e0.ts <= p.first_event_at
        )
      end as first_seen_at,
      coalesce(per.account_user_id is not null, false) as has_account
    from people_day p
    left join public.persons per
      on p.has_person and per.person_id::text = p.person_key
  ),
  event_rollup as (
    select day,
      count(*) filter (where surface = 'page' and event_type = 'view')::integer as pageviews
    from scoped
    group by day
  ),
  person_rollup as (
    select day,
      count(*)::integer as human_visitors,
      count(*) filter (
        where (first_seen_at at time zone 'Asia/Jerusalem')::date = day
      )::integer as new_visitors,
      count(*) filter (
        where (first_seen_at at time zone 'Asia/Jerusalem')::date < day
      )::integer as returning_visitors,
      count(*) filter (where has_account)::integer as identified
    from classified_people
    group by day
  ),
  push_rollup as (
    select (created_at at time zone 'Asia/Jerusalem')::date as day,
           count(*)::integer as push_subs
    from public.push_subscriptions
    where created_at >= (v_from::timestamp at time zone 'Asia/Jerusalem')
      and created_at < ((v_to + 1)::timestamp at time zone 'Asia/Jerusalem')
    group by 1
  )
  insert into public.daily_kpi
    (day, human_visitors, new_visitors, returning_visitors, pageviews,
     pv_per_visitor, push_subs, identified, computed_at)
  select d.day,
    coalesce(p.human_visitors, 0),
    coalesce(p.new_visitors, 0),
    coalesce(p.returning_visitors, 0),
    coalesce(e.pageviews, 0),
    round(coalesce(e.pageviews, 0)::numeric / nullif(p.human_visitors, 0), 2),
    coalesce(ps.push_subs, 0),
    coalesce(p.identified, 0),
    now()
  from days d
  left join person_rollup p using (day)
  left join event_rollup e using (day)
  left join push_rollup ps using (day)
  on conflict (day) do update set
    human_visitors = excluded.human_visitors,
    new_visitors = excluded.new_visitors,
    returning_visitors = excluded.returning_visitors,
    pageviews = excluded.pageviews,
    pv_per_visitor = excluded.pv_per_visitor,
    push_subs = excluded.push_subs,
    identified = excluded.identified,
    computed_at = excluded.computed_at;

  get diagnostics v_rows = row_count;
  return v_rows;
end
$function$;

create or replace function public.refresh_journey_funnel_daily(
  p_from date default ((now() at time zone 'Asia/Jerusalem')::date - 1),
  p_to date default (now() at time zone 'Asia/Jerusalem')::date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_from date := least(coalesce(p_from, current_date), coalesce(p_to, current_date));
  v_to date := greatest(coalesce(p_from, current_date), coalesce(p_to, current_date));
  v_rows integer := 0;
begin
  if v_to - v_from > 120 then
    raise exception 'journey funnel refresh is limited to 121 days';
  end if;

  -- Recompute the requested window as a whole so removed/renamed source events cannot
  -- leave stale rows behind.  The delete + insert is atomic inside this function call.
  delete from public.journey_funnel_daily
  where day between v_from and v_to;

  with clean as (
    select session_id
    from public.fn_ti_clean_classification(v_from, v_to)
    where clean_eligible
  ),
  raw as (
    select
      (e.ts at time zone 'Asia/Jerusalem')::date as day,
      e.ts,
      coalesce(e.person_id::text, nullif(e.sod_id, ''), nullif(e.session_id, '')) as person_key,
      e.path,
      e.surface,
      e.event_type,
      coalesce(e.props, '{}'::jsonb) as props
    from public.events e
    join clean c using (session_id)
    where e.ts >= (v_from::timestamp at time zone 'Asia/Jerusalem')
      and e.ts < ((v_to + 1)::timestamp at time zone 'Asia/Jerusalem')
  ),
  campaign_events as (
    select day, ts, person_key,
      coalesce(
        nullif(props->>'campaign', ''),
        nullif(props->>'slug', ''),
        case path
          when '/early-access' then 'early-access-2029'
          when '/melech-hamisparim/718' then 'tiktok-melech-hamisparim'
        end,
        nullif(regexp_replace(coalesce(path, ''), '^/+', ''), ''),
        'unknown'
      ) as segment,
      case
        when surface = 'campaign_landing'
          and event_type in ('landing_view', 'view') then 'landing_view'
        when event_type = 'engagement'
          and coalesce((case when (props->>'engaged_ms') ~ '^[0-9]+$' then (props->>'engaged_ms')::bigint end), 0) >= 10000
          and path in ('/early-access', '/melech-hamisparim/718') then 'engaged'
        when surface = 'campaign_landing'
          and event_type in ('email_signup', 'signup') then 'email_signup'
        when (surface = 'campaign_landing' and event_type in ('whatsapp_click', 'whatsapp_join'))
          or (surface = 'join' and event_type = 'click' and props->>'slug' = 'whatsapp-group')
          then 'whatsapp_click'
        when surface = 'campaign_landing' and event_type = 'returned' then 'returned'
        else null
      end as stage
    from raw
  ),
  subscriber_events as (
    select
      (s.created_at at time zone 'Asia/Jerusalem')::date as day,
      s.created_at as ts,
      coalesce(nullif(s.acquisition->>'visitor_id', ''), 'subscriber:' || s.id::text) as person_key,
      coalesce(
        nullif(s.acquisition#>>'{signup_touch,utm,utm_campaign}', ''),
        case s.acquisition#>>'{signup_touch,path}'
          when '/early-access' then 'early-access-2029'
          when '/melech-hamisparim/718' then 'tiktok-melech-hamisparim'
        end,
        nullif(regexp_replace(coalesce(s.acquisition#>>'{signup_touch,path}', ''), '^/+', ''), ''),
        nullif(s.source, ''),
        'unknown'
      ) as segment,
      'email_signup'::text as stage
    from public.subscribers s
    where s.created_at >= (v_from::timestamp at time zone 'Asia/Jerusalem')
      and s.created_at < ((v_to + 1)::timestamp at time zone 'Asia/Jerusalem')
  ),
  canonical as (
    select day, ts, person_key, segment, stage
    from campaign_events where stage is not null and person_key is not null
    union all
    select day, ts, person_key, segment, stage from subscriber_events
  ),
  deduped as (
    select day, person_key, stage,
      (array_agg(segment order by ts desc))[1] as segment
    from canonical
    group by day, person_key, stage
  ),
  segmented as (
    select day, stage, segment, count(*)::integer as people
    from deduped
    where segment <> 'all'
    group by day, stage, segment
  ),
  totals as (
    select day, stage, 'all'::text as segment, count(distinct person_key)::integer as people
    from deduped
    group by day, stage
  )
  insert into public.journey_funnel_daily(day, stage, segment, people)
  select day, stage, segment, people from segmented
  union all
  select day, stage, segment, people from totals
  on conflict (day, stage, segment) do update set people = excluded.people;

  get diagnostics v_rows = row_count;
  return v_rows;
end
$function$;

revoke execute on function public.refresh_daily_kpi(date, date) from public, anon, authenticated;
revoke execute on function public.refresh_journey_funnel_daily(date, date) from public, anon, authenticated;
grant execute on function public.refresh_daily_kpi(date, date) to service_role;
grant execute on function public.refresh_journey_funnel_daily(date, date) to service_role;

create or replace function public.admin_g4_funnel(
  p_from date default ((now() at time zone 'Asia/Jerusalem')::date - 7),
  p_to date default (now() at time zone 'Asia/Jerusalem')::date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not public.rd_is_admin() then
    raise exception 'not authorized';
  end if;
  if greatest(p_from, p_to) - least(p_from, p_to) > 120 then
    raise exception 'admin funnel read is limited to 121 days';
  end if;

  return jsonb_build_object(
    'from', least(p_from, p_to),
    'to', greatest(p_from, p_to),
    'fresh_through', (select max(computed_at) from public.daily_kpi),
    'daily_kpi', coalesce((
      select jsonb_agg(to_jsonb(k) order by k.day)
      from public.daily_kpi k
      where k.day between least(p_from, p_to) and greatest(p_from, p_to)
    ), '[]'::jsonb),
    'funnel', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.day, f.stage, f.segment)
      from public.journey_funnel_daily f
      where f.day between least(p_from, p_to) and greatest(p_from, p_to)
    ), '[]'::jsonb)
  );
end
$function$;

revoke execute on function public.admin_g4_funnel(date, date) from public, anon;
grant execute on function public.admin_g4_funnel(date, date) to authenticated, service_role;

-- pg_cron is already available on hosted Supabase.  Keep names stable so migration
-- replay replaces the schedules instead of multiplying jobs.
do $block$
declare v_job bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into v_job from cron.job where jobname = 'g4-kpi-funnel-hourly' limit 1;
    if v_job is not null then perform cron.unschedule(v_job); end if;
    perform cron.schedule(
      'g4-kpi-funnel-hourly',
      '7 * * * *',
      $cron$select public.refresh_daily_kpi(((now() at time zone 'Asia/Jerusalem')::date - 1), (now() at time zone 'Asia/Jerusalem')::date); select public.refresh_journey_funnel_daily(((now() at time zone 'Asia/Jerusalem')::date - 1), (now() at time zone 'Asia/Jerusalem')::date);$cron$
    );

    v_job := null;
    select jobid into v_job from cron.job where jobname = 'g4-kpi-funnel-nightly-reconcile' limit 1;
    if v_job is not null then perform cron.unschedule(v_job); end if;
    perform cron.schedule(
      'g4-kpi-funnel-nightly-reconcile',
      '23 1 * * *',
      $cron$select public.refresh_daily_kpi(((now() at time zone 'Asia/Jerusalem')::date - 7), (now() at time zone 'Asia/Jerusalem')::date); select public.refresh_journey_funnel_daily(((now() at time zone 'Asia/Jerusalem')::date - 7), (now() at time zone 'Asia/Jerusalem')::date);$cron$
    );
  end if;
end
$block$;

-- One bounded bootstrap.  Subsequent executions are idempotent.
select public.refresh_daily_kpi(
  ((now() at time zone 'Asia/Jerusalem')::date - 30),
  (now() at time zone 'Asia/Jerusalem')::date
);
select public.refresh_journey_funnel_daily(
  ((now() at time zone 'Asia/Jerusalem')::date - 30),
  (now() at time zone 'Asia/Jerusalem')::date
);
