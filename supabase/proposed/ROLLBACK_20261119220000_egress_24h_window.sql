-- Exact rollback proposal. Not authorized/applied to a shared database.
begin;
do $guard$ begin
  if (select md5(prosrc) from pg_proc where oid='public.admin_system_health()'::regprocedure) <> '168d10830f8ea27468a957cb6d3ffcfa'
    or (select md5(prosrc) from pg_proc where oid='public.fn_health_watch()'::regprocedure) <> '4402aaec222c60339ce551b5fe76c649'
    or (select md5(prosrc) from pg_proc where oid='public.fn_storage_egress_observed_24h(timestamptz)'::regprocedure) <> '13413b91c9df0cf6672a758cdada40cf' then
    raise exception 'EGRESS_24H_ROLLBACK_SOURCE_DRIFT';
  end if;
end $guard$;
do $patch$
declare a text := pg_get_functiondef('public.admin_system_health()'::regprocedure);
  w text := pg_get_functiondef('public.fn_health_watch()'::regprocedure);
begin
  a := replace(a, $old$      'supabase_egress_historical_exact', ($old$, $new$      'storage_egress_observed_latest', (
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
      'supabase_egress_historical_exact', ($new$);
  a := replace(a, $old$      'supabase_cached_egress', null,$old$, $new$      'storage_egress_guard', jsonb_build_object(
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
      'supabase_cached_egress', null,$new$);
  a := replace(a, $old$    ) into v_usage;
    v_usage := v_usage || public.fn_storage_egress_observed_24h();$old$, $new$    ) into v_usage;$new$);
  w := replace(w, $old$  v_egress jsonb;
  v_egress_latest_at timestamptz;$old$, $new$  v_egress_latest_at timestamptz;$new$);
  w := replace(w, $old$    v_egress := public.fn_storage_egress_observed_24h();
    v_egress_latest_at := (v_egress->>'storage_egress_observed_latest_at')::timestamptz;
    v_egress_hour := (v_egress#>>'{storage_egress_observed_latest,storage_get_bytes}')::numeric;
    v_egress_24h := (v_egress->>'storage_egress_observed_24h_observed_bytes')::numeric;
    v_egress_bot_share := (v_egress#>>'{storage_egress_observed_history_24h,-1,bot_share}')::numeric;

$old$, $new$    select computed_at,
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

$new$);
  w := replace(w, $old$מדידה אחרונה %s, נצפה %s בכיסוי %s/24 שעות (%s), bot share %s%%.$old$, $new$שעה אחרונה %s, 24 שעות %s, bot share %s%%.$new$);
  w := replace(w, $old$          v_egress#>>'{storage_egress_observed_24h_coverage,observed_hours}',
          v_egress#>>'{storage_egress_observed_24h_coverage,status}',
          round(v_egress_bot_share * 100,1)$old$, $new$          round(v_egress_bot_share * 100,1)$new$);
  execute a;
  execute w;
end $patch$;
drop function public.fn_storage_egress_observed_24h(timestamptz);
commit;
