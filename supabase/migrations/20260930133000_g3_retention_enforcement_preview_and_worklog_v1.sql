-- G3_ENFORCEMENT_BINDING_AND_LOG_RETENTION_V1
-- Foundation-only, non-destructive slice.
-- B1/B2: make the existing admin_retention_preview() boundary expose telemetry/log state
--        honestly. No DELETE, partition drop, purge executor, or guessed retention clock.
-- B3: enforce a reversible work_log archival transition while preserving all rows/history.
-- Owner: foundation_closure_protocol_law v7 + system_suggestions_law v5
--        + research_intake_foundation_contract_law v13 / project_codex §15.

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

  with rows as (
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
        where exists (
          select 1 from public.research_objects ro
          where ro.source_ref ~ ('(^|[+])wa_bot_log:' || wa_bot_log.id::text || '(#|[+]|$)')
        )
      )::bigint,
      0::bigint,
      count(*) filter (
        where not exists (
          select 1 from public.research_objects ro
          where ro.source_ref ~ ('(^|[+])wa_bot_log:' || wa_bot_log.id::text || '(#|[+]|$)')
        )
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
        where exists (
          select 1 from public.research_objects ro
          where ro.source_ref ~ ('(^|[+])wa_deep_queue:' || wa_deep_queue.id::text || '(#|[+]|$)')
        )
      )::bigint,
      0::bigint,
      count(*) filter (
        where not exists (
          select 1 from public.research_objects ro
          where ro.source_ref ~ ('(^|[+])wa_deep_queue:' || wa_deep_queue.id::text || '(#|[+]|$)')
        )
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
      'HUMAN_REVIEW',
      count(*)::bigint,
      min(created_at),
      max(created_at),
      count(*)::bigint,
      0::bigint,
      0::bigint,
      false,
      'KEEP_LONG_TERM by Research Intake §15.2. Multiple live analytics/RPC readers remain. No raw-row purge until aggregation+archive preserves required historical analytics and ZURIEL approves the destructive step.'
    from public.visitor_events

    union all

    select
      'site_visits',
      'OPERATIONAL_RUNTIME',
      'HUMAN_REVIEW',
      count(*)::bigint,
      min(ts),
      max(ts),
      count(*)::bigint,
      0::bigint,
      0::bigint,
      false,
      'KEEP_LONG_TERM by Research Intake §15.2. Live readers include 90-day analytics and arbitrary historical detail. No raw-row purge until aggregation+archive preserves required historical analytics and ZURIEL approves the destructive step.'
    from public.site_visits

    union all

    select
      c.relname::text,
      'OPERATIONAL_RUNTIME',
      'HUMAN_REVIEW',
      coalesce(s.n_live_tup, 0)::bigint,
      case
        when pg_get_expr(c.relpartbound,c.oid) = 'DEFAULT' then null::timestamptz
        else (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$FROM \('([^']+)'$$))[1]::timestamptz
      end,
      case
        when pg_get_expr(c.relpartbound,c.oid) = 'DEFAULT' then null::timestamptz
        else (regexp_match(pg_get_expr(c.relpartbound,c.oid), $$TO \('([^']+)'$$))[1]::timestamptz
      end,
      coalesce(s.n_live_tup, 0)::bigint,
      0::bigint,
      0::bigint,
      false,
      'KEEP_LONG_TERM historical events partition under Research Intake §15.2. Partition retirement requires aggregation+archive/replay proof and separate ZURIEL Human Gate before DROP/DELETE.'
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
    'mode', 'DRY_RUN_ONLY',
    'generated_at', now(),
    'delete_authorized', false,
    'tables', coalesce(jsonb_agg(to_jsonb(rows) order by table_name), '[]'::jsonb)
  )
  into v_result
  from rows;

  return v_result;
end;
$function$;

revoke all on function public.admin_retention_preview() from public, anon;
grant execute on function public.admin_retention_preview() to authenticated, service_role;

create or replace function public.fn_work_log_archive_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_candidates bigint := 0;
  v_archived bigint := 0;
  v_current_before bigint := 0;
  v_current_after bigint := 0;
begin
  if current_user not in ('postgres','supabase_admin')
     and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  select count(*) into v_current_before from public.work_log_current;

  with candidate as (
    select w.id
    from public.work_log w
    where coalesce(w.archived,false)=false
      and w.superseded_by_id is null
      and w.created_at < now() - interval '14 days'
      and coalesce(w.status,'') ~* '(AFTER|DONE|COMPLETE|COMPLETED|CLOSED|DEPLOYED|APPLIED|RESOLVED|FIXED|LIVE_VERIFIED|SUPERSEDED|ARCHIVED|PASS)'
      and coalesce(w.status,'') !~* '(NOT[ _-]*(MERGED|DEPLOYED|LIVE|CANONICAL|FOR[ _-]*MERGE)|PENDING|BLOCKER|BLOCKED|OPEN|IN_PROGRESS|BRANCH_ONLY|PAUSED|STOPPED_AT_GATE|DECISION_READY|CLAIMED_WRITE|WRITE_SCOPE_OPEN|WAITING|AWAITING|QUEUED|ASSIGNED|ACK_REQUIRED|READY_TO_DEPLOY|RELEASE_AUTHORIZED|ממתין)'
      and (
        coalesce(w.status,'') !~* 'HUMAN_GATE'
        or coalesce(w.status,'') ~* '(^AFTER_COMPLETE_|HUMAN_GATE_REJECTED|REJECTED_BY_HUMAN_GATE|^FINAL_CLOSURE_)'
      )
      and coalesce(w.dispatch_state,'') not in ('QUEUED','FIRE_REQUESTED','SESSION_STARTED','CLAIMED','RETRY_WAIT','DEFERRED')
      and not exists (
        select 1
        from public.work_log child
        where child.parent_assignment_id = w.id
          and coalesce(child.archived,false)=false
          and child.superseded_by_id is null
          and (
            coalesce(child.status,'') ~* '(NOT[ _-]*(MERGED|DEPLOYED|LIVE|CANONICAL|FOR[ _-]*MERGE)|PENDING|BLOCKER|BLOCKED|OPEN|IN_PROGRESS|BRANCH_ONLY|PAUSED|STOPPED_AT_GATE|DECISION_READY|CLAIMED_WRITE|WRITE_SCOPE_OPEN|WAITING|AWAITING|QUEUED|ASSIGNED|ACK_REQUIRED|READY_TO_DEPLOY|RELEASE_AUTHORIZED|ממתין)'
            or (
              coalesce(child.status,'') ~* 'HUMAN_GATE'
              and coalesce(child.status,'') !~* '(^AFTER_COMPLETE_|HUMAN_GATE_REJECTED|REJECTED_BY_HUMAN_GATE|^FINAL_CLOSURE_)'
            )
            or coalesce(child.dispatch_state,'') in ('QUEUED','FIRE_REQUESTED','SESSION_STARTED','CLAIMED','RETRY_WAIT','DEFERRED')
          )
      )
  ),
  counted as (
    select count(*)::bigint n from candidate
  ),
  changed as (
    update public.work_log w
       set archived = true
     where w.id in (select id from candidate)
       and coalesce(w.archived,false)=false
    returning 1
  )
  select counted.n, count(changed.*)::bigint
    into v_candidates, v_archived
  from counted
  left join changed on true
  group by counted.n;

  select count(*) into v_current_after from public.work_log_current;

  return jsonb_build_object(
    'contract','G3_ENFORCEMENT_BINDING_AND_LOG_RETENTION_V1:B3',
    'cutoff','14 days',
    'candidate_rows',coalesce(v_candidates,0),
    'archived_rows',coalesce(v_archived,0),
    'deleted_rows',0,
    'work_log_current_before',v_current_before,
    'work_log_current_after',v_current_after,
    'executed_at',now()
  );
end;
$function$;

revoke all on function public.fn_work_log_archive_maintenance() from public, anon, authenticated;
grant execute on function public.fn_work_log_archive_maintenance() to service_role;

create or replace function public.admin_worklog_archive_done()
returns integer
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if not exists (select 1 from public.users where id=auth.uid() and role='admin') then
    raise exception 'not authorized';
  end if;

  v_result := public.fn_work_log_archive_maintenance();
  return coalesce((v_result->>'archived_rows')::integer,0);
end;
$function$;

revoke all on function public.admin_worklog_archive_done() from public, anon;
grant execute on function public.admin_worklog_archive_done() to authenticated, service_role;

comment on function public.fn_work_log_archive_maintenance() is
  'B3 owner-native archival enforcement. Reversible archived=true transition only; no work_log deletion. Archives terminal inactive rows older than the same 14-day current-routing horizon, preserves active assignments/dispatch and active-child chains.';

comment on function public.admin_retention_preview() is
  'Canonical non-destructive retention preview. Includes source/WhatsApp plus G3 telemetry/events/work_log census. delete_authorized is always false; B1/B2 remain Human-Gated until aggregation/archive preserves required history.';

select cron.schedule(
  'g3-work-log-archive-daily',
  '40 2 * * *',
  $cron$select public.fn_work_log_archive_maintenance();$cron$
);
