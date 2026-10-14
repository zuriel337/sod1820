-- Applied migration disable_gpt_agent_delivery_zuriel_v17. User authorized 2026-10-14.
CREATE OR REPLACE FUNCTION public.work_log_gpt_delivery_stop_v17() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.work_log_gpt_delivery_stop_v17() FROM PUBLIC;
CREATE TRIGGER trg_work_log_zz_gpt_delivery_stop_v17 BEFORE INSERT OR UPDATE ON public.work_log FOR EACH ROW EXECUTE FUNCTION public.work_log_gpt_delivery_stop_v17();
CREATE OR REPLACE FUNCTION public.agent_dispatch_emit_gpt(p_assignment_id uuid) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN NULL; END $$;
UPDATE public.work_log SET dispatch_state='CANCELLED',dispatch_next_attempt_at=NULL,dispatch_last_error='GPT_DELIVERY_DISABLED_BY_ZURIEL_V17',dispatch_context=coalesce(dispatch_context,'{}'::jsonb)||'{"gpt_delivery_disabled":true,"result_retained":true}'::jsonb
WHERE to_actor='GPT' AND dispatch_state IN ('QUEUED','RETRY_WAIT','DEFERRED') AND dispatch_lease_owner IS NULL;
