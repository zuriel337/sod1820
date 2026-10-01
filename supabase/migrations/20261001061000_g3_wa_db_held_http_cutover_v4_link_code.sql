-- G3_WA_DB_HELD_HTTP_CUTOVER_V4 (2/2) — remaining DB-held Green HTTP residuals.
-- BRANCH-ONLY CANDIDATE: not applied to live DB. EXTEND_EXISTING: no new table/queue/bot/transport.
--
-- (2) Internal RPCs: wa_vip_backfill_sql(text,int) and fn_michael_execute(uuid) were callable by PUBLIC
--     (acl NULL). Now service_role only (wa-michael / wa-vip-backfill Edge use the service role).
-- (3) request_wa_link_code(text): blocking wa_send (extensions.http inside the RPC) replaced with the
--     wa_green_config() + async net.http_post enqueue seam (same as notify_admin V2 / job 55 V3).
--     Auth, phone normalisation, ownership check, rate limit, code insert and 10-minute expiry preserved.
--     Truthful return: queued=true, sent=false, delivery_receipt_confirmed=false. Enqueue is NOT provider
--     acceptance. If Green config is missing or enqueue fails, ok=false/error=enqueue_failed and the freshly
--     inserted code is removed (no dangling code for an undelivered message).
--
-- COMPATIBILITY MATRIX (TEMPORARY_COMPATIBILITY, removal condition = each caller migrated to Edge cutover):
--   wa_admin_reply(send)           admin-manual, acceptable (blocking provider call, human-triggered)
--   wa_groups / wa_state           manual service/postgres only
--   wa_distribute                  manual service/postgres only
--   fn_wa_backfill_from_green      manual service/postgres only (cron 33 replaced by Edge msg_ext in V2)
--   weekly detect_suggestions      non-Green HTTP: background debt, outside this Green transport scope

revoke all on function public.wa_vip_backfill_sql(text, integer) from public, anon, authenticated;
grant execute on function public.wa_vip_backfill_sql(text, integer) to service_role;
revoke all on function public.fn_michael_execute(uuid) from public, anon, authenticated;
grant execute on function public.fn_michael_execute(uuid) to service_role;

create or replace function public.request_wa_link_code(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_phone text;
  v_code text;
  v_recent int;
  v_taken uuid;
  v_cfg jsonb;
  v_expires timestamptz := now() + interval '10 minutes';
  v_code_id bigint;
  v_req bigint;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','auth_required'); end if;
  v_phone := public.wa_norm_phone(p_phone);
  if v_phone is null or length(v_phone) < 10 then return jsonb_build_object('ok',false,'error','bad_phone'); end if;
  select user_id into v_taken from public.wa_account_links where phone = v_phone;
  if v_taken is not null and v_taken <> v_uid then
    return jsonb_build_object('ok',false,'error','phone_taken');
  end if;
  if v_taken = v_uid then
    return jsonb_build_object('ok',true,'already_linked',true);
  end if;
  select count(*) into v_recent from public.wa_link_codes
    where user_id = v_uid and created_at > now() - interval '1 hour';
  if v_recent >= 5 then return jsonb_build_object('ok',false,'error','rate_limited'); end if;
  v_code := lpad((floor(random()*1000000))::int::text, 6, '0');
  insert into public.wa_link_codes(user_id, phone, code, expires_at)
    values (v_uid, v_phone, v_code, v_expires)
    returning id into v_code_id;
  v_cfg := public.wa_green_config();
  begin
    if coalesce(v_cfg->>'id','') = '' or coalesce(v_cfg->>'token','') = '' then
      raise exception 'green_config_missing';
    end if;
    v_req := net.http_post(
      url := coalesce(nullif(regexp_replace(coalesce(v_cfg->>'base',''),'/+$',''),''),'https://api.green-api.com')
             || '/waInstance' || (v_cfg->>'id') || '/sendMessage/' || (v_cfg->>'token'),
      body := jsonb_build_object('chatId', v_phone || '@c.us',
        'message', '🔐 קוד האימות שלך לחיבור הוואטסאפ ל-סוד 1820: ' || v_code ||
                   E'\nהקוד תקף ל-10 דקות. אם לא ביקשת — פשוט התעלם.'),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then
    delete from public.wa_link_codes where id = v_code_id;
    return jsonb_build_object('ok',false,'error','enqueue_failed');
  end;
  return jsonb_build_object('ok',true,'queued',true,'sent',false,'delivery_receipt_confirmed',false,
    'expires_at', v_expires,
    'masked', regexp_replace(v_phone, '^(\d{3})\d+(\d{2})$', '\1•••••\2'));
end $function$;

comment on function public.request_wa_link_code(text) is
  'Async enqueue only (wa_green_config + net.http_post). Returns queued=true, sent=false, delivery_receipt_confirmed=false; enqueue is not provider acceptance.';
