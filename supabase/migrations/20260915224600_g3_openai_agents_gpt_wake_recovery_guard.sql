-- G3_OPENAI_AGENTS_GPT_WAKE_RECOVERY_GUARD
-- Independent Claude challenge found one cross-runtime stale-lease race:
-- generic recovery could requeue a CLAIMED GPT RESULT_WAKE after lease expiry,
-- allowing a second managed OpenAI agent session for the same assignment.
--
-- Smallest safe fix: GPT RESULT_WAKE stale CLAIMED rows are excluded from the
-- generic recovery loop. Their lifecycle is owned by agent_dispatch_recover_gpt_wakes()
-- and agent_dispatch_reconcile_gpt_wake(). No new store/queue/owner is introduced.

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
    if coalesce(v_row.dispatch_attempts,0)>=3 then
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
  'Generic dispatch recovery. CLAIMED GPT RESULT_WAKE rows are excluded and owned by the OpenAI Agents API GPT wake reconciler/recovery path.';
