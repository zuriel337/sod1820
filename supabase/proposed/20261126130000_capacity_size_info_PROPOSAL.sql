-- SIZE_INFO: the legacy 1,400 MiB size line becomes operational information instead of a standing alert (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL on the shared DB). Apply as ONE transaction.
-- Package: docs/reviews/db-capacity-audit-20261126/README.md section 15 and PART3-DECISION-337.md section 3.
--
-- Owner: G3_CAPACITY_GROWTH_RUNTIME_V1 / foundation_closure_protocol_law v8 item 94 (capacity/growth/top-growers row).
-- Why: the 1,400 MiB line comes from effective_cache_size (migration 20260927045000: not a capacity limit). Since 30.9 it produced
-- 80 work_log rows and 43 pending suggestions with no action behind them, while real growth signals were rare and easy to miss.
-- What changes (this function only; fn_reliability_watch, admin_capacity_growth_v1 and every table are untouched):
--   1. The size-only state is renamed SIZE_INFO. It is still computed and still in capacity_guard:latest (size_warning,
--      size_warning_threshold_bytes keep their names and values), but it writes NO work_log row and NO suggestion.
--   2. WATCH (5% or 75 MiB / 7d) and ALERT (10% or 150 MiB / 7d) are byte-for-byte unchanged, keep precedence over SIZE_INFO,
--      and keep their work_log, suggest_add and (ALERT) notify_admin side effects with the same 12-hour de-duplication.
--   3. New payload fields, informational only (no state, no alert): baseline_weekly_growth_bytes (median 7-day growth of the earlier
--      snapshots), growth_vs_normal_ratio and anomaly_vs_normal (ratio >= 2 and >= 25 MiB). Promoting that flag to a WATCH
--      trigger would be a threshold decision and is NOT made here.
-- Not changed: no threshold value, no cron, no table. Existing pending suggestions are not closed (a human closes them).
-- Guard: the live source must be the one read on 26.11.2026 (md5 of prosrc 89e85b887d03b3e10095a3e99472ecc3).
-- Rollback: 20261126130000_capacity_size_info_ROLLBACK.sql.
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='public.fn_capacity_growth_guard_v1()'::regprocedure)
       <> '89e85b887d03b3e10095a3e99472ecc3' then
    raise exception 'fn_capacity_growth_guard_v1 drifted from the 26.11.2026 source; reconcile before applying';
  end if;
end
$guard$;

create or replace function public.fn_capacity_growth_guard_v1()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_current jsonb;
  v_prior jsonb;
  v_prior_at timestamptz;
  v_now_bytes bigint;
  v_prior_bytes bigint;
  v_delta bigint;
  v_pct numeric;
  v_top_growers jsonb:='[]'::jsonb;
  v_state text;
  v_size_warning boolean;
  v_payload jsonb;
  v_msg text;
  c_warn_size constant bigint:=1400::bigint*1024*1024;
  c_watch_bytes constant bigint:=75::bigint*1024*1024;
  c_alert_bytes constant bigint:=150::bigint*1024*1024;
  c_anomaly_min_bytes constant bigint:=25::bigint*1024*1024;
  v_baseline_weekly bigint;
  v_samples integer;
  v_growth_ratio numeric;
  v_anomaly boolean:=false;
begin
  v_current:=public.fn_capacity_snapshot_v1();
  v_now_bytes:=pg_database_size(current_database());
  v_size_warning:=v_now_bytes>c_warn_size;

  select payload,computed_at
    into v_prior,v_prior_at
  from public.analytics_cache
  where cache_kind='capacity_snapshot'
    and computed_at between now()-interval '8 days' and now()-interval '6 days'
  order by abs(extract(epoch from (computed_at-(now()-interval '7 days'))))
  limit 1;

  if v_prior is not null then
    v_prior_bytes:=nullif(v_prior->>'db_bytes','')::bigint;
    if v_prior_bytes is not null and v_prior_bytes>0 then
      v_delta:=v_now_bytes-v_prior_bytes;
      v_pct:=round((v_delta::numeric/v_prior_bytes::numeric)*100,2);
    end if;

    select coalesce(jsonb_agg(to_jsonb(g) order by g.delta_bytes desc),'[]'::jsonb)
      into v_top_growers
    from (
      select c.key as relation,
             c.value::bigint as bytes_now,
             coalesce(p.value::bigint,0) as bytes_7d,
             c.value::bigint-coalesce(p.value::bigint,0) as delta_bytes
      from jsonb_each_text(coalesce(v_current->'relations','{}'::jsonb)) c
      left join jsonb_each_text(coalesce(v_prior->'relations','{}'::jsonb)) p
        on p.key=c.key
      where c.value::bigint-coalesce(p.value::bigint,0)>0
      order by delta_bytes desc
      limit 12
    ) g;
  end if;

  -- Informational only (SIZE_INFO change, 26.11.2026): how this week compares with the normal weekly growth of the
  -- previous snapshots. It raises no state and no alert; WATCH/ALERT below are unchanged.
  if v_delta is not null then
    with s as (
      select (computed_at at time zone 'UTC')::date d, nullif(payload->>'db_bytes','')::bigint b
      from public.analytics_cache
      where cache_kind='capacity_snapshot' and computed_at>now()-interval '40 days'
    ), w as (
      select a.b-c.b as delta
      from s a join s c on c.d=a.d-7
      where a.d<=current_date-7 and a.b is not null and c.b is not null
    )
    select (percentile_cont(0.5) within group (order by delta))::bigint, count(*)::int
      into v_baseline_weekly, v_samples from w;
    if coalesce(v_samples,0)>=14 and coalesce(v_baseline_weekly,0)>0 then
      v_growth_ratio:=round(v_delta::numeric/v_baseline_weekly::numeric,2);
      v_anomaly:=v_growth_ratio>=2 and v_delta>=c_anomaly_min_bytes;
    end if;
  end if;

  if v_prior_bytes is not null
     and (coalesce(v_pct,0)>=10 or coalesce(v_delta,0)>=c_alert_bytes) then
    v_state:='ALERT';
  elsif v_prior_bytes is not null
     and (coalesce(v_pct,0)>=5 or coalesce(v_delta,0)>=c_watch_bytes) then
    v_state:='WATCH';
  elsif v_size_warning then
    v_state:='SIZE_INFO';
  elsif v_prior_bytes is null then
    v_state:='BASELINE_PENDING';
  else
    v_state:='OK';
  end if;

  v_payload:=jsonb_build_object(
    'contract','G3_CAPACITY_GROWTH_RUNTIME_V1',
    'state',v_state,
    'current_db_bytes',v_now_bytes,
    'size_warning_threshold_bytes',c_warn_size,
    'size_warning',v_size_warning,
    'baseline_at',v_prior_at,
    'baseline_db_bytes',v_prior_bytes,
    'growth_7d_bytes',v_delta,
    'growth_7d_pct',v_pct,
    'growth_basis',case when v_prior_bytes is null then 'BASELINE_PENDING' else 'EXACT_DB_SNAPSHOT_7D' end,
    'watch_threshold',jsonb_build_object('pct',5,'bytes',c_watch_bytes),
    'alert_threshold',jsonb_build_object('pct',10,'bytes',c_alert_bytes),
    'size_reference_basis','legacy planner reference (effective_cache_size); informational, not a capacity limit',
    'size_info',(v_state='SIZE_INFO'),
    'baseline_weekly_growth_bytes',v_baseline_weekly,
    'growth_vs_normal_ratio',v_growth_ratio,
    'anomaly_vs_normal',v_anomaly,
    'anomaly_basis','median 7d growth of earlier snapshots; informational, raises no alert',
    'top_growers_7d',v_top_growers,
    'top_current',coalesce(v_current->'top_current','[]'::jsonb),
    'cron_runs_24h',v_current->'cron_runs_24h',
    'evaluated_at',now()
  );

  insert into public.analytics_cache(
    cache_key,payload,computed_at,cache_kind,producer,producer_version,billable_state
  ) values(
    'capacity_guard:latest',v_payload,now(),'capacity_guard','fn_capacity_growth_guard_v1','v1','NOT_BILLABLE'
  )
  on conflict(cache_key) do update set
    payload=excluded.payload,
    computed_at=excluded.computed_at,
    cache_kind=excluded.cache_kind,
    producer=excluded.producer,
    producer_version=excluded.producer_version,
    billable_state=excluded.billable_state;

  if v_state in ('WATCH','ALERT')
     and not exists(
       select 1 from public.work_log
       where topic='⚠️ ניטור Capacity/Growth (אוטומטי)'
         and status=lower(v_state)
         and created_at>now()-interval '12 hours'
     ) then
    v_msg:=case v_state
      when 'WATCH' then format(
        'WATCH: 7d DB growth %s (%s%%). Top-grower evidence is attached in capacity_guard:latest.',
        pg_size_pretty(coalesce(v_delta,0)),coalesce(v_pct,0)
      )
      else format(
        'ALERT: 7d DB growth %s (%s%%). Attribute growth/retention now; size alone still does not imply service incident.',
        pg_size_pretty(coalesce(v_delta,0)),coalesce(v_pct,0)
      ) end;

    insert into public.work_log(session_date,topic,what_we_did,status,open_threads)
    values(
      current_date,
      '⚠️ ניטור Capacity/Growth (אוטומטי)',
      v_msg,
      lower(v_state),
      'Owner: foundation_closure_protocol_law v7. Signal/projection: analytics_cache capacity_guard:latest + admin_capacity_growth_v1().'
    );

    begin
      perform public.suggest_add(
        'performance','capacity_growth_guard',
        'Capacity/Growth '||v_state,
        v_msg,
        v_payload,
        100,
        1,
        'Attribute growth by relation; use existing retention/compaction owners. No automatic provider upgrade or destructive cleanup.',
        'capacity_growth_guard:'||v_state||':'||to_char(current_date,'YYYYMMDD')
      );
    exception when others then null;
    end;

    if v_state='ALERT' then
      begin
        perform public.notify_admin('🚨 סוד1820 — Capacity Growth ALERT'||chr(10)||v_msg);
      exception when others then null;
      end;
    end if;
  end if;
end;
$function$;

revoke all on function public.fn_capacity_growth_guard_v1() from public,anon,authenticated;
grant execute on function public.fn_capacity_growth_guard_v1() to service_role;
