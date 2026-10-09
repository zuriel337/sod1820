-- SOD1820_CONTROL_MONITORING_TIMEOUT_REPAIR_V1 — REVIEW CANDIDATE. BRANCH ONLY: not applied to any database.
-- Bounded performance repair of three existing admin readers (authenticated role runs under statement_timeout=8s):
--   admin_retention_preview, admin_system_health, admin_video_map_health.
-- Same signatures, same result shapes, same SECURITY DEFINER/search_path/volatility, same admin guards.
-- CREATE OR REPLACE keeps existing ACLs; no grant/revoke here. No new table/cache/registry/timeout change.
--
-- Root causes (from live catalog definitions; no production scan was run):
--  1. admin_retention_preview evaluated, per source row and twice (protected + unknown), a correlated
--     EXISTS over research_objects using LIKE / a dynamically built regex (wa_bot_log x ~1.8k refs,
--     wa_deep_queue, channel_updates). Dynamic patterns defeat the regex cache -> millions of recompiles.
--     Now: the referenced-id set is extracted ONCE from research_objects and matched by hash lookup.
--  2. admin_system_health runs that preview (above) and scans cron.job_run_details (no jobid index,
--     ~118k rows) once per cron job per section (40 jobs + 3). Now: one grouped pass, reused.
--  3. admin_video_map_health expanded the regex-heavy video_media_assets_v1 / placements_v1 views
--     ~13x. Now: the assets view is expanded once; placement count and per-source counts are
--     derived from that same single expansion (every placement belongs to exactly one asset).
--
-- Semantic parity notes (retention decisions unchanged):
--  * channel_updates.id is uuid (fixed 36 chars) so  source_ref LIKE 'channel_updates:'||id||'%'
--    is identical to substr(source_ref,17,36) = id::text.
--  * wa_*:  source_ref ~ '(^|[+])wa_x:ID(#|[+]|$)'  is identical to ID::text being in the set of
--    digit runs matched by '(?:^|[+])wa_x:([0-9]+)(?=#|[+]|$)' (lookahead keeps "+" reusable by the
--    next reference; leading zeros do not equal id::text in either form).

create or replace function public.admin_retention_preview()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if auth.role() <> 'service_role' and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  with ref_channel_updates as materialized (
    select distinct substr(ro.source_ref, 17, 36) as ref_id
    from public.research_objects ro
    where ro.source_ref like 'channel_updates:%'
  ),
  ref_wa_bot_log as materialized (
    select distinct m[1] as ref_id
    from public.research_objects ro,
         lateral regexp_matches(ro.source_ref, '(?:^|[+])wa_bot_log:([0-9]+)(?=#|[+]|$)', 'g') m
    where ro.source_ref like '%wa_bot_log:%'
  ),
  ref_wa_deep_queue as materialized (
    select distinct m[1] as ref_id
    from public.research_objects ro,
         lateral regexp_matches(ro.source_ref, '(?:^|[+])wa_deep_queue:([0-9]+)(?=#|[+]|$)', 'g') m
    where ro.source_ref like '%wa_deep_queue:%'
  ),
  rows as (
    select
      'channel_updates'::text as table_name,
      'SOURCE_INGRESS_PROVENANCE'::text as placement_role,
      'ACTIVE_SOURCE'::text as retention_class,
      count(*)::bigint as total_rows,
      min(created_at) as oldest_at,
      max(created_at) as newest_at,
      count(*) filter (
        where status in ('live','published','active')
           or channel_updates.id::text in (select ref_id from ref_channel_updates)
      )::bigint as protected_rows,
      0::bigint as purge_candidates,
      count(*) filter (
        where coalesce(status, '') not in ('live','published','active')
          and channel_updates.id::text not in (select ref_id from ref_channel_updates)
      )::bigint as unknown_dependency_rows,
      false as auto_purge_allowed,
      'Live broadcast/media source; referenced rows are provenance-protected. Unreferenced expired rows still require dependency review.'::text as reason
    from public.channel_updates

    union all

    select
      'wa_bot_log',
      'SOURCE_INGRESS_PROVENANCE',
      'HUMAN_REVIEW',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*) filter (where wa_bot_log.id::text in (select ref_id from ref_wa_bot_log))::bigint,
      0::bigint,
      count(*) filter (where wa_bot_log.id::text not in (select ref_id from ref_wa_bot_log))::bigint,
      false,
      'Raw WhatsApp interaction log. Direct Research OS references are protected; remaining rows still have historical timeline consumers.'
    from public.wa_bot_log

    union all

    select
      'wa_deep_queue',
      'OPERATIONAL_RUNTIME',
      'HUMAN_REVIEW',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*) filter (where wa_deep_queue.id::text in (select ref_id from ref_wa_deep_queue))::bigint,
      0::bigint,
      count(*) filter (where wa_deep_queue.id::text not in (select ref_id from ref_wa_deep_queue))::bigint,
      false,
      'Terminal queue rows are NOT purge-safe yet: live historical timeline code still reads this table and Research OS may reference individual rows.'
    from public.wa_deep_queue

    union all

    select
      'wa_vip_inbox',
      'SOURCE_INGRESS_PROVENANCE',
      'PROVENANCE_PROTECTED',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*)::bigint,
      0::bigint,
      0::bigint,
      false,
      'Raw VIP-author source intake feeding extraction and attribution. Keep until typed downstream provenance can fully replay the source.'
    from public.wa_vip_inbox

    union all

    select
      'wa_msg_ext',
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      0::bigint,
      0::bigint,
      count(*)::bigint,
      false,
      'Metadata/dedup index only; no message text. Candidate for bounded retention after reader/audit dependency proof and an explicit duration decision.'
    from public.wa_msg_ext

    union all

    select
      'wa_message_status',
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME',
      count(*)::bigint,
      min(incoming_at at time zone 'UTC'),
      max(incoming_at at time zone 'UTC'),
      0::bigint,
      0::bigint,
      count(*)::bigint,
      false,
      'Delivery/stuck/reply operational state. No automatic retention duration is assumed.'
    from public.wa_message_status

    union all

    select
      'visitor_events',
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME_120D',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*) filter (where created_at >= now()-interval '120 days')::bigint,
      count(*) filter (where created_at < now()-interval '120 days')::bigint,
      0::bigint,
      true,
      'ZURIEL Human Gate 2026-09-30: raw behavioral telemetry retained 120 days. Long-term traffic history remains with Traffic Intelligence aggregates; older Legacy raw detail is retired.'
    from public.visitor_events

    union all

    select
      'site_visits',
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME_120D',
      count(*)::bigint,
      min(ts),
      max(ts),
      count(*) filter (where ts >= now()-interval '120 days')::bigint,
      count(*) filter (where ts < now()-interval '120 days')::bigint,
      0::bigint,
      true,
      'ZURIEL Human Gate 2026-09-30: raw visit detail retained 120 days. Long-term canonical traffic totals stay in traffic_daily/traffic_history; old path/referrer/device detail is intentionally retired.'
    from public.site_visits

    union all

    select
      c.relname::text,
      'OPERATIONAL_RUNTIME',
      'BOUNDED_RUNTIME_120D',
      coalesce(s.n_live_tup, 0)::bigint,
      case
        when pg_get_expr(c.relpartbound,c.oid) = 'DEFAULT' then null::timestamptz
        else (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$FROM \('([^']+)'$$))[1]::timestamptz
      end,
      case
        when pg_get_expr(c.relpartbound,c.oid) = 'DEFAULT' then null::timestamptz
        else (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz
      end,
      case
        when (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz > now()-interval '120 days'
          then coalesce(s.n_live_tup,0)::bigint else 0::bigint end,
      case
        when (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz <= now()-interval '120 days'
          then coalesce(s.n_live_tup,0)::bigint else 0::bigint end,
      0::bigint,
      ((regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz <= now()-interval '120 days'),
      'ZURIEL Human Gate 2026-09-30: monthly raw events partition may retire only after Traffic Intelligence range refresh + exact day-coverage verification. At most one eligible partition is retired per maintenance run.'
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public'
      and p.relname = 'events'
      and c.relname <> 'events_default'

    union all

    select
      'work_log',
      'COORDINATION_PROVENANCE',
      'PROVENANCE_PROTECTED',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*)::bigint,
      0::bigint,
      count(*) filter (where coalesce(archived,false)=false and superseded_by_id is null and created_at < now()-interval '14 days')::bigint,
      false,
      'KEEP_FOREVER history authority under Research Intake §15.1. B3 enforcement changes only archived routing state; it never deletes provenance rows.'
    from public.work_log
  )
  select jsonb_build_object(
    'contract', 'research_intake_foundation_contract §11/§15 + foundation_closure_protocol_law v7',
    'mode', 'PREVIEW_WITH_SCOPED_TELEMETRY_AUTHORIZATION',
    'generated_at', now(),
    'delete_authorized', false,
    'authorized_delete_scopes', jsonb_build_array(
      jsonb_build_object('scope','events_monthly_partitions','raw_days',120,'human_gate','ZURIEL 2026-09-30'),
      jsonb_build_object('scope','visitor_events','raw_days',120,'human_gate','ZURIEL 2026-09-30'),
      jsonb_build_object('scope','site_visits','raw_days',120,'human_gate','ZURIEL 2026-09-30')
    ),
    'tables', coalesce(jsonb_agg(to_jsonb(rows) order by table_name), '[]'::jsonb)
  )
  into v_result
  from rows;

  return v_result;
end;
$function$;

create or replace function public.admin_system_health()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
  v_conns int;
  v_max int;
  v_longest numeric;
  v_idletx int;
  v_dbsize bigint;
  v_runs jsonb;
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

  -- cron run summary per job: ONE grouped pass over cron.job_run_details (no jobid index), reused by
  -- the cron and thumb_cron sections instead of one scan per job. Same last_status/last_run_at/failures_24h.
  begin
    select coalesce(jsonb_object_agg(d.jobid::text, jsonb_build_object(
             'last_status', d.last_status, 'last_run_at', d.last_run_at, 'failures_24h', d.failures_24h)), '{}'::jsonb)
      into v_runs
    from (
      select jobid,
             (array_agg(status order by start_time desc))[1] as last_status,
             max(start_time) as last_run_at,
             count(*) filter (where status = 'failed' and start_time > now() - interval '24 hours') as failures_24h
      from cron.job_run_details
      group by jobid
    ) d;
  exception when others then
    v_runs := null;
  end;

  -- cron: active/inactive + last status/failures-24h, by job name only. Never command/secrets.
  begin
    if v_runs is null then raise exception 'cron run details unavailable'; end if;
    select coalesce(jsonb_agg(c order by c ->> 'job_name'), '[]'::jsonb) into v_cron
    from (
      select jsonb_build_object(
        'job_name', j.jobname,
        'active', j.active,
        'last_status', v_runs -> j.jobid::text ->> 'last_status',
        'last_run_at', v_runs -> j.jobid::text ->> 'last_run_at',
        'failures_24h', coalesce((v_runs -> j.jobid::text ->> 'failures_24h')::bigint, 0)
      ) c
      from cron.job j
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
    if v_runs is null then raise exception 'cron run details unavailable'; end if;
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
      'dedupe_latest', (
        select payload
        from public.analytics_cache
        where cache_key like 'infra_media_dedupe_snapshot:%'
        order by computed_at desc
        limit 1
      ),
      'dedupe_latest_at', (
        select computed_at
        from public.analytics_cache
        where cache_key like 'infra_media_dedupe_snapshot:%'
        order by computed_at desc
        limit 1
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
            'last_status', v_runs -> j.jobid::text ->> 'last_status',
            'last_run_at', v_runs -> j.jobid::text ->> 'last_run_at',
            'failures_24h', coalesce((v_runs -> j.jobid::text ->> 'failures_24h')::bigint, 0)
          ) c
          from cron.job j
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

create or replace function public.admin_video_map_health()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_role text := coalesce(auth.jwt()->>'role','');
  v_summary jsonb;
  v_sources jsonb;
  v_kinds jsonb;
  v_series jsonb;
  v_cron jsonb;
  v_ai jsonb;
  v_channel jsonb;
  v_unresolved_category bigint := 0;
begin
  if v_role <> 'service_role' and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  -- The assets view (regex-heavy, built over placements_v1) is expanded ONCE. Placement totals and
  -- per-source counts derive from it: every placement belongs to exactly one asset
  -- (assets.placement_count = placements per asset_key; assets.placements lists each of them).
  with a as materialized (
    select asset_key, video_kind, media_url, google_indexable, uses_generic_page, is_duplicate_asset,
           has_unresolved_placement, cipher_slugs, series_keys, placement_count, placements
    from public.video_media_assets_v1
  )
  select
    jsonb_build_object(
      'placements', coalesce(sum(placement_count), 0)::bigint,
      'unique_assets', count(*),
      'google_indexable_assets', count(*) filter(where google_indexable),
      'generic_google_pages', count(*) filter(where google_indexable and uses_generic_page),
      'duplicate_assets', count(*) filter(where is_duplicate_asset),
      'assets_with_unresolved_placement', count(*) filter(where has_unresolved_placement),
      'cipher_assets', count(*) filter(where cardinality(cipher_slugs)>0),
      'mah_kore_habora_assets', count(*) filter(where 'mah-kore-habora'=any(series_keys)),
      'or_geula_assets', count(*) filter(where 'or-geula'=any(series_keys)),
      'torat_haremez_assets', count(*) filter(where 'torat-haremez'=any(series_keys)),
      'dimension_five_assets', count(*) filter(where 'dimension-five'=any(series_keys)),
      'legacy_storage_assets', count(*) filter(where media_url not like '%/sod1820/2029/video/%' and video_kind='selfhost'),
      'native_2029_storage_assets', count(*) filter(where media_url like '%/sod1820/2029/video/%')
    ),
    (
      select coalesce(jsonb_object_agg(source_type, n), '{}'::jsonb)
      from (
        select e ->> 'source_type' as source_type, count(*) n
        from a cross join lateral jsonb_array_elements(a.placements) e
        group by 1
      ) s
    ),
    (
      select coalesce(jsonb_object_agg(video_kind, n), '{}'::jsonb)
      from (select video_kind, count(*) n from a group by video_kind) s
    ),
    (
      select coalesce(jsonb_object_agg(series_key, n), '{}'::jsonb)
      from (
        select series_key, count(distinct asset_key) n
        from a cross join lateral unnest(a.series_keys) series_key
        group by series_key
      ) s
    )
  into v_summary, v_sources, v_kinds, v_series
  from a;

  select count(*) into v_unresolved_category
  from public.posts p
  where 'וידאו'=any(coalesce(p.categories,'{}'::text[]))
    and not ('טיוטה'=any(coalesce(p.tags,'{}'::text[])))
    and not ('פורום'=any(coalesce(p.tags,'{}'::text[])))
    and not (
      coalesce(p.content,'') ~* '\.(mp4|webm|m4v)(["''[:space:]<>?]|$)'
      or coalesce(p.content,'') ~* '(youtube\.com|youtu\.be|vimeo\.com)'
      or coalesce(p.content,'') ~* 'drive\.google\.com/'
      or coalesce(p.content,'') ~* '<iframe'
    );

  begin
    select jsonb_build_object(
      'job_name',j.jobname,'schedule',j.schedule,'active',j.active,
      'last_status',x.last_status,'last_run_at',x.last_run_at,'failures_24h',coalesce(x.failures_24h,0)
    )
    into v_cron
    from cron.job j
    left join lateral (
      select
        (array_agg(d.status order by d.start_time desc))[1] last_status,
        max(d.start_time) last_run_at,
        count(*) filter(where d.status='failed' and d.start_time>now()-interval '24 hours') failures_24h
      from cron.job_run_details d where d.jobid=j.jobid
    ) x on true
    where j.jobname='video-map-enrich'
    limit 1;
  exception when others then v_cron := null;
  end;

  with usage as (
    select l.model,count(*) calls,
           coalesce(sum(l.input_tokens),0)::bigint input_tokens,
           coalesce(sum(l.output_tokens),0)::bigint output_tokens
    from public.ai_token_log l
    where l.source in ('wa-video-enrich','video-map-enrich')
      and l.created_at>now()-interval '7 days'
    group by l.model
  ),
  priced as (
    select u.*,p.usd_per_m_input,p.usd_per_m_output,p.usd_to_ils,
      ((u.input_tokens::numeric*p.usd_per_m_input)+(u.output_tokens::numeric*p.usd_per_m_output))/1000000.0 cost_usd
    from usage u
    left join lateral (
      select ap.usd_per_m_input,ap.usd_per_m_output,ap.usd_to_ils
      from public.api_pricing ap
      where ap.model=u.model and ap.valid_from<=current_date and (ap.valid_until is null or ap.valid_until>=current_date)
      order by ap.valid_from desc limit 1
    ) p on true
  )
  select jsonb_build_object(
    'calls_7d',coalesce(sum(calls),0),
    'input_tokens_7d',coalesce(sum(input_tokens),0),
    'output_tokens_7d',coalesce(sum(output_tokens),0),
    'estimated_cost_usd_7d',round(coalesce(sum(cost_usd),0),6),
    'estimated_cost_ils_7d',round(coalesce(sum(cost_usd*usd_to_ils),0),6),
    'cost_basis','ESTIMATED_FROM_API_PRICING',
    'models',coalesce(jsonb_agg(jsonb_build_object(
      'model',model,'calls',calls,'input_tokens',input_tokens,'output_tokens',output_tokens,
      'cost_usd',round(coalesce(cost_usd,0),6)
    ) order by model),'[]'::jsonb)
  )
  into v_ai
  from priced;

  select jsonb_build_object(
    'pending',count(*) filter(where enrichment_status='pending'),
    'enriched',count(*) filter(where enrichment_status='enriched'),
    'retry_stt',count(*) filter(where enrichment_status='retry_stt'),
    'with_seo_title',count(*) filter(where seo_title is not null and btrim(seo_title)<>''),
    'with_topics',count(*) filter(where cardinality(topics)>0),
    'with_speaker',count(*) filter(where speaker is not null and btrim(speaker)<>''),
    'by_channel',(
      select coalesce(jsonb_object_agg(channel,payload),'{}'::jsonb)
      from (
        select channel,jsonb_build_object(
          'videos',count(*),
          'pending',count(*) filter(where enrichment_status='pending'),
          'enriched',count(*) filter(where enrichment_status='enriched'),
          'retry_stt',count(*) filter(where enrichment_status='retry_stt'),
          'with_seo_title',count(*) filter(where seo_title is not null and btrim(seo_title)<>'')
        ) payload
        from public.channel_updates
        where channel in ('or-geula','torat-haremez')
          and status='live'
          and image_url ~* '\.(mp4|webm|m4v)(\?|$)'
        group by channel
      ) q
    )
  )
  into v_channel
  from public.channel_updates
  where channel in ('or-geula','torat-haremez')
    and status='live'
    and image_url ~* '\.(mp4|webm|m4v)(\?|$)';

  return jsonb_build_object(
    'contract','VIDEO_MEDIA_PROJECTION_2029_V1',
    'owners',jsonb_build_object(
      'projection','public.video_media_placements_v1 + public.video_media_assets_v1',
      'enrichment_worker','wa-video-enrich',
      'google','api/sitemap.js + src/lib/seo.js + /video/:assetId',
      'research_2029','src/lib/researchAdmission.js',
      'storage_2029','media/sod1820/2029/video/<YYYY>/<MM>/<asset-id>/...'
    ),
    'ai_policy',jsonb_build_object(
      'deterministic_mapping_tokens',0,
      'metadata_provider','Anthropic','metadata_model','claude-haiku-4-5',
      'metadata_token_log_source','wa-video-enrich',
      'stt_provider','OpenAI','stt_model','gpt-transcribe','stt_mode','MANUAL_ONLY','stt_runs_from_cron',false
    ),
    'summary',v_summary || jsonb_build_object('video_category_without_detectable_media',v_unresolved_category),
    'source_placements',v_sources,
    'asset_kinds',v_kinds,
    'series',v_series,
    'channel_enrichment',v_channel,
    'cron',coalesce(v_cron,'{}'::jsonb),
    'ai',coalesce(v_ai,'{}'::jsonb),
    'generated_at',now()
  );
end;
$function$;
