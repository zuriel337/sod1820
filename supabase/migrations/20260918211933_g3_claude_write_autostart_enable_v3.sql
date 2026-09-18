-- G3_CLAUDE_WRITE_AUTOSTART_ENABLE_V3
-- EXTEND_EXISTING inter_agent_coordination_law v13.
-- Enables governed Claude Code Routine auto-start for WRITE assignments only when
-- the live assignment is explicitly branch-only with NO_MERGE + NO_DEPLOY.
-- This does not grant merge, deploy, live DB apply, canonicalization or publication authority.

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

revoke all on function public.agent_dispatch_emit(uuid) from public, anon, authenticated;
grant execute on function public.agent_dispatch_emit(uuid) to service_role;
