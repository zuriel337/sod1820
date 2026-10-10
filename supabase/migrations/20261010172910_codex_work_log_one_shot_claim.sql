-- Branch-only extension of the LIVE agent_dispatch_claim inspected 2026-10-10.
-- No new RPC/table/actor. Do not apply without exact-head owner/security review.
-- Preserve Claude and all behavior outside this task's GPT ASSIGNMENT rows.
create or replace function public.agent_dispatch_claim(
  p_assignment_id uuid, p_worker text, p_lease_seconds integer default 900
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.work_log%rowtype;
  v_lease integer := greatest(30, least(coalesce(p_lease_seconds,900),1800));
begin
  if length(trim(coalesce(p_worker,''))) < 3 then raise exception 'worker required'; end if;
  update public.work_log w
  set dispatch_state='CLAIMED',
      dispatch_attempts=coalesce(w.dispatch_attempts,0)+1,
      dispatch_lease_owner=left(p_worker,200),
      dispatch_lease_expires_at=now()+make_interval(secs=>v_lease),
      dispatch_next_attempt_at=null,
      status='CLAIMED_'||coalesce(w.to_actor,'AGENT')||'_EVENT_DRIVEN_RUNTIME',
      dispatch_context=case
        when w.task_key='REMOTE_CODEX_EXECUTOR_BRIDGE_V1' and w.dispatch_kind='ASSIGNMENT' and w.to_actor='GPT'
        then jsonb_set(w.dispatch_context,'{codex_consumption}',jsonb_build_object(
          'version',1,'idempotency_key',w.dispatch_context->>'idempotency_key',
          'lease_owner',left(p_worker,200),'consumed_at',now()),true)
        else w.dispatch_context end
  where w.id=p_assignment_id
    and w.archived=false and w.superseded_by_id is null
    and w.to_actor in ('GPT','CLAUDE') and coalesce(w.dispatch_attempts,0)<3
    and (w.dispatch_state in ('QUEUED','RETRY_WAIT','FIRE_REQUESTED','SESSION_STARTED')
      or (w.dispatch_state='CLAIMED' and w.dispatch_lease_expires_at<now()))
    and (
      (w.task_key='REMOTE_CODEX_EXECUTOR_BRIDGE_V1' and w.dispatch_kind='ASSIGNMENT' and w.to_actor='GPT') is not true
      or (
        w.to_actor='GPT' and w.assignment_mode='WRITE'
        and w.dispatch_context->>'created_via'='work_log_assign_agent_v1'
        and w.dispatch_context->>'codex_workflow_mode'='EXECUTE_BOUNDED'
        and w.dispatch_context->>'codex_execution_mode'='offline_golden'
        and jsonb_typeof(w.dispatch_context->'idempotency_key')='string'
        and w.dispatch_context->>'idempotency_key' ~ '^[A-Za-z0-9_:-]{16,128}$'
        and not (w.dispatch_context ? 'codex_consumption')
        and coalesce(w.dispatch_attempts,0)=0
        and w.dispatch_state in ('QUEUED','RETRY_WAIT')
        and coalesce(w.dispatch_next_attempt_at,now())<=now()
        and w.dispatch_lease_owner is null and w.dispatch_lease_expires_at is null
        and p_lease_seconds=120
      )
    )
  returning w.* into v_row;
  if not found then return null; end if;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.agent_dispatch_claim(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.agent_dispatch_claim(uuid,text,integer) to service_role;
