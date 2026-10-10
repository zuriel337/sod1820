-- Branch-only extension of the LIVE agent_dispatch_claim inspected 2026-10-10.
-- No new RPC/table/actor. Do not apply without exact-head owner/security review.
-- Preserve Claude and all behavior outside this task's GPT ASSIGNMENT rows.
-- Existing work_log only: durable DB-level one-shot uniqueness across distinct rows,
-- even when two service-role transactions race or a task row is requeued.
-- A partial expression index is an integrity constraint, NOT a new queue/store.
-- Review table size/lock impact before ever applying to production.
create unique index if not exists work_log_codex_consumed_idempotency_ux
  on public.work_log ((dispatch_context #>> '{codex_consumption,idempotency_key}'))
  where task_key='REMOTE_CODEX_EXECUTOR_BRIDGE_V1'
    and to_actor='GPT'
    and dispatch_kind='ASSIGNMENT'
    and dispatch_context ? 'codex_consumption';

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
        and not exists (
          select 1 from public.work_log consumed
          where consumed.id<>w.id
            and consumed.task_key='REMOTE_CODEX_EXECUTOR_BRIDGE_V1'
            and consumed.to_actor='GPT'
            and consumed.dispatch_kind='ASSIGNMENT'
            and consumed.dispatch_context ? 'codex_consumption'
            and consumed.dispatch_context #>> '{codex_consumption,idempotency_key}'
              = w.dispatch_context->>'idempotency_key'
        )
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

-- Exact current recovery owner (20260915224600), extended only for consumed
-- Codex offline-Golden GPT assignments; generic dispatch/GPT wake guards unchanged.
-- This migration remains BRANCH-ONLY and must pass Claude exact-SHA review.
create or replace function public.agent_dispatch_recover()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.work_log%rowtype;
  v_after_id uuid;
  v_retried integer:=0;
  v_failed integer:=0;
  v_emitted integer:=0;
  v_wake boolean;
begin
  for v_row in
    select *
    from public.work_log
    where archived=false
      and superseded_by_id is null
      and dispatch_state='CLAIMED'
      and dispatch_lease_expires_at<now()
      and not (to_actor='GPT' and dispatch_kind='RESULT_WAKE')
    order by created_at
    limit 50
    for update skip locked
  loop
    -- ONLY the consumed offline Codex Golden is non-retryable. The generic
    -- Claude/GPT paths continue through their unchanged recovery logic below.
    if v_row.task_key='REMOTE_CODEX_EXECUTOR_BRIDGE_V1'
       and v_row.to_actor='GPT'
       and v_row.dispatch_kind='ASSIGNMENT'
       and v_row.dispatch_context ? 'codex_consumption' then
      -- Reuse the canonical terminal AFTER authority; no second recovery ledger.
      -- A late worker finishing after this row is terminal receives lease mismatch.
      perform public.agent_dispatch_finish(
        v_row.id, v_row.dispatch_lease_owner, 'FAILED',
        'AFTER_CODEX_ONE_SHOT_LEASE_EXPIRED',
        'Codex one-shot lease expired after approval consumption; no automatic retry.',
        'Operator verification required before issuing a NEW signed assignment.',
        false, 'codex_consumed_lease_expired'
      );
      v_failed:=v_failed+1;
    elsif coalesce(v_row.dispatch_attempts,0)>=3 then
      v_wake:=v_row.from_actor in ('GPT','CLAUDE');
      insert into public.work_log(
        topic,status,what_we_did,open_threads,
        task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,
        release_authorization_state,parent_assignment_id,dispatch_kind,dispatch_state,
        dispatch_next_attempt_at,dispatch_context
      ) values(
        format('actor=DISPATCHER FROM=%s TO=%s task=%s — AFTER',
          coalesce(v_row.to_actor,'CLAUDE'),
          coalesce(v_row.from_actor,'ZURIEL'),
          coalesce(v_row.task_key,'UNKNOWN_TASK')),
        'AFTER_DISPATCH_FAILED_LEASE_EXHAUSTED',
        'Dispatch lease expired after retry budget was exhausted.',
        'Human/runtime review required before explicit requeue.',
        v_row.task_key,
        v_row.to_actor,
        case when v_wake then v_row.from_actor else null end,
        'READ_ONLY',
        v_row.assignment_scope,
        v_row.primary_owner,
        v_row.release_authorization_state,
        v_row.id,
        case when v_wake then 'RESULT_WAKE' else null end,
        case when v_wake then 'QUEUED' else null end,
        case when v_wake then now() else null end,
        jsonb_build_object('result_of',v_row.id,'outcome','FAILED','reason','lease_exhausted')
      ) returning id into v_after_id;

      update public.work_log
         set dispatch_state='FAILED',
             dispatch_completed_at=now(),
             dispatch_last_error='lease_exhausted',
             dispatch_lease_owner=null,
             dispatch_lease_expires_at=null,
             dispatch_next_attempt_at=null,
             superseded_by_id=v_after_id
       where id=v_row.id;
      v_failed:=v_failed+1;
    else
      update public.work_log
         set dispatch_state='RETRY_WAIT',
             dispatch_next_attempt_at=now(),
             dispatch_last_error='stale_lease_recovered',
             dispatch_lease_owner=null,
             dispatch_lease_expires_at=null
       where id=v_row.id;
      v_retried:=v_retried+1;
    end if;
  end loop;

  -- Existing queued/retry event recovery remains unchanged. A GPT RESULT_WAKE that
  -- is explicitly requeued fires its dedicated 00 trigger synchronously first;
  -- this loop is only the pre-existing fallback for unclaimed event rows.
  for v_row in
    select *
    from public.work_log
    where archived=false
      and superseded_by_id is null
      and to_actor in ('GPT','CLAUDE')
      and dispatch_state in ('QUEUED','RETRY_WAIT')
      and coalesce(dispatch_next_attempt_at,now())<=now()
      and (dispatch_last_emitted_at is null or dispatch_last_emitted_at<now()-interval '45 seconds')
    order by created_at
    limit 100
  loop
    perform public.agent_dispatch_emit(v_row.id);
    v_emitted:=v_emitted+1;
  end loop;

  return jsonb_build_object(
    'stale_retried',v_retried,
    'terminal_failed',v_failed,
    'events_reemitted',v_emitted
  );
end;
$$;

revoke all on function public.agent_dispatch_recover() from public, anon, authenticated;
grant execute on function public.agent_dispatch_recover() to service_role;


comment on function public.agent_dispatch_recover() is
 'Generic dispatch recovery excluding GPT RESULT_WAKE claims; consumed REMOTE_CODEX_EXECUTOR_BRIDGE_V1 offline-Golden leases fail terminally through canonical AFTER, never retry.';

