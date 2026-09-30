-- G3_ENFORCEMENT_BINDING_AND_LOG_RETENTION_V1 — B1/B2 120-day low-load retention.
-- Human Gate: ZURIEL 2026-09-30 delegated the least-burden policy to GPT.
-- Canonical owners: traffic_intelligence_law v11 + research_intake_foundation_contract_law v13
-- + foundation_closure_protocol_law v7.
-- Policy: raw events / visitor_events / site_visits = 120 days.
-- Long-term traffic history remains in traffic_daily / traffic_history.
-- Legacy raw path/referrer/device/arrival detail older than 120 days is intentionally retired.
-- Bounded maintenance: max 10k rows/table/run + max one monthly events partition/run.
-- No WhatsApp/source/research/provenance purge is authorized here. ELS untouched.

create index if not exists visitor_events_created_at_brin
  on public.visitor_events using brin(created_at);

create or replace function public.refresh_traffic_daily_range_v1(p_from date, p_to date)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  n int;
begin
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'invalid traffic refresh range';
  end if;

  insert into public.traffic_daily(day,entrances,engaged,bounces,views,visitors,searches,bots,suspected,updated_at)
  select agg.d, agg.entrances, agg.engaged, agg.bounces, agg.views, agg.visitors, agg.searches,
         coalesce(bt.bots,0), agg.suspected, now()
  from (
    select h.day d,
      count(*) filter (where not h.suspected_bot) entrances,
      count(*) filter (where h.engaged and not h.suspected_bot) engaged,
      count(*) filter (where h.bounce and not h.suspected_bot) bounces,
      coalesce(sum(h.views) filter (where not h.suspected_bot),0) views,
      count(distinct h.visitor) filter (where not h.suspected_bot) visitors,
      coalesce(sum(h.searches) filter (where not h.suspected_bot),0) searches,
      count(*) filter (where h.suspected_bot) suspected
    from public.fn_human_entrances(p_from, p_to) h
    group by h.day
  ) agg
  left join (
    select ev.ts::date d, count(distinct ev.session_id) bots
    from public.events ev
    where ev.is_bot and ev.ts::date between p_from and p_to
    group by ev.ts::date
  ) bt on bt.d = agg.d
  on conflict (day) do update set
    entrances=excluded.entrances, engaged=excluded.engaged, bounces=excluded.bounces,
    views=excluded.views, visitors=excluded.visitors, searches=excluded.searches,
    bots=excluded.bots, suspected=excluded.suspected, updated_at=now();

  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function public.refresh_traffic_daily_range_v1(date,date) from public, anon, authenticated;
grant execute on function public.refresh_traffic_daily_range_v1(date,date) to service_role;

create or replace function public.refresh_traffic_daily(p_days integer default 120)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return public.refresh_traffic_daily_range_v1(current_date-greatest(p_days,1), current_date);
end;
$function$;

create or replace function public.traffic_history_combined(p_gran text)
returns table(period date, views integer, live_views integer, users integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  with fp as (
    select day, views::int v, visitors::int u from public.traffic_daily
  ),
  jp as (
    select period as day, sum(views)::int v from public.traffic_history
    where granularity='day' and source='jetpack' group by period
  ),
  ga as (
    select period as day, sum(views)::int v, max(visitors)::int u from public.traffic_history
    where granularity='day' and source='ga' group by period
  ),
  days as (
    select day from fp union select day from jp union select day from ga
  ),
  picked as (
    select d.day,
      coalesce(fp.v, ga.v, jp.v, 0) as views,
      case when fp.v is not null then fp.v else 0 end as live_views,
      coalesce(fp.u, ga.u, 0) as users
    from days d
    left join fp on fp.day=d.day
    left join ga on ga.day=d.day
    left join jp on jp.day=d.day
  )
  select
    case p_gran when 'year' then date_trunc('year',day)::date
                when 'month' then date_trunc('month',day)::date
                when 'week' then date_trunc('week',day)::date
                else day end,
    sum(views)::int,
    sum(live_views)::int,
    sum(users)::int
  from picked
  where (p_gran <> 'day' or day >= date '2026-01-01')
  group by 1 order by 1;
$function$;

create or replace function public.visits_stats(p_days integer default 90)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_effective_days int := greatest(1, least(coalesce(p_days,90),120));
  v_key text := 'visits_stats_v3:'||v_effective_days;
  v_payload jsonb;
  v_on boolean := public._analytics_cache_on();
begin
  if v_on then
    select public.analytics_cache_get_v1(v_key, 'visits_stats') into v_payload;
    if v_payload is not null then return v_payload::json; end if;
  end if;

  with rng as (select now()-(v_effective_days||' days')::interval since),
  d as (
    select (ts at time zone 'Asia/Jerusalem')::date day, count(*) views, count(distinct visitor) uniques
    from public.site_visits,rng where ts>=rng.since and not is_bot group by 1
  ),
  paths as (
    select path,count(*) views from public.site_visits,rng
    where ts>=rng.since and not is_bot group by 1 order by 2 desc limit 25
  ),
  refs as (
    select coalesce(nullif(referrer,''),'ישיר / לא ידוע') referrer,count(*) views
    from public.site_visits,rng where ts>=rng.since and not is_bot group by 1 order by 2 desc limit 15
  ),
  dev as (
    select coalesce(nullif(device,''),'לא ידוע') device,count(*) views
    from public.site_visits,rng where ts>=rng.since and not is_bot group by 1 order by 2 desc
  )
  select jsonb_build_object(
    'daily',(select coalesce(jsonb_agg(jsonb_build_object('date',day,'views',views,'uniques',uniques) order by day),'[]'::jsonb) from d),
    'paths',(select coalesce(jsonb_agg(jsonb_build_object('path',path,'views',views) order by views desc),'[]'::jsonb) from paths),
    'referrers',(select coalesce(jsonb_agg(jsonb_build_object('referrer',referrer,'views',views) order by views desc),'[]'::jsonb) from refs),
    'devices',(select coalesce(jsonb_agg(jsonb_build_object('device',device,'views',views) order by views desc),'[]'::jsonb) from dev),
    'total_views',(select count(*) from public.site_visits,rng where ts>=rng.since and not is_bot),
    'total_uniques',(select count(distinct visitor) from public.site_visits,rng where ts>=rng.since and not is_bot),
    'today_views',(select count(*) from public.site_visits where not is_bot and ts>=date_trunc('day',now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'),
    'today_uniques',(select count(distinct visitor) from public.site_visits where not is_bot and ts>=date_trunc('day',now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'),
    'active_now',(select count(distinct visitor) from public.site_visits where not is_bot and ts>=now()-interval '5 minutes'),
    'requested_days',p_days,
    'effective_days',v_effective_days,
    'raw_retention_days',120,
    'retention_capped',coalesce(p_days,90)>120
  ) into v_payload;

  if v_on then
    insert into public.analytics_cache(cache_key,payload,computed_at)
    values(v_key,v_payload,now())
    on conflict(cache_key) do update set payload=excluded.payload,computed_at=now();
  end if;
  return v_payload::json;
end;
$function$;

create or replace function public.arrival_sources(p_days integer default 30)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_effective_days int := greatest(1, least(coalesce(p_days,30),120));
  v_key text := 'arrival_sources_v3:'||v_effective_days;
  v_payload jsonb;
  v_on boolean := public._analytics_cache_on();
begin
  if v_on then
    select public.analytics_cache_get_v1(v_key,'arrival_sources') into v_payload;
    if v_payload is not null then return v_payload::json; end if;
  end if;

  with rng as (select now()-(v_effective_days||' days')::interval since),
  base as (
    select coalesce(nullif(meta->>'tag',''),meta->>'source','ישיר') tag,
           coalesce(nullif(meta->>'source',''),'ישיר') platform,
           (meta->>'tagged')::boolean tagged,visitor_id,created_at
    from public.visitor_events,rng
    where section='arrival' and event_type='source' and created_at>=rng.since
  ),
  today as (
    select * from base
    where created_at>=date_trunc('day',now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'
  )
  select jsonb_build_object(
    'by_tag',(select coalesce(jsonb_agg(jsonb_build_object('tag',t.tag,'platform',t.platform,'tagged',t.tagged,'visitors',t.visitors,'hits',t.hits,'today',coalesce(td.today,0)) order by t.visitors desc),'[]'::jsonb)
      from (select tag,max(platform) platform,bool_or(tagged) tagged,count(distinct visitor_id) visitors,count(*) hits from base group by tag)t
      left join (select tag,count(distinct visitor_id) today from today group by tag)td on td.tag=t.tag),
    'by_platform',(select coalesce(jsonb_agg(jsonb_build_object('platform',p.platform,'visitors',p.visitors,'today',coalesce(pt.today,0)) order by p.visitors desc),'[]'::jsonb)
      from (select platform,count(distinct visitor_id) visitors from base group by platform)p
      left join (select platform,count(distinct visitor_id) today from today group by platform)pt on pt.platform=p.platform),
    'total_today',(select count(distinct visitor_id) from today),
    'total_visitors',(select count(distinct visitor_id) from base),
    'requested_days',p_days,
    'effective_days',v_effective_days,
    'raw_retention_days',120,
    'retention_capped',coalesce(p_days,30)>120
  ) into v_payload;

  if v_on then
    insert into public.analytics_cache(cache_key,payload,computed_at)
    values(v_key,v_payload,now())
    on conflict(cache_key) do update set payload=excluded.payload,computed_at=now();
  end if;
  return v_payload::json;
end;
$function$;

create or replace function public.admin_retention_preview()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if auth.role() <> 'service_role' and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  with rows as (
    select
      'channel_updates'::text as table_name,
      'SOURCE_INGRESS_PROVENANCE'::text as placement_role,
      'ACTIVE_SOURCE'::text as retention_class,
      count(*)::bigint as total_rows,
      min(created_at) as oldest_at,
      max(created_at) as newest_at,
      count(*) filter (
        where status in ('live','published','active')
           or exists (
             select 1 from public.research_objects ro
             where ro.source_ref like ('channel_updates:' || channel_updates.id::text || '%')
           )
      )::bigint as protected_rows,
      0::bigint as purge_candidates,
      count(*) filter (
        where coalesce(status, '') not in ('live','published','active')
          and not exists (
            select 1 from public.research_objects ro
            where ro.source_ref like ('channel_updates:' || channel_updates.id::text || '%')
          )
      )::bigint as unknown_dependency_rows,
      false as auto_purge_allowed,
      'Live broadcast/media source; referenced rows are provenance-protected. Unreferenced expired rows still require dependency review.'::text as reason
    from public.channel_updates

    union all

    select
      'wa_bot_log',
      'SOURCE_INGRESS_PROVENANCE',
      'HUMAN_REVIEW',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*) filter (
        where exists (
          select 1 from public.research_objects ro
          where ro.source_ref ~ ('(^|[+])wa_bot_log:' || wa_bot_log.id::text || '(#|[+]|$)')
        )
      )::bigint,
      0::bigint,
      count(*) filter (
        where not exists (
          select 1 from public.research_objects ro
          where ro.source_ref ~ ('(^|[+])wa_bot_log:' || wa_bot_log.id::text || '(#|[+]|$)')
        )
      )::bigint,
      false,
      'Raw WhatsApp interaction log. Direct Research OS references are protected; remaining rows still have historical timeline consumers.'
    from public.wa_bot_log

    union all

    select
      'wa_deep_queue',
      'OPERATIONAL_RUNTIME',
      'HUMAN_REVIEW',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*) filter (
        where exists (
          select 1 from public.research_objects ro
          where ro.source_ref ~ ('(^|[+])wa_deep_queue:' || wa_deep_queue.id::text || '(#|[+]|$)')
        )
      )::bigint,
      0::bigint,
      count(*) filter (
        where not exists (
          select 1 from public.research_objects ro
          where ro.source_ref ~ ('(^|[+])wa_deep_queue:' || wa_deep_queue.id::text || '(#|[+]|$)')
        )
      )::bigint,
      false,
      'Terminal queue rows are NOT purge-safe yet: live historical timeline code still reads this table and Research OS may reference individual rows.'
    from public.wa_deep_queue

    union all

    select
      'wa_vip_inbox',
      'SOURCE_INGRESS_PROVENANCE',
      'PROVENANCE_PROTECTED',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*)::bigint,
      0::bigint,
      0::bigint,
      false,
      'Raw VIP-author source intake feeding extraction and attribution. Keep until typed downstream provenance can fully replay the source.'
    from public.wa_vip_inbox

    union all

    select
      'wa_msg_ext',
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      0::bigint,
      0::bigint,
      count(*)::bigint,
      false,
      'Metadata/dedup index only; no message text. Candidate for bounded retention after reader/audit dependency proof and an explicit duration decision.'
    from public.wa_msg_ext

    union all

    select
      'wa_message_status',
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME',
      count(*)::bigint,
      min(incoming_at at time zone 'UTC'),
      max(incoming_at at time zone 'UTC'),
      0::bigint,
      0::bigint,
      count(*)::bigint,
      false,
      'Delivery/stuck/reply operational state. No automatic retention duration is assumed.'
    from public.wa_message_status

    union all

    select
      'visitor_events',
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME_120D',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*) filter (where created_at >= now()-interval '120 days')::bigint,
      count(*) filter (where created_at < now()-interval '120 days')::bigint,
      0::bigint,
      true,
      'ZURIEL Human Gate 2026-09-30: raw behavioral telemetry retained 120 days. Long-term traffic history remains with Traffic Intelligence aggregates; older Legacy raw detail is retired.'
    from public.visitor_events

    union all

    select
      'site_visits',
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME_120D',
      count(*)::bigint,
      min(ts),
      max(ts),
      count(*) filter (where ts >= now()-interval '120 days')::bigint,
      count(*) filter (where ts < now()-interval '120 days')::bigint,
      0::bigint,
      true,
      'ZURIEL Human Gate 2026-09-30: raw visit detail retained 120 days. Long-term canonical traffic totals stay in traffic_daily/traffic_history; old path/referrer/device detail is intentionally retired.'
    from public.site_visits

    union all

    select
      c.relname::text,
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME_120D',
      coalesce(s.n_live_tup, 0)::bigint,
      case
        when pg_get_expr(c.relpartbound,c.oid) = 'DEFAULT' then null::timestamptz
        else (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$FROM \('([^']+)'$$))[1]::timestamptz
      end,
      case
        when pg_get_expr(c.relpartbound,c.oid) = 'DEFAULT' then null::timestamptz
        else (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz
      end,
      case
        when (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz > now()-interval '120 days'
          then coalesce(s.n_live_tup,0)::bigint else 0::bigint end,
      case
        when (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz <= now()-interval '120 days'
          then coalesce(s.n_live_tup,0)::bigint else 0::bigint end,
      0::bigint,
      ((regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz <= now()-interval '120 days'),
      'ZURIEL Human Gate 2026-09-30: monthly raw events partition may retire only after Traffic Intelligence range refresh + exact day-coverage verification. At most one eligible partition is retired per maintenance run.'
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public'
      and p.relname = 'events'
      and c.relname <> 'events_default'

    union all

    select
      'work_log',
      'COORDINATION_PROVENANCE',
      'PROVENANCE_PROTECTED',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*)::bigint,
      0::bigint,
      count(*) filter (where coalesce(archived,false)=false and superseded_by_id is null and created_at < now()-interval '14 days')::bigint,
      false,
      'KEEP_FOREVER history authority under Research Intake §15.1. B3 enforcement changes only archived routing state; it never deletes provenance rows.'
    from public.work_log
  )
  select jsonb_build_object(
    'contract', 'research_intake_foundation_contract §11/§15 + foundation_closure_protocol_law v7',
    'mode', 'DRY_RUN_ONLY',
    'generated_at', now(),
    'delete_authorized', false,
    'authorized_delete_scopes', jsonb_build_array(
      jsonb_build_object('scope','events_monthly_partitions','raw_days',120,'human_gate','ZURIEL 2026-09-30'),
      jsonb_build_object('scope','visitor_events','raw_days',120,'human_gate','ZURIEL 2026-09-30'),
      jsonb_build_object('scope','site_visits','raw_days',120,'human_gate','ZURIEL 2026-09-30')
    ),
    'tables', coalesce(jsonb_agg(to_jsonb(rows) order by table_name), '[]'::jsonb)
  )
  into v_result
  from rows;

  return v_result;
end;
$function$;


revoke all on function public.admin_retention_preview() from public, anon;
grant execute on function public.admin_retention_preview() to authenticated, service_role;

create or replace function public.fn_telemetry_retention_120d()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cutoff timestamptz := now()-interval '120 days';
  v_ve bigint := 0;
  v_sv bigint := 0;
  v_part text;
  v_from timestamptz;
  v_to timestamptz;
  v_missing bigint := 0;
  v_preview jsonb;
begin
  v_preview := public.admin_retention_preview();

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_preview->'tables','[]'::jsonb)) x
    where x->>'table_name'='visitor_events'
      and x->>'retention_class'='BOUNDED_RUNTIME_120D'
      and coalesce((x->>'auto_purge_allowed')::boolean,false)
  ) or not exists (
    select 1
    from jsonb_array_elements(coalesce(v_preview->'tables','[]'::jsonb)) x
    where x->>'table_name'='site_visits'
      and x->>'retention_class'='BOUNDED_RUNTIME_120D'
      and coalesce((x->>'auto_purge_allowed')::boolean,false)
  ) then
    raise exception 'telemetry retention preview is not authorized';
  end if;

  with doomed as (
    select ctid from public.visitor_events
    where created_at < v_cutoff
    limit 10000
  ), deleted as (
    delete from public.visitor_events v
    using doomed d
    where v.ctid=d.ctid
    returning 1
  )
  select count(*)::bigint into v_ve from deleted;

  with doomed as (
    select id from public.site_visits
    where ts < v_cutoff
    order by ts
    limit 10000
  ), deleted as (
    delete from public.site_visits v
    using doomed d
    where v.id=d.id
    returning 1
  )
  select count(*)::bigint into v_sv from deleted;

  select c.relname,
         (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$FROM \('([^']+)'$$))[1]::timestamptz,
         (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz
    into v_part,v_from,v_to
  from pg_inherits i
  join pg_class c on c.oid=i.inhrelid
  join pg_class p on p.oid=i.inhparent
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and p.relname='events' and c.relname<>'events_default'
    and (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz <= v_cutoff
  order by v_to
  limit 1;

  if v_part is not null then
    perform public.refresh_traffic_daily_range_v1(v_from::date,(v_to-interval '1 day')::date);

    execute format(
      'select count(*) from (select distinct ts::date d from public.%I) e left join public.traffic_daily t on t.day=e.d where t.day is null',
      v_part
    ) into v_missing;

    if v_missing<>0 then
      raise exception 'traffic_daily coverage missing for partition %: % days',v_part,v_missing;
    end if;

    execute format('drop table public.%I',v_part);
  end if;

  insert into public.analytics_cache(cache_key,payload,computed_at)
  values(
    'retention_heartbeat:telemetry_120d',
    jsonb_build_object(
      'raw_days',120,
      'visitor_events_deleted',v_ve,
      'site_visits_deleted',v_sv,
      'events_partition_dropped',v_part,
      'ran_at',now()
    ),
    now()
  )
  on conflict(cache_key) do update set payload=excluded.payload,computed_at=excluded.computed_at;

  return jsonb_build_object(
    'raw_days',120,
    'visitor_events_deleted',v_ve,
    'site_visits_deleted',v_sv,
    'events_partition_dropped',v_part,
    'traffic_daily_missing_days',v_missing,
    'ran_at',now()
  );
end;
$function$;

revoke all on function public.fn_telemetry_retention_120d() from public, anon, authenticated;
grant execute on function public.fn_telemetry_retention_120d() to service_role;

create or replace function public.fn_telemetry_retention_guard_v1()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_jobid bigint;
  v_active boolean;
  v_heartbeat timestamptz;
  v_last_status text;
  v_old_ve timestamptz;
  v_old_sv timestamptz;
  v_old_partition boolean := false;
  v_reason text;
begin
  select j.jobid,j.active into v_jobid,v_active
  from cron.job j where j.jobname='g3-telemetry-retention-120d-daily' limit 1;

  select computed_at into v_heartbeat
  from public.analytics_cache where cache_key='retention_heartbeat:telemetry_120d' limit 1;

  if v_jobid is not null then
    select d.status into v_last_status
    from cron.job_run_details d
    where d.jobid=v_jobid
    order by d.start_time desc limit 1;
  end if;

  select min(created_at) into v_old_ve from public.visitor_events;
  select min(ts) into v_old_sv from public.site_visits;

  select exists(
    select 1
    from pg_inherits i
    join pg_class c on c.oid=i.inhrelid
    join pg_class p on p.oid=i.inhparent
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and p.relname='events' and c.relname<>'events_default'
      and (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz <= now()-interval '122 days'
  ) into v_old_partition;

  if v_jobid is null then
    v_reason := 'g3-telemetry-retention-120d-daily cron is missing';
  elsif not coalesce(v_active,false) then
    v_reason := 'g3-telemetry-retention-120d-daily cron is inactive';
  elsif v_heartbeat is null then
    v_reason := 'telemetry retention heartbeat is missing';
  elsif v_heartbeat < now()-interval '30 hours' then
    v_reason := format('telemetry retention heartbeat is stale: %s',v_heartbeat);
  elsif coalesce(v_last_status,'succeeded')='failed' then
    v_reason := 'latest telemetry retention cron run failed';
  elsif v_old_ve < now()-interval '122 days' then
    v_reason := format('visitor_events retention backlog exceeds 122 days: %s',v_old_ve);
  elsif v_old_sv < now()-interval '122 days' then
    v_reason := format('site_visits retention backlog exceeds 122 days: %s',v_old_sv);
  elsif v_old_partition then
    v_reason := 'events partition retirement backlog exceeds 122 days';
  else
    v_reason := null;
  end if;

  if v_reason is not null
     and not exists(
       select 1 from public.work_log
       where topic='🚨 ניטור Telemetry Retention (אוטומטי)'
         and created_at>now()-interval '6 hours'
     ) then
    insert into public.work_log(session_date,topic,what_we_did,status,open_threads)
    values(
      current_date,
      '🚨 ניטור Telemetry Retention (אוטומטי)',
      v_reason,
      'alert',
      'Owner: Traffic Intelligence v11 + Foundation v7. Raw telemetry policy is 120 days; check preview/enforcement before manual action.'
    );
    begin
      perform public.notify_admin('🚨 סוד1820 — Telemetry retention guard'||chr(10)||v_reason);
    exception when others then null;
    end;
  end if;
end;
$function$;

revoke all on function public.fn_telemetry_retention_guard_v1() from public, anon, authenticated;
grant execute on function public.fn_telemetry_retention_guard_v1() to service_role;

create or replace function public.fn_reliability_watch()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r record;
  v_last timestamptz;
  v_gap numeric;
  v_msg text;
  v_fp text;
  c_dead_man_minutes constant int := 90;
begin
  -- heartbeat: lets the external canary detect a dead health-watch (pg_cron cannot watch itself).
  begin
    insert into public.analytics_cache(cache_key, payload, computed_at)
    values ('reliability_heartbeat:health_watch', jsonb_build_object('at', now()), now())
    on conflict (cache_key) do update set payload = excluded.payload, computed_at = excluded.computed_at;
  exception when others then null;
  end;

  -- (a) recurring browser incident: runtime_error (>=5 distinct sessions/60m) or human issue_report (>=2).
  begin
    for r in
      select coalesce(nullif(props ->> 'message', ''), 'unknown') as msg,
             surface, event_type,
             count(*) as n,
             count(distinct coalesce(session_id, sod_id)) as sessions,
             max(ts) as last_ts
      from public.events
      where ts > now() - interval '60 minutes'
        and not coalesce(is_bot, false)
        and (surface = 'runtime_error' or event_type = 'issue_report')
      group by 1, 2, 3
      having count(distinct coalesce(session_id, sod_id))
             >= case when max(event_type) = 'issue_report' then 2 else 5 end
      order by sessions desc, n desc
      limit 3
    loop
      -- privacy: strip URLs/query, emails and long tokens again server-side; short bounded excerpt only.
      v_msg := left(regexp_replace(regexp_replace(regexp_replace(r.msg,
                 'https?://[^\s]+', '[url]', 'gi'),
                 '[[:alnum:]._+-]+@[[:alnum:]-]+(\.[[:alnum:]-]+)+', '[email]', 'g'),
                 '[[:alnum:]_-]{32,}', '[token]', 'g'), 80);
      v_fp := md5(r.surface || '|' || r.event_type || '|' || left(r.msg, 200));
      if not exists (
        select 1 from public.work_log
        where topic = '🚨 תקרית-ריצה בדפדפן (אוטומטי)'
          and open_threads = 'fp:' || v_fp
          and created_at > now() - interval '6 hours'
      ) then
        insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
        values (current_date, '🚨 תקרית-ריצה בדפדפן (אוטומטי)',
          format('%s/%s: %s sessions, %s אירועים ב-60 דקות האחרונות. הודעה: %s. זו תקרית חוזרת — לא סיבת-שורש. לבדוק את הפריסה האחרונה ואת ה-canary; אין rollback אוטומטי.',
                 r.surface, r.event_type, r.sessions, r.n, v_msg),
          'alert', 'fp:' || v_fp);
        begin
          perform public.suggest_add('performance', 'runtime_error_incident',
            format('תקרית-ריצה חוזרת (%s sessions): %s', r.sessions, left(v_msg, 60)),
            format('%s/%s דווחה ע"י %s sessions נפרדים ב-60 דקות. מקור: events. אין כאן סיבת-שורש.', r.surface, r.event_type, r.sessions),
            jsonb_build_object('surface', r.surface, 'event_type', r.event_type, 'events', r.n,
                               'sessions', r.sessions, 'last_seen', r.last_ts, 'window_minutes', 60),
            least(90, 50 + r.sessions::int), r.sessions::int,
            'לבדוק את הפריסה האחרונה ואת ה-canary; אין rollback אוטומטי',
            'runtime_error_incident:' || v_fp || ':' || to_char(now() at time zone 'utc', 'YYYYMMDD'));
        exception when others then null;
        end;
        begin
          perform public.notify_admin('🚨 סוד1820 — תקרית-ריצה בדפדפן' || chr(10) || format('%s sessions · %s', r.sessions, v_msg));
        exception when others then null;
        end;
      end if;
    end loop;
  exception when others then null;
  end;

  -- (b) events-ingest dead-man: last NORMAL human event.
  begin
    select max(ts) into v_last
    from public.events
    where ts > now() - interval '24 hours'
      and not coalesce(is_bot, false)
      and surface not in ('runtime_error', 'canary')
      and event_type is distinct from 'issue_report';
    v_gap := case when v_last is null then null else extract(epoch from (now() - v_last)) / 60 end;
    if v_last is null or v_gap > c_dead_man_minutes then
      if not exists (
        select 1 from public.work_log
        where topic = '🚨 ניטור ingest אירועים (אוטומטי)'
          and created_at > now() - interval '3 hours'
      ) then
        v_msg := case when v_last is null
          then 'אין אירוע-אדם רגיל אחד ב-24 השעות האחרונות. חוסר נתונים אינו בריאות.'
          else format('אין אירוע-אדם רגיל %s דקות (סף %s, נמדד: p99.9=17.7 דק'' על 30 ימים). אחרון: %s.',
                      round(v_gap), c_dead_man_minutes, to_char(v_last at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI')) end;
        insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
        values (current_date, '🚨 ניטור ingest אירועים (אוטומטי)', v_msg, 'alert',
          'runtime_error/issue_report/canary אינם הוכחת ingest חי. לבדוק ingest_event / הקצה / RLS.');
        begin
          perform public.notify_admin('🚨 סוד1820 — ingest אירועים שקט' || chr(10) || v_msg);
        exception when others then null;
        end;
      end if;
    end if;
  exception when others then null;
  end;

  -- G3 B3 owner-native enforcement guard: same existing Reliability/Health tree, no parallel monitor.
  begin
    perform public.fn_retention_enforcement_guard_v1();
  exception when others then null;
  end;

  -- G3 B1/B2 telemetry retention guard: same health tree, no second monitor.
  begin
    perform public.fn_telemetry_retention_guard_v1();
  exception when others then null;
  end;
end;
$function$;



revoke all on function public.fn_reliability_watch() from public, anon, authenticated;

do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='g3-telemetry-retention-120d-daily' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule(
    'g3-telemetry-retention-120d-daily',
    '10 3 * * *',
    $cron$select public.fn_telemetry_retention_120d();$cron$
  );
end $$;

comment on function public.fn_telemetry_retention_120d() is
  'Human-Gated 120-day raw telemetry retention. Bounded to 10k visitor_events + 10k site_visits rows and one verified events partition per daily run. Long-term canonical traffic history remains in traffic_daily/traffic_history.';

comment on function public.fn_telemetry_retention_guard_v1() is
  'Owner-native guard for the 120-day telemetry retention policy; called by the existing Reliability/Health tree.';

select public.fn_telemetry_retention_120d();
