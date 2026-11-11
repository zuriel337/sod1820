CREATE OR REPLACE FUNCTION public.work_log_dispatch_after_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.to_actor in ('GPT','CLAUDE') and new.dispatch_state in ('QUEUED','RETRY_WAIT') and coalesce(new.dispatch_next_attempt_at,now())<=now() then perform public.agent_dispatch_emit(new.id); end if; return null;
end $function$
;
