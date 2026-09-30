-- G3 Maintenance Matrix Row 10 — capacity/growth/top-growers.
-- EXTEND_EXISTING only: Foundation Capacity Policy + existing analytics_cache + Health/Reliability.
-- No Capacity Store, no new cron, no destructive action.
-- Relation-size census is computed at most once/day; health-watch remains */15 and cheap.

create or replace function public.fn_capacity_snapshot_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_key text := 'capacity_snapshot:'||to_char(current_date,'YYYY-MM-DD');
  v_payload jsonb;
  v_relations jsonb;
  v_top jsonb;
  v_cron_runs bigint := 0;
begin
  select payload into v_payload
  from public.analytics_cache
  where cache_key=v_key
    and computed_at>=date_trunc('day',now())
  limit 1;

  if v_payload is not null then
    return v_payload;
  end if;

  select coalesce(jsonb_object_agg(relname,bytes),'{}'::jsonb)
    into v_relations
  from (
    select c.relname,pg_total_relation_size(c.oid)::bigint bytes
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','m')
  ) q;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.bytes desc),'[]'::jsonb)
    into v_top
  from (
    select c.relname as relation,pg_total_relation_size(c.oid)::bigint bytes
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','m')
    order by bytes desc
    limit 15
  ) x;

  begin
    select count(*)::bigint into v_cron_runs
    from cron.job_run_details
    where start_time>now()-interval '24 hours';
  exception when others then
    v_cron_runs:=0;
  end;

  v_payload:=jsonb_build_object(
    'contract','G3_CAPACITY_GROWTH_RUNTIME_V1',
    'basis','EXACT_DATABASE_RELATION_SIZES',
    'db_bytes',pg_database_size(current_database()),
    'relations',v_relations,
    'top_current',v_top,
    'cron_runs_24h',v_cron_runs,
    'captured_at',now()
  );

  insert into public.analytics_cache(
    cache_key,payload,computed_at,cache_kind,producer,producer_version,billable_state
  ) values(
    v_key,v_payload,now(),'capacity_snapshot','fn_capacity_snapshot_v1','v1','NON_BILLABLE'
  )
  on conflict(cache_key) do update set
    payload=excluded.payload,
    computed_at=excluded.computed_at,
    cache_kind=excluded.cache_kind,
    producer=excluded.producer,
    producer_version=excluded.producer_version,
    billable_state=excluded.billable_state;

  return v_payload;
end;
$function$;

revoke all on function public.fn_capacity_snapshot_v1() from public,anon,authenticated;
grant execute on function public.fn_capacity_snapshot_v1() to service_role;

create or replace function public.fn_capacity_growth_guard_v1()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_current jsonb;
  v_prior jsonb;
  v_prior_at timestamptz;
  v_now_bytes bigint;
  v_prior_bytes bigint;
  v_delta bigint;
  v_pct numeric;
  v_top_growers jsonb:='[]'::jsonb;
  v_state text;
  v_size_warning boolean;
  v_payload jsonb;
  v_msg text;
  c_warn_size constant bigint:=1400::bigint*1024*1024;
  c_watch_bytes constant bigint:=75::bigint*1024*1024;
  c_alert_bytes constant bigint:=150::bigint*1024*1024;
begin
  v_current:=public.fn_capacity_snapshot_v1();
  v_now_bytes:=pg_database_size(current_database());
  v_size_warning:=v_now_bytes>c_warn_size;

  select payload,computed_at
    into v_prior,v_prior_at
  from public.analytics_cache
  where cache_kind='capacity_snapshot'
    and computed_at between now()-interval '8 days' and now()-interval '6 days'
  order by abs(extract(epoch from (computed_at-(now()-interval '7 days'))))
  limit 1;

  if v_prior is not null then
    v_prior_bytes:=nullif(v_prior->>'db_bytes','')::bigint;
    if v_prior_bytes is not null and v_prior_bytes>0 then
      v_delta:=v_now_bytes-v_prior_bytes;
      v_pct:=round((v_delta::numeric/v_prior_bytes::numeric)*100,2);
    end if;

    select coalesce(jsonb_agg(to_jsonb(g) order by g.delta_bytes desc),'[]'::jsonb)
      into v_top_growers
    from (
      select c.key as relation,
             c.value::bigint as bytes_now,
             coalesce(p.value::bigint,0) as bytes_7d,
             c.value::bigint-coalesce(p.value::bigint,0) as delta_bytes
      from jsonb_each_text(coalesce(v_current->'relations','{}'::jsonb)) c
      left join jsonb_each_text(coalesce(v_prior->'relations','{}'::jsonb)) p
        on p.key=c.key
      where c.value::bigint-coalesce(p.value::bigint,0)>0
      order by delta_bytes desc
      limit 12
    ) g;
  end if;

  if v_prior_bytes is not null
     and (coalesce(v_pct,0)>=10 or coalesce(v_delta,0)>=c_alert_bytes) then
    v_state:='ALERT';
  elsif v_prior_bytes is not null
     and (coalesce(v_pct,0)>=5 or coalesce(v_delta,0)>=c_watch_bytes) then
    v_state:='WATCH';
  elsif v_size_warning then
    v_state:='CAPACITY_WARNING';
  elsif v_prior_bytes is null then
    v_state:='BASELINE_PENDING';
  else
    v_state:='OK';
  end if;

  v_payload:=jsonb_build_object(
    'contract','G3_CAPACITY_GROWTH_RUNTIME_V1',
    'state',v_state,
    'current_db_bytes',v_now_bytes,
    'size_warning_threshold_bytes',c_warn_size,
    'size_warning',v_size_warning,
    'baseline_at',v_prior_at,
    'baseline_db_bytes',v_prior_bytes,
    'growth_7d_bytes',v_delta,
    'growth_7d_pct',v_pct,
    'growth_basis',case when v_prior_bytes is null then 'BASELINE_PENDING' else 'EXACT_DB_SNAPSHOT_7D' end,
    'watch_threshold',jsonb_build_object('pct',5,'bytes',c_watch_bytes),
    'alert_threshold',jsonb_build_object('pct',10,'bytes',c_alert_bytes),
    'top_growers_7d',v_top_growers,
    'top_current',coalesce(v_current->'top_current','[]'::jsonb),
    'cron_runs_24h',v_current->'cron_runs_24h',
    'evaluated_at',now()
  );

  insert into public.analytics_cache(
    cache_key,payload,computed_at,cache_kind,producer,producer_version,billable_state
  ) values(
    'capacity_guard:latest',v_payload,now(),'capacity_guard','fn_capacity_growth_guard_v1','v1','NON_BILLABLE'
  )
  on conflict(cache_key) do update set
    payload=excluded.payload,
    computed_at=excluded.computed_at,
    cache_kind=excluded.cache_kind,
    producer=excluded.producer,
    producer_version=excluded.producer_version,
    billable_state=excluded.billable_state;

  if v_state in ('CAPACITY_WARNING','WATCH','ALERT')
     and not exists(
       select 1 from public.work_log
       where topic='⚠️ ניטור Capacity/Growth (אוטומטי)'
         and status=lower(v_state)
         and created_at>now()-interval '12 hours'
     ) then
    v_msg:=case v_state
      when 'CAPACITY_WARNING' then format(
        'CAPACITY_WARNING: DB %s > 1400 MiB. Size alone is not an incident. Attribute growth and apply retention/compaction before provider upgrade.',
        pg_size_pretty(v_now_bytes)
      )
      when 'WATCH' then format(
        'WATCH: 7d DB growth %s (%s%%). Top-grower evidence is attached in capacity_guard:latest.',
        pg_size_pretty(coalesce(v_delta,0)),coalesce(v_pct,0)
      )
      else format(
        'ALERT: 7d DB growth %s (%s%%). Attribute growth/retention now; size alone still does not imply service incident.',
        pg_size_pretty(coalesce(v_delta,0)),coalesce(v_pct,0)
      ) end;

    insert into public.work_log(session_date,topic,what_we_did,status,open_threads)
    values(
      current_date,
      '⚠️ ניטור Capacity/Growth (אוטומטי)',
      v_msg,
      lower(v_state),
      'Owner: foundation_closure_protocol_law v7. Signal/projection: analytics_cache capacity_guard:latest + admin_capacity_growth_v1().'
    );

    begin
      perform public.suggest_add(
        'performance','capacity_growth_guard',
        'Capacity/Growth '||v_state,
        v_msg,
        v_payload,
        100,
        1,
        'Attribute growth by relation; use existing retention/compaction owners. No automatic provider upgrade or destructive cleanup.',
        'capacity_growth_guard:'||v_state||':'||to_char(current_date,'YYYYMMDD')
      );
    exception when others then null;
    end;

    if v_state='ALERT' then
      begin
        perform public.notify_admin('🚨 סוד1820 — Capacity Growth ALERT'||chr(10)||v_msg);
      exception when others then null;
      end;
    end if;
  end if;
end;
$function$;

revoke all on function public.fn_capacity_growth_guard_v1() from public,anon,authenticated;
grant execute on function public.fn_capacity_growth_guard_v1() to service_role;

create or replace function public.admin_capacity_growth_v1()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_latest jsonb;
  v_snapshots jsonb;
begin
  if auth.role()<>'service_role' and not coalesce(public.rd_is_admin(),false) then
    raise exception 'not authorized';
  end if;

  select payload into v_latest
  from public.analytics_cache
  where cache_key='capacity_guard:latest'
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'at',computed_at,
    'db_bytes',(payload->>'db_bytes')::bigint
  ) order by computed_at),'[]'::jsonb)
  into v_snapshots
  from (
    select computed_at,payload
    from public.analytics_cache
    where cache_kind='capacity_snapshot'
    order by computed_at desc
    limit 31
  ) s;

  return jsonb_build_object(
    'contract','G3_CAPACITY_GROWTH_RUNTIME_V1',
    'latest',coalesce(v_latest,'{}'::jsonb),
    'snapshots',v_snapshots,
    'source','existing analytics_cache + pg_database_size + pg_total_relation_size',
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.admin_capacity_growth_v1() from public,anon;
grant execute on function public.admin_capacity_growth_v1() to authenticated,service_role;

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

  -- G3 Matrix Row 10: capacity/growth guard under the same Reliability/Health tree.
  begin
    perform public.fn_capacity_growth_guard_v1();
  exception when others then null;
  end;
end;
$function$;




revoke all on function public.fn_reliability_watch() from public,anon,authenticated;

-- First census + enforcement evaluation. Non-destructive.
select public.fn_capacity_growth_guard_v1();
