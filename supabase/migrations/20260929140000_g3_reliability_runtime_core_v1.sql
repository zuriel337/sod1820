-- G3_RELIABILITY_RUNTIME_CORE_V1 (assignment f2e9e150-f6c9-43f3-bdb7-b148c4581372)
-- EXTEND_EXISTING: system_suggestions_law v5 + traffic_intelligence_law v11.
-- Additive only: no new table/store/cron. BRANCH_ONLY — not applied to any live DB.
--   * detect_suggestions(): + detector 4 (runtime_error_incident, from events.surface='runtime_error')
--     + detector 5 (health_watch_dead_man, from analytics_cache heartbeat). Upgrade-radar body preserved verbatim.
--   * fn_health_watch(): + heartbeat + dead-man for events-ingest / canary / notify. Existing DB-load,
--     egress and WhatsApp semantics preserved verbatim. Cron cadence (every 15m) unchanged.

CREATE OR REPLACE FUNCTION public.detect_suggestions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  n_raised int := 0;
  r record; best record; worst record; gap numeric; conf int;
  pending_ct int;
  v_pkg record;
  v_resp record;
  v_latest text;
  v_cur_maj int; v_cur_min int; v_cur_pat int;
  v_lat_maj int; v_lat_min int; v_lat_pat int;
  v_delta text;
  v_dep_conf int;
  v_impact text;
  v_lock jsonb;
  v_current text;
  v_node_current text;
  v_node_latest text;
  v_node_maj int; v_node_min int; v_node_pat int;
  v_node_lat_maj int; v_node_lat_min int; v_node_lat_pat int;
  v_hb_at timestamptz;
begin
  -- גלאי 1: השוואת סגנונות לפי continue-rate (דורש ≥40 ניתוחים לכל סגנון, ≥2 סגנונות)
  create temp table _st on commit drop as
    select l.style_key,
           count(*) n,
           round(100.0*count(*) filter (where l.continue_ct>0)/count(*),1) cont_rate
    from ai_analysis_log l
    group by l.style_key having count(*) >= 40;
  if (select count(*) from _st) >= 2 then
    select * into best from _st order by cont_rate desc limit 1;
    select * into worst from _st order by cont_rate asc limit 1;
    gap := best.cont_rate - worst.cont_rate;
    if gap >= 10 then
      conf := least(95, round(45 + gap + least(30, (best.n+worst.n)/10.0)));
      perform suggest_add(
        'ai', 'style_continue_rate',
        format('סגנון «%s» מוביל בהמשך-מחקר על פני «%s»', best.style_key, worst.style_key),
        format('היוריסטיקה מבוססת-נתונים (לא מובהקות סטטיסטית מלאה): «%s» השיג %s%% המשך-חקירה מול %s%% של «%s», על מדגם של %s+%s ניתוחים.',
               best.style_key, best.cont_rate, worst.cont_rate, worst.style_key, best.n, worst.n),
        jsonb_build_object('best', row_to_json(best), 'worst', row_to_json(worst), 'gap_points', gap),
        conf, best.n + worst.n,
        format('הפעלת «%s» כברירת-מחדל עשויה להעלות המשך-מחקר בעד ~%s נקודות', best.style_key, round(gap)),
        'style_continue_rate:' || best.style_key || '>' || worst.style_key
      );
      if found then n_raised := n_raised + 1; end if;
    end if;
  end if;

  -- גלאי 2: נודניק — הרבה ניתוחים ממתינים לדירוג שלך (הדירוג הוא מה שמלמד את המערכת)
  select count(*) into pending_ct from ai_analysis_log where admin_rating is null;
  if pending_ct >= 20 then
    perform suggest_add(
      'ai', 'pending_ratings',
      format('%s ניתוחי-AI ממתינים לדירוג שלך', pending_ct),
      'הדירוג שלך (👍/👎 + סיבה) הוא ה«אמת המחקרית» שמזינה את דו"חות-הסגנון. ככל שתדרג יותר — ההמלצות יהיו מבוססות יותר.',
      jsonb_build_object('pending', pending_ct),
      70, pending_ct,
      'דירוג עשוי לחדד את זיהוי-הסגנון המנצח', 'pending_ratings'
    );
    if found then n_raised := n_raised + 1; end if;
  end if;

  -- גלאי 4 (G3_RELIABILITY_RUNTIME_CORE_V1): אירוע-ריצה חוזר בדפדפן. קורא רק את events.surface=
  -- 'runtime_error' הקיים (אותו surface של ErrorBoundary), רק אנשים (ingest_event ממילא זורק בוטים),
  -- סף >=5 sessions נפרדים ב-24 שעות, עד 3 תקריות לריצה, dedupe יומי. אפס AI, אפס טבלה חדשה.
  begin
    for r in
      select coalesce(props ->> 'message', 'unknown') as msg,
             event_type,
             count(*) as n,
             count(distinct coalesce(session_id, sod_id)) as sessions,
             count(distinct path) as paths,
             max(ts) as last_ts,
             (array_agg(path order by ts desc))[1] as sample_path
      from public.events
      where surface = 'runtime_error'
        and ts > now() - interval '24 hours'
        and not coalesce(is_bot, false)
      group by 1, 2
      having count(distinct coalesce(session_id, sod_id)) >= 5
      order by sessions desc, n desc
      limit 3
    loop
      perform suggest_add(
        'performance', 'runtime_error_incident',
        format('שגיאת-ריצה חוזרת בדפדפן (%s sessions ב-24 שעות): %s', r.sessions, left(r.msg, 80)),
        format('אותה הודעת שגיאה (%s) דווחה ע"י %s sessions נפרדים על %s נתיבים, %s אירועים, אחרון ב-%s. מקור: events.surface=runtime_error. אין כאן סיבת-שורש — רק תקרית שחוזרת.',
               r.event_type, r.sessions, r.paths, r.n, to_char(r.last_ts at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI')),
        jsonb_build_object('message', left(r.msg, 200), 'event_type', r.event_type, 'events', r.n,
                           'sessions', r.sessions, 'paths', r.paths, 'sample_path', r.sample_path,
                           'last_seen', r.last_ts, 'window_hours', 24),
        least(90, 50 + r.sessions), r.sessions,
        'לבדוק את הפריסה האחרונה ואת ה-canary; אין rollback אוטומטי',
        'runtime_error_incident:' || md5(r.event_type || '|' || left(r.msg, 200)) || ':' || to_char(now() at time zone 'utc', 'YYYYMMDD')
      );
      if found then n_raised := n_raised + 1; end if;
    end loop;
  exception when others then
    null;
  end;

  -- גלאי 5 (G3_RELIABILITY): dead-man ל-fn_health_watch עצמו. הוא לא יכול לזהות שהוא תקוע, לכן
  -- מריץ heartbeat ב-analytics_cache הקיים והגלאי הזה (בנתיב system_watchman) בודק אותו.
  begin
    select computed_at into v_hb_at from public.analytics_cache where cache_key = 'reliability_heartbeat:health_watch';
    if v_hb_at is not null and v_hb_at < now() - interval '45 minutes' then
      perform suggest_add(
        'performance', 'health_watch_dead_man',
        'fn_health_watch לא רץ מעל 45 דקות',
        format('ה-heartbeat האחרון של health-watch: %s. הסכמה הרגילה היא כל 15 דקות. חוסר heartbeat אינו בריאות.',
               to_char(v_hb_at at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI')),
        jsonb_build_object('last_heartbeat', v_hb_at, 'expected_every_minutes', 15),
        85, 1, 'ניטור התשתית עצמו כבוי — לבדוק cron.job health-watch',
        'health_watch_dead_man:' || to_char(now() at time zone 'utc', 'YYYYMMDD')
      );
      if found then n_raised := n_raised + 1; end if;
    end if;
  exception when others then
    null;
  end;

  -- גלאי 3: רדאר שדרוגי-תלות.
  -- Current-version authority is the lockfile/.nvmrc on origin/main, fetched only from the
  -- fixed SOD1820 raw GitHub paths below. Package names are a fixed allowlist; no URL/host comes
  -- from a user, DB row or suggestion payload.
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '3000');

  v_lock := null;
  begin
    select status, content into v_resp
      from extensions.http((
        'GET',
        'https://raw.githubusercontent.com/zuriel337/sod1820/main/package-lock.json',
        array[]::extensions.http_header[],
        null,
        null
      )::extensions.http_request);
    if v_resp.status = 200 and v_resp.content is not null then
      v_lock := v_resp.content::jsonb;
    end if;
  exception when others then
    v_lock := null;
  end;

  if v_lock is not null then
    for v_pkg in
      select * from (values
        ('react'),
        ('react-dom'),
        ('react-router-dom'),
        ('vite'),
        ('@vitejs/plugin-react'),
        ('@supabase/supabase-js'),
        ('@vercel/edge'),
        ('@vercel/og'),
        ('@hebcal/core')
      ) as t(pkg_name)
    loop
      begin
        v_current := v_lock #>> array['packages', 'node_modules/' || v_pkg.pkg_name, 'version'];
        if v_current is null or v_current = '' or v_current ~ '-'
           or v_current !~ '^[0-9]+[.][0-9]+[.][0-9]+$' then
          continue;
        end if;

        v_latest := null;
        select status, content into v_resp
          from extensions.http((
            'GET',
            'https://registry.npmjs.org/' || replace(v_pkg.pkg_name, '/', '%2F') || '/latest',
            array[]::extensions.http_header[],
            null,
            null
          )::extensions.http_request);

        if v_resp.status <> 200 or v_resp.content is null then
          continue;
        end if;

        v_latest := (v_resp.content::jsonb ->> 'version');
        if v_latest is null or v_latest = '' or v_latest ~ '-'
           or v_latest !~ '^[0-9]+[.][0-9]+[.][0-9]+$' then
          continue;
        end if;

        v_cur_maj := split_part(v_current, '.', 1)::int;
        v_cur_min := split_part(v_current, '.', 2)::int;
        v_cur_pat := split_part(v_current, '.', 3)::int;
        v_lat_maj := split_part(v_latest, '.', 1)::int;
        v_lat_min := split_part(v_latest, '.', 2)::int;
        v_lat_pat := split_part(v_latest, '.', 3)::int;

        v_delta := null;
        if v_lat_maj > v_cur_maj then
          v_delta := 'major'; v_dep_conf := 55;
        elsif v_lat_maj = v_cur_maj and v_lat_min > v_cur_min then
          v_delta := 'minor'; v_dep_conf := 75;
        elsif v_lat_maj = v_cur_maj and v_lat_min = v_cur_min and v_lat_pat > v_cur_pat then
          v_delta := 'patch'; v_dep_conf := 90;
        end if;

        if v_delta is not null then
          v_impact := case v_delta
            when 'patch' then format('שדרוג patch בטוח יחסית (%s → %s) — להריץ CI מלא לפני שחרור', v_current, v_latest)
            when 'minor' then format('שדרוג minor (%s → %s) — לבדוק Changelog ותאימות לפני שחרור', v_current, v_latest)
            else format('שדרוג MAJOR (%s → %s) — דורש Foundation Gate לפני שחרור', v_current, v_latest)
          end;
          perform suggest_add(
            'performance', 'dependency_upgrade_radar',
            format('עדכון %s זמין: %s → %s (%s)', v_pkg.pkg_name, v_current, v_latest, v_delta),
            'הגרסה הנוכחית נקראה מ-package-lock.json של origin/main; הגרסה החדשה מתג latest היציב של registry.npmjs.org. גרסאות prerelease אינן נספרות.',
            jsonb_build_object(
              'package', v_pkg.pkg_name,
              'current', v_current,
              'latest', v_latest,
              'delta', v_delta,
              'current_source', 'raw.githubusercontent.com/zuriel337/sod1820/main/package-lock.json',
              'latest_source', 'registry.npmjs.org'
            ),
            v_dep_conf, 1, v_impact,
            'dependency_upgrade:' || v_pkg.pkg_name || ':' || v_latest
          );
          if found then n_raised := n_raised + 1; end if;
        end if;
      exception when others then
        continue;
      end;
    end loop;
  end if;

  -- Node LTS radar: current runtime comes from origin/main .nvmrc; the latest release is selected
  -- only from the same pinned major and only where the official Node feed marks it as LTS.
  v_node_current := null;
  begin
    select status, content into v_resp
      from extensions.http((
        'GET',
        'https://raw.githubusercontent.com/zuriel337/sod1820/main/.nvmrc',
        array[]::extensions.http_header[],
        null,
        null
      )::extensions.http_request);
    if v_resp.status = 200 and v_resp.content is not null then
      v_node_current := regexp_replace(btrim(v_resp.content, E' \t\n\r'), '^v', '');
    end if;

    if v_node_current ~ '^[0-9]+[.][0-9]+[.][0-9]+$' then
      v_node_maj := split_part(v_node_current, '.', 1)::int;
      v_node_min := split_part(v_node_current, '.', 2)::int;
      v_node_pat := split_part(v_node_current, '.', 3)::int;
      v_node_latest := null;

      select status, content into v_resp
        from extensions.http((
          'GET',
          'https://nodejs.org/dist/index.json',
          array[]::extensions.http_header[],
          null,
          null
        )::extensions.http_request);

      if v_resp.status = 200 and v_resp.content is not null then
        select regexp_replace(entry ->> 'version', '^v', '')
          into v_node_latest
        from jsonb_array_elements(v_resp.content::jsonb) entry
        where (entry ->> 'version') ~ ('^v' || v_node_maj::text || '[.][0-9]+[.][0-9]+$')
          and jsonb_typeof(entry -> 'lts') = 'string'
        order by
          split_part(regexp_replace(entry ->> 'version', '^v', ''), '.', 2)::int desc,
          split_part(regexp_replace(entry ->> 'version', '^v', ''), '.', 3)::int desc
        limit 1;
      end if;

      if v_node_latest is not null and v_node_latest !~ '-' then
        v_node_lat_maj := split_part(v_node_latest, '.', 1)::int;
        v_node_lat_min := split_part(v_node_latest, '.', 2)::int;
        v_node_lat_pat := split_part(v_node_latest, '.', 3)::int;
        v_delta := null;

        if v_node_lat_maj = v_node_maj and v_node_lat_min > v_node_min then
          v_delta := 'minor'; v_dep_conf := 85;
        elsif v_node_lat_maj = v_node_maj and v_node_lat_min = v_node_min and v_node_lat_pat > v_node_pat then
          v_delta := 'patch'; v_dep_conf := 95;
        end if;

        if v_delta is not null then
          perform suggest_add(
            'performance', 'dependency_upgrade_radar',
            format('עדכון Node LTS זמין: %s → %s (%s)', v_node_current, v_node_latest, v_delta),
            'הגרסה הנוכחית נקראה מ-.nvmrc של origin/main והגרסה החדשה מ-index.json הרשמי של nodejs.org. מעבר major נשאר Foundation Gate.',
            jsonb_build_object(
              'package', 'node',
              'current', v_node_current,
              'latest', v_node_latest,
              'delta', v_delta,
              'current_source', 'raw.githubusercontent.com/zuriel337/sod1820/main/.nvmrc',
              'latest_source', 'nodejs.org/dist/index.json',
              'lts_major', v_node_maj
            ),
            v_dep_conf, 1,
            format('עדכון Node LTS בתוך major %s (%s → %s) — להריץ CI מלא לפני שחרור', v_node_maj, v_node_current, v_node_latest),
            'dependency_upgrade:node:' || v_node_latest
          );
          if found then n_raised := n_raised + 1; end if;
        end if;
      end if;
    end if;
  exception when others then
    null;
  end;

  perform extensions.http_reset_curlopt();

  return jsonb_build_object('raised', n_raised, 'checked_at', now());
end; $function$;

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
  v_dm text[] := '{}';
  v_ev_at timestamptz;
  v_cn_at timestamptz;
  v_cn_type text;
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

  -- ===== G3_RELIABILITY_RUNTIME_CORE_V1: heartbeat + dead-man לאותות קיימים =====
  -- בלי טבלה/cron חדשים: heartbeat נכתב ל-analytics_cache הקיים, התראות ל-work_log + notify_admin
  -- הקיימים, עם dedupe של 6 שעות. חוסר נתונים מדווח כ-sensor_stale, לעולם לא כבריאות.
  begin
    insert into public.analytics_cache(cache_key, payload, computed_at)
    values ('reliability_heartbeat:health_watch', jsonb_build_object('ok', true), now())
    on conflict (cache_key) do update set payload = excluded.payload, computed_at = excluded.computed_at;

    -- (1) events-ingest: אין אירוע-אדם 2+ שעות (הקצב הרגיל: אלפים ביום)
    select max(ts) into v_ev_at from public.events where ts > now() - interval '1 day';
    if v_ev_at is null or v_ev_at < now() - interval '2 hours' then
      v_dm := v_dm || format('events-ingest: אירוע אחרון %s', coalesce(to_char(v_ev_at at time zone 'Asia/Jerusalem','DD.MM HH24:MI'),'לא ב-24 שעות'));
    end if;

    -- (2) canary: אין דיווח canary 26+ שעות (הקצב: עד 4 ביום) או דיווח fail אחרון
    select ts, event_type into v_cn_at, v_cn_type
      from public.events where surface = 'canary' order by ts desc limit 1;
    if v_cn_at is not null and v_cn_at < now() - interval '26 hours' then
      v_dm := v_dm || format('canary: דיווח אחרון %s', to_char(v_cn_at at time zone 'Asia/Jerusalem','DD.MM HH24:MI'));
    elsif v_cn_type = 'fail' then
      v_dm := v_dm || format('canary: הריצה האחרונה (%s) נכשלה', to_char(v_cn_at at time zone 'Asia/Jerusalem','DD.MM HH24:MI'));
    end if;

    -- (3) notify: אין ערוץ admin_notify פעיל = התראות לא יגיעו לאף אחד
    if not exists (select 1 from public.admin_notify where enabled and channel = 'whatsapp' and coalesce(target,'') <> '') then
      v_dm := v_dm || 'notify: אין ערוץ WhatsApp פעיל ב-admin_notify';
    end if;

    if array_length(v_dm, 1) is not null and not exists (
      select 1 from public.work_log
      where topic = '🚨 ניטור Dead-man (אוטומטי)' and created_at > now() - interval '6 hours'
    ) then
      v_msg := 'אותות ניטור חסרים/כושלים: ' || array_to_string(v_dm, ' · ') || '. חוסר נתונים אינו בריאות.';
      insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
      values (current_date, '🚨 ניטור Dead-man (אוטומטי)', v_msg, 'sensor_stale',
              'מקור: fn_health_watch (G3_RELIABILITY_RUNTIME_CORE_V1). canary כושל חוסם רק את השחרור הבא; אין rollback אוטומטי.');
      begin perform public.notify_admin('🚨 סוד1820 — אות ניטור חסר' || chr(10) || v_msg); exception when others then null; end;
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
end;
$function$;

revoke all on function public.detect_suggestions() from public, anon, authenticated;
revoke all on function public.fn_health_watch() from public, anon, authenticated;
grant execute on function public.fn_health_watch() to service_role;
