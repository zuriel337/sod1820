-- GROUP_SOURCE_MEDIA_V1 — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4).
-- Rollback: supabase/proposed/ROLLBACK_20261111234000_group_source_media_v1.sql · Test: bash scripts/run-group-source-media-sql-test.sh
-- Order: this file FIRST, then the Edge function wa-channel-ingest (+ _shared/waGroupMedia.js). Review: docs/reviews/group-source-media-20261111/.
--
-- ZURIEL 11.11.2026 ("כן, לתכנן"): images and videos from a public source group appear like its text messages, under the same gates as
-- «תורת הרמז» (Zvi): a VERIFIED writer only (the sender id resolves to exactly one contributor phone or verified WhatsApp link), an APPROVED
-- writer only (the four-writer list and the editorial flag), never held; a PUBLIC COPY of the media (the private original stays in
-- submission-inbox, where every group media message lands first); and a REDACTED caption (the same redaction as the text messages).
--
-- What changes:
--  1. channel_update_group_proof may describe a media message: text_only = false with media_kind 'image' | 'video'. Every existing row is
--     text_only = true and keeps its meaning; record_channel_update_group_proof_v1 (text) is not changed.
--  2. group_source_public_media (new, private): one row per media proof whose public copy was written to the public "media" bucket.
--  3. group_source_media_publishable_v1 (internal, STABLE): the ONE rule for "this media proof may be public now". Used by both recorders
--     and by the reader, so the three can never disagree.
--  4. record_channel_update_group_media_proof_v1 (service_role): the media twin of the v1 recorder. Same source, sender and identity rules
--     (the identity block is copied byte for byte); in addition the row must carry its private original (storage-object:<id> in
--     submission-inbox, of the declared kind). Returns whether the media may be published.
--  5. record_group_source_public_media_v1 (service_role): records the public copy only when the rule holds, the object exists in the public
--     bucket at the ONE path the Edge function derives for that message (2029 path, UUID v5 of channel + message id, month of the message),
--     and its type and size equal the private original.
--  6. world_group_source_arrivals_v2: SAME name, arguments, gates, redaction, ordering, limits and grants; three added columns (media_kind,
--     media_url, thumb_url; old clients ignore them, the 2029 client already reads them). Text rows are returned exactly as today, with the
--     media columns null. A media row is returned only with its recorded public copy that still exists in Storage; its caption goes through
--     the same redaction; the ingest placeholder ("📷 עדכון" / "🎬 עדכון וידאו") becomes an empty body; a video's thumb_url is the poster
--     that the existing media-thumbs job writes next to every 2029 video original (derivatives/poster.jpg), once it exists.
-- Not changed: the text recorder, admin_hold_group_source_v1 (it already holds media proofs: held_at + intake marker), channel_ingest_sources,
-- contributors, channel_updates, every existing row, audio (never public), Or HaGeula and every channel outside the three proof channels.
-- Forward-only: an old media message stays private (no proof, closed intake marker); a single old message is opened only by its own
-- reviewed file (see 20261111234500_gilui_yomi_kandro_media_backfill_v1_PROPOSAL.sql).
begin;

do $$
begin
  if md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) <> '5e5168904f67f73c1ad1fcb6ecceb5bb' then
    raise exception 'GROUP_SOURCE_MEDIA precondition: world_group_source_arrivals_v2 is not the definition read on 11.11.2026; nothing changed';
  end if;
  if md5(pg_get_functiondef('public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)'::regprocedure)) <> 'eb6551cf1f71dbb5943c6e249b3c978b' then
    raise exception 'GROUP_SOURCE_MEDIA precondition: record_channel_update_group_proof_v1 is not the definition read on 11.11.2026; nothing changed';
  end if;
  if md5(pg_get_functiondef('public.fn_wa_phone_digits(text)'::regprocedure)) <> '4cf0ae5f7ad240a7cef4e533e0437528' then
    raise exception 'GROUP_SOURCE_MEDIA precondition: fn_wa_phone_digits is not the definition read on 11.11.2026; nothing changed';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.channel_update_group_proof'::regclass
                  and conname = 'channel_update_group_proof_text_only_check' and pg_get_constraintdef(oid) = 'CHECK ((text_only IS TRUE))') then
    raise exception 'GROUP_SOURCE_MEDIA precondition: the text-only check of channel_update_group_proof is not the live one; nothing changed';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'channel_update_group_proof' and column_name = 'media_kind')
     or to_regclass('public.group_source_public_media') is not null
     or to_regprocedure('public.group_source_media_publishable_v1(uuid)') is not null
     or to_regprocedure('public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text)') is not null
     or to_regprocedure('public.record_group_source_public_media_v1(uuid,text)') is not null then
    raise exception 'GROUP_SOURCE_MEDIA precondition: already applied (or partly); nothing changed';
  end if;
  if not exists (select 1 from storage.buckets where id = 'media' and public is true)
     or not exists (select 1 from storage.buckets where id = 'submission-inbox' and public is false) then
    raise exception 'GROUP_SOURCE_MEDIA precondition: the public media bucket or the private submission-inbox bucket is not as expected; nothing changed';
  end if;
  if extensions.uuid_generate_v5('6f0c2f4e-1b1d-5b8a-9c3e-2029a5e7d1c0'::uuid, 'wa-channel:gilui-yomi:TEST-MESSAGE-1')::text <> 'be3c12c5-7aa1-5368-9b6a-304a973b22ca' then
    raise exception 'GROUP_SOURCE_MEDIA precondition: UUID v5 differs from the Edge waStableAssetId; nothing changed';
  end if;
end $$;

-- 1. A proof row may describe a media message.
alter table public.channel_update_group_proof add column media_kind text;
alter table public.channel_update_group_proof drop constraint channel_update_group_proof_text_only_check;
alter table public.channel_update_group_proof add constraint channel_update_group_proof_payload_check
  check ((text_only is true and media_kind is null) or (text_only is false and media_kind in ('image', 'video')));
comment on column public.channel_update_group_proof.media_kind is
  'null for a text proof (text_only = true); image | video for a media proof (text_only = false). Media proofs come only from record_channel_update_group_media_proof_v1.';

-- 2. The public copy of a proved media message (private table: only the definer functions below write it).
create table public.group_source_public_media (
  update_id uuid primary key references public.channel_update_group_proof(update_id) on delete cascade,
  media_kind text not null check (media_kind in ('image', 'video')),
  object_path text not null unique,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 47185920),
  published_at timestamptz not null default now(),
  constraint group_source_public_media_type_check check (
    (media_kind = 'image' and content_type in ('image/jpeg', 'image/png', 'image/webp'))
    or (media_kind = 'video' and content_type in ('video/mp4', 'video/webm'))),
  constraint group_source_public_media_path_check check (
    object_path ~ ('^sod1820/2029/' || media_kind || '/[0-9]{4}/(0[1-9]|1[0-2])/[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/original\.'
      || case content_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp'
                           when 'video/mp4' then 'mp4' when 'video/webm' then 'webm' end || '$'))
);
comment on table public.group_source_public_media is
  'Public copy (bucket media, 2029 path) of a group media message whose proof met group_source_media_publishable_v1 when it was recorded. Written only by record_group_source_public_media_v1. Takedown: admin_hold_group_source_v1 (immediate), or delete the row / the Storage object.';
alter table public.group_source_public_media enable row level security;
revoke all on table public.group_source_public_media from public, anon, authenticated, service_role;
grant select on table public.group_source_public_media to service_role;

-- 3. The one rule: may this media proof be public now? (the gates of the text reader, for a media row with its private original)
create function public.group_source_media_publishable_v1(p_update_id uuid)
 returns boolean
 language sql
 stable
 set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
      from public.channel_update_group_proof g
      join public.channel_updates cu on cu.id = g.update_id
      join public.channel_ingest_sources s
        on s.id = g.source_id and s.channel = cu.channel and s.channel = g.channel
       and s.channel in ('torat-haremez','gilui-yomi','ki-la-hamelucha-gematria','blaze-888')
       and s.enabled is true and coalesce(s.intake_mode,'') <> 'off'
       and s.chat_id = g.group_chat_id and s.chat_id like '%@g.us' and s.chat_id <> '__ALL__'
      join public.contributors c on c.id = g.identity_contributor_id and c.id = cu.contributor_id
     where g.update_id = p_update_id
       and g.held_at is null
       and g.identity_basis = 'verified_phone_unique'
       and g.text_only is false and g.media_kind in ('image','video')
       and cu.source = 'auto' and cu.ext_msg_id = g.ext_msg_id and cu.ext_msg_id !~ '^mail_'
       and cu.group_source_intake_public is true
       and cu.status in ('live','private')
       and (cu.expires_at is null or cu.expires_at > now())
       and cu.image_url ~ '^storage-object:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and cu.thumb_url is null
       and cu.text is not null and length(btrim(cu.text)) > 0
       and cu.text !~* '(vcard|begin:vcard|wa\.me/|chat\.whatsapp\.com)'
       and c.active is true
       and c.slug in ('tzvi-opoc','yaniv-levi','shachar-kandro','shimon-haimov')
       and coalesce(c.dossier_settings ->> 'general_feed_enabled','false') = 'true')
$function$;
revoke all on function public.group_source_media_publishable_v1(uuid) from public, anon, authenticated, service_role;

-- 4. Media proof: the media twin of record_channel_update_group_proof_v1 (identity block copied byte for byte).
create function public.record_channel_update_group_media_proof_v1(p_update_id uuid, p_source_id uuid, p_ext_msg_id text, p_group_chat_id text, p_sender_jid text, p_incoming boolean, p_type_message text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare cu record; s record; g record; v_kind text; v_mime text; v_ids uuid[]; v_contrib uuid; v_basis text; v_inserted int;
begin
  if p_incoming is not true then return jsonb_build_object('ok', false, 'error', 'not_incoming'); end if;
  v_kind := case p_type_message when 'imageMessage' then 'image' when 'videoMessage' then 'video' end;
  if v_kind is null then return jsonb_build_object('ok', false, 'error', 'not_media'); end if;
  select * into cu from public.channel_updates where id = p_update_id;
  if not found or cu.ext_msg_id is distinct from p_ext_msg_id or cu.source is distinct from 'auto'
     or cu.thumb_url is not null or cu.group_source_intake_public is not true
     or coalesce(cu.image_url, '') !~ '^storage-object:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', false, 'error', 'update_mismatch'); end if;
  -- The private original must exist in submission-inbox and be of the declared kind (its type was decided from the bytes at ingest).
  select o.metadata ->> 'mimetype' into v_mime from storage.objects o
   where o.bucket_id = 'submission-inbox' and o.id = substr(cu.image_url, 16)::uuid;
  if v_mime is null or split_part(v_mime, '/', 1) is distinct from v_kind then
    return jsonb_build_object('ok', false, 'error', 'private_original_mismatch'); end if;
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
         identity_contributor_id, identity_basis, incoming, text_only, media_kind)
  values (p_update_id, p_source_id, cu.channel, p_ext_msg_id, p_group_chat_id, p_sender_jid, v_contrib, v_basis, true, false, v_kind)
  on conflict do nothing;                                    -- replay: first proof stands, held_at never reset
  get diagnostics v_inserted = row_count;
  -- Only the first proof capture may attribute this row. Replay never overwrites later editorial attribution.
  if v_inserted = 1 and v_contrib is not null and cu.contributor_id is distinct from v_contrib then
    update public.channel_updates set contributor_id = v_contrib where id = p_update_id;
  end if;
  select * into g from public.channel_update_group_proof where update_id = p_update_id;
  if not found or g.text_only is not false or g.media_kind is distinct from v_kind or g.ext_msg_id is distinct from p_ext_msg_id then
    return jsonb_build_object('ok', false, 'error', 'proof_mismatch'); end if;
  return jsonb_build_object('ok', true, 'identity_basis', g.identity_basis, 'media_kind', v_kind,
    'publishable', public.group_source_media_publishable_v1(p_update_id));
end $function$;
revoke all on function public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text) to service_role;

-- 5. Record the public copy — only for a publishable proof, only at the one path of that message, only for an identical copy.
create function public.record_group_source_public_media_v1(p_update_id uuid, p_object_path text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare g record; cu record; v_priv_mime text; v_priv_size bigint; v_pub_mime text; v_pub_size bigint; v_ext text; v_expected text; v_existing text;
begin
  if p_update_id is null or coalesce(p_object_path, '') = '' then return jsonb_build_object('ok', false, 'error', 'invalid_arguments'); end if;
  if not public.group_source_media_publishable_v1(p_update_id) then return jsonb_build_object('ok', false, 'error', 'not_publishable'); end if;
  select * into g from public.channel_update_group_proof where update_id = p_update_id;
  select * into cu from public.channel_updates where id = p_update_id;
  select o.metadata ->> 'mimetype', (o.metadata ->> 'size')::bigint into v_priv_mime, v_priv_size from storage.objects o
   where o.bucket_id = 'submission-inbox' and o.id = substr(cu.image_url, 16)::uuid;
  select o.metadata ->> 'mimetype', (o.metadata ->> 'size')::bigint into v_pub_mime, v_pub_size from storage.objects o
   where o.bucket_id = 'media' and o.name = p_object_path;
  if v_pub_mime is null then return jsonb_build_object('ok', false, 'error', 'public_copy_missing'); end if;
  if v_priv_mime is null or v_pub_mime is distinct from v_priv_mime or v_pub_size is distinct from v_priv_size then
    return jsonb_build_object('ok', false, 'error', 'public_copy_mismatch'); end if;
  v_ext := case v_pub_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp'
                           when 'video/mp4' then 'mp4' when 'video/webm' then 'webm' end;
  if v_ext is null or split_part(v_pub_mime, '/', 1) is distinct from g.media_kind then
    return jsonb_build_object('ok', false, 'error', 'public_copy_type'); end if;
  -- The one path the Edge function derives (waPublicMediaPath + waStableAssetId): kind / month of the message / UUID v5 / original.<ext>.
  v_expected := 'sod1820/2029/' || g.media_kind || '/' || to_char(cu.created_at at time zone 'UTC', 'YYYY/MM') || '/'
    || extensions.uuid_generate_v5('6f0c2f4e-1b1d-5b8a-9c3e-2029a5e7d1c0'::uuid, 'wa-channel:' || cu.channel || ':' || cu.ext_msg_id)::text
    || '/original.' || v_ext;
  if p_object_path is distinct from v_expected then return jsonb_build_object('ok', false, 'error', 'bad_public_path'); end if;
  insert into public.group_source_public_media(update_id, media_kind, object_path, content_type, byte_size)
  values (p_update_id, g.media_kind, p_object_path, v_pub_mime, v_pub_size)
  on conflict do nothing;
  select m.object_path into v_existing from public.group_source_public_media m where m.update_id = p_update_id;
  if v_existing is distinct from p_object_path then return jsonb_build_object('ok', false, 'error', 'already_recorded_differently'); end if;
  return jsonb_build_object('ok', true, 'media_kind', g.media_kind);
end $function$;
revoke all on function public.record_group_source_public_media_v1(uuid,text) from public, anon, authenticated;
grant execute on function public.record_group_source_public_media_v1(uuid,text) to service_role;

-- 6. The one public reader, extended (same name and arguments; DROP + CREATE because the result gains three columns).
drop function public.world_group_source_arrivals_v2(integer, timestamp with time zone);
create function public.world_group_source_arrivals_v2(p_limit integer default 12, p_before timestamp with time zone default null)
 returns table(id uuid, body text, created_at timestamp with time zone, contributor_slug text, contributor_name text, group_proof boolean, proof_basis text, group_channel text, media_kind text, media_url text, thumb_url text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select cu.id,
         case when m.update_id is not null and btrim(cu.text) in ('📷 עדכון', '🎬 עדכון וידאו') then ''
              else left(regexp_replace(regexp_replace(regexp_replace(regexp_replace(cu.text, '((https?://)?(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])\S*', '\1', 'gi'), '(https?://|www\.)(?!(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}(?![A-Za-z0-9_-]))\S+', '[קישור]', 'gi'),
                   '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[דוא״ל]', 'g'),
                   '(\+?\d[\d\s().-]{7,}\d)', '[מספר]', 'g'), 1200) end,
         cu.created_at, c.slug, c.display_name, true, g.identity_basis, cu.channel,
         m.media_kind,
         case when m.update_id is not null then 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/' || m.object_path end,
         case when m.media_kind = 'video' and exists (select 1 from storage.objects po where po.bucket_id = 'media'
                    and po.name = regexp_replace(m.object_path, '/original\.[a-z0-9]+$', '/derivatives/poster.jpg'))
              then 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/' || regexp_replace(m.object_path, '/original\.[a-z0-9]+$', '/derivatives/poster.jpg') end
    from public.channel_update_group_proof g
    join public.channel_updates cu on cu.id = g.update_id
    join public.channel_ingest_sources s
      on s.id = g.source_id and s.channel = cu.channel and s.channel = g.channel
     and s.channel in ('torat-haremez','gilui-yomi','ki-la-hamelucha-gematria','blaze-888')
     and s.enabled is true and coalesce(s.intake_mode,'') <> 'off'
     and s.chat_id = g.group_chat_id and s.chat_id like '%@g.us' and s.chat_id <> '__ALL__'
    join public.contributors c on c.id = g.identity_contributor_id and c.id = cu.contributor_id
    left join public.group_source_public_media m on m.update_id = g.update_id and m.media_kind = g.media_kind and g.text_only is false
   where g.held_at is null
     and g.identity_basis = 'verified_phone_unique'
     and cu.source = 'auto' and cu.ext_msg_id = g.ext_msg_id and cu.ext_msg_id !~ '^mail_'
     and cu.group_source_intake_public is true
     and cu.status in ('live','private')
     and (cu.expires_at is null or cu.expires_at > now())
     and ((g.text_only is true and cu.image_url is null and cu.thumb_url is null)
          or (m.update_id is not null
              and exists (select 1 from storage.objects o where o.bucket_id = 'media' and o.name = m.object_path)
              and public.group_source_media_publishable_v1(g.update_id)))
     and cu.text is not null and length(btrim(cu.text)) > 0
     and cu.text !~* '(vcard|begin:vcard|wa\.me/|chat\.whatsapp\.com)'
     and c.active is true
     and c.slug in ('tzvi-opoc','yaniv-levi','shachar-kandro','shimon-haimov')
     and coalesce(c.dossier_settings ->> 'general_feed_enabled','false') = 'true'
     and (p_before is null or cu.created_at < p_before)
   order by cu.created_at desc, cu.id
   limit greatest(1, least(coalesce(p_limit,12), 40));
$function$;
revoke all on function public.world_group_source_arrivals_v2(integer, timestamp with time zone) from public;
grant execute on function public.world_group_source_arrivals_v2(integer, timestamp with time zone) to anon, authenticated, service_role;

do $$
begin
  if md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) <> 'd36f8a4bb2f87e61249c41c3499c6bd4'
     or md5(pg_get_functiondef('public.group_source_media_publishable_v1(uuid)'::regprocedure)) <> 'd943770e50bfd52a794ff0a88ed7770b'
     or md5(pg_get_functiondef('public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text)'::regprocedure)) <> '667c5fcfcfe993cab83a14d84cce18ae'
     or md5(pg_get_functiondef('public.record_group_source_public_media_v1(uuid,text)'::regprocedure)) <> '22c9c659dd449820e8bc2906b23dd43d' then
    raise exception 'GROUP_SOURCE_MEDIA postcondition: unexpected function definition';
  end if;
  if not has_function_privilege('anon', 'public.world_group_source_arrivals_v2(integer,timestamp with time zone)', 'execute')
     or has_function_privilege('anon', 'public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text)', 'execute')
     or has_function_privilege('authenticated', 'public.record_group_source_public_media_v1(uuid,text)', 'execute')
     or has_function_privilege('service_role', 'public.group_source_media_publishable_v1(uuid)', 'execute')
     or has_table_privilege('anon', 'public.group_source_public_media', 'select')
     or has_table_privilege('authenticated', 'public.group_source_public_media', 'select')
     or not has_function_privilege('service_role', 'public.record_group_source_public_media_v1(uuid,text)', 'execute') then
    raise exception 'GROUP_SOURCE_MEDIA postcondition: grants are not as specified';
  end if;
  if exists (select 1 from public.channel_update_group_proof where text_only is not true or media_kind is not null) then
    raise exception 'GROUP_SOURCE_MEDIA postcondition: an existing proof row changed';
  end if;
end $$;

commit;
