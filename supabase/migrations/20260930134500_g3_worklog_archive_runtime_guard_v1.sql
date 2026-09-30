-- G3_ENFORCEMENT_BINDING_AND_LOG_RETENTION_V1 — B3 GUARDED runtime slice.
-- EXTEND_EXISTING only:
--   * work_log archival enforcement remains fn_work_log_archive_maintenance()
--   * runtime guard is called by existing fn_reliability_watch() -> existing */15 fn_health_watch()
--   * heartbeat stored in existing analytics_cache, no new store/owner/monitoring tree.
-- No DELETE/DROP/TRUNCATE. ELS untouched.

create or replace function public.fn_work_log_archive_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_candidates bigint := 0;
  v_archived bigint := 0;
  v_current_before bigint := 0;
  v_current_after bigint := 0;
begin
  if current_user not in ('postgres','supabase_admin')
     and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  select count(*) into v_current_before from public.work_log_current;

  with candidate as (
    select w.id
    from public.work_log w
    where coalesce(w.archived,false)=false
      and w.superseded_by_id is null
      and w.created_at < now() - interval '14 days'
      and coalesce(w.status,'') ~* '(AFTER|DONE|COMPLETE|COMPLETED|CLOSED|DEPLOYED|APPLIED|RESOLVED|LIVE_VERIFIED|SUPERSEDED|ARCHIVED)'
      and coalesce(w.status,'') !~* '(NOT[ _-]*(MERGED|DEPLOYED|LIVE|CANONICAL|FOR[ _-]*MERGE)|PENDING|BLOCKER|BLOCKED|OPEN|IN[ _-]*PROGRESS|BRANCH[ _-]*ONLY|UNRESOLVED|ACK_|PAUSED|STOPPED_AT_GATE|DECISION_READY|CLAIMED_WRITE|WRITE_SCOPE_OPEN|WAITING|AWAITING|QUEUED|ASSIGNED|ACK_REQUIRED|READY_TO_DEPLOY|RELEASE_AUTHORIZED|ממתין)'
      and (
        coalesce(w.status,'') !~* 'HUMAN_GATE'
        or coalesce(w.status,'') ~* '(^AFTER_COMPLETE_|HUMAN_GATE_REJECTED|REJECTED_BY_HUMAN_GATE|^FINAL_CLOSURE_)'
      )
      and coalesce(w.dispatch_state,'') not in ('QUEUED','FIRE_REQUESTED','SESSION_STARTED','CLAIMED','RETRY_WAIT','DEFERRED')
      and not exists (
        select 1
        from public.work_log child
        where child.parent_assignment_id = w.id
          and coalesce(child.archived,false)=false
          and child.superseded_by_id is null
          and (
            coalesce(child.status,'') ~* '(NOT[ _-]*(MERGED|DEPLOYED|LIVE|CANONICAL|FOR[ _-]*MERGE)|PENDING|BLOCKER|BLOCKED|OPEN|IN[ _-]*PROGRESS|BRANCH[ _-]*ONLY|UNRESOLVED|ACK_|PAUSED|STOPPED_AT_GATE|DECISION_READY|CLAIMED_WRITE|WRITE_SCOPE_OPEN|WAITING|AWAITING|QUEUED|ASSIGNED|ACK_REQUIRED|READY_TO_DEPLOY|RELEASE_AUTHORIZED|ממתין)'
            or (
              coalesce(child.status,'') ~* 'HUMAN_GATE'
              and coalesce(child.status,'') !~* '(^AFTER_COMPLETE_|HUMAN_GATE_REJECTED|REJECTED_BY_HUMAN_GATE|^FINAL_CLOSURE_)'
            )
            or coalesce(child.dispatch_state,'') in ('QUEUED','FIRE_REQUESTED','SESSION_STARTED','CLAIMED','RETRY_WAIT','DEFERRED')
          )
      )
  ),
  counted as (
    select count(*)::bigint n from candidate
  ),
  changed as (
    update public.work_log w
       set archived = true
     where w.id in (select id from candidate)
       and coalesce(w.archived,false)=false
    returning 1
  )
  select counted.n, count(changed.*)::bigint
    into v_candidates, v_archived
  from counted
  left join changed on true
  group by counted.n;

  select count(*) into v_current_after from public.work_log_current;

  insert into public.analytics_cache(cache_key,payload,computed_at)
  values (
    'retention_heartbeat:work_log_archive',
    jsonb_build_object(
      'contract','G3_ENFORCEMENT_BINDING_AND_LOG_RETENTION_V1:B3',
      'archived_rows',coalesce(v_archived,0),
      'deleted_rows',0,
      'work_log_current_before',v_current_before,
      'work_log_current_after',v_current_after,
      'executed_at',now()
    ),
    now()
  )
  on conflict (cache_key) do update
    set payload=excluded.payload, computed_at=excluded.computed_at;

  return jsonb_build_object(
    'contract','G3_ENFORCEMENT_BINDING_AND_LOG_RETENTION_V1:B3',
    'cutoff','14 days',
    'candidate_rows',coalesce(v_candidates,0),
    'archived_rows',coalesce(v_archived,0),
    'deleted_rows',0,
    'work_log_current_before',v_current_before,
    'work_log_current_after',v_current_after,
    'executed_at',now()
  );
end;
$function$;


revoke all on function public.fn_work_log_archive_maintenance() from public, anon, authenticated;
grant execute on function public.fn_work_log_archive_maintenance() to service_role;

create or replace function public.fn_retention_enforcement_guard_v1()
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
  v_reason text;
begin
  select j.jobid, j.active
    into v_jobid, v_active
  from cron.job j
  where j.jobname='g3-work-log-archive-daily'
  limit 1;

  select computed_at
    into v_heartbeat
  from public.analytics_cache
  where cache_key='retention_heartbeat:work_log_archive'
  limit 1;

  if v_jobid is not null then
    select d.status
      into v_last_status
    from cron.job_run_details d
    where d.jobid=v_jobid
    order by d.start_time desc
    limit 1;
  end if;

  if v_jobid is null then
    v_reason := 'g3-work-log-archive-daily cron is missing';
  elsif not coalesce(v_active,false) then
    v_reason := 'g3-work-log-archive-daily cron is inactive';
  elsif v_heartbeat is null then
    v_reason := 'work_log archive heartbeat is missing';
  elsif v_heartbeat < now()-interval '30 hours' then
    v_reason := format('work_log archive heartbeat is stale: %s', v_heartbeat);
  elsif coalesce(v_last_status,'succeeded')='failed' then
    v_reason := 'latest g3-work-log-archive-daily cron run failed';
  else
    v_reason := null;
  end if;

  if v_reason is not null
     and not exists (
       select 1 from public.work_log
       where topic='🚨 ניטור Work Log Retention (אוטומטי)'
         and created_at>now()-interval '6 hours'
     ) then
    insert into public.work_log(session_date,topic,what_we_did,status,open_threads)
    values(
      current_date,
      '🚨 ניטור Work Log Retention (אוטומטי)',
      v_reason || '. DECIDED+ENFORCED is not sufficient without a live guard.',
      'alert',
      'Owner: foundation_closure_protocol_law v7. Check fn_work_log_archive_maintenance + g3-work-log-archive-daily + retention heartbeat.'
    );
    begin
      perform public.notify_admin('🚨 סוד1820 — Work Log retention guard' || chr(10) || v_reason);
    exception when others then null;
    end;
  end if;
end;
$function$;

revoke all on function public.fn_retention_enforcement_guard_v1() from public, anon, authenticated;
grant execute on function public.fn_retention_enforcement_guard_v1() to service_role;

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
end;
$function$;


revoke all on function public.fn_reliability_watch() from public, anon, authenticated;

-- Seed the execution heartbeat through the real owner-native mechanism; this is reversible archival state only.
select public.fn_work_log_archive_maintenance();
