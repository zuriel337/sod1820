-- Phase 3B · שכבת Admin-Reply — RPC יחיד, אדמין-gated, מעל התשתית הקיימת.
-- ⛔ בלי טבלה חדשה · בלי מנוע-תרגום חדש · בלי conversations · reuse בלבד:
--    translate → video_translate('raw',…) (המנוע שנפרס ב-Phase 3A · מתעד עלות ל-ai_token_log)
--    send      → wa_send(chat_id,text) הקיים (Green API)
-- Human-Gate: השליחה נעשית רק בקריאה מפורשת (אחרי אישור ZURIEL ב-UI) — אין Auto-Send.
-- ⚠️ טרם הוחל (stop-before-deploy). מיישמים רק באישור מפורש.

create or replace function public.wa_admin_reply(p_action text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin boolean;
  v_chat  text;
  v_text  text;
  v_res   jsonb;
  v_sent  jsonb;
begin
  -- 🔐 שער-אדמין (דפוס זהה ל-admin_add_word): רק users.role='admin'.
  select (role = 'admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin, false) then
    return jsonb_build_object('error', 'denied');
  end if;

  -- 🌍 תרגום (הודעה-נכנסת→עברית · תשובה-עברית→שפת-המקבל). reuse video_translate raw + רישום-עלות.
  if p_action = 'translate' then
    if nullif(btrim(coalesce(p_payload->>'text','')),'') is null then
      return jsonb_build_object('error', 'text_required');
    end if;
    v_res := public.video_translate(jsonb_build_object(
      'action',      'raw',
      'text',        p_payload->>'text',
      'target_lang', coalesce(p_payload->>'target', 'he'),
      'ref',         p_payload->>'ref',
      'ref_name',    p_payload->>'group',
      'user_ref',    p_payload->>'user_ref'
    ));
    return jsonb_build_object('ok', true, 'action', 'translate', 'result', v_res);

  -- ✍️ שליחה (Human-Gate: נקרא רק אחרי אישור מפורש). recipient מהרשומה בלבד.
  elsif p_action = 'send' then
    v_chat := nullif(btrim(coalesce(p_payload->>'chat_id','')),'');
    v_text := nullif(btrim(coalesce(p_payload->>'text','')),'');
    if v_chat is null or v_text is null then
      return jsonb_build_object('error', 'missing_chat_or_text');
    end if;
    -- 🔒 recipient חייב להגיע מהיסטוריה קיימת (wa_bot_log) — לא קלט-חופשי.
    if not exists (select 1 from public.wa_bot_log where group_id = v_chat) then
      return jsonb_build_object('error', 'unknown_recipient', 'detail', 'chat_id לא קיים ב-wa_bot_log');
    end if;

    v_sent := public.wa_send(v_chat, v_text, null);  -- Green API הקיים

    -- 📜 provenance: מי(אדמין)→למי(chat)→מתי(now)→מה(text). ל-wa_bot_log + bot_outbox הקיימים (בלי טבלה חדשה).
    insert into public.wa_bot_log (group_id, sender, sender_name, text_in, reply_out, action, bot_mode, created_at)
    values (v_chat, null, 'ZURIEL (admin)', p_payload->>'msg_in', v_text, 'admin_reply', 'human_gate', now());
    insert into public.bot_outbox (done_key, bot, chat_id, reply, msg_in, attempts, status, first_at, last_at, sent_msg_id)
    values ('adminreply:' || v_chat || ':' || extract(epoch from clock_timestamp())::bigint,
            'admin', v_chat, v_text, p_payload->>'msg_in', 1, 'sent', now(), now(), v_sent->>'idMessage')
    on conflict (done_key) do nothing;

    return jsonb_build_object('ok', true, 'action', 'send', 'chat_id', v_chat, 'sent', v_sent, 'at', now());
  end if;

  return jsonb_build_object('error', 'unknown_action');
end;
$function$;

-- callable מהמפקדה (אדמין מחובר). השער הפנימי מוודא role='admin'.
grant execute on function public.wa_admin_reply(text, jsonb) to authenticated;
