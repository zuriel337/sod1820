-- SOD1820 2029 — Research Intake v11 retention health / dry-run projection
-- EXTEND_EXISTING only. This migration creates no retention store and performs NO DELETE.
-- It exposes a read-only admin projection over existing source/runtime tables.

create or replace function public.admin_retention_preview()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  )
  select jsonb_build_object(
    'contract', 'research_intake_foundation_contract_law v11',
    'mode', 'DRY_RUN_ONLY',
    'generated_at', now(),
    'delete_authorized', false,
    'tables', coalesce(jsonb_agg(to_jsonb(rows) order by table_name), '[]'::jsonb)
  )
  into v_result
  from rows;

  return v_result;
end;
$$;

revoke all on function public.admin_retention_preview() from public, anon;
grant execute on function public.admin_retention_preview() to authenticated, service_role;

comment on function public.admin_retention_preview() is
'Research Intake v11 admin-only retention health projection. Dry-run/read-only: it never deletes, schedules purge, or creates retention truth.';
