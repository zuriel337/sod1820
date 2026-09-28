-- EGRESS_HARDENING_MONITORING_V1
-- EXTEND_EXISTING: traffic_intelligence_law v11 + system_suggestions_law v5 +
-- research_intake_foundation_contract_law v13.
-- No SEO/sitemap/VideoObject changes: parallel SEO session owns that scope.
-- No new table/store/health system: observations live in existing analytics_cache,
-- projection stays admin_system_health(), alerts stay fn_health_watch().
--
-- IMPORTANT TRUTH BOUNDARY:
-- storage_egress_observed_* = OBSERVED_STORAGE_LOGS only.
-- supabase_cached_egress = provider billed quota and remains UNKNOWN until a provider usage
-- data source is connected. Never equate observed log bytes with provider billing.

create or replace function public.admin_system_health()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
  v_conns int;
  v_max int;
  v_longest numeric;
  v_idletx int;
  v_dbsize bigint;
  v_cron jsonb;
  v_bots jsonb;
  v_comm jsonb;
  v_media jsonb;
  v_security jsonb;
  v_usage jsonb;
  v_retention jsonb;
  v_retention_summary jsonb;
begin
  if auth.role() <> 'service_role' and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  -- DB: connections/max/longest-active/idle-in-tx/database bytes.
  select count(*) into v_conns from pg_stat_activity where backend_type = 'client backend';
  select setting::int into v_max from pg_settings where name = 'max_connections';
  select coalesce(max(extract(epoch from (now() - query_start))), 0) into v_longest
    from pg_stat_activity
    where state = 'active' and backend_type = 'client backend'
      and query not ilike '%pg_stat_activity%';
  select count(*) into v_idletx from pg_stat_activity where state = 'idle in transaction';
  select pg_database_size(current_database()) into v_dbsize;

  -- cron: active/inactive + last status/failures-24h, by job name only. Never command/secrets.
  begin
    select coalesce(jsonb_agg(c order by c ->> 'job_name'), '[]'::jsonb) into v_cron
    from (
      select jsonb_build_object(
        'job_name', j.jobname,
        'active', j.active,
        'last_status', lr.last_status,
        'last_run_at', lr.last_run_at,
        'failures_24h', coalesce(lr.failures_24h, 0)
      ) c
      from cron.job j
      left join lateral (
        select
          (array_agg(d.status order by d.start_time desc))[1] as last_status,
          max(d.start_time) as last_run_at,
          count(*) filter (
            where d.status = 'failed' and d.start_time > now() - interval '24 hours'
          ) as failures_24h
        from cron.job_run_details d
        where d.jobid = j.jobid
      ) lr on true
    ) x;
  exception when others then
    v_cron := '[]'::jsonb;
  end;

  -- bots: outbox pending/failed + LIVE bot cron activity read from cron.job directly
  -- (never trust a stale bot_dashboard.active, which is a lagging activity heuristic).
  begin
    select jsonb_build_object(
      'outbox_pending', (select count(*) from public.bot_outbox where status in ('pending', 'queued')),
      'outbox_failed', (select count(*) from public.bot_outbox where status in ('failed', 'error')),
      'cron', (
        select coalesce(jsonb_agg(jsonb_build_object('job_name', jobname, 'active', active) order by jobname), '[]'::jsonb)
        from cron.job
        where jobname ilike 'wa-%' or jobname in ('bot-watchdog', 'check_stuck_messages_raziel')
      )
    ) into v_bots;
  exception when others then
    v_bots := jsonb_build_object('outbox_pending', 0, 'outbox_failed', 0, 'cron', '[]'::jsonb);
  end;

  -- communications: aggregate status counts only (queued/failed/sent/...). Never chat_id/reply text.
  begin
    select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into v_comm
    from (select status, count(*) as n from public.bot_outbox group by status) s;
  exception when others then
    v_comm := '{}'::jsonb;
  end;

  -- media/storage: aggregate bytes/object counts by MIME major type, large-object thresholds,
  -- migration-queue statuses, public gallery thumbnail health (missing vs original-as-thumb kept
  -- exactly separate), channel_updates thumbnail health, and gallery/post/channel thumb-cron
  -- activity. Never object paths/filenames/private bucket contents/raw metadata.
  -- NOTE: "public gallery" = published gallery_images rows (published = 1, not curator-hidden).
  begin
    select jsonb_build_object(
      'storage', jsonb_build_object(
        'total_objects', (select count(*) from storage.objects),
        'total_bytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects),
        'by_type', (
          select coalesce(jsonb_object_agg(mime_major, jsonb_build_object('count', n, 'bytes', bytes)), '{}'::jsonb)
          from (
            select
              case split_part(coalesce(metadata ->> 'mimetype', ''), '/', 1)
                when 'image' then 'image'
                when 'video' then 'video'
                when 'audio' then 'audio'
                else 'document'
              end as mime_major,
              count(*) as n,
              sum(coalesce((metadata ->> 'size')::bigint, 0)) as bytes
            from storage.objects
            group by 1
          ) t
        ),
        'large_objects', jsonb_build_object(
          'over_20mb', (select count(*) from storage.objects where coalesce((metadata ->> 'size')::bigint, 0) > 20 * 1024 * 1024),
          'over_50mb', (select count(*) from storage.objects where coalesce((metadata ->> 'size')::bigint, 0) > 50 * 1024 * 1024)
        )
      ),
      'migration_queue_status_counts', (
        select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
        from (select status, count(*) as n from public.media_migration_queue group by status) q
      ),
      'migration_queue_bytes', (select coalesce(sum(size), 0) from public.media_migration_queue),
      'migration_queue_objects', (select count(*) from public.media_migration_queue),
      'large_object_count', (select count(*) from pg_largeobject_metadata),
      'gallery', jsonb_build_object(
        'public_visible_count', (
          select count(*) from public.gallery_images
          where published = 1 and coalesce(curator_hidden, false) = false
        ),
        'missing_thumb_count', (
          select count(*) from public.gallery_images
          where published = 1 and coalesce(curator_hidden, false) = false
            and thumb_url is null
        ),
        'original_as_thumb_count', (
          select count(*) from public.gallery_images
          where published = 1 and coalesce(curator_hidden, false) = false
            and thumb_url is not null and thumb_url = image_url
        )
      ),
      'channel_updates', jsonb_build_object(
        'image_rows', (select count(*) from public.channel_updates where image_url is not null),
        'missing_thumb', (select count(*) from public.channel_updates where image_url is not null and thumb_url is null)
      ),
      'delivery_risk', jsonb_build_object(
        'public_bucket_objects', (
          select count(*) from storage.objects where bucket_id in ('media','gallery')
        ),
        'public_bucket_bytes', (
          select coalesce(sum(coalesce((metadata ->> 'size')::bigint,0)),0)
          from storage.objects where bucket_id in ('media','gallery')
        ),
        'public_video_objects', (
          select count(*) from storage.objects
          where bucket_id in ('media','gallery')
            and lower(coalesce(metadata ->> 'mimetype','')) like 'video/%'
        ),
        'public_video_bytes', (
          select coalesce(sum(coalesce((metadata ->> 'size')::bigint,0)),0)
          from storage.objects
          where bucket_id in ('media','gallery')
            and lower(coalesce(metadata ->> 'mimetype','')) like 'video/%'
        ),
        'public_video_no_cache', (
          select count(*) from storage.objects
          where bucket_id in ('media','gallery')
            and lower(coalesce(metadata ->> 'mimetype','')) like 'video/%'
            and lower(coalesce(metadata ->> 'cacheControl','')) = 'no-cache'
        ),
        'public_over_50mb', (
          select count(*) from storage.objects
          where bucket_id in ('media','gallery')
            and coalesce((metadata ->> 'size')::bigint,0) > 50 * 1024 * 1024
        ),
        'channel_video_missing_thumb', (
          select count(*) from public.channel_updates
          where image_url ~* '\\.(mp4|webm|mov|m4v)(\\?|#|$)'
            and thumb_url is null
        )
      ),
      'thumb_cron', (
        select coalesce(jsonb_agg(c order by c ->> 'job_name'), '[]'::jsonb)
        from (
          select jsonb_build_object(
            'job_name', j.jobname,
            'active', j.active,
            'schedule', j.schedule,
            'last_status', lr.last_status,
            'last_run_at', lr.last_run_at,
            'failures_24h', coalesce(lr.failures_24h, 0)
          ) c
          from cron.job j
          left join lateral (
            select
              (array_agg(d.status order by d.start_time desc))[1] as last_status,
              max(d.start_time) as last_run_at,
              count(*) filter (
                where d.status = 'failed' and d.start_time > now() - interval '24 hours'
              ) as failures_24h
            from cron.job_run_details d
            where d.jobid = j.jobid
          ) lr on true
          where j.jobname in ('gallery-thumbs', 'post-thumbs', 'channel-thumbs')
        ) x
      )
    ) into v_media;
  exception when others then
    v_media := '{}'::jsonb;
  end;

  -- security: unacked/recent count only.
  begin
    select jsonb_build_object(
      'unacked', (select count(*) from public.security_alerts where not acked),
      'recent_24h', (select count(*) from public.security_alerts where ts > now() - interval '24 hours')
    ) into v_security;
  exception when others then
    v_security := jsonb_build_object('unacked', 0, 'recent_24h', 0);
  end;

  -- AI/provider/Vercel usage: existing aggregates only, exact/estimated/unknown honesty.
  -- agent_token_costs is exact billed usage. vercel_usage_estimate is a named ESTIMATE.
  -- Exact Supabase cached-egress is UNKNOWN: no provider data source exists for it yet.
  begin
    select jsonb_build_object(
      'ai_cost_usd_7d', (select coalesce(sum(cost_usd), 0) from public.agent_token_costs where created_at > now() - interval '7 days'),
      'ai_cost_basis', 'EXACT',
      'vercel_bandwidth_mb_est_7d', (select coalesce(sum(est_vercel_bandwidth_mb), 0) from public.vercel_usage_estimate where day > current_date - 7),
      'vercel_bandwidth_basis', 'ESTIMATED',
      'storage_egress_observed_latest', (
        select payload
        from public.analytics_cache
        where cache_key like 'infra_egress_hour:%'
           or cache_key like 'infra_egress_observed:%'
        order by computed_at desc
        limit 1
      ),
      'storage_egress_observed_latest_at', (
        select computed_at
        from public.analytics_cache
        where cache_key like 'infra_egress_hour:%'
           or cache_key like 'infra_egress_observed:%'
        order by computed_at desc
        limit 1
      ),
      'storage_egress_observed_24h_bytes', (
        select nullif(sum((payload ->> 'storage_get_bytes')::numeric),0)
        from public.analytics_cache
        where cache_key like 'infra_egress_hour:%'
          and computed_at > now() - interval '24 hours'
      ),
      'storage_egress_observed_history_24h', (
        select coalesce(jsonb_agg(x order by x ->> 'at'), '[]'::jsonb)
        from (
          select jsonb_build_object(
            'at', computed_at,
            'bytes', coalesce((payload ->> 'storage_get_bytes')::numeric,0),
            'bot_share', coalesce((payload #>> '{traffic_classes,bot_share}')::numeric,0),
            'largest_get_bytes', coalesce((payload #>> '{risk,largest_observed_single_get_bytes}')::numeric,0),
            'burst_files', coalesce((payload #>> '{risk,simultaneous_mp4_burst_files}')::numeric,0)
          ) x
          from public.analytics_cache
          where cache_key like 'infra_egress_hour:%'
            and computed_at > now() - interval '24 hours'
          order by computed_at desc
          limit 24
        ) h
      ),
      'storage_egress_observed_basis', 'OBSERVED_STORAGE_LOGS',
      'supabase_egress_historical_exact', (
        select payload
        from public.analytics_cache
        where cache_key like 'infra_egress_provider_history:%'
        order by computed_at desc
        limit 1
      ),
      'supabase_egress_historical_exact_basis', 'EXACT_BILLING_HISTORY',
      'storage_egress_guard', jsonb_build_object(
        'warn_hour_bytes', 100 * 1024 * 1024,
        'critical_hour_bytes', 500 * 1024 * 1024,
        'warn_24h_bytes', 2::bigint * 1024 * 1024 * 1024,
        'critical_24h_bytes', 5::bigint * 1024 * 1024 * 1024,
        'warn_bot_share', 0.50,
        'state', (
          with latest as (
            select computed_at,
                   coalesce((payload ->> 'storage_get_bytes')::numeric,0) as hour_bytes,
                   coalesce((payload #>> '{traffic_classes,bot_share}')::numeric,0) as bot_share
            from public.analytics_cache
            where cache_key like 'infra_egress_hour:%'
            order by computed_at desc
            limit 1
          ), day24 as (
            select coalesce(sum((payload ->> 'storage_get_bytes')::numeric),0) as bytes
            from public.analytics_cache
            where cache_key like 'infra_egress_hour:%'
              and computed_at > now() - interval '24 hours'
          )
          select case
            when latest.computed_at is null then 'NO_HOURLY_DATA'
            when latest.computed_at < now() - interval '2 hours' then 'STALE'
            when latest.hour_bytes >= 500 * 1024 * 1024 or day24.bytes >= 5::bigint * 1024 * 1024 * 1024 then 'CRITICAL'
            when latest.hour_bytes >= 100 * 1024 * 1024 or day24.bytes >= 2::bigint * 1024 * 1024 * 1024
              or (latest.bot_share >= 0.50 and latest.hour_bytes >= 50 * 1024 * 1024) then 'WARN'
            else 'OK'
          end
          from latest cross join day24
        )
      ),
      'supabase_cached_egress', null,
      'supabase_cached_egress_basis', 'UNKNOWN'
    ) into v_usage;
  exception when others then
    v_usage := jsonb_build_object('ai_cost_basis', 'UNKNOWN', 'vercel_bandwidth_basis', 'UNKNOWN', 'supabase_cached_egress_basis', 'UNKNOWN');
  end;

  -- retention: pointer/summary from the existing admin_retention_preview() — reused, not
  -- duplicated. No per-table retention logic is re-implemented here.
  begin
    v_retention := public.admin_retention_preview();
    select jsonb_build_object(
      'contract', v_retention ->> 'contract',
      'mode', v_retention ->> 'mode',
      'delete_authorized', v_retention -> 'delete_authorized',
      'tables_assessed', jsonb_array_length(coalesce(v_retention -> 'tables', '[]'::jsonb)),
      'generated_at', v_retention ->> 'generated_at',
      'pointer', 'public.admin_retention_preview() for full per-table detail'
    ) into v_retention_summary;
  exception when others then
    v_retention_summary := jsonb_build_object(
      'pointer', 'public.admin_retention_preview() for full per-table detail',
      'error', 'unavailable'
    );
  end;

  select jsonb_build_object(
    'db', jsonb_build_object(
      'connections', v_conns,
      'max_connections', v_max,
      'longest_active_query_seconds', round(v_longest),
      'idle_in_transaction', v_idletx,
      'database_bytes', v_dbsize
    ),
    'cron', v_cron,
    'bots', v_bots,
    'communications', v_comm,
    'media', v_media,
    'security', v_security,
    'usage', v_usage,
    'retention', v_retention_summary,
    'generated_at', now()
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.admin_system_health() from public, anon;
grant execute on function public.admin_system_health() to authenticated, service_role;

comment on function public.admin_system_health() is
  'EGRESS_HARDENING_MONITORING_V1 — admin/service-only bounded read projection (system_suggestions_law v2 + research_intake_foundation_contract_law v11 + experience_governance_foundation_v1_law v6 + prior foundation owners). Bounded, privacy-safe operational facts only: no cron command text or secrets, no recipient addresses, no object paths/filenames, no raw private content, no universal score. Media projection includes storage by-type/large-object bytes, delivery-risk aggregates, gallery/channel_updates thumbnail health and backend thumb-cron activity. Usage includes bounded OBSERVED_STORAGE_LOGS snapshots from existing analytics_cache with 1h/24h thresholds and history; provider billed cached-egress remains explicitly UNKNOWN. Retention is a pointer/summary of admin_retention_preview(), never duplicated. Fail-closed: service_role or rd_is_admin() only.';


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
end;
$function$;

revoke all on function public.fn_health_watch() from public, anon, authenticated;
grant execute on function public.fn_health_watch() to service_role;

comment on function public.fn_health_watch() is
  'System Health watcher: real pressure + OBSERVED Storage Egress guard + bounded WhatsApp health. Provider billed Cached Egress remains UNKNOWN. DB size is informational only; 15m cadence under system_suggestions_law v5.';

