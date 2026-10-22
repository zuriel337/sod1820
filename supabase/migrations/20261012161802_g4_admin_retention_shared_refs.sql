-- G4 admin retention: share Research source-reference parsing across log rows.
-- Based on live admin_retention_preview prosrc MD5 601d7603c388c5f7f655e193936d13af.
-- Preserve the existing preview contract, authorization, retention policy and grants.
create or replace function public.admin_retention_preview()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if auth.role() <> 'service_role' and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  -- Source references use '+' between fragments and '#' after the source id.
  -- Parse the existing reference strings once; the distinct key set preserves
  -- the former per-row regex match for wa_bot_log and wa_deep_queue.
  with referenced_source_keys as materialized (
    select distinct split_part(token, '#', 1) as ref_key
    from public.research_objects ro
    cross join lateral unnest(string_to_array(ro.source_ref, '+')) as token
    where token like 'wa_bot_log:%' or token like 'wa_deep_queue:%'
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
           or exists (
             select 1 from public.research_objects ro
             where ro.source_ref like ('channel_updates:' || channel_updates.id::text || '%')
           )
      )::bigint as protected_rows,
      0::bigint as purge_candidates,
      count(*) filter (
        where coalesce(status, '') not in ('live','published','active')
          and not exists (
            select 1 from public.research_objects ro
            where ro.source_ref like ('channel_updates:' || channel_updates.id::text || '%')
          )
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
      count(*) filter (
        where ('wa_bot_log:' || wa_bot_log.id::text) in (select ref_key from referenced_source_keys)
      )::bigint,
      0::bigint,
      count(*) filter (
        where ('wa_bot_log:' || wa_bot_log.id::text) not in (select ref_key from referenced_source_keys)
      )::bigint,
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
      count(*) filter (
        where ('wa_deep_queue:' || wa_deep_queue.id::text) in (select ref_key from referenced_source_keys)
      )::bigint,
      0::bigint,
      count(*) filter (
        where ('wa_deep_queue:' || wa_deep_queue.id::text) not in (select ref_key from referenced_source_keys)
      )::bigint,
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

revoke all on function public.admin_retention_preview() from public, anon;
grant execute on function public.admin_retention_preview() to authenticated, service_role;
