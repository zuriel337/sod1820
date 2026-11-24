-- fn_reliability_watch (b): calibrated measurement-silence alerts in the EXISTING detector (PROPOSAL, NOT APPLIED).
-- Package: docs/reviews/measurement-silence-watch-20261124/README.md. Apply only on an explicit ZURIEL approval of this exact file.
--
-- Owners: system_suggestions_law v7 (reliability/health tree, fn_health_watch -> fn_reliability_watch) watching the
-- traffic_intelligence_law v11 meters. No contract text, table, cron, detector name or notification channel is added:
-- section (b) keeps its work_log + notify_admin outputs; sections (a), the heartbeat and the three G3 guards are unchanged.
-- ingest_event is not touched, so there is no ordering dependency on PR #1545.
--
-- Why: the old (b) dead-man watched "any human event in events" only. It stayed silent through the 4.11-15.11 page-view
-- gap (RUM kept flowing) and fired 12 alert hours in 20.10-24.11, 8 of them Shabbat quiet with no human visit at all.
-- What: (b1) total silence also reads site_visits and waits 240 min Friday 15:00-Saturday 23:00 Israel time (90 otherwise);
-- (b2) page_view_stopped / page_view_partial / visit_meter_stopped compare page/view, site_visits and RUM over the same
-- window, two consecutive checks, one alert per incident per 24 h. Thresholds and replay: README.
-- Guard: the live definition must be the one read on 24.11.2026 (md5 3cc04b93669c01d33f513a2c8867f104).
-- Rollback: 20261124230000_measurement_silence_watch_ROLLBACK.sql.
do $migration$
declare
  v_fn constant regprocedure := 'public.fn_reliability_watch()'::regprocedure;
  v_new constant text := $rw$
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
  c_dead_man_shabbat_minutes constant int := 240;
  v_shabbat boolean;
  v_limit int;
  v_last_sv timestamptz;
  v_last_any timestamptz;
  v_kind text;
  v_found text;
  v_at timestamptz;
  v_pv30 bigint; v_pvs30 bigint; v_pv60 bigint; v_sv30 bigint; v_svv30 bigint; v_sv60 bigint; v_rum30 bigint;
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

  -- (b) measurement silence (v2_measurement_silence_20261124; traffic_intelligence_law v11 measurement health under
  -- system_suggestions_law v7; same outputs as before: one work_log alert + notify_admin, no new store or detector table).
  -- Calibrated on live data 24.11.2026 (README docs/reviews/measurement-silence-watch-20261124):
  --   b1 total silence counts site_visits as well as events, and waits 240 min from Friday 15:00 to Saturday 23:00
  --      (Israel time); 90 min otherwise. Replay 20.10-24.11: 1 incident (4.11, the cutover) instead of 12 alert hours,
  --      8 of them Shabbat quiet with no human visit at all.
  --   b2 family silence compares three independent meters over the same window: page/view (events), site_visits
  --      (track_visit) and RUM hard loads (performance/web_vital distinct sample_id). It fires only when the same
  --      condition holds at this check and at the check 15 minutes earlier. Replay: 0 alerts in 1,522 checks of the
  --      Legacy period and 0 since 16.11 00:15; first alert 5.11 04:30 UTC in the 4.11-15.11 measurement gap.
  --      page_view_stopped:   no page/view in 30 min while >=5 human visitors or RUM loads (or >=3 of each) are seen
  --                           (largest natural value seen with no page view: 3);
  --      page_view_partial:   >=20 human site_visits in 60 min and page views < 0.35 of them (lowest natural ratio 0.67);
  --      visit_meter_stopped: no human site_visit in 30 min while >=5 sessions have a page view.
  --   One alert per 24 hours while it lasts (page-view stopped and partial count as one); total silence as before (3 h).
  begin
    v_shabbat := (extract(dow from now() at time zone 'Asia/Jerusalem') = 5 and extract(hour from now() at time zone 'Asia/Jerusalem') >= 15)
              or (extract(dow from now() at time zone 'Asia/Jerusalem') = 6 and extract(hour from now() at time zone 'Asia/Jerusalem') < 23);
    v_limit := case when v_shabbat then c_dead_man_shabbat_minutes else c_dead_man_minutes end;
    select max(ts) into v_last
    from public.events
    where ts > now() - interval '24 hours'
      and not coalesce(is_bot, false)
      and surface not in ('runtime_error', 'canary')
      and event_type is distinct from 'issue_report';
    select max(ts) into v_last_sv from public.site_visits where ts > now() - interval '24 hours' and not is_bot;
    v_last_any := greatest(v_last, v_last_sv);
    v_gap := case when v_last_any is null then null else extract(epoch from (now() - v_last_any)) / 60 end;
    if v_last_any is null or v_gap > v_limit then
      if not exists (
        select 1 from public.work_log
        where topic = '🚨 ניטור ingest אירועים (אוטומטי)'
          and created_at > now() - interval '3 hours'
      ) then
        v_msg := case when v_last_any is null
          then 'אין אירוע אדם ואין ביקור אדם אחד ב־24 השעות האחרונות (events ו־site_visits). חוסר נתונים אינו בריאות.'
          else format('אין אירוע אדם ואין ביקור אדם %s דקות (events ו־site_visits; סף %s%s). אחרון: %s.',
                      round(v_gap), v_limit, case when v_shabbat then ', שבת' else '' end,
                      to_char(v_last_any at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI')) end;
        insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
        values (current_date, '🚨 ניטור ingest אירועים (אוטומטי)', v_msg, 'alert',
          'שני מדי האתר שקטים יחד: תקלה כוללת (אתר, Service Worker, ingest_event, track_visit) או היעדר גולשים. לבדוק את האתר ואת הפריסה האחרונה.');
        begin
          perform public.notify_admin('🚨 סוד1820 — אין מדידה ואין ביקורים' || chr(10) || v_msg);
        exception when others then null;
        end;
      end if;
    end if;

    v_kind := null;
    for k in 0..1 loop
      v_at := now() - make_interval(mins => 15 * k);
      select count(*), count(distinct session_id) into v_pv30, v_pvs30 from public.events
        where surface = 'page' and event_type = 'view' and ts >= v_at - interval '30 minutes' and ts < v_at;
      select count(*) into v_pv60 from public.events
        where surface = 'page' and event_type = 'view' and ts >= v_at - interval '60 minutes' and ts < v_at;
      select count(*) filter (where ts >= v_at - interval '30 minutes'), count(distinct visitor) filter (where ts >= v_at - interval '30 minutes'), count(*)
        into v_sv30, v_svv30, v_sv60 from public.site_visits
        where not is_bot and ts >= v_at - interval '60 minutes' and ts < v_at;
      select count(distinct props ->> 'sample_id') into v_rum30 from public.events
        where surface = 'performance' and event_type = 'web_vital' and ts >= v_at - interval '30 minutes' and ts < v_at;
      v_found := case
        when v_pv30 = 0 and (greatest(v_svv30, v_rum30) >= 5 or (v_svv30 >= 3 and v_rum30 >= 3)) then 'page_view_stopped'
        when v_sv60 >= 20 and v_pv60 < 0.35 * v_sv60 then 'page_view_partial'
        when v_sv30 = 0 and v_pvs30 >= 5 then 'visit_meter_stopped'
      end;
      if k = 0 then
        v_kind := v_found;
        v_msg := format('ב־30 הדקות האחרונות: צפיות בדף %s (סשנים %s) · ביקורים אנושיים %s (מבקרים %s) · טעינות RUM %s. ב־60 דקות: צפיות %s מול ביקורים %s.',
                        v_pv30, v_pvs30, v_sv30, v_svv30, v_rum30, v_pv60, v_sv60);
      elsif v_found is distinct from v_kind then
        v_kind := null;  -- not the same condition 15 minutes ago: wait for the next check
      end if;
    end loop;
    -- page_view_stopped and page_view_partial are one incident for the 24-hour dedupe.
    if v_kind is not null and not exists (
      select 1 from public.work_log
      where topic = '🚨 ניטור הפסקת מדידה (אוטומטי)'
        and open_threads like 'kind:' || case when v_kind like 'page_view%' then 'page_view' else v_kind end || '%'
        and created_at > now() - interval '24 hours'
    ) then
      v_msg := case v_kind
        when 'page_view_stopped' then 'צפיות בדף לא נקלטות, אבל יש גולשים לפי מדדים אחרים. '
        when 'page_view_partial' then 'חלק גדול מהצפיות בדף לא נקלט ביחס לביקורים. '
        else 'מד הביקורים (track_visit) שקט, אבל צפיות בדף נקלטות. ' end || v_msg;
      insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
      values (current_date, '🚨 ניטור הפסקת מדידה (אוטומטי)', v_msg, 'alert', 'kind:' || v_kind);
      begin
        perform public.notify_admin('🚨 סוד1820 — הפסקת מדידה' || chr(10) || v_msg);
      exception when others then null;
      end;
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
$function$
$rw$;
begin
  if md5(pg_get_functiondef(v_fn)) <> '3cc04b93669c01d33f513a2c8867f104' then
    raise exception 'Unexpected fn_reliability_watch definition %', md5(pg_get_functiondef(v_fn));
  end if;
  execute v_new;
  if position('v2_measurement_silence_20261124' in pg_get_functiondef(v_fn)) = 0 then
    raise exception 'fn_reliability_watch was not replaced';
  end if;
end;
$migration$;
