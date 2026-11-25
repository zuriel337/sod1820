-- REVIEW ONLY, NOT APPLIED. #1514 option 2 (ZURIEL 24.11.2026): a group reply is private from the moment it is ingested.
-- The existing text proof (record_channel_update_group_proof_v1) records a proof only while channel_updates.group_source_intake_public
-- is open, and the public group-source reader (world_group_source_arrivals_v2) shows a proven row exactly while that marker is open.
-- A reply therefore could not be proven without being public for a moment. v2 is the same function family, extended (v1 is not
-- changed and stays the proof of every non-reply message):
--   - a non-reply text message: exactly the v1 rules (the marker must be open);
--   - a reply (quotedMessage, or a quoted parent id): the row must have been inserted with the marker CLOSED, and the identity
--     proof and the quoted parent id are written in the same single insert. Nothing opens the marker; nothing writes later.
-- Identity is decided exactly as in v1 (sender JID -> exactly one Contributor). No table, column, policy or grant to anon or
-- authenticated is created; EXECUTE is granted to service_role only, as v1. Guarded by the live v1 body (md5 eb6551cf…).
-- Does not touch the rule tree. One transaction: a failed guard changes nothing.
BEGIN;
do $guard$
begin
  if md5(pg_get_functiondef('public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)'::regprocedure))
     <> 'eb6551cf1f71dbb5943c6e249b3c978b' then
    raise exception 'GROUP_REPLY_PROOF_V2 precondition: record_channel_update_group_proof_v1 is not the reviewed body; nothing changed';
  end if;
  if to_regprocedure('public.record_channel_update_group_proof_v2(uuid,uuid,text,text,text,boolean,text,text)') is not null then
    raise exception 'GROUP_REPLY_PROOF_V2 precondition: v2 already exists; nothing changed';
  end if;
end $guard$;

CREATE FUNCTION public.record_channel_update_group_proof_v2(p_update_id uuid, p_source_id uuid, p_ext_msg_id text,
  p_group_chat_id text, p_sender_jid text, p_incoming boolean, p_type_message text, p_quoted_parent_ext_msg_id text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare cu record; s record; v_ids uuid[]; v_contrib uuid; v_basis text; v_inserted int; v_reply boolean; v_parent text;
begin
  if p_incoming is not true then return jsonb_build_object('ok', false, 'error', 'not_incoming'); end if;
  if p_type_message is null or p_type_message not in ('textMessage','extendedTextMessage','quotedMessage') then
    return jsonb_build_object('ok', false, 'error', 'not_text'); end if;
  -- A reply is a quotedMessage or a message that carries a quoted parent id. An invalid id keeps it a reply, without a parent.
  v_reply := p_type_message = 'quotedMessage' or p_quoted_parent_ext_msg_id is not null;
  v_parent := case when p_quoted_parent_ext_msg_id ~ '^[A-Za-z0-9_-]{16,128}$' and p_quoted_parent_ext_msg_id <> p_ext_msg_id
                   then p_quoted_parent_ext_msg_id end;
  select * into cu from public.channel_updates where id = p_update_id;
  -- A reply must already be private (marker closed at insert); any other message keeps the v1 rule (marker open).
  if not found or cu.ext_msg_id is distinct from p_ext_msg_id or cu.source is distinct from 'auto'
     or cu.image_url is not null or cu.thumb_url is not null
     or (v_reply and cu.group_source_intake_public is not false)
     or (not v_reply and cu.group_source_intake_public is not true) then
    return jsonb_build_object('ok', false, 'error', 'update_mismatch'); end if;
  select * into s from public.channel_ingest_sources where id = p_source_id;
  if not found or s.channel is distinct from cu.channel or s.channel not in ('torat-haremez','gilui-yomi','blaze-888')
     or s.enabled is not true or coalesce(s.intake_mode,'') = 'off'
     or s.chat_id is distinct from p_group_chat_id or s.chat_id not like '%@g.us' then
    return jsonb_build_object('ok', false, 'error', 'source_mismatch'); end if;
  -- quoted parents are kept for the two Community groups only (v7 §43-45)
  if v_reply and s.channel not in ('torat-haremez','gilui-yomi') then v_parent := null; end if;
  if coalesce(p_sender_jid,'') = '' or p_sender_jid not like '%@c.us' then
    return jsonb_build_object('ok', false, 'error', 'bad_sender'); end if;
  with jid as (select public.fn_wa_phone_digits(p_sender_jid) as d),
  cand as (
    select c.id from public.contributors c, jid
     where jid.d is not null and public.fn_wa_phone_digits(c.phone) = jid.d
    union
    select c.id from public.contributors c
      join public.wa_account_links w on w.user_id = c.user_id and w.verified_at is not null, jid
     where c.user_id is not null and jid.d is not null and public.fn_wa_phone_digits(w.phone) = jid.d)
  select array_agg(id) into v_ids from cand;
  if coalesce(array_length(v_ids,1),0) = 1 then v_contrib := v_ids[1]; v_basis := 'verified_phone_unique';
  else v_contrib := null; v_basis := 'unverified'; end if;
  insert into public.channel_update_group_proof(update_id, source_id, channel, ext_msg_id, group_chat_id, sender_jid,
         identity_contributor_id, identity_basis, incoming, text_only, quoted_parent_ext_msg_id)
  values (p_update_id, p_source_id, cu.channel, p_ext_msg_id, p_group_chat_id, p_sender_jid, v_contrib, v_basis, true, true,
          case when v_reply then v_parent end)
  on conflict do nothing;                                    -- replay: first proof stands, held_at never reset
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 and v_contrib is not null and cu.contributor_id is distinct from v_contrib then
    update public.channel_updates set contributor_id = v_contrib where id = p_update_id;
  end if;
  return jsonb_build_object('ok', true, 'identity_basis', v_basis, 'reply', v_reply, 'quoted_parent', v_parent is not null and v_reply);
end $function$;

REVOKE ALL ON FUNCTION public.record_channel_update_group_proof_v2(uuid,uuid,text,text,text,boolean,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_channel_update_group_proof_v2(uuid,uuid,text,text,text,boolean,text,text) TO service_role;
COMMIT;
