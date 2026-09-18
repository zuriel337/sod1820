-- G3_CLAUDE_WRITE_AUTOSTART_REQUEUE_IDEMPOTENCY_V3_1
-- Hardens explicit requeue so an in-flight/started/claimed runtime cannot be duplicated.

create or replace function public.agent_dispatch_requeue(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.work_log%rowtype;
begin
  if auth.role()<>'service_role' and not coalesce(public.rd_is_admin(),false) then
    raise exception 'not authorized';
  end if;

  select * into v_row
  from public.work_log
  where id=p_assignment_id
    and archived=false
    and superseded_by_id is null
    and dispatch_kind in ('ASSIGNMENT','RESULT_WAKE')
    and to_actor in ('GPT','CLAUDE')
  for update;

  if not found then
    return false;
  end if;

  if v_row.dispatch_state in ('FIRE_REQUESTED','SESSION_STARTED') then
    return false;
  end if;

  if v_row.dispatch_state='CLAIMED'
     and (v_row.dispatch_lease_expires_at is null or v_row.dispatch_lease_expires_at>=now()) then
    return false;
  end if;

  update public.work_log
     set dispatch_state='QUEUED',
         dispatch_attempts=0,
         dispatch_next_attempt_at=now(),
         dispatch_lease_owner=null,
         dispatch_lease_expires_at=null,
         dispatch_last_error=null,
         dispatch_last_emitted_at=null,
         dispatch_last_request_id=null,
         dispatch_completed_at=null
   where id=p_assignment_id;

  return found;
end;
$$;
