CREATE OR REPLACE FUNCTION public.work_log_gpt_delivery_stop_v17()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
 IF NEW.to_actor='GPT' AND (TG_OP='INSERT' OR NEW.dispatch_state IN ('QUEUED','RETRY_WAIT')) THEN
  NEW.dispatch_context:=coalesce(NEW.dispatch_context,'{}'::jsonb)||jsonb_build_object('original_to_actor','GPT','delivery_disabled_by','ZURIEL_V17','gpt_ack_required',false);
  NEW.to_actor:='ZURIEL';
  NEW.dispatch_kind:=NULL;
  NEW.dispatch_state:=NULL;
  NEW.dispatch_next_attempt_at:=NULL;
  NEW.dispatch_last_error:='GPT_DELIVERY_DISABLED_BY_ZURIEL_V17_PASSIVE_REPORT';
 END IF;
 RETURN NEW;
END $function$
