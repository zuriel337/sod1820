create or replace function public.admin_system_health()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_conns int;
  v_max int;
  v_longest numeric;
  v_idletx int;
  v_dbsize bigint;
  v_cron jsonb := '[]'::jsonb;
  v_bots jsonb := '{}'::jsonb;
  v_comm jsonb := '{}'::jsonb;
  v_media jsonb := '{}'::jsonb;
  v_security jsonb := '{}'::jsonb;
  v_usage jsonb := '{}'::jsonb;
  v_retention jsonb;
  v_retention_summary jsonb;
begin
  if auth.role() <> 'service_role' and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

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

  begin
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'job_name', j.jobname,
          'active', j.active,
          'last_status', x.last_status,
          'last_run_at', x.last_run_at,
          'failures_24h', coalesce(x.failures_24h, 0)
        )
        order by j.jobname
      ),
      '[]'::jsonb
    )
    into v_cron
    from cron.job j
    left join lateral (
      select
        (array_agg(d.status order by d.start_time desc))[1] as last_status,
        max(d.start_time) as last_run_at,
        count(*) filter (
          where d.status = 'failed'
            and d.start_time > now() - interval '24 hours'
        ) as failures_24h
      from cron.job_run_details d
      where d.jobid = j.jobid
    ) x on true;
  exception when others then
    v_cron := '[]'::jsonb;
  end;

  begin
    select jsonb_build_object(
      'outbox_pending', count(*) filter (where status in ('pending','queued')),
      'outbox_failed', count(*) filter (where status in ('failed','error')),
      'cron', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object('job_name', jobname, 'active', active)
            order by jobname
          ),
          '[]'::jsonb
        )
        from cron.job
        where jobname ilike 'wa-%'
           or jobname in ('bot-watchdog','check_stuck_messages_raziel')
      )
    )
    into v_bots
    from public.bot_outbox;
  exception when others then
    v_bots := jsonb_build_object(
      'outbox_pending', 0,
      'outbox_failed', 0,
      'cron', '[]'::jsonb
    );
  end;

  begin
    select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
    into v_comm
    from (
      select status, count(*) as n
      from public.bot_outbox
      group by status
    ) s;
  exception when others then
    v_comm := '{}'::jsonb;
  end;

  begin
    select jsonb_build_object(
      'migration_queue_status_counts', (
        select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
        from (
          select status, count(*) as n
          from public.media_migration_queue
          group by status
        ) q
      ),
      'migration_queue_bytes', (
        select coalesce(sum(size), 0)
        from public.media_migration_queue
      ),
      'migration_queue_objects', (
        select count(*)
        from public.media_migration_queue
      ),
      'large_object_count', (
        select count(*)
        from pg_largeobject_metadata
      ),
      'gallery_original_as_thumbnail_count', (
        select count(*)
        from public.gallery_images
        where published = 1
          and coalesce(curator_hidden, false) = false
          and (thumb_url is null or thumb_url = image_url)
      )
    )
    into v_media;
  exception when others then
    v_media := '{}'::jsonb;
  end;

  begin
    select jsonb_build_object(
      'unacked', count(*) filter (where not acked),
      'recent_24h', count(*) filter (where ts > now() - interval '24 hours')
    )
    into v_security
    from public.security_alerts;
  exception when others then
    v_security := jsonb_build_object('unacked', 0, 'recent_24h', 0);
  end;

  begin
    select jsonb_build_object(
      'ai_cost_usd_7d', (
        select coalesce(sum(cost_usd), 0)
        from public.agent_token_costs
        where created_at > now() - interval '7 days'
      ),
      'ai_cost_basis', 'EXACT',
      'vercel_bandwidth_mb_est_7d', (
        select coalesce(sum(est_vercel_bandwidth_mb), 0)
        from public.vercel_usage_estimate
        where day > current_date - 7
      ),
      'vercel_bandwidth_basis', 'ESTIMATED',
      'supabase_cached_egress', null,
      'supabase_cached_egress_basis', 'UNKNOWN'
    )
    into v_usage;
  exception when others then
    v_usage := jsonb_build_object(
      'ai_cost_basis', 'UNKNOWN',
      'vercel_bandwidth_basis', 'UNKNOWN',
      'supabase_cached_egress_basis', 'UNKNOWN'
    );
  end;

  begin
    v_retention := public.admin_retention_preview();
    v_retention_summary := jsonb_build_object(
      'contract', v_retention ->> 'contract',
      'mode', v_retention ->> 'mode',
      'delete_authorized', v_retention -> 'delete_authorized',
      'tables_assessed', jsonb_array_length(coalesce(v_retention -> 'tables', '[]'::jsonb)),
      'generated_at', v_retention ->> 'generated_at',
      'pointer', 'public.admin_retention_preview() for full per-table detail'
    );
  exception when others then
    v_retention_summary := jsonb_build_object(
      'pointer', 'public.admin_retention_preview() for full per-table detail',
      'error', 'unavailable'
    );
  end;

  return jsonb_build_object(
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
  );
end;
$function$;

revoke all on function public.admin_system_health() from public, anon;
grant execute on function public.admin_system_health() to authenticated, service_role;

comment on function public.admin_system_health() is
  'G3_2029_CONTROL_PLANE_FOUNDATION_V1: admin/service-only bounded operational projection. Canonical owners include system_suggestions_law v2, subscription_funnel_law v19, experience_governance_foundation_v1_law v6, research_intake_foundation_contract_law v11, and foundation_closure_protocol_law v6.';

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
end;
$function$;

comment on function public.fn_health_watch() is
  'G3_2029_CONTROL_PLANE_FOUNDATION_V1: infrastructure alerts terminate in public.notify_admin() under subscription_funnel_law v19; 1-hour work_log dedupe and failure isolation preserved.';
