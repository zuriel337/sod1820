-- WORLD_2029_GROUP_PROVENANCE_ID_BINDING_BUILD_V1 — BRANCH-ONLY. NOT APPLIED to the live project by this change.
-- EXTEND_EXISTING: narrow PRIVATE proof extension for channel_updates (not a new source/feed/tree/store owner).
-- Replaces the v1 reader, which trusted contributor_id derived from the user-controlled WhatsApp pushname.
-- Positive proof = (real configured group source, incoming text message, provider ext_msg_id, sender JID whose phone
-- matches exactly ONE contributors.phone). No proof row => excluded (fail closed). held_at => excluded (human hold wins).
-- Historical rows have no proof row and therefore stay out until separately re-proven + explicitly authorized.
-- No change to channel_updates columns/RLS/grants, no status flip, no research_objects touch.

drop function if exists public.world_group_source_arrivals_v1(integer);

create table if not exists public.channel_update_group_proof (
  update_id          uuid primary key references public.channel_updates(id) on delete cascade,
  source_id          uuid not null references public.channel_ingest_sources(id) on delete restrict,
  channel            text not null check (channel in ('torat-haremez','gilui-yomi')),
  ext_msg_id         text not null,
  group_chat_id      text not null check (group_chat_id like '%@g.us' and group_chat_id <> '__ALL__'),
  sender_jid         text not null,                       -- private; never returned by any public function
  identity_contributor_id uuid references public.contributors(id) on delete restrict, -- NULL = UNVERIFIED
  identity_basis     text not null check (identity_basis in ('jid_phone_unique','unverified')),
  incoming           boolean not null check (incoming is true),
  text_only          boolean not null check (text_only is true),
  proven_at          timestamptz not null default now(),
  held_at            timestamptz,
  held_by            uuid,
  unique (ext_msg_id)
);
alter table public.channel_update_group_proof enable row level security;       -- no policies => deny all non-bypass roles
revoke all on public.channel_update_group_proof from public, anon, authenticated;
grant select, insert, update on public.channel_update_group_proof to service_role;

create or replace function public.fn_wa_phone_digits(p text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case
    when d is null or d = '' then null
    when d like '0%' then '972' || substr(d, 2)            -- local IL form 05x… -> 9725x…
    else d end
  from (select regexp_replace(coalesce(split_part(p, '@', 1), ''), '\D', '', 'g') as d) t
$$;
revoke all on function public.fn_wa_phone_digits(text) from public, anon, authenticated;

-- Writer: called ONLY by wa-channel-ingest (service role) right after it inserted the channel_updates row.
create or replace function public.record_channel_update_group_proof_v1(
  p_update_id uuid, p_source_id uuid, p_ext_msg_id text, p_group_chat_id text,
  p_sender_jid text, p_incoming boolean, p_type_message text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare cu record; s record; v_ids uuid[]; v_contrib uuid; v_basis text;
begin
  if p_incoming is not true then return jsonb_build_object('ok', false, 'error', 'not_incoming'); end if;
  if p_type_message is null or p_type_message not in ('textMessage','extendedTextMessage','quotedMessage') then
    return jsonb_build_object('ok', false, 'error', 'not_text'); end if;
  select * into cu from public.channel_updates where id = p_update_id;
  if not found or cu.ext_msg_id is distinct from p_ext_msg_id or cu.source is distinct from 'auto'
     or cu.image_url is not null or cu.thumb_url is not null then
    return jsonb_build_object('ok', false, 'error', 'update_mismatch'); end if;
  select * into s from public.channel_ingest_sources where id = p_source_id;
  if not found or s.channel is distinct from cu.channel or s.channel not in ('torat-haremez','gilui-yomi')
     or s.enabled is not true or coalesce(s.intake_mode,'') = 'off'
     or s.chat_id is distinct from p_group_chat_id or s.chat_id not like '%@g.us' then
    return jsonb_build_object('ok', false, 'error', 'source_mismatch'); end if;
  if coalesce(p_sender_jid,'') = '' or p_sender_jid not like '%@c.us' then
    return jsonb_build_object('ok', false, 'error', 'bad_sender'); end if;
  select array_agg(c.id) into v_ids from public.contributors c
   where public.fn_wa_phone_digits(c.phone) = public.fn_wa_phone_digits(p_sender_jid);
  if coalesce(array_length(v_ids,1),0) = 1 then v_contrib := v_ids[1]; v_basis := 'jid_phone_unique';
  else v_contrib := null; v_basis := 'unverified'; end if;
  insert into public.channel_update_group_proof(update_id, source_id, channel, ext_msg_id, group_chat_id, sender_jid,
         identity_contributor_id, identity_basis, incoming, text_only)
  values (p_update_id, p_source_id, cu.channel, p_ext_msg_id, p_group_chat_id, p_sender_jid, v_contrib, v_basis, true, true)
  on conflict do nothing;                                    -- replay: first proof stands, held_at never reset
  return jsonb_build_object('ok', true, 'identity_basis', v_basis);
end $$;
revoke all on function public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text) to service_role;

-- Human hold (admin only). Hold overrides eligibility; unhold is explicit.
create or replace function public.admin_hold_group_source_v1(p_update_id uuid, p_hold boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin boolean; v_n int;
begin
  select (role = 'admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin,false) then raise exception 'admin only'; end if;
  if p_update_id is null or p_hold is null then return jsonb_build_object('ok', false, 'error', 'invalid_arguments'); end if;
  update public.channel_update_group_proof
     set held_at = case when p_hold then coalesce(held_at, now()) else null end,
         held_by = case when p_hold then auth.uid() else null end
   where update_id = p_update_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'error', 'no_proof'); end if;
  return jsonb_build_object('ok', true, 'held', p_hold);
end $$;
revoke all on function public.admin_hold_group_source_v1(uuid, boolean) from public, anon;
grant execute on function public.admin_hold_group_source_v1(uuid, boolean) to authenticated, service_role;

-- Reader v2: bounded, sanitized, exact columns, cursor by created_at.
create or replace function public.world_group_source_arrivals_v2(p_limit integer default 12, p_before timestamptz default null)
returns table (id uuid, body text, created_at timestamptz, contributor_slug text, contributor_name text,
               group_proof boolean, proof_basis text)
language sql stable security definer set search_path = public, pg_temp as $$
  select cu.id,
         left(regexp_replace(regexp_replace(regexp_replace(cu.text, '(https?://|www\.)\S+', '[קישור]', 'gi'),
              '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[דוא״ל]', 'g'),
              '(\+?\d[\d\s().-]{7,}\d)', '[מספר]', 'g'), 1200),
         cu.created_at, c.slug, c.display_name, true, g.identity_basis
    from public.channel_update_group_proof g
    join public.channel_updates cu on cu.id = g.update_id
    join public.channel_ingest_sources s
      on s.id = g.source_id and s.channel = cu.channel and s.channel = g.channel
     and s.channel in ('torat-haremez','gilui-yomi')
     and s.enabled is true and coalesce(s.intake_mode,'') <> 'off'
     and s.chat_id = g.group_chat_id and s.chat_id like '%@g.us' and s.chat_id <> '__ALL__'
    join public.contributors c on c.id = g.identity_contributor_id and c.id = cu.contributor_id
   where g.held_at is null
     and g.identity_basis = 'jid_phone_unique'
     and cu.source = 'auto' and cu.ext_msg_id = g.ext_msg_id and cu.ext_msg_id !~ '^mail_'
     and cu.status in ('live','private')                       -- off / hidden / blocked never qualify
     and (cu.expires_at is null or cu.expires_at > now())
     and cu.image_url is null and cu.thumb_url is null
     and cu.text is not null and length(btrim(cu.text)) > 0
     and cu.text !~* '(vcard|begin:vcard|wa\.me/|chat\.whatsapp\.com)'
     and coalesce(c.dossier_settings ->> 'general_feed_enabled','false') = 'true'
     and (p_before is null or cu.created_at < p_before)
   order by cu.created_at desc, cu.id
   limit greatest(1, least(coalesce(p_limit,12), 40));
$$;
revoke all on function public.world_group_source_arrivals_v2(integer, timestamptz) from public;
grant execute on function public.world_group_source_arrivals_v2(integer, timestamptz) to anon, authenticated, service_role;
