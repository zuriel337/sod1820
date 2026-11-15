CREATE OR REPLACE FUNCTION public.record_channel_update_group_proof_v1(p_update_id uuid, p_source_id uuid, p_ext_msg_id text, p_group_chat_id text, p_sender_jid text, p_incoming boolean, p_type_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare cu record; s record; v_ids uuid[]; v_contrib uuid; v_basis text; v_inserted int;
begin
  if p_incoming is not true then return jsonb_build_object('ok', false, 'error', 'not_incoming'); end if;
  if p_type_message is null or p_type_message not in ('textMessage','extendedTextMessage','quotedMessage') then
    return jsonb_build_object('ok', false, 'error', 'not_text'); end if;
  select * into cu from public.channel_updates where id = p_update_id;
  if not found or cu.ext_msg_id is distinct from p_ext_msg_id or cu.source is distinct from 'auto'
     or cu.image_url is not null or cu.thumb_url is not null or cu.group_source_intake_public is not true then
    return jsonb_build_object('ok', false, 'error', 'update_mismatch'); end if;
  select * into s from public.channel_ingest_sources where id = p_source_id;
  if not found or s.channel is distinct from cu.channel or s.channel not in ('torat-haremez','gilui-yomi','blaze-888')
     or s.enabled is not true or coalesce(s.intake_mode,'') = 'off'
     or s.chat_id is distinct from p_group_chat_id or s.chat_id not like '%@g.us' then
    return jsonb_build_object('ok', false, 'error', 'source_mismatch'); end if;
  if coalesce(p_sender_jid,'') = '' or p_sender_jid not like '%@c.us' then
    return jsonb_build_object('ok', false, 'error', 'bad_sender'); end if;
  -- Candidate contributors, deduplicated by contributor.id: (A) contributors.phone, (B) VERIFIED wa_account_links owned by
  -- contributors.user_id. Reads wa_account_links as function owner (RLS-bypass); no grant to anon/authenticated.
  with jid as (select public.fn_wa_phone_digits(p_sender_jid) as d),
  cand as (
    select c.id from public.contributors c, jid
     where jid.d is not null and public.fn_wa_phone_digits(c.phone) = jid.d
    union
    select c.id from public.contributors c
      join public.wa_account_links w on w.user_id = c.user_id and w.verified_at is not null, jid
     where c.user_id is not null and jid.d is not null and public.fn_wa_phone_digits(w.phone) = jid.d)
  select array_agg(id) into v_ids from cand;                 -- >1 distinct contributors (incl. c.phone vs another account's verified link) => unverified
  if coalesce(array_length(v_ids,1),0) = 1 then v_contrib := v_ids[1]; v_basis := 'verified_phone_unique';
  else v_contrib := null; v_basis := 'unverified'; end if;
  insert into public.channel_update_group_proof(update_id, source_id, channel, ext_msg_id, group_chat_id, sender_jid,
         identity_contributor_id, identity_basis, incoming, text_only)
  values (p_update_id, p_source_id, cu.channel, p_ext_msg_id, p_group_chat_id, p_sender_jid, v_contrib, v_basis, true, true)
  on conflict do nothing;                                    -- replay: first proof stands, held_at never reset
  get diagnostics v_inserted = row_count;
  -- Only the first proof capture may attribute this newly admitted intake row. Provider timestamp may be old.
  -- Replay never overwrites later editorial attribution. Historical rows have the closed default intake marker.
  if v_inserted = 1 and v_contrib is not null and cu.contributor_id is distinct from v_contrib then
    update public.channel_updates set contributor_id = v_contrib where id = p_update_id;
  end if;
  return jsonb_build_object('ok', true, 'identity_basis', v_basis);
end $function$
;
