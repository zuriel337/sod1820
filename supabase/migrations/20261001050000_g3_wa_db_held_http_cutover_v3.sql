-- G3_WA_DB_HELD_HTTP_CUTOVER_V3 — removes the last active DB-held Green HTTP cron path (jobid 55).
-- BRANCH-ONLY CANDIDATE: not applied to live DB. EXTEND_EXISTING: no new table/queue/bot/transport.
--
-- ti-post-37034-daily-watch called public.wa_send(v_target, v_body) (extensions.http, blocking) inside its DO body.
-- notify_admin() is NOT reused: it fans out to every enabled whatsapp target, the watch needs exactly one
-- (target ~ '^[0-9]+@c\.us$' limit 1). So the provider call is replaced in place by the same async pg_net +
-- wa_green_config() seam used by notify_admin (V2). Only the send block is patched, by exact-substring
-- replacement of the live command (the migration aborts if the live text is not the expected one);
-- report math, dedupe, target selection and the in-app notification are untouched.
--
-- Truthful receipt semantics: enqueue is NOT provider acceptance. provider_accepted=false, http_status=null,
-- delivery_receipt_confirmed=false; the new fields whatsapp_enqueued / net_request_id record only the enqueue.
-- channels_sent stays ['in_app'] (no 'whatsapp' is claimed without a provider response).
-- Idempotent: if the command no longer contains wa_send it is left alone.

do $m$
declare
  v_id bigint;
  v_cmd text;
  v_new text;
begin
  select jobid, command into v_id, v_cmd from cron.job where jobname = 'ti-post-37034-daily-watch';
  if v_id is null then raise exception 'cron job ti-post-37034-daily-watch not found'; end if;
  if v_cmd !~ 'wa_send' then return; end if;

  v_new := v_cmd;

  -- 1) declarations
  if position($r$v_accepted boolean := false;$r$ in v_new) = 0 then raise exception 'expected declaration not found'; end if;
  v_new := replace(v_new, $r$v_accepted boolean := false;$r$,
    $r$v_accepted boolean := false;
  v_enqueued boolean := false;
  v_req bigint;
  v_cfg jsonb;$r$);

  -- 2) blocking provider call -> async enqueue
  if position($r$v_send:=public.wa_send(v_target,v_body);$r$ in v_new) = 0 then raise exception 'expected wa_send call not found'; end if;
  v_new := replace(v_new, $r$v_send:=public.wa_send(v_target,v_body);$r$,
    $r$v_cfg:=public.wa_green_config();
    IF coalesce(v_cfg->>'id','')<>'' AND coalesce(v_cfg->>'token','')<>'' THEN
      BEGIN
        v_req:=net.http_post(url:=coalesce(nullif(regexp_replace(coalesce(v_cfg->>'base',''),'/+$',''),''),'https://api.green-api.com')||'/waInstance'||(v_cfg->>'id')||'/sendMessage/'||(v_cfg->>'token'),body:=jsonb_build_object('chatId',v_target,'message',v_body),headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=20000);
        v_enqueued:=true;
      EXCEPTION WHEN OTHERS THEN v_enqueued:=false; END;
    END IF;$r$);

  -- 3) enqueue is not acceptance
  if position($r$v_accepted:=coalesce((v_send->>'http_status')::integer between 200 and 299,false);$r$ in v_new) = 0 then raise exception 'expected accept line not found'; end if;
  v_new := replace(v_new, $r$v_accepted:=coalesce((v_send->>'http_status')::integer between 200 and 299,false);$r$, $r$v_accepted:=false;$r$);

  if position($r$IF v_accepted THEN update public.user_notifications set channels_sent=array['in_app','whatsapp'] where id=v_notice; END IF;$r$ in v_new) = 0 then raise exception 'expected channels_sent line not found'; end if;
  v_new := replace(v_new, $r$IF v_accepted THEN update public.user_notifications set channels_sent=array['in_app','whatsapp'] where id=v_notice; END IF;$r$, $r$NULL;$r$);

  -- 4) honest receipt payload
  if position($r$'provider_accepted',v_accepted,'http_status',v_send->'http_status',$r$ in v_new) = 0 then raise exception 'expected receipt payload not found'; end if;
  v_new := replace(v_new, $r$'provider_accepted',v_accepted,'http_status',v_send->'http_status',$r$,
    $r$'whatsapp_enqueued',v_enqueued,'net_request_id',v_req,'provider_accepted',false,'http_status',null,$r$);

  if v_new ~* 'wa_send|wa_admin|fn_wa_backfill_from_green|extensions\.http' then
    raise exception 'job 55 still references a DB-held Green HTTP path';
  end if;
  perform cron.alter_job(job_id := v_id, command := v_new);
end
$m$;
