-- G3_WA_DB_HELD_HTTP_CUTOVER_V5_OUTBOX — closes invariant #15 + Green-token-in-pg_net leakage.
-- BRANCH-ONLY CANDIDATE: not applied to live DB. No new table/queue/store: EXTENDS the existing public.bot_outbox
-- (RLS on, no client policy, service_role only) + one thin Edge transport adapter (wa-system-outbox).
--
-- SUPERSEDES: V2 notify_admin (pg_net Green URL), V3 job55 (pg_net Green URL), V4 net-queue ACL (net.* tables are
-- supabase_admin-owned; postgres cannot revoke) and V4 async request_wa_link_code. Nothing on this branch puts the
-- Green id/token into net.http_request_queue / net._http_response.
--
-- Design: DB producers only INSERT governed rows (bot in 'system'|'link-code'); the Edge adapter claims them
-- atomically (FOR UPDATE SKIP LOCKED), sends via _shared/waGreen.ts, and records the outcome. Cron/clients call the
-- adapter with an empty body and NO secret: it can only advance already-authorized rows, never create or alter content.
--
-- Status machine (text, no constraint change): pending -> sending -> sent | pending(retry, backoff) | failed | expired.
-- Ambiguous outcome (row stuck in 'sending' > 10 min) -> failed, never auto-resent (no duplicate sends).

-- (B) minimal payload on the EXISTING table (image_url for sendFileByUrl). Default '{}' keeps old writers valid.
alter table public.bot_outbox add column if not exists payload jsonb not null default '{}'::jsonb;

-- (C) service-role-only atomic claim. Content never comes from the caller; only an optional row ref (done_key).
create or replace function public.outbox_claim_system(p_ref text default null, p_limit integer default 5)
returns table(done_key text, bot text, chat_id text, reply text, payload jsonb, attempts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 10);
begin
  -- ambiguous in-flight rows are failed, not resent
  -- terminal link-code rows never retain the OTP text (wa_link_codes is the only short-lived verification row)
  update public.bot_outbox o set status = 'failed', last_at = now(),
         reply = case when o.bot = 'link-code' then '[failed]' else o.reply end,
         payload = case when o.bot = 'link-code' then '{}'::jsonb else o.payload end
   where o.bot in ('system','link-code') and o.status = 'sending' and o.last_at < now() - interval '10 minutes';
  -- expired content is never sent (OTP lives 10 minutes; system alerts 24 hours)
  update public.bot_outbox o set status = 'expired', last_at = now(),
         reply = case when o.bot = 'link-code' then '[expired]' else o.reply end,
         payload = case when o.bot = 'link-code' then '{}'::jsonb else o.payload end
   where o.status = 'pending'
     and ((o.bot = 'link-code' and o.first_at < now() - interval '10 minutes')
       or (o.bot = 'system'    and o.first_at < now() - interval '24 hours'));

  return query
  with c as (
    select b.done_key from public.bot_outbox b
     where b.bot in ('system','link-code')
       and b.status = 'pending'
       and (p_ref is null or b.done_key = p_ref)
       and (b.attempts = 0 or b.last_at <= now() - (interval '1 minute' * least(120, power(2, b.attempts)::integer)))
     order by b.first_at
     limit v_limit
     for update skip locked
  )
  update public.bot_outbox o
     set status = 'sending', attempts = o.attempts + 1, last_at = now()
    from c where o.done_key = c.done_key
  returning o.done_key, o.bot, o.chat_id, o.reply, o.payload, o.attempts;
end $$;

-- outcome recording: only a row we hold in 'sending' can change; content is never writable here.
create or replace function public.outbox_mark_system(p_key text, p_outcome text, p_sent_msg_id text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.bot_outbox%rowtype;
  v_new text;
begin
  select * into v_row from public.bot_outbox
   where done_key = p_key and bot in ('system','link-code') and status = 'sending' for update;
  if not found then return 'ignored'; end if;
  if p_outcome = 'sent' then
    v_new := 'sent';
  elsif p_outcome = 'retry' then
    v_new := case when v_row.attempts >= 5 then 'failed' else 'pending' end;
  else
    v_new := 'failed';
  end if;
  update public.bot_outbox set status = v_new, last_at = now(),
         sent_msg_id = case when v_new = 'sent' then left(p_sent_msg_id, 200) else sent_msg_id end,
         -- OTP text is scrubbed on EVERY terminal state (sent/failed); pending (retry) keeps it for delivery
         reply = case when bot = 'link-code' and v_new = 'sent' then '[delivered]'
                      when bot = 'link-code' and v_new = 'failed' then '[failed]' else reply end,
         payload = case when bot = 'link-code' and v_new in ('sent','failed') then '{}'::jsonb else payload end
   where done_key = p_key;
  return v_new;
end $$;

-- status only, for the client's "did this exact row get sent" truth (no content)
create or replace function public.outbox_ref_status(p_ref text)
returns text
language sql
security definer
set search_path = public
as $$ select status from public.bot_outbox where done_key = p_ref and bot in ('system','link-code') $$;

revoke all on function public.outbox_claim_system(text, integer) from public, anon, authenticated;
revoke all on function public.outbox_mark_system(text, text, text) from public, anon, authenticated;
revoke all on function public.outbox_ref_status(text) from public, anon, authenticated;
grant execute on function public.outbox_claim_system(text, integer) to service_role;
grant execute on function public.outbox_mark_system(text, text, text) to service_role;
grant execute on function public.outbox_ref_status(text) to service_role;
revoke all on table public.bot_outbox from anon, authenticated;

-- (F) notify_admin: one bot_outbox row per enabled WhatsApp target; truthful queued / not-sent. Image kept in payload.
create or replace function public.notify_admin(p_text text, p_image_url text default null::text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record; sent jsonb := '[]'::jsonb; v_queued int := 0;
  v_payload jsonb := case when coalesce(p_image_url,'') <> '' then jsonb_build_object('image_url', p_image_url) else '{}'::jsonb end;
begin
  for r in select channel, target from public.admin_notify where enabled and coalesce(target,'') <> '' loop
    begin
      if r.channel = 'whatsapp' then
        insert into public.bot_outbox(done_key, bot, chat_id, reply, payload)
        values ('na:' || gen_random_uuid()::text, 'system', r.target, p_text, v_payload);
        v_queued := v_queued + 1;
        sent := sent || jsonb_build_object('channel','whatsapp','target',r.target,'ok',true,'queued',true,'sent',false);
      elsif r.channel = 'email' then
        sent := sent || jsonb_build_object('channel','email','target',r.target,'ok',false,'note','no_generic_email_edge_yet');
      else
        sent := sent || jsonb_build_object('channel',r.channel,'ok',false,'note','unknown_channel');
      end if;
    exception when others then
      sent := sent || jsonb_build_object('channel',r.channel,'ok',false,'error','enqueue_failed');
    end;
  end loop;
  return jsonb_build_object('sent', sent, 'queued', v_queued, 'provider_sent', false, 'preview', left(p_text, 80));
end; $$;

-- system_watchman_run: queued != provider-sent (only the final return changes).
create or replace function public.system_watchman_run(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_detected jsonb;
  v_pulse jsonb;
  v_pending int := 0;
  v_titles text := '';
  v_worth boolean := false;
  v_text text;
  v_sent jsonb;
begin
  v_detected := public.detect_suggestions();
  v_pulse := coalesce(public.site_pulse(7), '{}'::jsonb);
  select count(*), coalesce(string_agg('• ' || title || ' (' || coalesce(confidence::text,'—') || '%)', E'\n'), '') into v_pending, v_titles
  from (select title, confidence from public.system_suggestions where status='pending' order by confidence desc nulls last, created_at desc limit 8) s;
  v_worth := coalesce(p_force,false) or v_pending > 0 or coalesce((v_pulse->>'pending_ratings')::int,0) >= 10 or coalesce((v_pulse->>'ai_analyses')::int,0) > 0 or coalesce((v_pulse->>'new_findings')::int,0) > 0;
  if not v_worth then return jsonb_build_object('ok',true,'sent',false,'reason','nothing_worth_reporting','detected',v_detected,'pulse',v_pulse); end if;
  v_text := concat_ws(E'\n','🧠 דופק סוד 1820 · 7 ימים',format('🤖 ניתוחי AI: %s',coalesce(v_pulse->>'ai_analyses','0')),format('🔬 המשיכו לחקור: %s%% · הוסיפו למחקר: %s%%',coalesce(v_pulse->>'ai_continue_rate','0'),coalesce(v_pulse->>'ai_research_rate','0')),format('🌌 ממצאים חדשים: %s · גשרי שפה: %s',coalesce(v_pulse->>'new_findings','0'),coalesce(v_pulse->>'new_bridges','0')),format('✍️ ממתינים לדירוג: %s',coalesce(v_pulse->>'pending_ratings','0')),case when v_pending>0 then E'\n🧠 המלצות מערכת:\n'||v_titles else null end,'👉 https://sod1820.co.il/admin');
  v_sent := public.notify_admin(v_text,null);
  return jsonb_build_object('ok',true,'sent',false,'queued',coalesce((v_sent->>'queued')::int,0) > 0,'suggestions',v_pending,'detected',v_detected,'pulse',v_pulse,'notify',v_sent);
end;
$function$;

-- (G) request_wa_link_code: insert code + governed outbox row. No HTTP, no pg_net, never returns the code.
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
  v_expires timestamptz := now() + interval '10 minutes';
  v_ref text;
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
  v_ref := 'lc:' || gen_random_uuid()::text;
  insert into public.wa_link_codes(user_id, phone, code, expires_at) values (v_uid, v_phone, v_code, v_expires);
  insert into public.bot_outbox(done_key, bot, chat_id, reply)
    values (v_ref, 'link-code', v_phone || '@c.us',
      '🔐 קוד האימות שלך לחיבור הוואטסאפ ל-סוד 1820: ' || v_code ||
      E'\nהקוד תקף ל-10 דקות. אם לא ביקשת — פשוט התעלם.');
  return jsonb_build_object('ok',true,'queued',true,'sent',false,'delivery_receipt_confirmed',false,
    'delivery_ref', v_ref, 'expires_at', v_expires,
    'masked', regexp_replace(v_phone, '^(\d{3})\d+(\d{2})$', '\1•••••\2'));
end $function$;

comment on function public.request_wa_link_code(text) is
  'Inserts wa_link_codes + bot_outbox(bot=link-code). No provider/pg_net call; returns queued=true,sent=false,delivery_ref; never the code.';

-- (H) job 55: replace the DB-held wa_send block (pre-V3 live text) with a bot_outbox enqueue. Exact-substring guarded.
do $m$
declare
  v_id bigint;
  v_cmd text;
  v_new text;
  a1 text := $r$v_accepted boolean := false;$r$;
  a2 text := $r$v_send:=public.wa_send(v_target,v_body);$r$;
  a3 text := $r$v_accepted:=coalesce((v_send->>'http_status')::integer between 200 and 299,false);$r$;
  a4 text := $r$IF v_accepted THEN update public.user_notifications set channels_sent=array['in_app','whatsapp'] where id=v_notice; END IF;$r$;
  a5 text := $r$'provider_accepted',v_accepted,'http_status',v_send->'http_status',$r$;
begin
  select jobid, command into v_id, v_cmd from cron.job where jobname = 'ti-post-37034-daily-watch';
  if v_id is null then raise exception 'cron job ti-post-37034-daily-watch not found'; end if;
  if v_cmd !~ 'wa_send' then return; end if;
  if position(a1 in v_cmd) = 0 or position(a2 in v_cmd) = 0 or position(a3 in v_cmd) = 0
     or position(a4 in v_cmd) = 0 or position(a5 in v_cmd) = 0 then
    raise exception 'job 55 live text differs from expected; refusing blind rewrite';
  end if;
  v_new := replace(v_cmd, a1, a1 || E'\n  v_enqueued boolean := false;');
  v_new := replace(v_new, a2, $r$insert into public.bot_outbox(done_key,bot,chat_id,reply) values ('ti-watch:'||v_key||':'||v_target,'system',v_target,v_body) on conflict (done_key) do nothing;
    v_enqueued:=FOUND;$r$);
  v_new := replace(v_new, a3, $r$v_accepted:=false;$r$);
  v_new := replace(v_new, a4, $r$NULL;$r$);
  v_new := replace(v_new, a5, $r$'whatsapp_enqueued',v_enqueued,'provider_accepted',false,'http_status',null,$r$);
  if v_new ~* 'wa_send|wa_admin|fn_wa_backfill_from_green|extensions\.http|net\.http|wa_green_config|green-api' then
    raise exception 'job 55 still references a DB-held Green/pg_net path';
  end if;
  perform cron.alter_job(job_id := v_id, command := v_new);
end
$m$;

-- (E) one pg_cron every 2 minutes: URL + empty body only. No header, no token, no Vault read, no secret.
select cron.schedule('wa-system-outbox', '*/2 * * * *', $c$
  select net.http_post(url:='https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-system-outbox', body:='{}'::jsonb);
$c$);

-- COMPATIBILITY / REMAINING DB-HELD PATHS (owner = WhatsApp channel owner):
--   wa_admin(method,payload,http), wa_send(chat,text,image)  manual service/postgres only, no cron/RPC caller on this branch.
--       removal condition: no non-manual callers remain (verified by the V5 caller census test) -> drop both.
--   wa_admin_reply(send)       human admin-triggered; acceptable blocking call; removal: admin UI moves to outbox.
--   wa_groups / wa_state / wa_distribute   manual service/postgres only; removal: migrate to waGreen.ts.
--   fn_wa_backfill_from_green  manual only (cron 33 -> Edge msg_ext in V2); removal: drop once Edge mode proven live.
--   detect_suggestions (weekly) non-Green HTTP; outside this Green transport scope.
