CREATE OR REPLACE FUNCTION public.work_log_dispatch_gpt_after_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.to_actor='GPT' and new.dispatch_kind='RESULT_WAKE' and coalesce(new.assignment_mode,'READ_ONLY')='READ_ONLY' and new.dispatch_state in ('QUEUED','RETRY_WAIT') and coalesce(new.dispatch_next_attempt_at,now()) <= now() then perform public.agent_dispatch_emit_gpt(new.id); end if;
  return null;
end;
$function$
