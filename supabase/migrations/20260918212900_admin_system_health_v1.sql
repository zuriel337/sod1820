-- G3_2029_CONTROL_PLANE_FOUNDATION_V1 — first non-UI 2029 Internal Control Plane foundation.
-- EXTEND_EXISTING only. No new table/store/registry/health ledger. BRANCH-ONLY: this migration
-- is not applied to the live database by this slice (release_authorization_state =
-- BRANCH_ONLY_NO_DB_APPLY_NO_MERGE_NO_DEPLOY).
--
-- Owners: system_suggestions_law v2 + admin_alert_direct_law v1 +
--         experience_governance_foundation_v1_law v6 + research_intake_foundation_contract_law v11 +
--         foundation_closure_protocol_law v6.
--
-- (1) public.admin_system_health() — admin/service-only bounded read projection over existing
--     owners. Exposes only bounded, privacy-safe operational facts: no cron command text, no
--     secrets, no recipient addresses, no object paths, no raw private content, no universal
--     "score". Retention is reused via admin_retention_preview() as a pointer/summary — this
--     migration creates no Retention Store and duplicates none of its per-table logic.
--
-- (2) public.fn_health_watch() — patched so infrastructure alerts terminate in
--     public.notify_admin() per admin_alert_direct_law v1, instead of a direct
--     public.wa_send() call to a hardcoded WhatsApp target. The 1-hour work_log dedupe and the
--     failure-isolation (a notify failure never breaks the health scan) are preserved verbatim.
--     NOTE: fn_health_watch is a pre-existing live primitive (like notify_admin/rd_is_admin) that
--     predates migration tracking; this CREATE OR REPLACE is sourced from the live definition
--     read directly from the canonical Supabase project (LIVE-FIRST), not from any prior
--     migration file.

-- ---------------------------------------------------------------------------------------------
-- (1) admin_system_health()
-- ---------------------------------------------------------------------------------------------
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

  -- media/storage: aggregate bytes/object counts, migration-queue statuses, large-object count,
  -- public gallery original-as-thumbnail count. Never object paths/private content.
  -- NOTE: "public gallery" = published gallery_images rows (published in (1,2), not curator-hidden)
  -- whose thumb_url is missing or identical to image_url (i.e. no distinct thumbnail was ever cut).
  begin
    select jsonb_build_object(
      'migration_queue_status_counts', (
        select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
        from (select status, count(*) as n from public.media_migration_queue group by status) q
      ),
      'migration_queue_bytes', (select coalesce(sum(size), 0) from public.media_migration_queue),
      'migration_queue_objects', (select count(*) from public.media_migration_queue),
      'large_object_count', (select count(*) from pg_largeobject_metadata),
      'gallery_original_as_thumbnail_count', (
        select count(*) from public.gallery_images
        where published in (1, 2) and coalesce(curator_hidden, false) = false
          and (thumb_url is null or thumb_url = image_url)
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
  'G3_2029_CONTROL_PLANE_FOUNDATION_V1 — admin/service-only bounded read projection (system_suggestions_law v2 + admin_alert_direct_law v1 + experience_governance_foundation_v1_law v6 + research_intake_foundation_contract_law v11 + foundation_closure_protocol_law v6). Bounded, privacy-safe operational facts only: no cron command text or secrets, no recipient addresses, no object paths, no raw private content, no universal score. Retention is a pointer/summary of admin_retention_preview(), never duplicated. Fail-closed: service_role or rd_is_admin() only.';

-- ---------------------------------------------------------------------------------------------
-- (2) fn_health_watch(): alerts now terminate in public.notify_admin() per admin_alert_direct_law
-- v1. Removes the hardcoded WhatsApp target ('972556651237@c.us') and the direct
-- public.wa_send() call. The 1-hour work_log dedupe and the failure-isolation (wrapped so a
-- delivery failure never breaks the health scan) are unchanged.
-- ---------------------------------------------------------------------------------------------
create or replace function public.fn_health_watch()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_conns int; v_max int; v_longest numeric; v_idletx int; v_dbsize bigint; v_msg text; v_reasons text[]:='{}';
begin
  select count(*) into v_conns from pg_stat_activity where backend_type='client backend';
  select setting::int into v_max from pg_settings where name='max_connections';
  select coalesce(max(extract(epoch from (now()-query_start))),0) into v_longest
    from pg_stat_activity where state='active' and backend_type='client backend'
      and query not ilike '%pg_stat_activity%';
  select count(*) into v_idletx from pg_stat_activity where state='idle in transaction';
  select pg_database_size(current_database()) into v_dbsize;

  if v_conns > v_max*0.8 then v_reasons:=v_reasons||format('חיבורים %s/%s (>80%%)',v_conns,v_max); end if;
  if v_longest > 30      then v_reasons:=v_reasons||format('שאילתה תקועה %ss',round(v_longest)); end if;
  if v_idletx > 5        then v_reasons:=v_reasons||format('idle-in-tx %s',v_idletx); end if;
  if v_dbsize > 1400*1024*1024 then v_reasons:=v_reasons||format('DB %s מתקרב לגבול-מטמון',pg_size_pretty(v_dbsize)); end if;

  if array_length(v_reasons,1) is not null then
    v_msg := '⚠️ עומס-תשתית זוהה: '||array_to_string(v_reasons,' · ')
             ||format(' | חיבורים %s/%s, DB %s',v_conns,v_max,pg_size_pretty(v_dbsize));
    if not exists (select 1 from work_log
                   where topic='🚨 ניטור בריאות תשתית (אוטומטי)' and created_at > now()-interval '1 hour') then
      insert into work_log (session_date, topic, what_we_did, status, open_threads)
      values (current_date, '🚨 ניטור בריאות תשתית (אוטומטי)', v_msg, 'alert',
              'אם חוזר — לשקול Compute Medium או להזיז בוטים למתזמן חיצוני. נבדק כל 5 דק ע"י fn_health_watch.');
      -- כל התראה מסתיימת ב-notify_admin (admin_alert_direct_law v1) — עטוף: כשל בשליחה לא שובר את הניטור
      begin
        perform public.notify_admin(
          '🚨 סוד1820 — התראת-תשתית'||chr(10)||v_msg||chr(10)||'(האתר עלול להיחנק. נרשם ביומן.)'
        );
      exception when others then null;
      end;
    end if;
  end if;
end $function$;

comment on function public.fn_health_watch() is
  'G3_2029_CONTROL_PLANE_FOUNDATION_V1 correction — infrastructure health alerts terminate in public.notify_admin() per admin_alert_direct_law v1. No direct wa_send()/hardcoded WhatsApp target. 1-hour work_log dedupe and failure-isolation preserved.';
