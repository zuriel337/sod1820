-- Throwaway fixture (never a live project): the columns and constraints the reply path touches, read from the live database on
-- 24.11.2026, the live fn_wa_phone_digits and the live body of record_channel_update_group_proof_v1 (md5 eb6551cf… is asserted below).
create table public.contributors (id uuid primary key default gen_random_uuid(), phone text, user_id uuid);
create table public.wa_account_links (id bigserial primary key, user_id uuid not null, phone text not null, verified_at timestamptz not null default now());
create table public.channel_ingest_sources (id uuid primary key default gen_random_uuid(), channel text not null, chat_id text not null,
  enabled boolean not null default true, intake_mode text not null default 'off');
create table public.channel_updates (id uuid primary key default gen_random_uuid(), channel text, text text, image_url text, thumb_url text,
  source text, contributor_id uuid, group_source_intake_public boolean default false, ext_msg_id text, status text default 'private', created_at timestamptz default now());
create table public.channel_update_group_proof (update_id uuid primary key references public.channel_updates(id) on delete cascade,
  source_id uuid not null references public.channel_ingest_sources(id), channel text not null, ext_msg_id text not null unique,
  group_chat_id text not null, sender_jid text not null, identity_contributor_id uuid references public.contributors(id),
  identity_basis text not null, incoming boolean not null, text_only boolean not null, proven_at timestamptz not null default now(),
  held_at timestamptz, held_by uuid, media_kind text, quoted_parent_ext_msg_id text,
  check (channel = any (array['torat-haremez','gilui-yomi','blaze-888'])),
  check (group_chat_id like '%@g.us' and group_chat_id <> '__ALL__'),
  check (identity_basis = any (array['verified_phone_unique','unverified'])),
  check (incoming is true),
  check ((text_only is true and media_kind is null) or (text_only is false and media_kind = any (array['image','video']))),
  check (quoted_parent_ext_msg_id is null or quoted_parent_ext_msg_id ~ '^[A-Za-z0-9_-]{16,128}$'));
do $r$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $r$;
CREATE OR REPLACE FUNCTION public.fn_wa_phone_digits(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select case
    when d is null or d = '' then null
    when d like '0%' then '972' || substr(d, 2)            -- local IL form 05x… -> 9725x…
    else d end
  from (select regexp_replace(coalesce(split_part(p, '@', 1), ''), '\D', '', 'g') as d) t
$function$
;
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
