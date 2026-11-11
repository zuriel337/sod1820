CREATE OR REPLACE FUNCTION public.agent_dispatch_reconcile_routine_response(p_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
declare v_row public.work_log%rowtype; v_resp net._http_response%rowtype; v_body jsonb; v_session_id text; v_session_url text; v_error text;
begin
  select * into v_row from public.work_log where id=p_assignment_id for update;
  if not found then return jsonb_build_object('state','NOT_FOUND'); end if;
  if v_row.dispatch_last_request_id is null then return jsonb_build_object('state',coalesce(v_row.dispatch_state,'NO_REQUEST'),'response','NO_REQUEST'); end if;
  select * into v_resp from net._http_response where id=v_row.dispatch_last_request_id order by created desc limit 1;
  if not found then return jsonb_build_object('state',coalesce(v_row.dispatch_state,'UNKNOWN'),'response','PENDING'); end if;
  update public.work_log set dispatch_response_at=now() where id=p_assignment_id;

  if v_resp.status_code between 200 and 299 then
    begin v_body:=v_resp.content::jsonb; exception when others then v_body:=null; end;
    v_session_id:=nullif(v_body->>'claude_code_session_id',''); v_session_url:=nullif(v_body->>'claude_code_session_url','');
    if v_session_id is not null and v_session_url is not null then
      update public.work_log set dispatch_session_id=v_session_id,dispatch_session_url=v_session_url,dispatch_state=case when dispatch_state='FIRE_REQUESTED' then 'SESSION_STARTED' else dispatch_state end,status=case when dispatch_state='FIRE_REQUESTED' then 'DISPATCH_SESSION_STARTED_CLAUDE_CODE' else status end,dispatch_last_error=null where id=p_assignment_id;
      return jsonb_build_object('state','SESSION_STARTED','assignment_id',p_assignment_id,'claude_code_session_id',v_session_id,'claude_code_session_url',v_session_url);
    end if;
    update public.work_log set dispatch_state='DEFERRED',status='DEFERRED_CLAUDE_CODE_ROUTINE_RESPONSE_INVALID',dispatch_last_error='routine_success_without_session_provenance' where id=p_assignment_id;
    return jsonb_build_object('state','DEFERRED','error','routine_success_without_session_provenance');
  end if;

  v_error:=left(coalesce(v_resp.error_msg,'')||' http_'||coalesce(v_resp.status_code::text,'unknown')||' '||coalesce(v_resp.content,''),1000);
  if v_resp.status_code in (400,401,403,404) then
    update public.work_log set dispatch_state='DEFERRED',status='DEFERRED_CLAUDE_CODE_ROUTINE_HTTP_CONFIG_ERROR',dispatch_last_error=v_error,dispatch_next_attempt_at=null where id=p_assignment_id; return jsonb_build_object('state','DEFERRED','http_status',v_resp.status_code);
  end if;
  if v_resp.status_code=429 or v_resp.status_code>=500 then
    update public.work_log set dispatch_state='RETRY_WAIT',status='RETRY_WAIT_CLAUDE_CODE_ROUTINE_HTTP',dispatch_last_error=v_error,dispatch_next_attempt_at=now()+interval '1 minute',dispatch_last_emitted_at=null,dispatch_last_request_id=null where id=p_assignment_id; return jsonb_build_object('state','RETRY_WAIT','http_status',v_resp.status_code);
  end if;
  update public.work_log set dispatch_state='DEFERRED',status='DEFERRED_CLAUDE_CODE_ROUTINE_AMBIGUOUS_TRANSPORT',dispatch_last_error=v_error,dispatch_next_attempt_at=null where id=p_assignment_id;
  return jsonb_build_object('state','DEFERRED','http_status',v_resp.status_code);
end $function$;
