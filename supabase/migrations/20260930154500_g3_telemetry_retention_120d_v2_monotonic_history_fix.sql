-- G3 telemetry retention V2 corrective: monotonic legacy daily snapshot.
-- Preserved daily first-party history never decreases after raw pruning begins.
-- Bot-only days do not create zero-valued snapshots that could mask GA fallback.

create or replace function public.refresh_site_visits_history_v1(p_from date, p_to date)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  n int;
begin
  if p_from is null or p_to is null then return 0; end if;
  if p_from>p_to then raise exception 'invalid site_visits history range'; end if;

  insert into public.traffic_history(period,granularity,views,visitors,sessions,source,note)
  select
    (sv.ts at time zone 'Asia/Jerusalem')::date,
    'day',
    count(*) filter(where not sv.is_bot)::int,
    count(distinct sv.visitor) filter(where not sv.is_bot)::int,
    null::int,
    'site_visits_legacy',
    'First-party site_visits daily snapshot preserved before 120-day raw retention; metric identity remains distinct from traffic_daily.'
  from public.site_visits sv
  where (sv.ts at time zone 'Asia/Jerusalem')::date between p_from and p_to
  group by 1
  having count(*) filter(where not sv.is_bot)>0
  on conflict(period,granularity,source) do update set
    views=greatest(public.traffic_history.views,excluded.views),
    visitors=greatest(coalesce(public.traffic_history.visitors,0),coalesce(excluded.visitors,0)),
    sessions=coalesce(public.traffic_history.sessions,excluded.sessions),
    note=excluded.note;

  get diagnostics n=row_count;
  return n;
end;
$function$;

revoke all on function public.refresh_site_visits_history_v1(date,date) from public, anon, authenticated;
grant execute on function public.refresh_site_visits_history_v1(date,date) to service_role;

create or replace function public.fn_telemetry_retention_120d()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cutoff timestamptz:=now()-interval '120 days';
  v_ve bigint:=0;
  v_sv bigint:=0;
  v_part_candidate text;
  v_part_dropped text;
  v_from timestamptz;
  v_to timestamptz;
  v_missing bigint:=0;
  v_partition_error text;
  v_preview jsonb;
begin
  perform set_config('statement_timeout','45s',true);
  v_preview:=public.admin_retention_preview();

  if not exists (
    select 1 from jsonb_array_elements(coalesce(v_preview->'authorized_delete_scopes','[]'::jsonb)) x
    where x->>'scope'='events_monthly_partitions' and (x->>'raw_days')::int=120
  ) or not exists (
    select 1 from jsonb_array_elements(coalesce(v_preview->'authorized_delete_scopes','[]'::jsonb)) x
    where x->>'scope'='visitor_events' and (x->>'raw_days')::int=120
  ) or not exists (
    select 1 from jsonb_array_elements(coalesce(v_preview->'authorized_delete_scopes','[]'::jsonb)) x
    where x->>'scope'='site_visits' and (x->>'raw_days')::int=120
  ) then
    raise exception 'telemetry retention preview is not authorized';
  end if;

  -- Keep a tiny legacy daily snapshot current without keeping raw history.
  perform public.refresh_site_visits_history_v1(current_date-7,current_date);
  perform public.refresh_site_visits_history_v1(
    (v_cutoff at time zone 'Asia/Jerusalem')::date,
    (v_cutoff at time zone 'Asia/Jerusalem')::date
  );

  with doomed as (
    select ctid from public.visitor_events
    where created_at<v_cutoff
    limit 10000
  ), deleted as (
    delete from public.visitor_events v using doomed d where v.ctid=d.ctid returning 1
  )
  select count(*)::bigint into v_ve from deleted;

  with doomed as (
    select id from public.site_visits
    where ts<v_cutoff
    order by ts
    limit 10000
  ), deleted as (
    delete from public.site_visits v using doomed d where v.id=d.id returning 1
  )
  select count(*)::bigint into v_sv from deleted;

  begin
    select c.relname,
           (regexp_match(pg_get_expr(c.relpartbound,c.oid),$$FROM \('([^']+)'$$))[1]::timestamptz,
           (regexp_match(pg_get_expr(c.relpartbound,c.oid),$$TO \('([^']+)'$$))[1]::timestamptz
      into v_part_candidate,v_from,v_to
    from pg_inherits i
    join pg_class c on c.oid=i.inhrelid
    join pg_class p on p.oid=i.inhparent
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and p.relname='events' and c.relname<>'events_default'
      and (regexp_match(pg_get_expr(c.relpartbound,c.oid),$$TO \('([^']+)'$$))[1]::timestamptz<=v_cutoff
    order by v_to
    limit 1;

    if v_part_candidate is not null then
      if not exists (
        select 1 from jsonb_array_elements(coalesce(v_preview->'tables','[]'::jsonb)) x
        where x->>'table_name'=v_part_candidate
          and x->>'retention_class'='BOUNDED_RUNTIME_120D'
          and coalesce((x->>'auto_purge_allowed')::boolean,false)
      ) then
        raise exception 'partition % is not retention-authorized by preview',v_part_candidate;
      end if;

      perform public.refresh_traffic_daily_range_v1(v_from::date,(v_to-interval '1 day')::date);

      select count(*) into v_missing
      from (
        select distinct h.day
        from public.fn_human_entrances(v_from::date-1,(v_to-interval '1 day')::date+1) h
        where h.day between v_from::date and (v_to-interval '1 day')::date
      ) e
      left join public.traffic_daily t on t.day=e.day
      where t.day is null;

      if v_missing<>0 then
        raise exception 'traffic_daily coverage missing for partition %: % human-entrance days',v_part_candidate,v_missing;
      end if;

      perform set_config('lock_timeout','2s',true);
      execute format('drop table public.%I',v_part_candidate);
      v_part_dropped:=v_part_candidate;
    end if;
  exception when others then
    v_partition_error:=sqlerrm;
  end;

  insert into public.analytics_cache(cache_key,payload,computed_at)
  values(
    'retention_heartbeat:telemetry_120d',
    jsonb_build_object(
      'raw_days',120,
      'visitor_events_deleted',v_ve,
      'site_visits_deleted',v_sv,
      'events_partition_candidate',v_part_candidate,
      'events_partition_dropped',v_part_dropped,
      'partition_error',v_partition_error,
      'ran_at',now()
    ),
    now()
  )
  on conflict(cache_key) do update set payload=excluded.payload,computed_at=excluded.computed_at;

  return jsonb_build_object(
    'raw_days',120,
    'visitor_events_deleted',v_ve,
    'site_visits_deleted',v_sv,
    'events_partition_candidate',v_part_candidate,
    'events_partition_dropped',v_part_dropped,
    'partition_error',v_partition_error,
    'traffic_daily_missing_days',v_missing,
    'ran_at',now()
  );
end;
$function$;

revoke all on function public.fn_telemetry_retention_120d() from public, anon, authenticated;
grant execute on function public.fn_telemetry_retention_120d() to service_role;
