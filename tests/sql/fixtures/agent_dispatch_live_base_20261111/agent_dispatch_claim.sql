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
