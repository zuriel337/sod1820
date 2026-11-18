-- PROPOSAL — NOT APPLIED. Provider freshness watch + high-severity notification fix + recorded Search Console sync answer.
-- ZURIEL 18.11.2026 (stage 2 of docs/reviews/analytics-google-seo-closure-20261118/README.md). Apply only with his explicit approval.
--
-- Owners (no new contract, store or collector):
--   traffic_intelligence_law v11 — the sources (gsc_metrics from gsc-sync, traffic_history 'ga' from ga-sync-server);
--   system_suggestions_law v7    — a stale source becomes a de-duplicated recommendation through the existing suggest_add();
--   control-plane plan §13–14    — "dead telemetry sensor": alert only when a source stopped, never on normal fluctuation.
-- Why: the scheduled syncs are recorded as successful as soon as net.http_post is queued (5 ms), whether or not data arrived.
-- The watch reads the data itself. A missing source is reported as missing, never as zero. Nothing is deleted or rewritten.
--
-- Read live 18.11.2026 (linswmnnkjxvweumprav); every part is guarded on that read, and a second apply is a no-op.
-- Side effect to know before applying: user_notifications has trg_user_notification_wa_project (AFTER INSERT), so a high notice also
-- reaches the admin's WhatsApp projection. One notice per suggestion (dedupe_key), not one per hourly refresh.

begin;

-- 1. The freshness watch (read-only over the two stores; writes only through suggest_add).
create or replace function public.fn_provider_freshness_watch()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_gsc_through date;
  v_gsc_fetch timestamptz;
  v_ga_through date;
  v_ga_write timestamptz;
  v_gsc_state text;
  v_ga_state text;
begin
  -- Search Console: Google publishes with a 2–3 day delay; gsc-daily-sync runs 05:17 UTC and re-reads the last 7 days.
  select max(date), max(fetched_at) into v_gsc_through, v_gsc_fetch from public.gsc_metrics where dimension = 'total';
  v_gsc_state := case
    when v_gsc_fetch is null then 'no_data'
    when v_gsc_fetch < now() - interval '30 hours' then 'sync_stopped'
    when v_gsc_through < current_date - 5 then 'data_stale'
    else 'fresh' end;

  -- GA4: ga4-daily-server-sync runs 05:27 UTC and writes the last 7 days, today included (partial).
  select max(period), max(created_at) into v_ga_through, v_ga_write
    from public.traffic_history where source = 'ga' and granularity = 'day';
  v_ga_state := case
    when v_ga_write is null then 'no_data'
    when v_ga_write < now() - interval '30 hours' then 'sync_stopped'
    when v_ga_through < current_date - 2 then 'data_stale'
    else 'fresh' end;

  if v_gsc_state <> 'fresh' then
    perform public.suggest_add('data_quality', 'provider_freshness_watch',
      'מקור נתונים הפסיק להתעדכן: Google Search Console',
      format('מצב: %s. נתונים עד %s, סנכרון אחרון %s. ״הצלחה״ של המשימה המתוזמנת אינה הוכחה שהגיעו נתונים; חוסר נתונים אינו אפס.',
        v_gsc_state, coalesce(v_gsc_through::text, 'אין'), coalesce(to_char(v_gsc_fetch at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI'), 'אין')),
      jsonb_build_object('severity', 'high', 'source', 'gsc', 'state', v_gsc_state, 'data_through', v_gsc_through, 'last_fetch', v_gsc_fetch),
      90, 1, 'high', 'provider_freshness:gsc:' || v_gsc_state);
  end if;

  if v_ga_state <> 'fresh' then
    perform public.suggest_add('data_quality', 'provider_freshness_watch',
      'מקור נתונים הפסיק להתעדכן: Google Analytics 4',
      format('מצב: %s. נתונים עד %s, סנכרון אחרון %s. ״הצלחה״ של המשימה המתוזמנת אינה הוכחה שהגיעו נתונים; חוסר נתונים אינו אפס.',
        v_ga_state, coalesce(v_ga_through::text, 'אין'), coalesce(to_char(v_ga_write at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI'), 'אין')),
      jsonb_build_object('severity', 'high', 'source', 'ga4', 'state', v_ga_state, 'data_through', v_ga_through, 'last_write', v_ga_write),
      90, 1, 'high', 'provider_freshness:ga4:' || v_ga_state);
  end if;

  return jsonb_build_object(
    'checked_at', now(),
    'gsc', jsonb_build_object('state', v_gsc_state, 'data_through', v_gsc_through, 'last_fetch', v_gsc_fetch),
    'ga4', jsonb_build_object('state', v_ga_state, 'data_through', v_ga_through, 'last_write', v_ga_write));
end;
$function$;

revoke all on function public.fn_provider_freshness_watch() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on function public.fn_provider_freshness_watch() from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on function public.fn_provider_freshness_watch() from authenticated'; end if;
end $$;

-- 2. High-severity notification. Two defects, read live 18.11.2026 (md5 c99975e5af83bf4999bf702f33bab986; no admin_system_high notice ever):
--    (a) severity is read only from observed->>'severity', which no detector writes (they pass 'high' as estimated_impact);
--    (b) the insert omits user_notifications.email, which is NOT NULL, so even a high row fails and the handler swallows the error.
--    The fix reads either field and writes the admin's account e-mail; the rest is the live function unchanged. It applies only over the
--    exact live text (md5) or is a no-op over the fixed text; any other version stops the transaction.
do $$
declare v_def text := pg_get_functiondef('public.fn_system_suggestion_notify_high()'::regprocedure);
begin
  if md5(v_def) = 'c99975e5af83bf4999bf702f33bab986' then return; end if;
  if position('r.email, ''admin_system_high''' in v_def) > 0 and position('new.estimated_impact' in v_def) > 0 then return; end if;
  raise exception 'fn_system_suggestion_notify_high changed since the 18.11.2026 read (md5 %); re-read before applying', md5(v_def);
end $$;

create or replace function public.fn_system_suggestion_notify_high()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_sev text := lower(coalesce(nullif(new.observed->>'severity', ''),
    case when lower(coalesce(new.estimated_impact, '')) in ('high', 'critical') then new.estimated_impact end, ''));
  v_title text := left(regexp_replace(coalesce(new.title, ''), '[\r\n\t]+', ' ', 'g'), 80);
  v_cat text := left(regexp_replace(coalesce(new.category, ''), '[\r\n\t]+', ' ', 'g'), 40);
begin
  if v_sev not in ('high', 'critical') or coalesce(new.status, '') <> 'pending' then return new; end if;
  begin
    for r in
      select p.user_id, lower(coalesce(nullif(u.email, ''), nullif(p.email, ''))) as email from public.notification_prefs p
        join public.users u on u.id = p.user_id and u.role = 'admin'
       where p.user_id is not null and 'admin:system_high' = any(coalesce(p.topics, '{}'::text[]))
         and coalesce(nullif(u.email, ''), nullif(p.email, '')) is not null
    loop
      insert into public.user_notifications(user_id, email, kind, title, body, source_topic, source_ref, dedupe_key)
      values (r.user_id, r.email, 'admin_system_high', 'תקלת מערכת ' || case v_sev when 'critical' then 'קריטית' else 'חמורה' end,
              concat_ws(' · ', nullif(v_title, ''), nullif(v_cat, ''), v_sev),
              'admin:system_high', 'system_suggestion:' || new.id::text,
              'system_high:' || r.user_id::text || ':' || new.id::text)
      on conflict do nothing;
    end loop;
  exception when others then
    null; -- must never block the system_suggestions write
  end;
  return new;
end $function$;

-- 3. Scheduling (existing pg_cron), only where pg_cron exists: the watch hourly at minute 41 (after both 05:17 / 05:27 syncs), and the
--    Search Console call waits for the real answer (120 s) so net._http_response records it. The command is changed only if the
--    exact 18.11.2026 body is found once; otherwise the transaction stops.
do $$
declare
  v_job bigint;
  v_cmd text;
  v_old text := 'body:=jsonb_build_object(''days'',7,''site'',''sc-domain:sod1820.co.il''))';
  v_new text := 'body:=jsonb_build_object(''days'',7,''site'',''sc-domain:sod1820.co.il''),timeout_milliseconds:=120000)';
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then return; end if;
  perform cron.schedule('provider-freshness-watch', '41 * * * *', 'select public.fn_provider_freshness_watch()');
  select jobid, command into v_job, v_cmd from cron.job where jobname = 'gsc-daily-sync';
  if v_job is null then raise exception 'gsc-daily-sync not found'; end if;
  if position(v_new in v_cmd) > 0 and position(v_old in v_cmd) = 0 then return; end if; -- already applied
  if (length(v_cmd) - length(replace(v_cmd, v_old, ''))) / length(v_old) <> 1 then
    raise exception 'gsc-daily-sync command changed since the 18.11.2026 read; re-read before applying';
  end if;
  perform cron.alter_job(v_job, command := replace(v_cmd, v_old, v_new));
end $$;

commit;
