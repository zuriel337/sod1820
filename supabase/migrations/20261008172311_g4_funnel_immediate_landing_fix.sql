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

  with raw as (
    select
      (e.ts at time zone 'Asia/Jerusalem')::date as day,
      e.ts,
      coalesce(e.person_id::text, nullif(e.sod_id, ''), nullif(e.session_id, '')) as person_key,
      e.path,
      e.surface,
      e.event_type,
      coalesce(e.props, '{}'::jsonb) as props
    from public.events e
    where not e.is_bot
      and e.ts >= (v_from::timestamp at time zone 'Asia/Jerusalem')
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


revoke execute on function public.refresh_journey_funnel_daily(date, date) from public, anon, authenticated;
grant execute on function public.refresh_journey_funnel_daily(date, date) to service_role;

select public.refresh_journey_funnel_daily(
  ((now() at time zone 'Asia/Jerusalem')::date - 30),
  (now() at time zone 'Asia/Jerusalem')::date
);

