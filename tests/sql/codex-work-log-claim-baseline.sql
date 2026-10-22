-- Read-only snapshot of the exact live RPCs on 2026-10-10 for isolated PostgreSQL tests.
-- Fixture only: never apply this file to Supabase.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create function auth.role() returns text language sql as $$ select 'service_role'::text $$;
create function public.rd_is_admin() returns boolean language sql as $$ select false $$;
create table public.work_log (
 id uuid primary key, task_key text, archived boolean default false, superseded_by_id uuid,
 to_actor text, assignment_mode text, dispatch_kind text, dispatch_state text, status text,
 dispatch_attempts integer default 0, dispatch_lease_owner text, dispatch_lease_expires_at timestamptz,
 dispatch_next_attempt_at timestamptz, dispatch_context jsonb default '{}'::jsonb,
 dispatch_last_error text, dispatch_last_emitted_at timestamptz,
 dispatch_last_request_id bigint, dispatch_completed_at timestamptz
);
CREATE OR REPLACE FUNCTION public.agent_dispatch_claim(p_assignment_id uuid, p_worker text, p_lease_seconds integer DEFAULT 900)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_row public.work_log%rowtype; v_lease integer:=greatest(30,least(coalesce(p_lease_seconds,900),1800));
begin
  if length(trim(coalesce(p_worker,'')))<3 then raise exception 'worker required'; end if;
  update public.work_log w set dispatch_state='CLAIMED',dispatch_attempts=coalesce(w.dispatch_attempts,0)+1,dispatch_lease_owner=left(p_worker,200),dispatch_lease_expires_at=now()+make_interval(secs=>v_lease),dispatch_next_attempt_at=null,status='CLAIMED_'||coalesce(w.to_actor,'AGENT')||'_EVENT_DRIVEN_RUNTIME'
   where w.id=p_assignment_id and w.archived=false and w.superseded_by_id is null and w.to_actor in ('GPT','CLAUDE') and coalesce(w.dispatch_attempts,0)<3 and (w.dispatch_state in ('QUEUED','RETRY_WAIT','FIRE_REQUESTED','SESSION_STARTED') or (w.dispatch_state='CLAIMED' and w.dispatch_lease_expires_at<now())) returning w.* into v_row;
  if not found then return null; end if; return to_jsonb(v_row);
end $function$;

CREATE OR REPLACE FUNCTION public.agent_dispatch_requeue(p_assignment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Never create a second runtime while the first request/session/lease is live.
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
$function$;

-- Exact current canonical finish/recovery bodies in disposable PostgreSQL only.
-- Expand only the test fixture schema to model AFTER output and expired-lease recovery.
alter table public.work_log
  add column topic text,
  add column what_we_did text,
  add column open_threads text,
  add column from_actor text,
  add column assignment_scope text,
  add column primary_owner text,
  add column release_authorization_state text,
  add column parent_assignment_id uuid,
  add column created_at timestamptz default now();
alter table public.work_log alter column id set default gen_random_uuid();

-- Never make network calls in the disposable fixture.
create or replace function public.agent_dispatch_emit(p_assignment_id uuid)
returns bigint language sql as $$ select null::bigint $$;

create or replace function public.agent_dispatch_finish(
  p_assignment_id uuid,
  p_worker text,
  p_outcome text,
  p_result_status text,
  p_result_summary text,
  p_open_threads text default null,
  p_retryable boolean default false,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.work_log%rowtype;
  v_outcome text := upper(trim(coalesce(p_outcome,'')));
  v_after_id uuid;
  v_next interval;
  v_wake boolean;
  v_after_dispatch_state text;
  v_after_dispatch_kind text;
  v_after_to text;
begin
  select * into v_row
  from public.work_log
  where id = p_assignment_id
  for update;

  if not found then raise exception 'assignment not found'; end if;
  if v_row.dispatch_state <> 'CLAIMED'
     or v_row.dispatch_lease_owner is distinct from left(p_worker,200) then
    raise exception 'lease mismatch';
  end if;

  if v_outcome = 'DEFERRED' then
    update public.work_log
       set dispatch_state = 'DEFERRED',
           status = left(coalesce(nullif(p_result_status,''),'DEFERRED_AGENT_RUNTIME'),240),
           dispatch_last_error = left(coalesce(p_error,p_result_summary,'deferred'),1000),
           dispatch_lease_owner = null,
           dispatch_lease_expires_at = null,
           dispatch_next_attempt_at = null
     where id = p_assignment_id;
    return jsonb_build_object('state','DEFERRED','assignment_id',p_assignment_id);
  end if;

  if v_outcome = 'FAILED' and p_retryable and coalesce(v_row.dispatch_attempts,0) < 3 then
    v_next := case coalesce(v_row.dispatch_attempts,0)
      when 1 then interval '1 minute'
      when 2 then interval '5 minutes'
      else interval '15 minutes'
    end;
    update public.work_log
       set dispatch_state = 'RETRY_WAIT',
           dispatch_last_error = left(coalesce(p_error,p_result_summary,'retryable_failure'),1000),
           dispatch_next_attempt_at = now() + v_next,
           dispatch_lease_owner = null,
           dispatch_lease_expires_at = null
     where id = p_assignment_id;
    return jsonb_build_object('state','RETRY_WAIT','assignment_id',p_assignment_id,'next_attempt_at',now()+v_next);
  end if;

  if v_outcome not in ('COMPLETED','FAILED','CANCELLED') then
    raise exception 'invalid terminal outcome %', v_outcome;
  end if;

  v_wake := v_row.from_actor in ('GPT','CLAUDE');
  v_after_dispatch_state := case when v_wake then 'QUEUED' else null end;
  v_after_dispatch_kind := case when v_wake then 'RESULT_WAKE' else null end;
  v_after_to := case when v_wake then v_row.from_actor else null end;

  insert into public.work_log(
    topic, status, what_we_did, open_threads,
    task_key, from_actor, to_actor, assignment_mode, assignment_scope,
    primary_owner, release_authorization_state, parent_assignment_id,
    dispatch_kind, dispatch_state, dispatch_next_attempt_at, dispatch_context
  ) values (
    format('actor=%s FROM=%s TO=%s task=%s — AFTER',
      coalesce(v_row.to_actor,'DISPATCHER'),
      coalesce(v_row.to_actor,'DISPATCHER'),
      coalesce(v_row.from_actor,'ZURIEL'),
      coalesce(v_row.task_key,'UNKNOWN_TASK')),
    left(coalesce(nullif(p_result_status,''), 'AFTER_DISPATCH_' || v_outcome), 240),
    left(coalesce(p_result_summary,''),12000),
    left(coalesce(p_open_threads,''),12000),
    v_row.task_key,
    v_row.to_actor,
    v_after_to,
    'READ_ONLY',
    v_row.assignment_scope,
    v_row.primary_owner,
    v_row.release_authorization_state,
    v_row.id,
    v_after_dispatch_kind,
    v_after_dispatch_state,
    case when v_wake then now() else null end,
    jsonb_build_object(
      'result_of', v_row.id,
      'outcome', v_outcome,
      'attempts', coalesce(v_row.dispatch_attempts,0),
      'runtime_error', p_error,
      'originating_actor', v_row.from_actor,
      'completed_by', p_worker
    )
  ) returning id into v_after_id;

  update public.work_log
     set dispatch_state = v_outcome,
         dispatch_completed_at = now(),
         dispatch_last_error = case when v_outcome='COMPLETED' then null else left(coalesce(p_error,p_result_summary),1000) end,
         dispatch_lease_owner = null,
         dispatch_lease_expires_at = null,
         dispatch_next_attempt_at = null,
         superseded_by_id = v_after_id
   where id = p_assignment_id;

  return jsonb_build_object(
    'state',v_outcome,
    'assignment_id',p_assignment_id,
    'after_id',v_after_id,
    'result_wake_queued',v_wake
  );
end;
$$;

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
