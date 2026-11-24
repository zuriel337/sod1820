-- Local fixture: the tables and helpers fn_reliability_watch touches, and the function EXACTLY as read live on 24.11.2026.
create table public.events(event_id uuid default gen_random_uuid(), ts timestamptz not null, sod_id text, person_id uuid,
  session_id text, surface text, event_type text, path text, via text, is_bot boolean default false, props jsonb) partition by range(ts);
create table public.events_all partition of public.events for values from ('2000-01-01') to ('2100-01-01');
create table public.site_visits(id bigserial primary key, ts timestamptz default now(), path text, referrer text, visitor text, device text, is_bot boolean default false);
create table public.analytics_cache(cache_key text primary key, payload jsonb, computed_at timestamptz default now());
create table public.work_log(id uuid primary key default gen_random_uuid(), session_date date default current_date, topic text not null,
  what_we_did text, status text, open_threads text, created_at timestamptz default now());
create table public.notices(t text, at timestamptz default clock_timestamp());
create function public.notify_admin(p_text text, p_image_url text default null) returns void language sql as $$ insert into public.notices(t) values (p_text) $$;
create function public.suggest_add(p_category text, p_detector text, p_title text, p_reason text, p_observed jsonb, p_confidence integer, p_sample integer, p_impact text, p_dedupe text) returns void language sql as $$ select $$;
create function public.fn_retention_enforcement_guard_v1() returns void language sql as $$ select $$;
create function public.fn_telemetry_retention_guard_v1() returns void language sql as $$ select $$;
create function public.fn_capacity_growth_guard_v1() returns void language sql as $$ select $$;
CREATE OR REPLACE FUNCTION public.fn_reliability_watch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
