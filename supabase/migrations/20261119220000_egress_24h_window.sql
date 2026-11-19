-- P0: proposed correction of the existing Egress readers. NOT APPLIED to any shared DB.
-- ZURIEL authorized branch/PR preparation only; Work acceptance and separate SQL approval remain required.
begin;
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='public.admin_system_health()'::regprocedure) <> 'ef8336c67f7bae8c1176699805c1c2c6'
    or (select md5(prosrc) from pg_proc where oid='public.fn_health_watch()'::regprocedure) <> '29e12793ac2afb89b5948c816b1d645f'
    or to_regprocedure('public.fn_storage_egress_observed_24h(timestamptz)') is not null then
    raise exception 'EGRESS_24H_SOURCE_DRIFT';
  end if;
end $guard$;

-- One shared read projection over the existing hourly cache. No new collector/store.
create or replace function public.fn_storage_egress_observed_24h(p_at timestamptz default now())
returns jsonb language sql stable security invoker set search_path = public, pg_temp
as $function$
with bounds as (
  select date_trunc('hour', p_at at time zone 'UTC') at time zone 'UTC' as until
), hours as (
  select h as window_start, h + interval '1 hour' as window_end
  from bounds, lateral generate_series(until - interval '24 hours', until - interval '1 hour', interval '1 hour') h
), parsed as materialized (
  select c.cache_key, c.computed_at, c.payload,
    case when c.payload->>'window_start' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:00:00Z$'
      and pg_input_is_valid(c.payload->>'window_start', 'timestamp with time zone')
      then (c.payload->>'window_start')::timestamptz end as window_start
  from public.analytics_cache c
  where c.cache_key like 'infra_egress_hour:%'
    and c.producer = 'traffic_intelligence_law' and c.producer_version = 'v11'
    and c.payload->>'basis' = 'OBSERVED_STORAGE_LOGS'
    and c.invalidated_at is null
), candidates as materialized (
  select p.*, p.window_start + interval '1 hour' as window_end,
    row_number() over (partition by p.window_start order by p.computed_at desc nulls last, p.cache_key desc) as revision
  from parsed p cross join bounds
  where p.payload->>'window_start' = to_char(p.window_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:00:00"Z"')
    and p.payload->>'window_end' = to_char((p.window_start + interval '1 hour') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:00:00"Z"')
    and p.window_start + interval '1 hour' <= until
), all_observations as materialized (
  select *,
    case when jsonb_typeof(payload->'storage_get_bytes') = 'number'
      and payload->>'storage_get_bytes' ~ '^[0-9]{1,30}$'
      and coalesce(payload#>>'{coverage,source_status}', 'AVAILABLE') = 'AVAILABLE'
      then (payload->>'storage_get_bytes')::numeric end as bytes,
    case when payload#>>'{traffic_classes,bot_share}' ~ '^(0(\.[0-9]+)?|1(\.0+)?)$'
      then (payload#>>'{traffic_classes,bot_share}')::numeric end as bot_share,
    coalesce(payload#>>'{coverage,missing_or_invalid_content_length_requests}', '0') <> '0' as partial_hour
  from candidates where revision = 1
), observations as materialized (
  -- Only the day total/history is window-limited. Sensor age must survive an outage >24h.
  select o.* from all_observations o join hours h using (window_start, window_end)
), totals as (
  select count(bytes)::int as observed_hours, sum(bytes) as observed_bytes,
    count(*) filter (where bytes is not null and partial_hour)::int as partial_hours
  from observations
), coverage as (
  select *, case when observed_hours = 0 then 'NO_DATA'
    when observed_hours = 24 and partial_hours = 0 then 'COMPLETE' else 'PARTIAL' end as status
  from totals
), latest as (
  select * from all_observations where bytes is not null order by window_end desc limit 1
)
select jsonb_build_object(
  'storage_egress_observed_basis', 'OBSERVED_STORAGE_LOGS',
  'storage_egress_observed_latest', (select payload from latest),
  'storage_egress_observed_latest_at', (select window_end from latest),
  'storage_egress_observed_latest_computed_at', (select computed_at from latest),
  -- Keep the old full-day field truthful for consumers that have not adopted coverage.
  'storage_egress_observed_24h_bytes', case when status = 'COMPLETE' then observed_bytes end,
  'storage_egress_observed_24h_observed_bytes', observed_bytes,
  'storage_egress_observed_24h_coverage', jsonb_build_object(
    'window_start', until - interval '24 hours', 'window_end', until,
    'observed_hours', observed_hours, 'required_hours', 24,
    'missing_hours', 24 - observed_hours, 'partial_hours', partial_hours, 'status', status,
    'missing_windows', (select coalesce(jsonb_agg(h.window_start order by h.window_start), '[]'::jsonb)
      from hours h where not exists (select 1 from observations o where o.window_start=h.window_start and o.bytes is not null))
  ),
  'storage_egress_observed_history_24h', (select coalesce(jsonb_agg(jsonb_build_object(
    'at', window_end, 'window_start', window_start, 'window_end', window_end,
    'bytes', bytes, 'bot_share', bot_share,
    'largest_get_bytes', payload#>'{risk,largest_observed_single_get_bytes}',
    'burst_files', payload#>'{risk,simultaneous_mp4_burst_files}'
  ) order by window_start), '[]'::jsonb) from observations where bytes is not null),
  'storage_egress_guard', jsonb_build_object(
    'warn_hour_bytes', 100 * 1024 * 1024, 'critical_hour_bytes', 500 * 1024 * 1024,
    'warn_24h_bytes', 2::bigint * 1024 * 1024 * 1024, 'critical_24h_bytes', 5::bigint * 1024 * 1024 * 1024,
    'warn_bot_share', 0.50,
    'state', case
      when (select window_end from latest) < p_at - interval '2 hours' then 'STALE'
      when observed_hours = 0 then 'NO_HOURLY_DATA'
      when (select bytes from latest) >= 500 * 1024 * 1024 or observed_bytes >= 5::bigint * 1024 * 1024 * 1024 then 'CRITICAL'
      when (select bytes from latest) >= 100 * 1024 * 1024 or observed_bytes >= 2::bigint * 1024 * 1024 * 1024
        or (select bot_share >= 0.50 and bytes >= 50 * 1024 * 1024 from latest) then 'WARN'
      when status <> 'COMPLETE' then 'PARTIAL' else 'OK' end
  )
)
from coverage cross join bounds;
$function$;
revoke all on function public.fn_storage_egress_observed_24h(timestamptz) from public, anon, authenticated, service_role;
comment on function public.fn_storage_egress_observed_24h(timestamptz) is
  'Internal shared projection for admin_system_health and fn_health_watch: 24 completed UTC windows, one cache revision per hour, explicit coverage; OBSERVED Storage only, never provider billing.';

do $patch$
declare a text := pg_get_functiondef('public.admin_system_health()'::regprocedure);
  w text := pg_get_functiondef('public.fn_health_watch()'::regprocedure);
begin
  a := replace(a, $old$      'storage_egress_observed_latest', (
        select payload
        from public.analytics_cache
        where cache_key like 'infra_egress_hour:%'
           or cache_key like 'infra_egress_observed:%'
        order by computed_at desc
        limit 1
      ),
      'storage_egress_observed_latest_at', (
        select computed_at
        from public.analytics_cache
        where cache_key like 'infra_egress_hour:%'
           or cache_key like 'infra_egress_observed:%'
        order by computed_at desc
        limit 1
      ),
      'storage_egress_observed_24h_bytes', (
        select nullif(sum((payload ->> 'storage_get_bytes')::numeric),0)
        from public.analytics_cache
        where cache_key like 'infra_egress_hour:%'
          and computed_at > now() - interval '24 hours'
      ),
      'storage_egress_observed_history_24h', (
        select coalesce(jsonb_agg(x order by x ->> 'at'), '[]'::jsonb)
        from (
          select jsonb_build_object(
            'at', computed_at,
            'bytes', coalesce((payload ->> 'storage_get_bytes')::numeric,0),
            'bot_share', coalesce((payload #>> '{traffic_classes,bot_share}')::numeric,0),
            'largest_get_bytes', coalesce((payload #>> '{risk,largest_observed_single_get_bytes}')::numeric,0),
            'burst_files', coalesce((payload #>> '{risk,simultaneous_mp4_burst_files}')::numeric,0)
          ) x
          from public.analytics_cache
          where cache_key like 'infra_egress_hour:%'
            and computed_at > now() - interval '24 hours'
          order by computed_at desc
          limit 24
        ) h
      ),
      'storage_egress_observed_basis', 'OBSERVED_STORAGE_LOGS',
$old$, $new$$new$);
  a := replace(a, $old$      'storage_egress_guard', jsonb_build_object(
        'warn_hour_bytes', 100 * 1024 * 1024,
        'critical_hour_bytes', 500 * 1024 * 1024,
        'warn_24h_bytes', 2::bigint * 1024 * 1024 * 1024,
        'critical_24h_bytes', 5::bigint * 1024 * 1024 * 1024,
        'warn_bot_share', 0.50,
        'state', (
          with latest as (
            select computed_at,
                   coalesce((payload ->> 'storage_get_bytes')::numeric,0) as hour_bytes,
                   coalesce((payload #>> '{traffic_classes,bot_share}')::numeric,0) as bot_share
            from public.analytics_cache
            where cache_key like 'infra_egress_hour:%'
            order by computed_at desc
            limit 1
          ), day24 as (
            select coalesce(sum((payload ->> 'storage_get_bytes')::numeric),0) as bytes
            from public.analytics_cache
            where cache_key like 'infra_egress_hour:%'
              and computed_at > now() - interval '24 hours'
          )
          select case
            when latest.computed_at is null then 'NO_HOURLY_DATA'
            when latest.computed_at < now() - interval '2 hours' then 'STALE'
            when latest.hour_bytes >= 500 * 1024 * 1024 or day24.bytes >= 5::bigint * 1024 * 1024 * 1024 then 'CRITICAL'
            when latest.hour_bytes >= 100 * 1024 * 1024 or day24.bytes >= 2::bigint * 1024 * 1024 * 1024
              or (latest.bot_share >= 0.50 and latest.hour_bytes >= 50 * 1024 * 1024) then 'WARN'
            else 'OK'
          end
          from latest cross join day24
        )
      ),
$old$, $new$$new$);
  a := replace(a, $old$    ) into v_usage;$old$, $new$    ) into v_usage;
    v_usage := v_usage || public.fn_storage_egress_observed_24h();$new$);
  w := replace(w, $old$  v_egress_latest_at timestamptz;$old$, $new$  v_egress jsonb;
  v_egress_latest_at timestamptz;$new$);
  w := replace(w, $old$    select computed_at,
           coalesce((payload ->> 'storage_get_bytes')::numeric,0),
           coalesce((payload #>> '{traffic_classes,bot_share}')::numeric,0)
    into v_egress_latest_at, v_egress_hour, v_egress_bot_share
    from public.analytics_cache
    where cache_key like 'infra_egress_hour:%'
    order by computed_at desc
    limit 1;

    select coalesce(sum((payload ->> 'storage_get_bytes')::numeric),0)
    into v_egress_24h
    from public.analytics_cache
    where cache_key like 'infra_egress_hour:%'
      and computed_at > now() - interval '24 hours';

$old$, $new$    v_egress := public.fn_storage_egress_observed_24h();
    v_egress_latest_at := (v_egress->>'storage_egress_observed_latest_at')::timestamptz;
    v_egress_hour := (v_egress#>>'{storage_egress_observed_latest,storage_get_bytes}')::numeric;
    v_egress_24h := (v_egress->>'storage_egress_observed_24h_observed_bytes')::numeric;
    v_egress_bot_share := (v_egress#>>'{storage_egress_observed_history_24h,-1,bot_share}')::numeric;

$new$);
  w := replace(w, $old$שעה אחרונה %s, 24 שעות %s, bot share %s%%.$old$, $new$מדידה אחרונה %s, נצפה %s בכיסוי %s/24 שעות (%s), bot share %s%%.$new$);
  w := replace(w, $old$          round(v_egress_bot_share * 100,1)$old$, $new$          v_egress#>>'{storage_egress_observed_24h_coverage,observed_hours}',
          v_egress#>>'{storage_egress_observed_24h_coverage,status}',
          round(v_egress_bot_share * 100,1)$new$);
  execute a;
  execute w;
end $patch$;
commit;
