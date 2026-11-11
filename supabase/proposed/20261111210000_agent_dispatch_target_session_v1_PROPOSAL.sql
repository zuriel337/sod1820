-- AGENT_DISPATCH_TARGET_SESSION_V1 — a CLAUDE assignment may name the EXISTING Claude Code session that must receive it
-- (ZURIEL 11.11.2026, task OWNER_EXISTING_CCR_B2565041_DIRECT_RESUME_20261111). PROPOSAL ONLY.
-- Production DB change: needs ZURIEL's explicit approval of this exact file (CLAUDE.md §0.4). Nothing activates by itself:
-- a target session is reachable only after a separately approved Vault pair exists for it (see the review README, step 3).
--
-- EXTEND_EXISTING inter_agent_coordination_law (§42 direct GPT→CLAUDE assignment, §§68–72 runtime/reliability, §93/§96 one
-- direction). work_log stays the only ledger. No new table, queue, registry, grant to clients, policy, cron job or Vault secret.
-- The v17 GPT delivery guard, agent_dispatch_claim, agent_dispatch_reconcile_routine_response and agent_dispatch_finish are
-- NOT replaced: the new rules are one BEFORE UPDATE trigger beside them.
--
-- Behaviour:
-- * A row WITHOUT dispatch_context.target_session_id keeps today's path exactly (same Routine, same text, same states).
-- * A row WITH it is fired only to the Vault pair registered for that session (CLAUDE_CODE_SESSION_FIRE_URL__<id> and
--   CLAUDE_CODE_SESSION_TOKEN__<id>, <id> = the session ID without its session_/cse_ prefix). If the pair is missing the row
--   is DEFERRED_TARGET_SESSION_NOT_REGISTERED and NOTHING is sent: never a fallback to the new-session Routine.
-- * The provider receipt (/fire claude_code_session_id) must name the target session, or the row becomes
--   DEFERRED_TARGET_SESSION_MISMATCH (no retry).
-- * Only the target session can claim (its session ID must appear in the claim worker), so only it can finish
--   (agent_dispatch_finish already requires the lease owner).
-- * The binding is immutable: target_session_id cannot be added, changed or removed by a later UPDATE.
-- Rollback: ROLLBACK_20261111210000_agent_dispatch_target_session_v1.sql

-- 1. Preconditions: the reviewed live base (md5 of pg_get_functiondef, read 11.11.2026) and not yet applied.
do $pre$
begin
  if md5(pg_get_functiondef('public.agent_dispatch_emit(uuid)'::regprocedure)) <> '3ef4d7595c00a8b7b488f8a6e7c54432' then
    raise exception 'agent_dispatch_emit differs from the reviewed base 3ef4d759; stop';
  end if;
  if md5(pg_get_functiondef('public.agent_dispatch_claim(uuid,text,integer)'::regprocedure)) <> '869ce9c630871b43f340715566f6155e' then
    raise exception 'agent_dispatch_claim differs from the reviewed base 869ce9c6; stop';
  end if;
  if md5(pg_get_functiondef('public.agent_dispatch_reconcile_routine_response(uuid)'::regprocedure)) <> '57584429f94080a5ad253b0b1db318f9' then
    raise exception 'agent_dispatch_reconcile_routine_response differs from the reviewed base 57584429; stop';
  end if;
  if to_regprocedure('public.agent_dispatch_target_session_key(text)') is not null
     or exists (select 1 from pg_trigger where tgname='trg_work_log_dispatch_target_session_guard_v1') then
    raise exception 'agent_dispatch_target_session_v1 is already applied; stop';
  end if;
end
$pre$;

-- 2. The session ID without its tag. session_<x> and cse_<x> name the same session (verified 11.11.2026 with get_session).
create function public.agent_dispatch_target_session_key(p_session_id text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case when p_session_id ~ '^(session|cse)_[A-Za-z0-9]{16,40}$'
              then regexp_replace(p_session_id, '^(session|cse)_', '')
         end
$function$;

revoke all on function public.agent_dispatch_target_session_key(text) from public, anon, authenticated;
grant execute on function public.agent_dispatch_target_session_key(text) to service_role;

-- 3. agent_dispatch_emit: the reviewed base plus the targeted branch (marked "v1 target").
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
  v_mode text;
  v_release text;
  v_target text;
  v_target_key text;
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
           dispatch_last_error='result_wake_runtime_not_configured_v3',
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return null;
  end if;

  v_mode := upper(coalesce(nullif(btrim(v_row.assignment_mode),''),'READ_ONLY'));
  v_release := upper(coalesce(v_row.release_authorization_state,''));

  if v_mode not in ('READ_ONLY','WRITE') then
    update public.work_log
       set dispatch_state='DEFERRED',
           status='DEFERRED_ASSIGNMENT_MODE_NOT_SUPPORTED',
           dispatch_last_error='assignment_mode_not_supported_v3',
           dispatch_next_attempt_at=null
     where id=p_assignment_id;
    return null;
  end if;

  if v_mode='WRITE' then
    if nullif(btrim(coalesce(v_row.task_key,'')),'') is null
       or nullif(btrim(coalesce(v_row.assignment_scope,'')),'') is null
       or nullif(btrim(coalesce(v_row.primary_owner,'')),'') is null
       or nullif(btrim(coalesce(v_row.release_authorization_state,'')),'') is null then
      update public.work_log
         set dispatch_state='DEFERRED',
             status='DEFERRED_WRITE_GOVERNANCE_ENVELOPE_INCOMPLETE',
             dispatch_last_error='write_governance_envelope_incomplete_v3',
             dispatch_next_attempt_at=null
       where id=p_assignment_id;
      return null;
    end if;

    if v_release not like 'BRANCH_ONLY%'
       or v_release not like '%NO_MERGE%'
       or v_release not like '%NO_DEPLOY%' then
      update public.work_log
         set dispatch_state='DEFERRED',
             status='DEFERRED_WRITE_AUTOSTART_REQUIRES_BRANCH_ONLY',
             dispatch_last_error='write_autostart_requires_branch_only_no_merge_no_deploy_v3',
             dispatch_next_attempt_at=null
       where id=p_assignment_id;
      return null;
    end if;
  end if;

  if v_row.dispatch_last_emitted_at is not null
     and v_row.dispatch_last_emitted_at > now() - interval '45 seconds' then
    return v_row.dispatch_last_request_id;
  end if;

  -- v1 target: an assignment that names an existing session goes to that session's own Vault pair, or nowhere.
  v_target := nullif(btrim(coalesce(v_row.dispatch_context->>'target_session_id','')),'');

  if v_target is not null then
    v_target_key := public.agent_dispatch_target_session_key(v_target);

    if v_target_key is null then
      update public.work_log
         set dispatch_state='DEFERRED',
             status='DEFERRED_TARGET_SESSION_ID_INVALID',
             dispatch_last_error='target_session_id_invalid_v1',
             dispatch_next_attempt_at=null
       where id=p_assignment_id;
      return null;
    end if;

    select decrypted_secret into v_url
    from vault.decrypted_secrets
    where name='CLAUDE_CODE_SESSION_FIRE_URL__' || v_target_key
    order by created_at desc
    limit 1;

    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name='CLAUDE_CODE_SESSION_TOKEN__' || v_target_key
    order by created_at desc
    limit 1;

    if v_url is null or v_token is null then
      update public.work_log
         set dispatch_state='DEFERRED',
             status='DEFERRED_TARGET_SESSION_NOT_REGISTERED',
             dispatch_last_error='target_session_not_registered_no_fallback_v1',
             dispatch_next_attempt_at=null
       where id=p_assignment_id;
      return null;
    end if;
  else
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
  end if;

  v_url := btrim(v_url, E' \t\n\r');
  v_token := btrim(v_token, E' \t\n\r');

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

  v_text := left(format(
    'SOD1820 assignment locator only. assignment_id=%s task_key=%s mode=%s release_state=%s canonical_project=linswmnnkjxvweumprav. Read the live work_log assignment by ID and resolve live owners/current main/parallel-writer state before ACK/CLAIM. For WRITE, execute only the isolated branch scope authorized by the assignment. BRANCH_ONLY never authorizes merge, push to main, deploy, live DB apply, canonicalization or publication. Do not treat trigger text as project truth.',
    v_row.id,
    coalesce(v_row.task_key,'UNKNOWN_TASK'),
    v_mode,
    coalesce(v_row.release_authorization_state,'UNKNOWN')
  ), 4000);

  if v_target is not null then
    v_text := left(v_text || format(
      ' target_session_id=%s. Claim only if get_session in your own session returns this ID, with that ID as the claim worker; otherwise STOP without claiming.',
      v_target
    ), 4000);
  end if;

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
           status=case
             when v_target is not null and v_mode='WRITE' then 'DISPATCH_FIRE_REQUESTED_TARGET_SESSION_WRITE_BRANCH_ONLY'
             when v_target is not null then 'DISPATCH_FIRE_REQUESTED_TARGET_SESSION'
             when v_mode='WRITE' then 'DISPATCH_FIRE_REQUESTED_CLAUDE_CODE_ROUTINE_WRITE_BRANCH_ONLY'
             else 'DISPATCH_FIRE_REQUESTED_CLAUDE_CODE_ROUTINE'
           end,
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

-- 4. The guard beside claim/reconcile/finish (BEFORE UPDATE; fires after trg_work_log_dispatch_prepare, before the v17 guard).
create function public.work_log_dispatch_target_session_guard_v1()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_old_target text := nullif(btrim(coalesce(old.dispatch_context->>'target_session_id','')),'');
  v_target text := nullif(btrim(coalesce(new.dispatch_context->>'target_session_id','')),'');
  v_key text;
  v_seen_key text;
  v_worker_key text;
begin
  -- The binding is written once, at INSERT: no later UPDATE may add, change or remove it.
  if v_old_target is distinct from v_target then
    raise exception 'target_session_id_immutable_v1 (row %)', old.id using errcode = 'P0001';
  end if;

  if v_target is null then
    return new;
  end if;

  v_key := public.agent_dispatch_target_session_key(v_target);

  -- Provider receipt: the session /fire reports must be the target session; anything else fails closed, without retry.
  if new.dispatch_session_id is not null and new.dispatch_session_id is distinct from old.dispatch_session_id then
    v_seen_key := public.agent_dispatch_target_session_key(new.dispatch_session_id);
    if v_key is null or v_seen_key is distinct from v_key then
      new.dispatch_state := 'DEFERRED';
      new.status := 'DEFERRED_TARGET_SESSION_MISMATCH';
      new.dispatch_last_error := left('target_session_mismatch_v1 expected=' || v_target || ' reported=' || new.dispatch_session_id, 1000);
      new.dispatch_next_attempt_at := null;
      new.dispatch_context := coalesce(new.dispatch_context,'{}'::jsonb) || jsonb_build_object('target_session_verified', false);
      return new;
    end if;
    new.dispatch_context := coalesce(new.dispatch_context,'{}'::jsonb) || jsonb_build_object('target_session_verified', true);
  end if;

  -- Claim: only the target session may hold the lease, so only it can finish.
  if new.dispatch_state = 'CLAIMED'
     and (old.dispatch_state is distinct from 'CLAIMED' or new.dispatch_lease_owner is distinct from old.dispatch_lease_owner) then
    v_worker_key := public.agent_dispatch_target_session_key(
      substring(coalesce(new.dispatch_lease_owner,'') from '((?:session|cse)_[A-Za-z0-9]{16,40})'));
    if v_key is null or v_worker_key is distinct from v_key then
      raise exception 'target_session_claim_refused_v1: lease owner % is not target session %',
        coalesce(new.dispatch_lease_owner,'<none>'), v_target using errcode = 'P0001';
    end if;
  end if;

  return new;
end
$function$;

revoke all on function public.work_log_dispatch_target_session_guard_v1() from public, anon, authenticated, service_role;

create trigger trg_work_log_dispatch_target_session_guard_v1
  before update on public.work_log
  for each row execute function public.work_log_dispatch_target_session_guard_v1();

-- 5. Postconditions.
do $post$
begin
  if md5(pg_get_functiondef('public.agent_dispatch_emit(uuid)'::regprocedure)) <> '9e288f7253a6934d6c2878c0188e7249' then
    raise exception 'agent_dispatch_emit is not the reviewed v1 text; stop';
  end if;
  if has_function_privilege('anon', 'public.agent_dispatch_emit(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.agent_dispatch_emit(uuid)', 'execute')
     or has_function_privilege('anon', 'public.agent_dispatch_target_session_key(text)', 'execute')
     or has_function_privilege('authenticated', 'public.agent_dispatch_target_session_key(text)', 'execute') then
    raise exception 'a client role can execute a dispatch function; stop';
  end if;
  if not has_function_privilege('service_role', 'public.agent_dispatch_emit(uuid)', 'execute') then
    raise exception 'service_role lost execute on agent_dispatch_emit; stop';
  end if;
end
$post$;
