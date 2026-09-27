-- HEALTH_WATCH_DB_SIZE_FALSE_ALERT_V1
-- Human-Gate ZURIEL 2026-09-27.
-- EXTEND_EXISTING System Health / system_suggestions_law v5.
--
-- The previous health watcher treated pg_database_size() > 1400 MB as an
-- infrastructure-pressure alert because that was near effective_cache_size.
-- effective_cache_size is planner/cache guidance, not a hard database-size
-- capacity limit. DB size remains visible in health context, but is no longer
-- itself an alert reason. Real pressure signals remain connections, long active
-- query, idle-in-transaction, plus the existing WhatsApp/channel checks.

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

revoke all on function public.fn_health_watch() from public, anon, authenticated;
grant execute on function public.fn_health_watch() to service_role;

comment on function public.fn_health_watch() is
  'System Health watcher: real pressure + bounded WhatsApp health. DB size is informational only; 15m cadence under system_suggestions_law v5 resource policy.';
