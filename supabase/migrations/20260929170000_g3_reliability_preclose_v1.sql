-- G3_RELIABILITY_PRECLOSE_CURRENT_MAIN_V3 (assignment 7f192e57-8f4e-4559-ad93-1360e47cbca3)
-- EXTEND_EXISTING: system_suggestions_law v5 + traffic_intelligence_law v11 + deploy_on_request v2.
-- BRANCH_ONLY — NOT applied to any live DB. No new table / store / cron / release system.
--   * fn_reliability_watch(): runtime_error + issue_report incident detection, events-ingest dead-man and
--     health-watch heartbeat. Called from the EXISTING */15 fn_health_watch -> work_log + notify_admin.
--   * fn_reliability_heartbeat_status(): narrow public read of health-watch age/health only.
--   * fn_release_canary_override{,_status}: audited Human-Gate override in EXISTING analytics_cache; writer stays service_role-only.
--   * exact-SHA canary evidence/enforcement lives in existing GitHub commit-status / Actions release infrastructure.
--   * deploy_on_request v3: adds the canary gate to the v2 AUTO-RELEASE PREFLIGHT (no auto rollback).
--   * detect_suggestions() is intentionally NOT touched (weekly summaries only; not on the incident path).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. incident / dead-man detection, terminating in notify_admin (via fn_health_watch)
-- Dead-man threshold — MEASURED 2026-09-29 on live events (human, non-canary/runtime_error, 30d, n=134144 gaps):
--   p50=0.0m p99=5.3m p99.9=17.7m; worst hourly p99=9.1m; gaps >60m: 15, >90m: 5 (on 2 days), >120m: 3, max 516m.
--   Threshold = 90 minutes (~5x p99.9). The old 2h design tripped 3x/30d; 90m trips <=2 days/30d and is one
--   alert per 3h max. runtime_error / issue_report / canary rows are EXCLUDED: they never prove ingest is alive.
--   No normal event in 24h (or ever) is an ALERT — no-data != healthy.
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
end;
$function$;

revoke all on function public.fn_reliability_watch() from public, anon, authenticated;

-- fn_health_watch: body preserved verbatim from live; only the final guarded call to fn_reliability_watch is added.
create or replace function public.fn_health_watch()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_conns int;
  v_max int;
  v_longest numeric;
  v_idletx int;
  v_dbsize bigint;
  v_msg text;
  v_reasons text[] := '{}';
  v_wa jsonb;
  v_wa_state text;
  v_wa_stale text;
  v_egress_latest_at timestamptz;
  v_egress_hour numeric := 0;
  v_egress_24h numeric := 0;
  v_egress_bot_share numeric := 0;
begin
  select count(*) into v_conns
  from pg_stat_activity
  where backend_type = 'client backend';

  select setting::int into v_max
  from pg_settings
  where name = 'max_connections';

  select coalesce(max(extract(epoch from (now() - query_start))), 0)
  into v_longest
  from pg_stat_activity
  where state = 'active'
    and backend_type = 'client backend'
    and query not ilike '%pg_stat_activity%';

  select count(*) into v_idletx
  from pg_stat_activity
  where state = 'idle in transaction';

  select pg_database_size(current_database()) into v_dbsize;

  if v_conns > v_max * 0.8 then
    v_reasons := v_reasons || format('חיבורים %s/%s (>80%%)', v_conns, v_max);
  end if;
  if v_longest > 30 then
    v_reasons := v_reasons || format('שאילתה תקועה %ss', round(v_longest));
  end if;
  if v_idletx > 5 then
    v_reasons := v_reasons || format('idle-in-tx %s', v_idletx);
  end if;

  if array_length(v_reasons, 1) is not null then
    v_msg := '⚠️ עומס-תשתית זוהה: '
      || array_to_string(v_reasons, ' · ')
      || format(' | חיבורים %s/%s, DB %s (מידע בלבד)', v_conns, v_max, pg_size_pretty(v_dbsize));

    if not exists (
      select 1
      from public.work_log
      where topic = '🚨 ניטור בריאות תשתית (אוטומטי)'
        and created_at > now() - interval '1 hour'
    ) then
      insert into public.work_log (
        session_date, topic, what_we_did, status, open_threads
      )
      values (
        current_date,
        '🚨 ניטור בריאות תשתית (אוטומטי)',
        v_msg,
        'alert',
        'נבדק כל 15 דקות ע"י fn_health_watch. גודל DB מוצג כמידע בלבד; פעל לפי סיבת הלחץ המפורשת.'
      );

      begin
        perform public.notify_admin(
          '🚨 סוד1820 — התראת-תשתית'
          || chr(10)
          || v_msg
          || chr(10)
          || '(נרשם ביומן. בדוק את סיבת הלחץ המפורשת.)'
        );
      exception when others then
        null;
      end;
    end if;
  end if;

  -- Storage egress observation guard. Provider billed Cached Egress remains UNKNOWN; this reads
  -- only hourly OBSERVED_STORAGE_LOGS snapshots written into the existing analytics_cache.
  begin
    select computed_at,
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

    if v_egress_latest_at is not null and v_egress_latest_at < now() - interval '2 hours' then
      if not exists (
        select 1 from public.work_log
        where topic = '🚨 ניטור Egress/Storage (אוטומטי)'
          and status = 'sensor_stale'
          and created_at > now() - interval '6 hours'
      ) then
        v_msg := format(
          'חיישן Storage Egress לא התעדכן מאז %s. אין לפרש חוסר נתונים כבריאות.',
          to_char(v_egress_latest_at at time zone 'Asia/Jerusalem','DD.MM HH24:MI')
        );
        insert into public.work_log(session_date,topic,what_we_did,status,open_threads)
        values(current_date,'🚨 ניטור Egress/Storage (אוטומטי)',v_msg,'sensor_stale',
          'מקור המדידה: OBSERVED_STORAGE_LOGS; provider Cached Egress billing נשאר UNKNOWN.');
        begin perform public.notify_admin('🚨 סוד1820 — חיישן Egress תקוע' || chr(10) || v_msg); exception when others then null; end;
      end if;
    elsif v_egress_latest_at is not null and (
      v_egress_hour >= 100 * 1024 * 1024
      or v_egress_24h >= 2::bigint * 1024 * 1024 * 1024
      or (v_egress_bot_share >= 0.50 and v_egress_hour >= 50 * 1024 * 1024)
    ) then
      if not exists (
        select 1 from public.work_log
        where topic = '🚨 ניטור Egress/Storage (אוטומטי)'
          and status in ('warn','critical')
          and created_at > now() - interval '1 hour'
      ) then
        v_msg := format(
          'OBSERVED Storage Egress: שעה אחרונה %s, 24 שעות %s, bot share %s%%. provider Cached Egress billing אינו נמדד כאן.',
          pg_size_pretty(v_egress_hour::bigint),
          pg_size_pretty(v_egress_24h::bigint),
          round(v_egress_bot_share * 100,1)
        );
        insert into public.work_log(session_date,topic,what_we_did,status,open_threads)
        values(
          current_date,
          '🚨 ניטור Egress/Storage (אוטומטי)',
          v_msg,
          case when v_egress_hour >= 500 * 1024 * 1024 or v_egress_24h >= 5::bigint * 1024 * 1024 * 1024 then 'critical' else 'warn' end,
          'בדוק /2029/control → Media / Egress. בסיס: OBSERVED_STORAGE_LOGS, לא חשבונית provider.'
        );
        begin perform public.notify_admin('🚨 סוד1820 — חריגת Storage Egress' || chr(10) || v_msg); exception when others then null; end;
      end if;
    end if;
  exception when others then
    null;
  end;

  -- Bounded Green API/channel probe inside the existing health owner.
  -- health-watch now runs every 15m; this modulo gate yields two probes/hour.
  if mod(extract(minute from now())::int, 10) = 0 then
    begin
      v_wa := public.wa_admin('getStateInstance', '{}'::jsonb, 'GET');
      v_wa_state := coalesce(v_wa #>> '{result,stateInstance}', 'unknown');
    exception when others then
      v_wa_state := 'probe_error';
    end;

    if v_wa_state <> 'authorized' then
      v_msg := format(
        'WhatsApp/Green API אינו מחובר: stateInstance=%s. channel ingest cron לבדו אינו הוכחת זרימה.',
        v_wa_state
      );

      if not exists (
        select 1
        from public.work_log
        where topic = '🚨 ניטור ערוצי WhatsApp (אוטומטי)'
          and created_at > now() - interval '1 hour'
      ) then
        insert into public.work_log (
          session_date, topic, what_we_did, status, open_threads
        )
        values (
          current_date,
          '🚨 ניטור ערוצי WhatsApp (אוטומטי)',
          v_msg,
          'alert',
          'יש לחבר מחדש את Green API. לאחר החיבור wa-channel-ingest מבצע recovery oldest-first לפני חזרה ל-live polling.'
        );

        begin
          perform public.notify_admin('🚨 סוד1820 — WhatsApp מנותק' || chr(10) || v_msg);
        exception when others then
          null;
        end;
      end if;
    else
      select string_agg(
        format(
          '%s · last_success=%s · poll=%sm',
          coalesce(display_name,label,channel),
          coalesce(to_char(last_run_at at time zone 'Asia/Jerusalem','DD.MM HH24:MI'),'never'),
          coalesce(poll_every_min,5)
        ),
        ' | '
        order by priority, channel
      )
      into v_wa_stale
      from public.channel_ingest_sources
      where enabled
        and (
          last_run_at is null
          or last_run_at < now() - make_interval(mins => greatest(20, coalesce(poll_every_min,5) * 3))
        );

      if v_wa_stale is not null and not exists (
        select 1
        from public.work_log
        where topic = '🚨 ניטור ערוצי WhatsApp (אוטומטי)'
          and created_at > now() - interval '1 hour'
      ) then
        v_msg := 'Green API מחובר, אבל יש ערוצי ingest ללא poll מוצלח/עם recovery פתוח: ' || v_wa_stale;

        insert into public.work_log (
          session_date, topic, what_we_did, status, open_threads
        )
        values (
          current_date,
          '🚨 ניטור ערוצי WhatsApp (אוטומטי)',
          v_msg,
          'alert',
          'בדוק wa-channel-ingest debug trace. last_run_at מתקדם רק אחרי poll תקין; recovery משאיר אותו ישן בכוונה עד סגירת הפער.'
        );

        begin
          perform public.notify_admin('🚨 סוד1820 — WhatsApp ingest תקוע' || chr(10) || v_msg);
        exception when others then
          null;
        end;
      end if;
    end if;
  end if;

  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
  begin
    perform public.fn_reliability_watch();
  exception when others then
    null;
  end;
end;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. canary heartbeat + bounded Human-Gate override readers (no public write path)
create or replace function public.fn_reliability_heartbeat_status()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_hb timestamptz;
  v_age numeric;
begin
  select computed_at into v_hb
  from public.analytics_cache
  where cache_key = 'reliability_heartbeat:health_watch';
  v_age := case when v_hb is null then null else round(extract(epoch from (now() - v_hb)) / 60, 1) end;
  return jsonb_build_object(
    'healthy', v_age is not null and v_age <= 45,
    'age_minutes', v_age,
    'max_age_minutes', 45
  );
end;
$function$;

create or replace function public.fn_release_canary_override(p_reason text, p_hours int default 24)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_payload jsonb;
begin
  if p_reason is null or length(btrim(p_reason)) < 20 then raise exception 'override needs an explicit reason (>=20 chars)'; end if;
  if p_hours is null or p_hours < 1 or p_hours > 72 then raise exception 'hours must be 1..72'; end if;
  v_payload := jsonb_build_object('reason', left(p_reason, 500), 'granted_at', now(),
                                  'expires_at', now() + make_interval(hours => p_hours), 'granted_via', 'human_gate');
  insert into public.analytics_cache(cache_key, payload, computed_at)
  values ('release_canary:override', v_payload, now())
  on conflict (cache_key) do update set payload = excluded.payload, computed_at = excluded.computed_at;
  insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
  values (current_date, '🛂 Human-Gate override לשער ה-canary', left(p_reason, 500), 'override',
          'expires_at=' || (v_payload ->> 'expires_at'));
  return v_payload;
end;
$function$;

create or replace function public.fn_release_canary_override_status()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_ovr jsonb;
  v_allowed boolean := false;
begin
  select payload into v_ovr from public.analytics_cache where cache_key = 'release_canary:override';
  v_allowed := v_ovr is not null and (v_ovr ->> 'expires_at')::timestamptz > now();
  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', case when v_allowed then 'human_gate_override' else 'no_active_override' end,
    'expires_at', case when v_allowed then v_ovr ->> 'expires_at' else null end
  );
end;
$function$;

revoke all on function public.fn_reliability_heartbeat_status() from public;
revoke all on function public.fn_release_canary_override_status() from public;
revoke all on function public.fn_release_canary_override(text, int) from public, anon, authenticated;
grant execute on function public.fn_reliability_heartbeat_status() to anon, authenticated, service_role;
grant execute on function public.fn_release_canary_override_status() to anon, authenticated, service_role;
grant execute on function public.fn_release_canary_override(text, int) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. deploy_on_request v3 — extend the v2 AUTO-RELEASE PREFLIGHT with the canary gate (no new release system)
do $$
declare
  v_prev public.nodes%rowtype;
begin
  select * into v_prev from public.nodes
  where type = 'rule' and rule_id = 'deploy_on_request' and is_active = true
  order by rule_version desc limit 1 for update;
  if v_prev.id is null then raise exception 'deploy_on_request active owner not found'; end if;
  if v_prev.rule_version <> 2 then raise exception 'expected deploy_on_request v2, found v%', v_prev.rule_version; end if;
  if exists (select 1 from public.nodes where type = 'rule' and rule_id = 'deploy_on_request' and rule_version = 3) then
    raise exception 'deploy_on_request v3 already exists';
  end if;

  update public.nodes set is_active = false where id = v_prev.id;

  insert into public.nodes (type, label, description, metadata, is_active, rule_id, rule_version, depends_on,
                            supersedes_version, weight, hebrew_date, axis_theme, gallery_id, identity_key)
  values ('rule', v_prev.label,
    v_prev.description || E'\n\n'
      || '[UPDATE v3 · G3_RELIABILITY_PRECLOSE · EXTEND_EXISTING — PRODUCTION CANARY GATE FOR THE NEXT RELEASE]' || E'\n'
      || '1. PREFLIGHT ADDITION. AUTO-RELEASE PREFLIGHT (v2 §5) additionally requires the latest GitHub commit status with context sod1820/post-deploy-canary on the current successful Production deployment SHA to be success, unless public.fn_release_canary_override_status() reports an active bounded Human-Gate override. GitHub Actions/commit status is the release evidence; arbitrary events rows are never release evidence.' || E'\n'
      || '2. BLOCK, DO NOT ROLL BACK. Missing, failed or pending canary status for the exact Production SHA blocks the NEXT release only. There is no automatic rollback. Recovery = a fixing/deploy canary that passes, or an explicit audited Human-Gate override.' || E'\n'
      || '3. EXPLICIT AUDITED OVERRIDE. Only ZURIEL Human Gate may authorise select public.fn_release_canary_override(<reason>, <hours 1..72>); it writes work_log and expires. The public override-status reader exposes only active/expiry state, never grants an override.' || E'\n'
      || '4. SYNTHETIC ≠ GOLDEN. A synthetic canary PASS is a small deterministic zero-AI smoke set. GitHub workflow budget allows at most four scheduled/manual runs per UTC day; deploy-triggered runs are always evaluated. Canary never substitutes Golden/CI/security gates.' || E'\n'
      || '5. HEARTBEAT IS PART OF CANARY TRUTH. The external canary calls public.fn_reliability_heartbeat_status(); missing or >45m heartbeat makes the GitHub canary fail and records failure on the exact deployed SHA. The reader is read-only and exposes only age/health.' || E'\n'
      || '6. ONE-TIME INSTALL BOOTSTRAP. The single PR that first installs this gate may pass preflight only when its base-main does not yet contain scripts/release-canary-gate.mjs and no prior canary status exists. Once the gate runtime exists on main, every later release fails closed without exact-SHA success or explicit audited Human-Gate override.',
    coalesce(v_prev.metadata, '{}'::jsonb) || jsonb_build_object(
      'release_canary_gate', 'github_status:sod1820/post-deploy-canary',
      'release_canary_override', 'fn_release_canary_override',
      'release_canary_override_reader', 'fn_release_canary_override_status',
      'release_canary_heartbeat_reader', 'fn_reliability_heartbeat_status',
      'release_canary_evidence_store', 'github_commit_status',
      'release_canary_auto_rollback', false),
    true, 'deploy_on_request', 3, v_prev.depends_on, 2, v_prev.weight, v_prev.hebrew_date,
    v_prev.axis_theme, v_prev.gallery_id, v_prev.identity_key);
end
$$;
