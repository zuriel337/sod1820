-- Phase 3B · שכבת Admin-Reply — RPC יחיד, אדמין-gated, מעל התשתית הקיימת. (v2 · מוקשח)
-- ⛔ בלי טבלה חדשה · בלי מנוע-תרגום חדש · בלי conversations. reuse בלבד:
--    translate/prepare → video_translate('raw') (מנוע Phase 3A · מתעד עלות ל-ai_token_log)
--    send              → wa_send(chat_id,text) הקיים (Green API)
--
-- 🔒 Human-Gate בצד-שרת (לא UI בלבד):
--   • send **אינו** מקבל טקסט חופשי. הוא מקבל artifact בלבד ושולח את הטקסט שנשמר ב-prepare — מילה-במילה.
--     ⇒ אי-אפשר לשלוח משהו שלא עבר prepare/אישור, ואי-אפשר שהנשלח יהיה שונה מהמאושר (אין תרגום-מחדש).
--   • recipient תמיד מהרשומה (wa_bot_log) — לא קלט-חופשי.
--   • Idempotency: claim אטומי (admin_preview→admin_sending) מונע double-send; artifact שנשלח כבר → מוחזר בלי שליחה חוזרת.
--   • provenance: auth.uid() (מי) → chat (למי) → now (מתי) → הטקסט (מה), ל-wa_bot_log + bot_outbox הקיימים.
-- ⚠️ טרם הוחל (stop-before-deploy). bot='admin' + status='admin_*' לא נאסף ע״י אף drainer (הם מסננים bot+status='pending').

create or replace function public.wa_admin_reply(p_action text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin  boolean;
  v_uid    uuid := auth.uid();
  v_chat   text;
  v_hebrew text;
  v_target text;
  v_trans  text;
  v_key    text;
  v_res    jsonb;
  v_sent   jsonb;
  v_row    record;
begin
  -- 🔐 שער-אדמין — בצד-שרת בלבד, לפי auth.uid() (לא סומך על שום פרמטר-קליינט).
  select (role = 'admin') into v_admin from public.users where id = v_uid;
  if not coalesce(v_admin, false) then
    return jsonb_build_object('error', 'denied');
  end if;

  -- 🌍 translate — תצוגה בלבד (הודעה-נכנסת → עברית). לא יוצר artifact, לא שולח.
  if p_action = 'translate' then
    if nullif(btrim(coalesce(p_payload->>'text','')),'') is null then
      return jsonb_build_object('error', 'text_required');
    end if;
    v_res := public.video_translate(jsonb_build_object(
      'action','raw', 'text', p_payload->>'text',
      'target_lang', coalesce(p_payload->>'target','he'),
      'ref', p_payload->>'ref', 'ref_name', p_payload->>'group', 'user_ref', p_payload->>'user_ref'));
    return jsonb_build_object('ok', true, 'action','translate', 'result', v_res);

  -- 📝 prepare — מכין artifact-מאושר: מתרגם תשובה-עברית → שפת-מקבל ושומר את הטקסט המדויק (status='admin_preview').
  --    ה-artifact הוא «מה שאושר». send ישלח בדיוק אותו. done_key דטרמיניסטי ⇒ prepare חוזר = אותו artifact (idempotent).
  elsif p_action = 'prepare' then
    v_chat   := nullif(btrim(coalesce(p_payload->>'chat_id','')),'');
    v_hebrew := nullif(btrim(coalesce(p_payload->>'text','')),'');
    v_target := coalesce(nullif(btrim(coalesce(p_payload->>'target','')),''),'he');
    if v_chat is null or v_hebrew is null then return jsonb_build_object('error','missing_chat_or_text'); end if;
    if not exists (select 1 from public.wa_bot_log where group_id = v_chat) then
      return jsonb_build_object('error','unknown_recipient','detail','chat_id לא קיים ב-wa_bot_log');
    end if;
    v_res  := public.video_translate(jsonb_build_object('action','raw','text',v_hebrew,'target_lang',v_target,
                'ref', p_payload->>'ref', 'ref_name', v_chat, 'user_ref', p_payload->>'user_ref'));
    v_trans := coalesce(v_res->'result'->>'text', v_res->>'text');
    if nullif(btrim(coalesce(v_trans,'')),'') is null then
      return jsonb_build_object('error','translate_failed','detail',v_res);
    end if;
    v_key := 'areply:' || v_chat || ':' || md5(v_hebrew || '|' || v_target || '|' || v_trans);
    insert into public.bot_outbox (done_key, bot, chat_id, reply, msg_in, attempts, status, first_at, last_at)
      values (v_key, 'admin', v_chat, v_trans, left(coalesce(p_payload->>'msg_in',''),500), 0, 'admin_preview', now(), now())
      on conflict (done_key) do nothing;
    return jsonb_build_object('ok',true,'action','prepare','artifact',v_key,'text',v_trans,'target',v_target,
      'detected', v_res->'result'->>'detected_lang', 'confidence', v_res->'result'->>'confidence');

  -- ✍️ send — שולח artifact מאושר בלבד (בלי טקסט חופשי, בלי תרגום-מחדש). Idempotent + Human-Gate-שרת.
  elsif p_action = 'send' then
    v_key := nullif(btrim(coalesce(p_payload->>'artifact','')),'');
    if v_key is null then return jsonb_build_object('error','missing_artifact'); end if;

    -- claim אטומי: רק מעבר admin_preview→admin_sending יצליח (מונע double-send במקביל/retry).
    update public.bot_outbox set status='admin_sending', attempts=attempts+1, last_at=now()
      where done_key = v_key and status = 'admin_preview'
      returning chat_id, reply, msg_in into v_chat, v_trans, v_hebrew;

    if not found then
      select status, chat_id, reply, sent_msg_id into v_row
        from public.bot_outbox where done_key = v_key;
      if v_row.status is null then return jsonb_build_object('error','unknown_artifact'); end if;
      if v_row.status = 'admin_sent' then    -- כבר נשלח → idempotent, בלי שליחה חוזרת
        return jsonb_build_object('ok',true,'action','send','idempotent',true,'chat_id',v_row.chat_id,'text',v_row.reply,'sent_msg_id',v_row.sent_msg_id);
      end if;
      if v_row.status = 'admin_sending' then  -- שליחה במקביל בתהליך
        return jsonb_build_object('ok',true,'action','send','in_progress',true,'chat_id',v_row.chat_id);
      end if;
      return jsonb_build_object('error','artifact_not_previewed','status',v_row.status);
    end if;

    -- recipient עדיין חייב מהרשומה
    if not exists (select 1 from public.wa_bot_log where group_id = v_chat) then
      update public.bot_outbox set status='admin_preview' where done_key = v_key;   -- שחרור ה-claim
      return jsonb_build_object('error','unknown_recipient');
    end if;

    -- שליחה דרך wa_send הקיים — הטקסט המדויק מה-artifact, בלי תרגום-מחדש. כשל → מחזירים ל-admin_preview.
    begin
      v_sent := public.wa_send(v_chat, v_trans, null);
    exception when others then
      update public.bot_outbox set status='admin_preview' where done_key = v_key;
      return jsonb_build_object('error','send_failed','detail',sqlerrm);
    end;

    update public.bot_outbox set status='admin_sent', last_at=now(),
      sent_msg_id = coalesce(v_sent->>'idMessage', v_sent->'result'->>'idMessage')
      where done_key = v_key;

    -- 📜 provenance: מי(uid)→למי(chat)→מתי(now)→מה(text).
    insert into public.wa_bot_log (group_id, sender, sender_name, text_in, reply_out, action, bot_mode, created_at)
      values (v_chat, null, 'ZURIEL (admin)', v_hebrew, v_trans, 'admin_reply', 'human_gate:'||coalesce(v_uid::text,'?'), now());

    return jsonb_build_object('ok',true,'action','send','chat_id',v_chat,'text',v_trans,'by',v_uid,'sent',v_sent,'at',now());
  end if;

  return jsonb_build_object('error','unknown_action');
end;
$function$;

-- 🔒 הרשאות: revoke מ-public/anon, grant ל-authenticated בלבד (השער הפנימי עדיין מוודא role='admin').
revoke all on function public.wa_admin_reply(text, jsonb) from public;
revoke all on function public.wa_admin_reply(text, jsonb) from anon;
grant execute on function public.wa_admin_reply(text, jsonb) to authenticated;
