-- G3_WA_DB_HELD_HTTP_CUTOVER_V2 — closes invariant #15 for the remaining hot/background paths.
-- BRANCH-ONLY CANDIDATE: not applied to live DB. EXTEND_EXISTING: no new table/queue/bot/transport.
--
-- 1) notify_admin(): WhatsApp alert leg no longer calls blocking wa_send/wa_admin (extensions.http).
--    It enqueues the Green API call through the existing async pg_net seam (net.http_post, returns
--    immediately; the response is collected by pg_net, never held in the DB connection). Secrets come
--    from the service-role-only wa_green_config() Vault seam (V1) and are never returned/logged.
--    Signature, return shape and admin_notify semantics are unchanged.
-- 2) wa-green-backfill-daily cron: Edge execution under the existing wa-vip-backfill owner (mode=msg_ext)
--    using the existing FB_ADMIN_KEY header pattern. The DB keeps only the exact dedup/insert semantics
--    (fn_wa_backfill_apply) and the group listing (fn_wa_backfill_groups); both service_role-only.
-- 3) fn_wa_backfill_from_green()/wa_admin()/wa_send() KEPT as TEMPORARY_COMPATIBILITY, manual only.

create or replace function public.fn_wa_backfill_groups()
returns setof text
language sql
security definer
set search_path = public
as $$ select distinct group_id from public.wa_bot_log where group_id like '%@g.us' $$;

-- Exact legacy semantics of fn_wa_backfill_from_green's per-group step: non-array => skip,
-- only linked phones, on conflict (phone,msg_id) do nothing, errors never propagate.
create or replace function public.fn_wa_backfill_apply(p_group_id text, p_history jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_ins int := 0;
begin
  if p_history is null or jsonb_typeof(p_history) is distinct from 'array' then return 0; end if;
  begin
    insert into public.wa_msg_ext(phone, msg_id, ts, group_id)
    select regexp_replace(m->>'senderId','@.*$',''), m->>'idMessage',
           to_timestamp((m->>'timestamp')::bigint), p_group_id
    from jsonb_array_elements(p_history) m
    where m->>'idMessage' is not null and m->>'senderId' is not null
      and regexp_replace(m->>'senderId','@.*$','') in (select phone from public.wa_account_links)
    on conflict (phone, msg_id) do nothing;
    get diagnostics v_ins = row_count;
  exception when others then
    return 0;
  end;
  return v_ins;
end $$;

revoke all on function public.fn_wa_backfill_groups() from public, anon, authenticated;
revoke all on function public.fn_wa_backfill_apply(text, jsonb) from public, anon, authenticated;
grant execute on function public.fn_wa_backfill_groups() to service_role;
grant execute on function public.fn_wa_backfill_apply(text, jsonb) to service_role;

create or replace function public.notify_admin(p_text text, p_image_url text DEFAULT NULL::text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record; sent jsonb := '[]'::jsonb;
  cfg jsonb := public.wa_green_config();
  v_url text; v_method text; v_body jsonb; v_req bigint;
begin
  for r in select channel, target from public.admin_notify where enabled and coalesce(target,'') <> '' loop
    begin
      if r.channel = 'whatsapp' then
        if coalesce(cfg->>'id','') = '' or coalesce(cfg->>'token','') = '' then
          sent := sent || jsonb_build_object('channel','whatsapp','target',r.target,'ok',false,'error','green_config_missing');
          continue;
        end if;
        if p_image_url is not null and p_image_url <> '' then
          v_method := 'sendFileByUrl';
          v_body := jsonb_build_object('chatId', r.target, 'urlFile', p_image_url,
            'fileName', coalesce(nullif(regexp_replace(p_image_url, '^.*/', ''), ''), 'image.jpg'),
            'caption', p_text);
        else
          v_method := 'sendMessage';
          v_body := jsonb_build_object('chatId', r.target, 'message', p_text);
        end if;
        v_url := coalesce(nullif(regexp_replace(coalesce(cfg->>'base',''), '/+$', ''), ''), 'https://api.green-api.com')
                 || '/waInstance' || (cfg->>'id') || '/' || v_method || '/' || (cfg->>'token');
        -- async: pg_net enqueues and returns; no DB connection is held for the provider round-trip
        v_req := net.http_post(url := v_url, body := v_body,
                               headers := '{"Content-Type":"application/json"}'::jsonb,
                               timeout_milliseconds := 20000);
        if v_method = 'sendMessage' then
          begin
            insert into public.bot_transcripts(chat_id, message, http_status, meta)
            values (r.target, p_text, null, jsonb_build_object('method', v_method, 'async', true, 'net_request_id', v_req));
          exception when others then null; end;
        end if;
        sent := sent || jsonb_build_object('channel','whatsapp','target',r.target,'ok',true,'queued',true);
      elsif r.channel = 'email' then
        sent := sent || jsonb_build_object('channel','email','target',r.target,'ok',false,'note','no_generic_email_edge_yet');
      else
        sent := sent || jsonb_build_object('channel',r.channel,'ok',false,'note','unknown_channel');
      end if;
    exception when others then
      sent := sent || jsonb_build_object('channel',r.channel,'ok',false,'error','enqueue_failed');
    end;
  end loop;
  return jsonb_build_object('sent', sent, 'preview', left(p_text, 80));
end; $$;

-- Cron cutover: same job name/schedule, Edge-executed.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'wa-green-backfill-daily'),
  command := $c$
    with s as (select decrypted_secret as key from vault.decrypted_secrets where name='FB_ADMIN_KEY' order by created_at desc limit 1)
    select net.http_get(
      url:='https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-vip-backfill?mode=msg_ext&count=1000',
      headers:=jsonb_build_object('x-fb-admin-key', s.key),
      timeout_milliseconds:=55000
    ) from s;
  $c$
);
