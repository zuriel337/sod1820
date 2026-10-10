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
