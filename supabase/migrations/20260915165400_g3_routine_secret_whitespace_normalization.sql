-- G3_ROUTINE_SECRET_WHITESPACE_NORMALIZATION
-- Robustness hardening after the first live Golden found a copied LF after /fire.
-- Never persist/log secret values; normalize surrounding whitespace in-memory only.

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

  -- Copy/paste through textarea/password UIs can append CR/LF. Normalize only
  -- surrounding transport whitespace; never mutate or expose the stored secret.
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

comment on function public.agent_dispatch_emit(uuid) is
  'Event transport to canonical Claude Code Routine. Trims surrounding CR/LF/tab/space from Vault transport secrets in-memory before validation; never logs secret values.';
