-- BRANCH ONLY. Existing v16 work_log transport; no tables, cron jobs, public grants or activation.
-- Apply only with an authorized runtime rollout: sender/receiver must use structured envelope + ACK.
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.work_log WHERE archived=false AND superseded_by_id IS NULL AND assignment_mode='WRITE' AND dispatch_kind IS NULL AND status LIKE 'CLAIMED_WRITE%' AND (jsonb_typeof(dispatch_context->'github_paths') IS DISTINCT FROM 'array' OR jsonb_array_length(dispatch_context->'github_paths')=0)) THEN
  RAISE EXCEPTION 'apply blocked: reconcile legacy WRITE owners and github_paths before rollout; no automatic retirement';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.work_log WHERE task_key='SESSION_COORDINATION_ACK_PROTOCOL_ROLLOUT_V16' AND from_actor='GPT' AND status='ACK_PROTOCOL_ROLLOUT_VERIFIED' AND dispatch_context->>'receiver_protocol'='ACK_BEFORE_CLAIM_V16' AND dispatch_context->>'tested'='true') THEN
  RAISE EXCEPTION 'apply blocked: verify compatible Routine ACK-before-claim instructions before migration';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.agent_dispatch_emit(p_assignment_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
declare
  v_row public.work_log%rowtype;
  v_url text;
  v_token text;
  v_request_id bigint;
  v_text text;
  v_mode text;
  v_release text;
  v_reason text;
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

  v_reason := public.agent_dispatch_preflight(v_row);
  if v_reason is not null then
    update public.work_log set dispatch_state='DEFERRED', status='BLOCKED_DISPATCH_PREFLIGHT',
      dispatch_last_error=v_reason, dispatch_next_attempt_at=null where id=p_assignment_id;
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
    'SOD1820 assignment locator only. assignment_id=%s task_key=%s mode=%s release_state=%s canonical_project=linswmnnkjxvweumprav. Read the live work_log assignment by ID and resolve live owners/current main/parallel-writer state. Confirm receipt via agent_dispatch_ack with your real receiver session ID and observed Git base/head, then agent_dispatch_claim. A fire request is not ACK. Record WORKING and TESTED through agent_dispatch_progress; finish with passive AFTER. If ACK/progress helpers are unavailable or instructions are incompatible, STOP and record the runtime mismatch; do not bypass them. For WRITE, execute only the isolated branch scope authorized by the assignment. BRANCH_ONLY never authorizes merge, push to main, deploy, live DB apply, canonicalization or publication. Do not treat trigger text as project truth.',
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
$function$;

CREATE OR REPLACE FUNCTION public.agent_dispatch_preflight(p_row public.work_log)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g jsonb:=coalesce(p_row.dispatch_context->'governance','{}'); path text; dep text; other public.work_log%rowtype;
BEGIN
 IF p_row.task_key IS NULL OR p_row.task_key !~ '^[A-Za-z0-9._:-]{3,160}$' THEN RETURN 'task_key_missing_or_invalid'; END IF;
 IF nullif(trim(p_row.assignment_scope),'') IS NULL OR nullif(trim(p_row.primary_owner),'') IS NULL THEN RETURN 'scope_or_owner_missing'; END IF;
 IF p_row.assignment_mode NOT IN ('READ_ONLY','WRITE') OR p_row.assignment_mode IS NULL THEN RETURN 'mode_missing_or_invalid'; END IF;
 IF p_row.from_actor IS NULL OR p_row.to_actor IS NULL OR p_row.from_actor NOT IN ('GPT','ZURIEL') OR p_row.to_actor<>'CLAUDE' THEN RETURN 'activation_direction_unsupported_v16'; END IF;
 IF p_row.assignment_mode='READ_ONLY' THEN RETURN NULL; END IF;
 IF nullif(trim(p_row.release_authorization_state),'') IS NULL THEN RETURN 'write_governance_envelope_incomplete'; END IF;
 IF p_row.release_authorization_state NOT LIKE 'BRANCH_ONLY%' OR p_row.release_authorization_state NOT LIKE '%NO_MERGE%' OR p_row.release_authorization_state NOT LIKE '%NO_DEPLOY%' THEN RETURN 'write_autostart_requires_branch_only'; END IF;
 IF g->>'base_sha' IS NULL OR g->>'base_sha' !~ '^[0-9a-f]{40}$' OR g->>'expected_head_sha' IS NULL OR g->>'expected_head_sha' !~ '^[0-9a-f]{40}$' THEN RETURN 'git_base_or_head_missing_or_invalid'; END IF;
 IF g->>'branch' IS NULL OR g->>'branch' !~ '^(gpt|claude|integration|perf)/[A-Za-z0-9._/-]+$' OR g->>'branch' LIKE '%..%' OR g->>'branch' LIKE '%//%' OR g->>'branch' LIKE '%/' THEN RETURN 'isolated_branch_missing_or_invalid'; END IF;
 IF nullif(trim(g->>'authorization_ref'),'') IS NULL THEN RETURN 'write_authorization_reference_missing'; END IF;
 IF jsonb_typeof(p_row.dispatch_context->'github_paths') IS DISTINCT FROM 'array' OR jsonb_array_length(p_row.dispatch_context->'github_paths')=0 THEN RETURN 'write_paths_missing'; END IF;
 IF jsonb_typeof(g->'dependency_ids') IS DISTINCT FROM 'array' THEN RETURN 'dependency_ids_missing'; END IF;
 IF nullif(trim(p_row.dispatch_context->>'verification'),'') IS NULL OR nullif(trim(p_row.dispatch_context->>'stop_condition'),'') IS NULL OR nullif(trim(p_row.dispatch_context->>'expected_output'),'') IS NULL THEN RETURN 'acceptance_contract_missing'; END IF;
 FOR path IN SELECT jsonb_array_elements_text(p_row.dispatch_context->'github_paths') LOOP
  IF path='' OR path LIKE '/%' OR path LIKE '%..%' OR path LIKE '%\\%' OR path LIKE '%//%' OR path ~ '(^|/)\.(\/|$)' OR path LIKE '%/' OR (path LIKE '%*%' AND length(path)-length(replace(path,'*',''))<>2) OR replace(path,'/**','') LIKE '%*%' OR (path LIKE '%*%' AND path NOT LIKE '%/**') OR path !~ '^[A-Za-z0-9._/*-]+$' THEN RETURN 'write_path_invalid'; END IF;
 END LOOP;
 FOR dep IN SELECT jsonb_array_elements_text(g->'dependency_ids') LOOP
  IF dep !~ '^[0-9a-f-]{36}$' THEN RETURN 'dependency_id_invalid'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.work_log WHERE id=dep::uuid AND (dispatch_state='COMPLETED' OR dispatch_context->>'outcome'='COMPLETED') AND coalesce(dispatch_context->>'result_status',status) ~ '(^|_)PASS(_|$)|^AFTER_TESTED$' AND coalesce(dispatch_context->>'result_status',status) !~ '(BLOCKED|BLOCKER|FAILED|DEFERRED)') THEN RETURN 'dependency_not_accepted:'||dep; END IF;
 END LOOP;
 -- One transaction-wide lock serializes reservation/claim checks across differently named scopes.
 PERFORM pg_advisory_xact_lock(hashtext('agent_dispatch:write_files_v16'));
 FOR other IN SELECT * FROM public.work_log w WHERE w.id IS DISTINCT FROM p_row.id AND w.archived=false AND w.superseded_by_id IS NULL AND w.assignment_mode='WRITE'
  AND (w.dispatch_kind='ASSIGNMENT' AND (coalesce(w.dispatch_state,'QUEUED') NOT IN ('COMPLETED','FAILED','CANCELLED','DEFERRED') OR w.dispatch_state='DEFERRED' AND w.dispatch_lease_owner IS NOT NULL) OR w.dispatch_kind IS NULL AND w.status LIKE 'CLAIMED_WRITE%') LOOP
  IF lower(other.assignment_scope)=lower(p_row.assignment_scope) THEN RETURN 'active_writer_scope_conflict:'||other.id; END IF;
  IF jsonb_typeof(other.dispatch_context->'github_paths') IS DISTINCT FROM 'array' THEN RETURN 'active_writer_paths_unverified:'||other.id; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_row.dispatch_context->'github_paths') a(path), jsonb_array_elements_text(other.dispatch_context->'github_paths') b(path)
    WHERE lower(regexp_replace(a.path,'/\*\*$',''))=lower(regexp_replace(b.path,'/\*\*$','')) OR starts_with(lower(regexp_replace(a.path,'/\*\*$','')),lower(regexp_replace(b.path,'/\*\*$',''))||'/') OR starts_with(lower(regexp_replace(b.path,'/\*\*$','')),lower(regexp_replace(a.path,'/\*\*$',''))||'/')) THEN RETURN 'active_writer_file_conflict:'||other.id; END IF;
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.agent_dispatch_preflight(public.work_log) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_dispatch_preflight(public.work_log) TO service_role;

CREATE OR REPLACE FUNCTION public.work_log_dispatch_preflight_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text;
BEGIN
 IF new.dispatch_kind='ASSIGNMENT' AND new.dispatch_state IN ('QUEUED','RETRY_WAIT','FIRE_REQUESTED','SESSION_STARTED','CLAIMED') THEN
  reason:=public.agent_dispatch_preflight(new);
  IF reason IS NOT NULL THEN
   new.dispatch_state:='DEFERRED'; new.status:='BLOCKED_DISPATCH_PREFLIGHT'; new.dispatch_last_error:=reason;
   new.dispatch_next_attempt_at:=NULL;
   new.dispatch_context:=coalesce(new.dispatch_context,'{}')||jsonb_build_object('lifecycle','BLOCKED','blocked_reason',reason);
  END IF;
 END IF;
 RETURN new;
END $$;
-- Alphabetical BEFORE order: run after existing legacy INSERT-only prepare, before AFTER emit.
CREATE TRIGGER trg_work_log_dispatch_zz_preflight BEFORE INSERT OR UPDATE ON public.work_log FOR EACH ROW EXECUTE FUNCTION public.work_log_dispatch_preflight_guard();
REVOKE ALL ON FUNCTION public.work_log_dispatch_preflight_guard() FROM PUBLIC,anon,authenticated;

-- Overload the existing sender with a structured governance envelope; retain old READ_ONLY calls.
CREATE OR REPLACE FUNCTION public.work_log_assign_agent(
 p_from_actor text,p_to_actor text,p_task_key text,p_primary_owner text,p_mode text,p_scope text,p_objective text,
 p_dependencies text[],p_do_not_touch text[],p_verification text,p_stop_condition text,p_expected_output text,
 p_release_authorization_state text,p_github_paths text[],p_governance jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prior public.work_log%rowtype; result uuid; context jsonb;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT coalesce(public.rd_is_admin(),false) THEN RAISE EXCEPTION 'not authorized'; END IF;
 IF upper(p_from_actor) NOT IN ('GPT','ZURIEL') OR upper(p_to_actor)<>'CLAUDE' THEN RAISE EXCEPTION 'activation direction unsupported v16'; END IF;
 context:=jsonb_build_object('objective',p_objective,'dependencies',to_jsonb(coalesce(p_dependencies,'{}'::text[])), 'do_not_touch',to_jsonb(coalesce(p_do_not_touch,'{}'::text[])), 'verification',p_verification,'stop_condition',p_stop_condition,'expected_output',p_expected_output,'github_paths',to_jsonb(coalesce(p_github_paths,'{}'::text[])),'governance',p_governance,'lifecycle','ASSIGNED','created_via','work_log_assign_agent_preflight_v16');
 PERFORM pg_advisory_xact_lock(hashtext('agent_dispatch:'||p_task_key));
 SELECT * INTO prior FROM public.work_log WHERE task_key=p_task_key AND to_actor=upper(p_to_actor) AND dispatch_kind='ASSIGNMENT' ORDER BY created_at DESC LIMIT 1;
 IF found THEN
  IF prior.dispatch_context->'governance' IS DISTINCT FROM p_governance OR prior.dispatch_context->'github_paths' IS DISTINCT FROM context->'github_paths' OR prior.what_we_did IS DISTINCT FROM p_objective OR prior.assignment_scope IS DISTINCT FROM p_scope OR prior.assignment_mode IS DISTINCT FROM upper(p_mode) THEN RAISE EXCEPTION 'task_key_payload_conflict'; END IF;
  RETURN prior.id;
 END IF;
 INSERT INTO public.work_log(topic,status,task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,release_authorization_state,what_we_did,open_threads,dispatch_kind,dispatch_state,dispatch_next_attempt_at,dispatch_context)
 VALUES('Structured assignment '||p_task_key,'ASSIGNED',p_task_key,upper(p_from_actor),upper(p_to_actor),upper(p_mode),p_scope,p_primary_owner,p_release_authorization_state,p_objective,'handoff_to='||upper(p_to_actor),'ASSIGNMENT','QUEUED',now(),context) RETURNING id INTO result;
 IF NOT EXISTS(SELECT 1 FROM public.work_log WHERE id=result AND task_key=p_task_key) THEN RAISE EXCEPTION 'assignment persistence failed'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.work_log_assign_agent(text,text,text,text,text,text,text,text[],text[],text,text,text,text,text[],jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.work_log_assign_agent(text,text,text,text,text,text,text,text[],text[],text,text,text,text,text[],jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.agent_dispatch_ack(p_assignment_id uuid,p_worker text,p_session_id text,p_observed_base_sha text DEFAULT NULL,p_observed_head_sha text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.work_log%rowtype; reason text; receipt jsonb;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'not authorized'; END IF;
 IF length(trim(coalesce(p_worker,'')))<3 OR length(trim(coalesce(p_session_id,'')))<3 THEN RAISE EXCEPTION 'worker and receiver session required'; END IF;
 SELECT * INTO w FROM public.work_log WHERE id=p_assignment_id FOR UPDATE;
 IF NOT found OR w.archived OR w.superseded_by_id IS NOT NULL OR w.dispatch_state NOT IN ('FIRE_REQUESTED','SESSION_STARTED','CLAIMED') THEN RETURN NULL; END IF;
 IF w.dispatch_state='CLAIMED' AND w.dispatch_lease_owner IS DISTINCT FROM p_worker THEN RAISE EXCEPTION 'lease mismatch'; END IF;
 IF w.dispatch_session_id IS NOT NULL AND w.dispatch_session_id IS DISTINCT FROM p_session_id THEN RAISE EXCEPTION 'transport session mismatch'; END IF;
 reason:=public.agent_dispatch_preflight(w); IF reason IS NOT NULL THEN RAISE EXCEPTION 'preflight: %',reason; END IF;
 IF w.assignment_mode='WRITE' AND (p_observed_base_sha IS DISTINCT FROM w.dispatch_context#>>'{governance,base_sha}' OR p_observed_head_sha IS DISTINCT FROM w.dispatch_context#>>'{governance,expected_head_sha}') THEN RAISE EXCEPTION 'git head/base mismatch'; END IF;
 IF w.dispatch_context#>>'{receipt,worker}' IS NOT NULL THEN
  IF w.dispatch_context#>>'{receipt,worker}' IS DISTINCT FROM p_worker OR w.dispatch_context#>>'{receipt,session_id}' IS DISTINCT FROM p_session_id THEN RAISE EXCEPTION 'receiver receipt conflict'; END IF;
  RETURN w.dispatch_context->'receipt';
 END IF;
 receipt:=jsonb_build_object('worker',p_worker,'session_id',p_session_id,'delivered_at',now(),'ack_at',now(),'observed_base_sha',p_observed_base_sha,'observed_head_sha',p_observed_head_sha);
 UPDATE public.work_log SET dispatch_context=dispatch_context||jsonb_build_object('receipt',receipt,'lifecycle','ACK'),status='ACK_RECEIVER_CONFIRMED' WHERE id=w.id;
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.agent_dispatch_ack(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_dispatch_ack(uuid,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.agent_dispatch_claim(p_assignment_id uuid,p_worker text,p_lease_seconds integer DEFAULT 900)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.work_log%rowtype; reason text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'not authorized'; END IF;
 SELECT * INTO w FROM public.work_log WHERE id=p_assignment_id FOR UPDATE;
 IF NOT found OR w.archived OR w.superseded_by_id IS NOT NULL OR w.dispatch_state NOT IN ('FIRE_REQUESTED','SESSION_STARTED') OR coalesce(w.dispatch_attempts,0)>=3 THEN RETURN NULL; END IF;
 IF w.dispatch_context#>>'{receipt,worker}' IS DISTINCT FROM p_worker OR w.dispatch_context#>>'{receipt,ack_at}' IS NULL THEN RETURN NULL; END IF;
 reason:=public.agent_dispatch_preflight(w); IF reason IS NOT NULL THEN
  UPDATE public.work_log SET dispatch_state='DEFERRED',status='BLOCKED_DISPATCH_PREFLIGHT',dispatch_last_error=reason,dispatch_next_attempt_at=NULL WHERE id=w.id; RETURN NULL;
 END IF;
 UPDATE public.work_log SET dispatch_state='CLAIMED',dispatch_attempts=coalesce(dispatch_attempts,0)+1,dispatch_lease_owner=p_worker,
 dispatch_lease_expires_at=now()+make_interval(secs=>greatest(30,least(coalesce(p_lease_seconds,900),1800))),dispatch_next_attempt_at=NULL,status='CLAIMED_RECEIVER_CONFIRMED',dispatch_context=dispatch_context||jsonb_build_object('lifecycle','CLAIMED','claimed_at',now()) WHERE id=w.id RETURNING * INTO w;
 RETURN to_jsonb(w);
END $$;

CREATE OR REPLACE FUNCTION public.agent_dispatch_progress(p_assignment_id uuid,p_worker text,p_phase text,p_evidence jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.work_log%rowtype;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'not authorized'; END IF;
 SELECT * INTO w FROM public.work_log WHERE id=p_assignment_id FOR UPDATE;
 IF NOT found OR w.dispatch_state<>'CLAIMED' OR w.dispatch_lease_owner IS DISTINCT FROM p_worker OR w.dispatch_lease_expires_at<=now() THEN RAISE EXCEPTION 'lease mismatch or expired'; END IF;
 IF p_phase NOT IN ('WORKING','TESTED','BLOCKED') THEN RAISE EXCEPTION 'invalid lifecycle phase'; END IF;
 IF p_phase='TESTED' AND (w.dispatch_context->>'lifecycle' IS DISTINCT FROM 'WORKING' OR jsonb_typeof(p_evidence->'tests') IS DISTINCT FROM 'array' OR jsonb_array_length(p_evidence->'tests')=0) THEN RAISE EXCEPTION 'working state and test evidence required'; END IF;
 IF p_phase='WORKING' AND w.dispatch_context->>'lifecycle' NOT IN ('CLAIMED','WORKING') THEN RAISE EXCEPTION 'invalid phase order'; END IF;
 IF p_phase='BLOCKED' AND nullif(trim(p_evidence->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'blocked reason required'; END IF;
 UPDATE public.work_log SET status=p_phase,dispatch_lease_expires_at=now()+interval '15 minutes',dispatch_context=dispatch_context||jsonb_build_object('lifecycle',p_phase,'progress_evidence',p_evidence,'progress_at',now()) WHERE id=w.id RETURNING * INTO w;
 RETURN to_jsonb(w);
END $$;
REVOKE ALL ON FUNCTION public.agent_dispatch_progress(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_dispatch_progress(uuid,text,text,jsonb) TO service_role;

-- Reuse recovery scheduler; never retry unknown delivery or an expired WRITE lease automatically.
CREATE OR REPLACE FUNCTION public.agent_dispatch_requeue(p_assignment_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.work_log%rowtype; reason text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'not authorized'; END IF;
 SELECT * INTO w FROM public.work_log WHERE id=p_assignment_id AND archived=false AND superseded_by_id IS NULL AND dispatch_kind='ASSIGNMENT' AND to_actor='CLAUDE' FOR UPDATE;
 IF NOT found OR w.dispatch_state IN ('FIRE_REQUESTED','SESSION_STARTED','CLAIMED','COMPLETED','CANCELLED') THEN RETURN false; END IF;
 IF w.dispatch_last_error IN ('delivery_ack_timeout_unknown_outcome','write_lease_expired_requires_owner_reconciliation') OR w.dispatch_lease_owner IS NOT NULL THEN RETURN false; END IF;
 reason:=public.agent_dispatch_preflight(w); IF reason IS NOT NULL THEN RETURN false; END IF;
 UPDATE public.work_log SET dispatch_state='QUEUED',dispatch_attempts=0,dispatch_next_attempt_at=now(),dispatch_last_error=NULL,
 dispatch_last_emitted_at=NULL,dispatch_last_request_id=NULL,dispatch_completed_at=NULL,
 dispatch_context=(dispatch_context-'receipt')||jsonb_build_object('lifecycle','ASSIGNED','requeued_at',now()) WHERE id=w.id;
 RETURN found;
END $$;
CREATE OR REPLACE FUNCTION public.agent_dispatch_finish(p_assignment_id uuid, p_worker text, p_outcome text, p_result_status text, p_result_summary text, p_open_threads text DEFAULT NULL::text, p_retryable boolean DEFAULT false, p_error text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_row public.work_log%rowtype; v_outcome text:=upper(trim(coalesce(p_outcome,''))); v_after_id uuid; v_next interval; v_wake boolean; v_after_dispatch_state text; v_after_dispatch_kind text; v_after_to text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'not authorized'; end if;
  select * into v_row from public.work_log where id=p_assignment_id for update; if not found then raise exception 'assignment not found'; end if; if v_row.dispatch_state<>'CLAIMED' or v_row.dispatch_lease_owner is distinct from left(p_worker,200) then raise exception 'lease mismatch'; end if;
  if v_outcome='COMPLETED' and v_row.assignment_mode='WRITE' and v_row.dispatch_context->>'lifecycle' is distinct from 'TESTED' then raise exception 'tested evidence required before completed write'; end if;
  if v_outcome='DEFERRED' then update public.work_log set dispatch_state='DEFERRED',status=left(coalesce(nullif(p_result_status,''),'DEFERRED_AGENT_RUNTIME'),240),dispatch_last_error=left(coalesce(p_error,p_result_summary,'deferred'),1000),dispatch_lease_owner=null,dispatch_lease_expires_at=null,dispatch_next_attempt_at=null where id=p_assignment_id; return jsonb_build_object('state','DEFERRED','assignment_id',p_assignment_id); end if;
  if v_outcome='FAILED' and p_retryable and coalesce(v_row.dispatch_attempts,0)<3 then v_next:=case coalesce(v_row.dispatch_attempts,0) when 1 then interval '1 minute' when 2 then interval '5 minutes' else interval '15 minutes' end; update public.work_log set dispatch_state='RETRY_WAIT',dispatch_last_error=left(coalesce(p_error,p_result_summary,'retryable_failure'),1000),dispatch_next_attempt_at=now()+v_next,dispatch_lease_owner=null,dispatch_lease_expires_at=null where id=p_assignment_id; return jsonb_build_object('state','RETRY_WAIT','assignment_id',p_assignment_id,'next_attempt_at',now()+v_next); end if;
  if v_outcome not in ('COMPLETED','FAILED','CANCELLED') then raise exception 'invalid terminal outcome %',v_outcome; end if;
  v_wake:=(v_row.from_actor='CLAUDE' and v_row.to_actor='GPT'); /* v16: Claude results addressed to GPT are passive. */ v_after_dispatch_state:=case when v_wake then 'QUEUED' else null end; v_after_dispatch_kind:=case when v_wake then 'RESULT_WAKE' else null end; v_after_to:=case when v_row.from_actor in ('GPT','CLAUDE') then v_row.from_actor else null end;
  insert into public.work_log(topic,status,what_we_did,open_threads,task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,release_authorization_state,parent_assignment_id,dispatch_kind,dispatch_state,dispatch_next_attempt_at,dispatch_context)
  values(format('actor=%s FROM=%s TO=%s task=%s — AFTER',coalesce(v_row.to_actor,'DISPATCHER'),coalesce(v_row.to_actor,'DISPATCHER'),coalesce(v_row.from_actor,'ZURIEL'),coalesce(v_row.task_key,'UNKNOWN_TASK')),left(coalesce(nullif(p_result_status,''),'AFTER_DISPATCH_'||v_outcome),240),left(coalesce(p_result_summary,''),12000),left(coalesce(p_open_threads,''),12000),v_row.task_key,v_row.to_actor,v_after_to,'READ_ONLY',v_row.assignment_scope,v_row.primary_owner,v_row.release_authorization_state,v_row.id,v_after_dispatch_kind,v_after_dispatch_state,case when v_wake then now() else null end,jsonb_build_object('result_of',v_row.id,'outcome',v_outcome,'attempts',coalesce(v_row.dispatch_attempts,0),'runtime_error',p_error,'originating_actor',v_row.from_actor,'completed_by',p_worker,'result_status',p_result_status,'lifecycle','AFTER','receipt',v_row.dispatch_context->'receipt','tests',v_row.dispatch_context#>'{progress_evidence,tests}')) returning id into v_after_id;
  update public.work_log set dispatch_state=v_outcome,dispatch_context=dispatch_context||jsonb_build_object('result_status',p_result_status),dispatch_completed_at=now(),dispatch_last_error=case when v_outcome='COMPLETED' then null else left(coalesce(p_error,p_result_summary),1000) end,dispatch_lease_owner=null,dispatch_lease_expires_at=null,dispatch_next_attempt_at=null,superseded_by_id=v_after_id where id=p_assignment_id;
  return jsonb_build_object('state',v_outcome,'assignment_id',p_assignment_id,'after_id',v_after_id,'result_wake_queued',v_wake);
end $function$
;


CREATE OR REPLACE FUNCTION public.agent_dispatch_recover()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.work_log%rowtype; retried integer:=0; failed integer:=0; emitted integer:=0; blocked integer:=0;
BEGIN
 FOR w IN SELECT * FROM public.work_log WHERE archived=false AND superseded_by_id IS NULL AND dispatch_kind='ASSIGNMENT' AND to_actor='CLAUDE'
  AND (dispatch_state='CLAIMED' AND dispatch_lease_expires_at<now() OR dispatch_state IN ('FIRE_REQUESTED','SESSION_STARTED') AND dispatch_last_emitted_at<now()-interval '10 minutes') ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED LOOP
  IF w.dispatch_state<>'CLAIMED' OR w.assignment_mode='WRITE' THEN
   UPDATE public.work_log SET dispatch_state='DEFERRED',status='BLOCKED_DISPATCH_TIMEOUT',dispatch_last_error=CASE WHEN w.dispatch_state='CLAIMED' THEN 'write_lease_expired_requires_owner_reconciliation' ELSE 'delivery_ack_timeout_unknown_outcome' END,dispatch_next_attempt_at=NULL,dispatch_context=dispatch_context||jsonb_build_object('lifecycle','BLOCKED') WHERE id=w.id; blocked:=blocked+1;
  ELSIF coalesce(w.dispatch_attempts,0)>=3 THEN
   PERFORM public.agent_dispatch_finish(w.id,w.dispatch_lease_owner,'FAILED','AFTER_DISPATCH_FAILED_LEASE_EXHAUSTED','Read-only lease exhausted; evidence retained.','Runtime review required.',false,'lease_exhausted'); failed:=failed+1;
  ELSE
   UPDATE public.work_log SET dispatch_state='RETRY_WAIT',dispatch_next_attempt_at=now(),dispatch_last_error='stale_read_only_lease_recovered',dispatch_lease_owner=NULL,dispatch_lease_expires_at=NULL,dispatch_context=(dispatch_context-'receipt')||jsonb_build_object('lifecycle','ASSIGNED') WHERE id=w.id; retried:=retried+1;
  END IF;
 END LOOP;
 FOR w IN SELECT * FROM public.work_log WHERE archived=false AND superseded_by_id IS NULL AND to_actor='CLAUDE' AND dispatch_kind='ASSIGNMENT' AND dispatch_state IN ('QUEUED','RETRY_WAIT') AND coalesce(dispatch_next_attempt_at,now())<=now() ORDER BY created_at LIMIT 100 LOOP
  IF public.agent_dispatch_emit(w.id) IS NOT NULL THEN emitted:=emitted+1; END IF;
 END LOOP;
 RETURN jsonb_build_object('stale_retried',retried,'terminal_failed',failed,'events_reemitted',emitted,'blocked',blocked);
END $$;
