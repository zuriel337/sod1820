-- G3_WA_CHANNELS_TO_WORLD_2029_V1
-- EXTEND_EXISTING only:
-- - channel_updates stays the source/ingress + Or-Geula story source
-- - research_objects stays the Research OS home
-- - fn_health_watch stays the health owner
-- - no new table/store/graph/truth system
-- BRANCH-ONLY until explicit ZURIEL "תעלה".

-- Resource/freshness balance:
-- Or-Geula story <= ~5m; heavy research channels <= ~5m; lower-priority language/reality channel <= ~15m.
update public.channel_ingest_sources
set poll_every_min = case channel
  when 'or-geula' then 5
  when 'torat-haremez' then 5
  when 'gilui-yomi' then 5
  when 'sfot-vheker' then 15
  else poll_every_min
end
where channel in ('or-geula','torat-haremez','gilui-yomi','sfot-vheker');

-- Service-only resolver for a private binary already bound to a channel_updates source row.
-- The source row stores only storage-object:<uuid>; bucket path and signed URL remain server-side.
create or replace function public.private_channel_media_access(
  p_channel_update_id uuid,
  p_storage_object_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_ref text;
  v_o record;
begin
  select image_url into v_ref
  from public.channel_updates
  where id = p_channel_update_id;

  if not found then raise exception 'channel update not found'; end if;
  if v_ref is distinct from ('storage-object:' || p_storage_object_id::text) then
    raise exception 'private media ref not bound to source';
  end if;

  select o.id,o.bucket_id,o.name,o.metadata into v_o
  from storage.objects o
  where o.id = p_storage_object_id
    and o.bucket_id = 'submission-inbox';

  if not found then raise exception 'storage object not found'; end if;

  return jsonb_build_object(
    'ok', true,
    'bucket', v_o.bucket_id,
    'path', v_o.name,
    'mime', lower(coalesce(v_o.metadata->>'mimetype','')),
    'size', coalesce(
      nullif(v_o.metadata->>'size','')::bigint,
      nullif(v_o.metadata->>'contentLength','')::bigint,
      0
    )
  );
end
$function$;

revoke all on function public.private_channel_media_access(uuid,uuid) from public, anon, authenticated;
grant execute on function public.private_channel_media_access(uuid,uuid) to service_role;

comment on function public.private_channel_media_access(uuid,uuid) is
  'G3_WA_CHANNELS_TO_WORLD_2029_V1: service-only private source-media resolver. Validates opaque storage-object id is bound to the exact channel_updates row before returning a submission-inbox path for short-lived server-side signing.';

do $cron$
declare
  v_id bigint;
  v_research_cmd text := $cmd$
    with s as (
      select decrypted_secret as key
      from vault.decrypted_secrets
      where name='FB_ADMIN_KEY'
      order by created_at desc
      limit 1
    )
    select net.http_get(
      url:='https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-channel-research-intake?hours=168&limit=4',
      headers:=jsonb_build_object('x-fb-admin-key',s.key),
      timeout_milliseconds:=55000
    )
    from s
    where nullif(s.key,'') is not null;
  $cmd$;
begin
  select jobid into v_id from cron.job where jobname='wa-channel-ingest';
  if v_id is null then
    raise exception 'missing cron job: wa-channel-ingest';
  end if;
  perform cron.alter_job(job_id := v_id, schedule := '*/5 * * * *');

  select jobid into v_id from cron.job where jobname='wa-channel-research-intake';
  if v_id is null then
    perform cron.schedule(
      'wa-channel-research-intake',
      '2,7,12,17,22,27,32,37,42,47,52,57 * * * *',
      v_research_cmd
    );
  else
    perform cron.alter_job(
      job_id := v_id,
      schedule := '2,7,12,17,22,27,32,37,42,47,52,57 * * * *',
      command := v_research_cmd,
      active := true
    );
  end if;
end
$cron$;

-- Extend the existing health owner. last_run_at is now "successful provider poll", including a valid
-- empty history; during bounded outage recovery wa-channel-ingest deliberately leaves it stale until
-- the known gap is consumed. That makes this check truthful instead of equating cron execution with flow.
create or replace function public.fn_health_watch()
returns void
language plpgsql
security definer
set search_path = public
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
  if v_dbsize > 1400 * 1024 * 1024 then
    v_reasons := v_reasons || format('DB %s מתקרב לגבול-מטמון', pg_size_pretty(v_dbsize));
  end if;

  if array_length(v_reasons, 1) is not null then
    v_msg := '⚠️ עומס-תשתית זוהה: '
      || array_to_string(v_reasons, ' · ')
      || format(' | חיבורים %s/%s, DB %s', v_conns, v_max, pg_size_pretty(v_dbsize));

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
        'אם חוזר — לשקול Compute Medium או להזיז בוטים למתזמן חיצוני. נבדק כל 5 דק ע"י fn_health_watch.'
      );

      begin
        perform public.notify_admin(
          '🚨 סוד1820 — התראת-תשתית'
          || chr(10)
          || v_msg
          || chr(10)
          || '(האתר עלול להיחנק. נרשם ביומן.)'
        );
      exception when others then
        null;
      end;
    end if;
  end if;

  -- Green API / channel flow probe every 10 minutes, inside the existing health owner.
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
  'G3_WA_CHANNELS_TO_WORLD_2029_V1: existing infrastructure watcher + Green API authorization and successful channel-poll freshness. Alerts terminate in canonical notify_admin and persist in work_log; no parallel watchdog.';
