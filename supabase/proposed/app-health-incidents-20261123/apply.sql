-- PROPOSED ONLY. DO NOT EXECUTE OR DEPLOY WITHOUT A SEPARATE SQL HUMAN GATE.
-- Replaces existing fn_reliability_watch body; no new store, cron, grants or capability.
-- Exact live function MD5 checked read-only 2026-11-23.
begin;
do $guard$
begin
 if md5(pg_get_functiondef('public.fn_reliability_watch()'::regprocedure)) <>
    '3cc04b93669c01d33f513a2c8867f104' then
   raise exception 'Reliability watch drift; reconciliation required';
 end if;
end;
$guard$;

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

  -- (a2) app_health is an existing ingest_event family. Do not aggregate
  -- client messages or values, and do not treat absent telemetry as success.
  -- A confirmed save is a receipt; failed signals only alert after 3
  -- distinct sessions in one hour, so one user's retries cannot page admins.
  begin
    for r in
      select event_type, props ->> 'reason' as failure_code,
             count(*) as n,
             count(distinct coalesce(session_id,sod_id)) as sessions,
             max(ts) as last_ts
      from public.events
      where ts > now() - interval '60 minutes'
        and surface = 'app_health'
        and not coalesce(is_bot,false)
        and event_type in ('save_failed','auth_failed','load_failed','runtime_error')
        and props ->> 'reason' in ('no_receipt','storage_full','storage_blocked',
          'storage_unavailable','sync_error','sync_conflict','network','server_error',
          'session_missing','refresh_failed','chunk_error','render_error','unknown')
      group by event_type, props ->> 'reason'
      having count(distinct coalesce(session_id,sod_id)) >= 3
      order by sessions desc limit 4
    loop
      v_fp := md5('app_health|' || r.event_type || '|' || r.failure_code);
      if not exists (select 1 from public.work_log where
          topic = '🚨 כשל פעולה באפליקציה (אוטומטי)'
          and open_threads = 'fp:' || v_fp
          and created_at > now() - interval '6 hours') then
        insert into public.work_log(session_date,topic,what_we_did,status,open_threads)
        values (current_date,'🚨 כשל פעולה באפליקציה (אוטומטי)',
          format('%s / %s: %s אירועים, %s סשנים שונים ב-60 דקות. מקור events/app_health בלבד. הסיבה עדיין UNKNOWN.',
            r.event_type,r.failure_code,r.n,r.sessions), 'alert','fp:' || v_fp);
        begin
          perform public.suggest_add('performance','app_health_incident',
            format('כשל פעולה חוזר: %s / %s (%s סשנים)',
              r.event_type,r.failure_code,r.sessions),
            'נדרש לאמת את הפעולה, אישור השרת והחזרה לאחר רענון. אין שינוי מערכת אוטומטי.',
            jsonb_build_object('event_type',r.event_type,'failure_code',r.failure_code,
              'events',r.n,'sessions',r.sessions,'last_seen',r.last_ts,'window_minutes',60),
            least(90,50+r.sessions::int),r.sessions::int,
            'נתב לפי חוזה בעלים, בדוק רגרסיה ו-SHA פריסה; לא לבצע rollback אוטומטי',
            'app_health_incident:' || v_fp || ':' || to_char(now() at time zone 'utc','YYYYMMDD'));
        exception when others then null; end;
        begin
          perform public.notify_admin('🚨 סוד1820 — כשל פעולה באפליקציה' || chr(10) ||
            r.event_type || '/' || r.failure_code || ': ' || r.sessions || ' sessions');
        exception when others then null; end;
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

-- Existing EXECUTE restrictions are preserved; never make this public.
revoke all on function public.fn_reliability_watch() from public, anon, authenticated;
commit;
