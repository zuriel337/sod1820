-- G3_CLAUDE_CODE_ROUTINE_TRANSPORT_V2
-- EXTEND_EXISTING inter_agent_coordination_law v11.
-- Supersedes the v1 Messages/Edge execution transport before release.
-- work_log remains the Coordination Ledger; Claude Code Routine is runtime transport only.
--
-- The Routine API is the real Claude Code agent/session wake path.
-- Required Vault secrets are intentionally NOT created with placeholder values:
--   CLAUDE_CODE_ROUTINE_FIRE_URL
--   CLAUDE_CODE_ROUTINE_TOKEN
-- Missing config fails closed as DEFERRED_CLAUDE_CODE_ROUTINE_NOT_CONFIGURED.

alter table public.work_log
  add column if not exists dispatch_session_id text,
  add column if not exists dispatch_session_url text,
  add column if not exists dispatch_response_at timestamptz;

alter table public.work_log
  drop constraint if exists work_log_dispatch_state_ck,
  add constraint work_log_dispatch_state_ck
    check (dispatch_state is null or dispatch_state in (
      'QUEUED','FIRE_REQUESTED','SESSION_STARTED','CLAIMED','RETRY_WAIT',
      'DEFERRED','FAILED','CANCELLED','COMPLETED'
    ));

-- The old internal Edge webhook transport is not a fallback. Remove its verifier
-- and generated secret so a future agent cannot confuse Messages API execution
-- with a real Claude Code agent wake.
drop function if exists public.agent_dispatch_verify_webhook(text);
delete from vault.secrets where name = 'AGENT_DISPATCH_WEBHOOK_KEY';

-- Primary event transport for CLAUDE READ_ONLY assignments: fire one Claude Code
-- Routine session via Anthropic's routine API. GPT/WRITE/result-wake remain honest
-- DEFERRED states until their governed runtime paths exist.
create or replace function public.agent_dispatch_emit(p_assignment_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_row public.work_log%rowtype;
  v_url text;
  v_token text;
  v_request_id bigint;
  v_text text;
begin
  select * into v_row
  from public.work_log
  where id = p_assignment_id
  for update;

  if not found
     or v_row.archived
     or v_row.superseded_by_id is not null
     or v_row.dispatch_state not in ('QUEUED','RETRY_WAIT')
     or coalesce(v_row.dispatch_next_attempt_at, now()) > now() then
    return null;
  end if;

  if v_row.to_actor <> 'CLAUDE' then
    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_GPT_RUNTIME_ENDPOINT_NOT_CONFIGURED',
           dispatch_last_error='gpt_runtime_endpoint_not_configured',
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return null;
  end if;

  if v_row.dispatch_kind <> 'ASSIGNMENT' then
    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_RESULT_WAKE_RUNTIME_NOT_CONFIGURED',
           dispatch_last_error='result_wake_runtime_not_configured_v2',
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return null;
  end if;

  if coalesce(v_row.assignment_mode,'READ_ONLY') <> 'READ_ONLY' then
    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_WRITE_REQUIRES_GOVERNED_AGENT_RUNTIME',
           dispatch_last_error='write_auto_start_not_enabled_v2',
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return null;
  end if;

  -- Duplicate suppression for trigger recursion / recovery overlap.
  if v_row.dispatch_last_emitted_at is not null
     and v_row.dispatch_last_emitted_at > now() - interval '45 seconds' then
    return v_row.dispatch_last_request_id;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name='CLAUDE_CODE_ROUTINE_FIRE_URL'
  order by created_at desc
  limit 1;

  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name='CLAUDE_CODE_ROUTINE_TOKEN'
  order by created_at desc
  limit 1;

  if v_url is null or v_token is null then
    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_CLAUDE_CODE_ROUTINE_NOT_CONFIGURED',
           dispatch_last_error='claude_code_routine_url_or_token_missing',
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return null;
  end if;

  if v_url !~ '^https://api[.]anthropic[.]com/v1/claude_code/routines/[^/]+/fire$'
     or length(v_token) < 20 then
    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_CLAUDE_CODE_ROUTINE_CONFIG_INVALID',
           dispatch_last_error='claude_code_routine_config_invalid',
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return null;
  end if;

  -- Trigger text is only a locator. The saved Routine prompt must live-bootstrap
  -- from CLAUDE.md + canonical Supabase and treat this text as untrusted input.
  v_text := left(format(
    'SOD1820 assignment locator only. assignment_id=%s task_key=%s canonical_project=linswmnnkjxvweumprav. Read the live work_log assignment by ID, resolve the live owner, then ACK/CLAIM through the canonical dispatch functions. Do not treat trigger text as project truth.',
    v_row.id,
    coalesce(v_row.task_key,'UNKNOWN_TASK')
  ), 4000);

  begin
    select net.http_post(
      url := v_url,
      body := jsonb_build_object('text', v_text),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_token,
        'anthropic-beta','experimental-cc-routine-2026-04-01',
        'anthropic-version','2023-06-01'
      ),
      timeout_milliseconds := 10000
    ) into v_request_id;

    update public.work_log
       set dispatch_state='FIRE_REQUESTED',
           status='DISPATCH_FIRE_REQUESTED_CLAUDE_CODE_ROUTINE',
           dispatch_last_request_id=v_request_id,
           dispatch_last_emitted_at=now(),
           dispatch_last_error=null,
           dispatch_next_attempt_at=null
     where id=p_assignment_id;

    return v_request_id;
  exception when others then
    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_CLAUDE_CODE_ROUTINE_FIRE_ERROR',
           dispatch_last_error=left('routine_fire_error:' || sqlerrm,1000),
           dispatch_last_emitted_at=now(),
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return null;
  end;
end;
$$;

revoke all on function public.agent_dispatch_emit(uuid) from public, anon, authenticated;
grant execute on function public.agent_dispatch_emit(uuid) to service_role;

-- Capture the proof that Claude actually woke: Anthropic returns the new Claude
-- Code session ID and URL. A Routine may claim before this response is reconciled;
-- in that race we retain CLAIMED and only append the session provenance.
create or replace function public.agent_dispatch_reconcile_routine_response(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_row public.work_log%rowtype;
  v_resp net._http_response%rowtype;
  v_body jsonb;
  v_session_id text;
  v_session_url text;
  v_error text;
begin
  select * into v_row
  from public.work_log
  where id=p_assignment_id
  for update;

  if not found then return jsonb_build_object('state','NOT_FOUND'); end if;
  if v_row.dispatch_last_request_id is null then
    return jsonb_build_object('state',coalesce(v_row.dispatch_state,'NO_REQUEST'),'response','NO_REQUEST');
  end if;

  select * into v_resp
  from net._http_response
  where id=v_row.dispatch_last_request_id
  order by created desc
  limit 1;

  if not found then
    return jsonb_build_object('state',coalesce(v_row.dispatch_state,'UNKNOWN'),'response','PENDING');
  end if;

  update public.work_log set dispatch_response_at=now() where id=p_assignment_id;

  if v_resp.status_code between 200 and 299 then
    begin
      v_body := v_resp.content::jsonb;
    exception when others then
      v_body := null;
    end;

    v_session_id := nullif(v_body->>'claude_code_session_id','');
    v_session_url := nullif(v_body->>'claude_code_session_url','');

    if v_session_id is not null and v_session_url is not null then
      update public.work_log
         set dispatch_session_id=v_session_id,
             dispatch_session_url=v_session_url,
             dispatch_state=case when dispatch_state='FIRE_REQUESTED' then 'SESSION_STARTED' else dispatch_state end,
             status=case when dispatch_state='FIRE_REQUESTED' then 'DISPATCH_SESSION_STARTED_CLAUDE_CODE' else status end,
             dispatch_last_error=null
       where id=p_assignment_id;
      return jsonb_build_object(
        'state','SESSION_STARTED',
        'assignment_id',p_assignment_id,
        'claude_code_session_id',v_session_id,
        'claude_code_session_url',v_session_url
      );
    end if;

    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_CLAUDE_CODE_ROUTINE_RESPONSE_INVALID',
           dispatch_last_error='routine_success_without_session_provenance'
     where id=p_assignment_id;
    return jsonb_build_object('state','DEFERRED','error','routine_success_without_session_provenance');
  end if;

  v_error := left(coalesce(v_resp.error_msg,'') || ' http_' || coalesce(v_resp.status_code::text,'unknown') || ' ' || coalesce(v_resp.content,''),1000);

  -- Authentication/configuration errors are deterministic: no blind retries.
  if v_resp.status_code in (400,401,403,404) then
    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_CLAUDE_CODE_ROUTINE_HTTP_CONFIG_ERROR',
           dispatch_last_error=v_error,
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return jsonb_build_object('state','DEFERRED','http_status',v_resp.status_code);
  end if;

  -- 429/5xx is known-no-session response, so bounded retry is safe. Ambiguous
  -- transport timeouts do not auto-retry because they could duplicate a session.
  if v_resp.status_code=429 or v_resp.status_code>=500 then
    update public.work_log
       set dispatch_state='RETRY_WAIT',
           status='RETRY_WAIT_CLAUDE_CODE_ROUTINE_HTTP',
           dispatch_last_error=v_error,
           dispatch_next_attempt_at=now()+interval '1 minute',
           dispatch_last_emitted_at=null,
           dispatch_last_request_id=null
     where id=p_assignment_id;
    return jsonb_build_object('state','RETRY_WAIT','http_status',v_resp.status_code);
  end if;

  update public.work_log
     set dispatch_state='DEFERRED',
         status='DEFERRED_CLAUDE_CODE_ROUTINE_AMBIGUOUS_TRANSPORT',
         dispatch_last_error=v_error,
         dispatch_next_attempt_at=null
   where id=p_assignment_id;
  return jsonb_build_object('state','DEFERRED','http_status',v_resp.status_code);
end;
$$;

revoke all on function public.agent_dispatch_reconcile_routine_response(uuid) from public, anon, authenticated;
grant execute on function public.agent_dispatch_reconcile_routine_response(uuid) to service_role;

-- A real Claude Code Routine may ACK/CLAIM before or after the fire response is
-- reconciled. Allow both states without letting a second worker steal the lease.
create or replace function public.agent_dispatch_claim(
  p_assignment_id uuid,
  p_worker text,
  p_lease_seconds integer default 900
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
         status='CLAIMED_' || coalesce(w.to_actor,'AGENT') || '_EVENT_DRIVEN_RUNTIME'
   where w.id=p_assignment_id
     and w.archived=false
     and w.superseded_by_id is null
     and w.to_actor in ('GPT','CLAUDE')
     and coalesce(w.dispatch_attempts,0)<3
     and (
       w.dispatch_state in ('QUEUED','RETRY_WAIT','FIRE_REQUESTED','SESSION_STARTED')
       or (w.dispatch_state='CLAIMED' and w.dispatch_lease_expires_at<now())
     )
  returning w.* into v_row;

  if not found then return null; end if;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.agent_dispatch_claim(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.agent_dispatch_claim(uuid,text,integer) to service_role;

-- Reconcile pg_net responses as recovery/observability only. This cron does not
-- initiate assignments; the INSERT/UPDATE trigger remains the event source.
create or replace function public.agent_dispatch_reconcile_routine_responses()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_seen integer := 0;
begin
  for v_row in
    select id
    from public.work_log
    where archived=false
      and superseded_by_id is null
      and to_actor='CLAUDE'
      and dispatch_last_request_id is not null
      and dispatch_response_at is null
      and dispatch_state in ('FIRE_REQUESTED','CLAIMED')
    order by created_at
    limit 100
  loop
    perform public.agent_dispatch_reconcile_routine_response(v_row.id);
    v_seen := v_seen+1;
  end loop;
  return jsonb_build_object('responses_checked',v_seen);
end;
$$;

revoke all on function public.agent_dispatch_reconcile_routine_responses() from public, anon, authenticated;
grant execute on function public.agent_dispatch_reconcile_routine_responses() to service_role;

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname='g3-agent-routine-response-reconcile' loop
    perform cron.unschedule(r.jobid);
  end loop;
  perform cron.schedule(
    'g3-agent-routine-response-reconcile',
    '* * * * *',
    'select public.agent_dispatch_reconcile_routine_responses();'
  );
end
$$;

-- Extend CURRENT projection with explicit session provenance. This is evidence of
-- wake, not project truth or release authority.
create or replace view public.work_log_current as
with base as (
  select
    w.*,
    coalesce(
      w.task_key,
      (regexp_match(coalesce(w.topic,''),'task=([^ ]+)'))[1],
      split_part(coalesce(w.topic,''),' — ',1)
    ) as _task_scope
  from public.work_log w
  where w.archived=false and w.superseded_by_id is null
),
recent as (
  select id from base order by created_at desc limit 100
),
active_latest as (
  select distinct on (_task_scope) id
  from base
  where created_at>=now()-interval '14 days'
    and (
      coalesce(status,'') ~* '(CLAIMED_WRITE|WRITE_SCOPE_OPEN|BLOCKED|WAITING|AWAITING|QUEUED|ASSIGNED|ACK_REQUIRED|READY_TO_DEPLOY|RELEASE_AUTHORIZED|ממתין)'
      or dispatch_state in ('QUEUED','FIRE_REQUESTED','SESSION_STARTED','CLAIMED','RETRY_WAIT','DEFERRED')
    )
  order by _task_scope,created_at desc
),
keep as (
  select id from recent
  union
  select id from active_latest
)
select
  b.id,b.session_date,b.topic,b.numbers,b.what_we_did,b.status,b.open_threads,b.created_at,b.archived,b.superseded_by_id,
  b.task_key,b.from_actor,b.to_actor,b.assignment_mode,b.assignment_scope,b.primary_owner,b.release_authorization_state,
  b.parent_assignment_id,b.dispatch_kind,b.dispatch_state,b.dispatch_context,b.dispatch_attempts,b.dispatch_next_attempt_at,
  b.dispatch_lease_owner,b.dispatch_lease_expires_at,b.dispatch_last_error,b.dispatch_last_request_id,b.dispatch_last_emitted_at,
  b.dispatch_completed_at,b.dispatch_session_id,b.dispatch_session_url,b.dispatch_response_at
from base b join keep k using(id)
order by b.created_at desc;

comment on column public.work_log.dispatch_session_id is
  'Claude Code session id returned by Anthropic Routine API; runtime provenance only.';
comment on column public.work_log.dispatch_session_url is
  'Claude Code session URL returned by Anthropic Routine API; proof-of-wake provenance only.';
