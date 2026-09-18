-- G3_2029_CONTROL_PLANE_MEDIA_HEALTH_V2 — implementation follow-up to the released
-- G3_2029_CONTROL_PLANE_FOUNDATION_V1 (PR #530, live). EXTEND_EXISTING only: no new
-- table/store/registry/RPC. BRANCH-ONLY: this migration is not applied to the live database by
-- this slice (release_authorization_state = BRANCH_ONLY_NO_DB_APPLY_NO_MERGE_NO_DEPLOY).
--
-- Owners: system_suggestions_law v2 + research_intake_foundation_contract_law v11 +
--         experience_governance_foundation_v1_law v6 + current media/storage owners.
--
-- Widens public.admin_system_health()'s media projection so it is decision-useful for media
-- performance/delivery triage, while staying privacy-safe: bounded aggregates only, never object
-- paths, filenames, private bucket contents, chat ids, secrets or raw media metadata. No universal
-- media score. fn_health_watch is untouched by this migration.
--
-- Added, all bounded aggregates over existing owners (storage.objects, public.gallery_images,
-- public.channel_updates, public.media_migration_queue, cron.job/cron.job_run_details):
--   storage.total_objects / total_bytes
--   storage.by_type: image/video/audio/document counts + bytes (from storage.objects metadata
--     mimetype; 'document' collapses any non-image/video/audio major type, e.g. application/text)
--   storage.large_objects: object counts over 20MB and over 50MB
--   gallery: public-visible count (published=1, not curator_hidden), with missing_thumb_count
--     (thumb_url is null) kept exactly separate from original_as_thumb_count (thumb_url =
--     image_url) — the two were previously combined under one OR'd count
--   channel_updates: image rows + missing_thumb, mirroring the gallery thumbnail-health shape
--   thumb_cron: live cron.job activity/schedule/last-status/failures-24h for the three existing
--     gallery/post/channel thumbnail cron jobs, by job name only (same shape as the existing cron
--     section — never command text)
--
-- Left explicitly UNKNOWN/omitted rather than invented: provider cached-egress (no provider data
-- source exists — unchanged from v1's 'supabase_cached_egress_basis' = 'UNKNOWN'), and
-- poster/derivative backlog (no canonical poster/derivative table exists live; a proxy would be a
-- heuristic invention, which this assignment explicitly disallows).

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
  'G3_2029_CONTROL_PLANE_MEDIA_HEALTH_V2 — admin/service-only bounded read projection (system_suggestions_law v2 + research_intake_foundation_contract_law v11 + experience_governance_foundation_v1_law v6 + prior foundation owners). Bounded, privacy-safe operational facts only: no cron command text or secrets, no recipient addresses, no object paths/filenames, no raw private content, no universal score. Media projection now includes storage by-type/large-object bytes, gallery/channel_updates thumbnail health (missing vs original-as-thumb kept separate), and gallery/post/channel thumb-cron activity, all bounded aggregates over existing owners. Retention is a pointer/summary of admin_retention_preview(), never duplicated. Fail-closed: service_role or rd_is_admin() only.';
