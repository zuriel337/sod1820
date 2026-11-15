-- GROUP_SOURCE_MEDIA_V1 + GILUI_YOMI_KANDRO_MEDIA_BACKFILL_V1 — throwaway local PostgreSQL only (never a live project).
-- Run: bash scripts/run-group-source-media-sql-test.sh
-- The public reader, the text proof recorder, the phone-digits function, the admin hold and the status guard are the LIVE ones, byte for
-- byte (md5 asserted below against the values read on 11.11.2026). The proof table carries the live constraints under their live names.
-- Storage is modelled by storage.buckets / storage.objects (id, bucket, name, metadata.mimetype/size), as the functions read it.
-- Supabase's default privileges (execute / all to anon, authenticated, service_role) are reproduced, so the proposal's revokes are tested.
-- Every phone number, chat id and message id here is invented.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create function expect(p_ok boolean, p_what text) returns void language plpgsql as $f$
  begin if p_ok is not true then raise exception 'FAIL: %', p_what; end if; end $f$;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create schema extensions;
create extension "uuid-ossp" schema extensions;
create schema auth;
create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('test.uid', true), '')::uuid $f$;
create schema storage;
create table storage.buckets(id text primary key, public boolean not null default false);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null,
  metadata jsonb, unique (bucket_id, name));
insert into storage.buckets values ('media', true), ('submission-inbox', false), ('gallery', true);
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table public.users(id uuid primary key, role text);
create table public.contributors(id uuid primary key default gen_random_uuid(), slug text unique, display_name text, phone text, user_id uuid,
  active boolean default true, dossier_settings jsonb default '{}'::jsonb);
create table public.wa_account_links(id bigserial primary key, user_id uuid not null, phone text not null, verified_at timestamptz default now());
create table public.channel_ingest_sources(id uuid primary key default gen_random_uuid(), channel text not null, chat_id text not null,
  admin_only boolean not null default false, admin_ids text[] not null default '{}'::text[], enabled boolean not null default true,
  intake_mode text not null default 'research_first');
create table public.channel_updates(id uuid primary key default gen_random_uuid(), channel text, text text, credit text, speaker text,
  created_at timestamptz default now(), expires_at timestamptz, group_source_intake_public boolean default false, contributor_id uuid,
  ext_msg_id text, source text default 'auto', status text default 'private', image_url text, thumb_url text);
create table public.channel_update_group_proof(
  update_id uuid not null constraint channel_update_group_proof_pkey primary key
    constraint channel_update_group_proof_update_id_fkey references public.channel_updates(id) on delete cascade,
  source_id uuid not null constraint channel_update_group_proof_source_id_fkey references public.channel_ingest_sources(id) on delete restrict,
  channel text not null constraint channel_update_group_proof_channel_check check (channel = any (array['torat-haremez', 'gilui-yomi', 'blaze-888'])),
  ext_msg_id text not null constraint channel_update_group_proof_ext_msg_id_key unique,
  group_chat_id text not null constraint channel_update_group_proof_group_chat_id_check check ((group_chat_id ~~ '%@g.us') and (group_chat_id <> '__ALL__')),
  sender_jid text not null,
  identity_contributor_id uuid constraint channel_update_group_proof_identity_contributor_id_fkey references public.contributors(id) on delete restrict,
  identity_basis text not null constraint channel_update_group_proof_identity_basis_check check (identity_basis = any (array['verified_phone_unique', 'unverified'])),
  incoming boolean not null constraint channel_update_group_proof_incoming_check check (incoming is true),
  text_only boolean not null constraint channel_update_group_proof_text_only_check check (text_only is true),
  proven_at timestamptz not null default now(), held_at timestamptz, held_by uuid);

\ir fixtures/group_source_media_live_base_20261111/fn_wa_phone_digits.sql
\ir fixtures/group_source_media_live_base_20261111/record_channel_update_group_proof_v1.sql
\ir fixtures/group_source_media_live_base_20261111/world_group_source_arrivals_v2.sql
\ir fixtures/group_source_media_live_base_20261111/admin_hold_group_source_v1.sql
\ir fixtures/group_source_media_live_base_20261111/guard_group_source_status_hold_v1.sql
create trigger trg_group_source_status_hold_v1 before update of status on public.channel_updates for each row execute function public.guard_group_source_status_hold_v1();
revoke all on function public.world_group_source_arrivals_v2(integer, timestamp with time zone) from public;
select expect(md5(pg_get_functiondef('public.fn_wa_phone_digits(text)'::regprocedure)) = '4cf0ae5f7ad240a7cef4e533e0437528', 'fn_wa_phone_digits is the live one');
select expect(md5(pg_get_functiondef('public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)'::regprocedure)) = 'eb6551cf1f71dbb5943c6e249b3c978b', 'text recorder is the live one');
select expect(md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) = '5e5168904f67f73c1ad1fcb6ecceb5bb', 'reader is the live one');
select expect(md5(pg_get_functiondef('public.admin_hold_group_source_v1(uuid,boolean)'::regprocedure)) = '43618e5434a0c3e70c12c7e82a8cfb4f', 'admin hold is the live one');
select expect(md5(pg_get_functiondef('public.guard_group_source_status_hold_v1()'::regprocedure)) = '4a289e60d08e4282265adac8b420877a', 'status guard is the live one');

insert into public.users values ('00000000-0000-4000-8000-0000000000f1', 'admin'), ('00000000-0000-4000-8000-0000000000f2', 'member');
insert into public.contributors(slug, display_name, phone, user_id, active, dossier_settings) values
  ('shachar-kandro', 'שחר יצחק קנדרו', '000000000101', null, true, '{"general_feed_enabled": true}'),
  ('yaniv-levi', 'יניב לוי', null, '00000000-0000-4000-8000-0000000000a2', true, '{"general_feed_enabled": true}'),
  ('tzvi-opoc', 'צבי', '000000000301', null, true, '{"general_feed_enabled": true}'),
  ('shimon-haimov', 'שמעון חיימוב', '000000000401', null, true, '{"general_feed_enabled": false}'),
  ('other-writer', 'כותב אחר', '000000000501', null, true, '{"general_feed_enabled": true}'),
  ('dup-a', 'כפול א', '000000000601', null, true, '{"general_feed_enabled": true}'),
  ('dup-b', 'כפול ב', '000000000601', null, true, '{"general_feed_enabled": true}');
insert into public.wa_account_links(user_id, phone) values ('00000000-0000-4000-8000-0000000000a2', '000000000201');
insert into public.channel_ingest_sources(id, channel, chat_id) values
  ('00000000-0000-4000-8000-0000000000b1', 'gilui-yomi', '100000000000000002@g.us'),
  ('00000000-0000-4000-8000-0000000000b2', 'torat-haremez', '100000000000000001@g.us'),
  ('00000000-0000-4000-8000-0000000000b3', 'or-geula', '100000000000000009@g.us');

create function src(p_channel text) returns uuid language sql as $f$ select id from public.channel_ingest_sources where channel = p_channel $f$;
create function chat(p_channel text) returns text language sql as $f$ select chat_id from public.channel_ingest_sources where channel = p_channel $f$;
create function contrib(p_slug text) returns uuid language sql as $f$ select id from public.contributors where slug = p_slug $f$;
create function basis(p_id uuid) returns text language sql as $f$ select identity_basis from public.channel_update_group_proof where update_id = p_id $f$;

-- A text message as the ingest stores it today: row (status private, intake marker) + the text proof.
create function ingest_text(p_channel text, p_sender text, p_text text, p_at timestamptz default now()) returns uuid language plpgsql as $f$
declare v_id uuid; v_msg text := 'T' || substr(md5(random()::text), 1, 19);
begin
  insert into public.channel_updates(channel, text, created_at, group_source_intake_public, ext_msg_id)
  values (p_channel, p_text, p_at, true, v_msg) returning id into v_id;
  perform public.record_channel_update_group_proof_v1(v_id, src(p_channel), v_msg, chat(p_channel), p_sender, true, 'textMessage');
  return v_id;
end $f$;

-- A media message as the NEW ingest stores it: private original in submission-inbox, row with storage-object:<id> + intake marker.
create function store_media(p_channel text, p_kind text, p_mime text, p_size bigint, p_text text, p_at timestamptz default now(),
  p_msg text default null, p_intake boolean default true) returns uuid language plpgsql as $f$
declare v_id uuid; v_obj uuid := gen_random_uuid(); v_msg text := coalesce(p_msg, 'M' || substr(md5(random()::text), 1, 19));
begin
  insert into storage.objects(id, bucket_id, name, metadata) values (v_obj, 'submission-inbox',
    'sod1820/2029/unresolved/' || to_char(p_at at time zone 'UTC', 'YYYY/MM') || '/' || gen_random_uuid() || '/' || p_kind || '/original.' || split_part(p_mime, '/', 2),
    jsonb_build_object('mimetype', p_mime, 'size', p_size));
  insert into public.channel_updates(channel, text, created_at, group_source_intake_public, ext_msg_id, image_url)
  values (p_channel, p_text, p_at, p_intake, v_msg, 'storage-object:' || v_obj) returning id into v_id;
  return v_id;
end $f$;
-- Helpers that call the proposed functions are created before the proposal exists (their bodies are checked when they first run).
set check_function_bodies = off;
create function media_proof(p_id uuid, p_sender text, p_type text, p_incoming boolean default true, p_source uuid default null, p_chat text default null)
returns jsonb language sql as $f$
  select public.record_channel_update_group_media_proof_v1(p_id, coalesce(p_source, src(cu.channel)), cu.ext_msg_id, coalesce(p_chat, chat(cu.channel)),
    p_sender, p_incoming, p_type) from public.channel_updates cu where cu.id = p_id $f$;
-- The Edge path for the public copy, computed INDEPENDENTLY of the server (waPublicMediaPath + waStableAssetId are UUID v5 in the same
-- namespace; the cross-check value be3c12c5-… below is the Node result of waStableAssetId("gilui-yomi", "TEST-MESSAGE-1")).
create function edge_path(p_id uuid, p_ext text) returns text language sql as $f$
  select 'sod1820/2029/' || g.media_kind || '/' || to_char(cu.created_at at time zone 'UTC', 'YYYY/MM') || '/'
    || extensions.uuid_generate_v5('6f0c2f4e-1b1d-5b8a-9c3e-2029a5e7d1c0'::uuid, 'wa-channel:' || cu.channel || ':' || cu.ext_msg_id) || '/original.' || p_ext
    from public.channel_updates cu join public.channel_update_group_proof g on g.update_id = cu.id where cu.id = p_id $f$;
reset check_function_bodies;
-- Upload (the same bytes: same type and size as the private original, unless overridden) and record.
create function publish(p_id uuid, p_path text default null, p_size bigint default null, p_mime text default null, p_bucket text default 'media')
returns jsonb language plpgsql as $f$
declare v_mime text; v_size bigint; v_path text;
begin
  select o.metadata ->> 'mimetype', (o.metadata ->> 'size')::bigint into v_mime, v_size
    from public.channel_updates cu join storage.objects o on o.id = substr(cu.image_url, 16)::uuid where cu.id = p_id;
  v_path := coalesce(p_path, edge_path(p_id, case coalesce(p_mime, v_mime) when 'image/jpeg' then 'jpg' when 'image/png' then 'png'
    when 'image/webp' then 'webp' when 'video/mp4' then 'mp4' when 'video/webm' then 'webm' end));
  insert into storage.objects(bucket_id, name, metadata) values (p_bucket, v_path, jsonb_build_object('mimetype', coalesce(p_mime, v_mime), 'size', coalesce(p_size, v_size)))
  on conflict (bucket_id, name) do nothing;
  return public.record_group_source_public_media_v1(p_id, v_path);
end $f$;
create function shown(p_id uuid) returns boolean language sql as $f$
  select exists (select 1 from public.world_group_source_arrivals_v2(40, null) r where r.id = p_id) $f$;
create function arrival(p_id uuid) returns jsonb language sql as $f$
  select to_jsonb(r) from public.world_group_source_arrivals_v2(40, null) r where r.id = p_id $f$;

-- 0. Baseline on the live functions: text messages of verified approved writers are public; a media row has no public path.
create table t_text as
  select ingest_text('gilui-yomi', '000000000101@c.us', 'גילוי ראשון', now() - interval '3 hours') as id union all
  select ingest_text('gilui-yomi', '000000000201@c.us', 'יניב: ראו https://evil.example/x ו־050-0000000 youtu.be/dQw4w9WgXcQ?si=abc', now() - interval '2 hours') union all
  select ingest_text('torat-haremez', '000000000301@c.us', 'צבי: הודעת טקסט', now() - interval '1 hour');
select expect((select count(*) from public.world_group_source_arrivals_v2(40, null)) = 3, 'three text arrivals are public');
create table before_reader as select * from public.world_group_source_arrivals_v2(40, null);
create table before_proofs as select * from public.channel_update_group_proof;
select expect((select public.record_channel_update_group_proof_v1(store_media('gilui-yomi', 'image', 'image/jpeg', 1000, 'x'), src('gilui-yomi'), 'none',
  chat('gilui-yomi'), '000000000101@c.us', true, 'imageMessage') ->> 'error') = 'not_text', 'the live text recorder refuses media');
delete from public.channel_updates where text = 'x';
select 'PASS 0 baseline: the live reader shows the three verified text arrivals; the live text recorder refuses media (live functions, md5)' as result;

-- 1. Apply. Text arrivals are byte-identical; no existing proof row changed; the text recorder still works the same way.
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111234500_gilui_yomi_kandro_media_backfill_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(to_regclass('public.group_source_public_media') is null, 'the backfill refuses before GROUP_SOURCE_MEDIA_V1');
\ir ../../supabase/proposed/20261111234000_group_source_media_v1_PROPOSAL.sql
select expect(not exists (select id, body, created_at, contributor_slug, contributor_name, group_proof, proof_basis, group_channel
  from public.world_group_source_arrivals_v2(40, null) except select * from before_reader)
  and not exists (select * from before_reader except select id, body, created_at, contributor_slug, contributor_name, group_proof, proof_basis, group_channel
  from public.world_group_source_arrivals_v2(40, null)), 'text arrivals are byte-identical after the change');
select expect((select bool_and(media_kind is null and media_url is null and thumb_url is null) from public.world_group_source_arrivals_v2(40, null)), 'text rows carry no media');
select expect(not exists (select update_id, source_id, channel, ext_msg_id, group_chat_id, sender_jid, identity_contributor_id, identity_basis, incoming, text_only, proven_at, held_at, held_by
  from public.channel_update_group_proof except select * from before_proofs), 'no existing proof row changed');
select expect(shown(ingest_text('gilui-yomi', '000000000101@c.us', 'טקסט אחרי השינוי')), 'the unchanged text recorder still publishes');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111234000_group_source_media_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select 'PASS 1 apply: text arrivals byte-identical with null media columns; proof rows unchanged; text recorder unchanged; a second apply refuses' as result;

-- 2. Publication: a verified approved writer's image and video become public with a redacted caption, only after the copy is recorded.
create table t_img as select store_media('gilui-yomi', 'image', 'image/jpeg', 283882,
  'יניב: ראו https://evil.example/x ו־050-0000000 youtu.be/dQw4w9WgXcQ?si=abc', '2026-11-10 22:41:49+00', 'TEST-MESSAGE-1') as id;
select expect((select media_proof(id, '000000000201@c.us', 'imageMessage') = '{"ok": true, "media_kind": "image", "publishable": true, "identity_basis": "verified_phone_unique"}'::jsonb from t_img), 'image proof: verified, publishable');
select expect((select not shown(id) from t_img), 'nothing is public before the public copy is recorded');
select expect((select publish(id) ->> 'ok' = 'true' from t_img), 'the public copy is recorded');
select expect((select object_path = 'sod1820/2029/image/2026/11/be3c12c5-7aa1-5368-9b6a-304a973b22ca/original.jpg' from public.group_source_public_media m join t_img on m.update_id = t_img.id),
  'the recorded path is exactly the Edge path (Node waStableAssetId cross-check)');
select expect((select (arrival(id) ->> 'media_kind') = 'image' from t_img), 'the reader returns the image');
select expect((select r.media_url = 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/11/be3c12c5-7aa1-5368-9b6a-304a973b22ca/original.jpg'
  and r.thumb_url is null and r.contributor_slug = 'yaniv-levi' and r.group_channel = 'gilui-yomi'
  from public.world_group_source_arrivals_v2(40, '2026-11-10 22:42:00+00') r join t_img on r.id = t_img.id), 'public URL, writer and group');
select expect((select r.body from public.world_group_source_arrivals_v2(40, '2026-11-10 22:42:00+00') r join t_img on r.id = t_img.id)
  = (select body from before_reader where body like 'יניב:%'), 'the caption gets exactly the text redaction');
select expect((select cu.contributor_id = contrib('yaniv-levi') from public.channel_updates cu join t_img using (id)), 'the first proof attributes the row');
create table t_vid as select store_media('torat-haremez', 'video', 'video/mp4', 5000000, '🎬 עדכון וידאו') as id;
select expect((select media_proof(id, '000000000301@c.us', 'videoMessage') ->> 'publishable' = 'true' and publish(id) ->> 'ok' = 'true' from t_vid), 'video proof and copy');
select expect((select (arrival(id) ->> 'media_kind') = 'video' and (arrival(id) ->> 'body') = '' and (arrival(id) ->> 'thumb_url') is null from t_vid), 'video shown, placeholder body empty, no poster yet');
insert into storage.objects(bucket_id, name, metadata) select 'media', regexp_replace(object_path, '/original\.mp4$', '/derivatives/poster.jpg'), '{"mimetype":"image/jpeg","size":10}'
  from public.group_source_public_media m join t_vid on m.update_id = t_vid.id;
select expect((select (arrival(id) ->> 'thumb_url') like 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/%/derivatives/poster.jpg' from t_vid),
  'the poster of the existing media-thumbs job becomes the video thumb');
create table t_ph as select store_media('gilui-yomi', 'image', 'image/webp', 900, '📷 עדכון') as id;
select expect((select media_proof(id, '000000000101@c.us', 'imageMessage') ->> 'identity_basis' = 'verified_phone_unique' and publish(id) ->> 'ok' = 'true'
  and (arrival(id) ->> 'body') = '' and (arrival(id) ->> 'media_url') like '%/original.webp' from t_ph), 'image without a caption: empty body, webp copy (Kandro bound by phone)');
select 'PASS 2 publication: image and video of verified approved writers, public URL at the exact Edge path, redacted caption, empty placeholder, poster as thumb' as result;

-- 3. Identity and approval gates: the proof is recorded, nothing becomes public.
create table t_gate(label text, id uuid);
insert into t_gate select 'unknown sender', store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'א');
insert into t_gate select 'two contributors', store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ב');
insert into t_gate select 'flag off', store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ג');
insert into t_gate select 'not approved', store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ד');
insert into t_gate select 'inactive', store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ה');
select expect(media_proof((select id from t_gate where label = 'unknown sender'), '000000000999@c.us', 'imageMessage') @> '{"ok": true, "identity_basis": "unverified", "publishable": false}', 'unknown sender: unverified');
select expect(media_proof((select id from t_gate where label = 'two contributors'), '000000000601@c.us', 'imageMessage') @> '{"identity_basis": "unverified", "publishable": false}', 'ambiguous phone: unverified');
select expect(media_proof((select id from t_gate where label = 'flag off'), '000000000401@c.us', 'imageMessage') @> '{"identity_basis": "verified_phone_unique", "publishable": false}', 'editorial flag off');
select expect(media_proof((select id from t_gate where label = 'not approved'), '000000000501@c.us', 'imageMessage') @> '{"identity_basis": "verified_phone_unique", "publishable": false}', 'not in the four-writer list');
update public.contributors set active = false where slug = 'tzvi-opoc';
select expect(media_proof((select id from t_gate where label = 'inactive'), '000000000301@c.us', 'imageMessage') @> '{"publishable": false}', 'inactive contributor');
update public.contributors set active = true where slug = 'tzvi-opoc';
select expect((select bool_and(publish(id) ->> 'error' = 'not_publishable') from t_gate where label <> 'inactive'), 'the copy is refused for each');
select expect((select bool_and(not shown(id)) from t_gate) and not exists (select 1 from public.group_source_public_media m join t_gate g on g.id = m.update_id), 'nothing public');
update public.contributors set dossier_settings = '{"general_feed_enabled": true}' where slug = 'shimon-haimov';
select expect((select (publish(id) ->> 'ok') = 'true' and shown(id) from t_gate where label = 'flag off'), 'turning the editorial flag on publishes on the next record');
update public.contributors set dossier_settings = '{"general_feed_enabled": false}' where slug = 'shimon-haimov';
select expect((select not shown(id) from t_gate where label = 'flag off'), 'turning it off hides it again (the reader re-checks the rule)');
select 'PASS 3 identity and approval: unknown or ambiguous sender, flag off, writer outside the list, inactive writer -> proof recorded, nothing public; the flag is re-checked by the reader' as result;

-- 4. Message, source and copy checks: each refused, nothing public.
select expect(media_proof(store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ו'), '000000000101@c.us', 'audioMessage') ->> 'error' = 'not_media', 'audio is never a media proof');
select expect(media_proof(store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ז'), '000000000101@c.us', 'textMessage') ->> 'error' = 'not_media', 'a text type is refused');
select expect(media_proof(store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ח'), '000000000101@c.us', 'imageMessage', false) ->> 'error' = 'not_incoming', 'outgoing is refused');
select expect(media_proof(store_media('gilui-yomi', 'video', 'video/mp4', 100, 'ט'), '000000000101@c.us', 'imageMessage') ->> 'error' = 'private_original_mismatch', 'declared image, private original is a video');
select expect(media_proof(store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'י', now(), null, false), '000000000101@c.us', 'imageMessage') ->> 'error' = 'update_mismatch', 'closed intake marker (historical row)');
select expect(media_proof(store_media('or-geula', 'image', 'image/jpeg', 100, 'כ'), '000000000101@c.us', 'imageMessage') ->> 'error' = 'source_mismatch', 'a channel outside the proof channels');
select expect(media_proof(store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ל'), '000000000101@c.us', 'imageMessage', true, null, '199999999999999999@g.us') ->> 'error' = 'source_mismatch', 'another group chat');
select expect(media_proof(store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'מ'), '100000000000000002@g.us', 'imageMessage') ->> 'error' = 'bad_sender', 'a group id as sender');
create table t_noorig as select store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'נ') as id;
delete from storage.objects o using public.channel_updates cu, t_noorig n where cu.id = n.id and o.id = substr(cu.image_url, 16)::uuid;
select expect((select media_proof(id, '000000000101@c.us', 'imageMessage') ->> 'error' = 'private_original_mismatch' from t_noorig), 'private original missing');
create table t_exp as select store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'ס') as id;
update public.channel_updates set expires_at = now() - interval '1 minute' where id = (select id from t_exp);
select expect((select media_proof(id, '000000000101@c.us', 'imageMessage') @> '{"ok": true, "publishable": false}' from t_exp), 'expired row: not publishable');
select expect(media_proof(store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'BEGIN:VCARD פרטים'), '000000000101@c.us', 'imageMessage') @> '{"publishable": false}', 'contact card caption');
create table t_copy as select store_media('gilui-yomi', 'image', 'image/jpeg', 2000, 'ע') as id;
select expect((select media_proof(id, '000000000101@c.us', 'imageMessage') ->> 'publishable' = 'true' from t_copy), 'copy checks: publishable');
select expect((select public.record_group_source_public_media_v1(id, edge_path(id, 'jpg')) ->> 'error' = 'public_copy_missing' from t_copy), 'no public object yet');
select expect((select publish(id, null, 1999) ->> 'error' = 'public_copy_mismatch' from t_copy), 'a copy of another size');
delete from storage.objects where bucket_id = 'media' and name = (select edge_path(id, 'jpg') from t_copy);
select expect((select publish(id, null, null, 'image/png') ->> 'error' = 'public_copy_mismatch' from t_copy), 'a copy of another type');
select expect((select publish(id, replace(edge_path(id, 'jpg'), to_char(now() at time zone 'UTC', 'YYYY/MM'), '2020/01')) ->> 'error' = 'bad_public_path' from t_copy), 'another month');
select expect((select publish(id, regexp_replace(edge_path(id, 'jpg'), '/[0-9a-f-]{36}/', '/' || extensions.uuid_generate_v5('6f0c2f4e-1b1d-5b8a-9c3e-2029a5e7d1c0'::uuid, 'other') || '/')) ->> 'error' = 'bad_public_path' from t_copy), 'another asset id');
select expect((select publish(id, null, null, null, 'gallery') ->> 'error' = 'public_copy_missing' from t_copy), 'a copy in another bucket is not the public copy');
select expect((select not shown(id) and not exists (select 1 from public.group_source_public_media where update_id = t_copy.id) from t_copy), 'nothing recorded');
create table t_v1 as select store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'פ') as id;
select expect((select public.record_channel_update_group_proof_v1(cu.id, src('gilui-yomi'), cu.ext_msg_id, chat('gilui-yomi'), '000000000101@c.us', true, 'textMessage') ->> 'error'
  from public.channel_updates cu join t_v1 using (id)) = 'update_mismatch', 'the text recorder still refuses a media row (its own message id)');
create table t_raw as select store_media('gilui-yomi', 'image', 'image/jpeg', 100, 'צ') as id;
\set ON_ERROR_STOP 0
insert into public.group_source_public_media(update_id, media_kind, object_path, content_type, byte_size)
  select id, 'image', 'sod1820/2029/image/2026/11/not-a-uuid/original.jpg', 'image/jpeg', 1 from t_copy;
insert into public.channel_update_group_proof(update_id, source_id, channel, ext_msg_id, group_chat_id, sender_jid, identity_basis, incoming, text_only, media_kind)
  select cu.id, src('gilui-yomi'), 'gilui-yomi', cu.ext_msg_id, chat('gilui-yomi'), '000000000101@c.us', 'unverified', true, false, 'audio'
    from public.channel_updates cu join t_raw using (id);
insert into public.channel_update_group_proof(update_id, source_id, channel, ext_msg_id, group_chat_id, sender_jid, identity_basis, incoming, text_only, media_kind)
  select cu.id, src('gilui-yomi'), 'gilui-yomi', cu.ext_msg_id, chat('gilui-yomi'), '000000000101@c.us', 'unverified', true, true, 'image'
    from public.channel_updates cu join t_raw using (id);
\set ON_ERROR_STOP 1
select expect(not exists (select 1 from public.group_source_public_media where object_path like '%not-a-uuid%')
  and not exists (select 1 from public.channel_update_group_proof g join t_raw on g.update_id = t_raw.id), 'table checks refuse a bad path, an audio proof and a text proof with a media kind');
select 'PASS 4 message, source and copy checks: audio, text type, outgoing, wrong kind, missing original, closed marker, foreign channel or chat, bad sender, expired, contact card; missing, resized, retyped, misplaced or foreign-bucket copy; table checks' as result;

-- 5. Hold, takedown and replay.
create table t_hold as select id from t_img;
set test.uid = '00000000-0000-4000-8000-0000000000f2';
\set ON_ERROR_STOP 0
select public.admin_hold_group_source_v1((select id from t_hold), true);
\set ON_ERROR_STOP 1
select expect((select g.held_at is null from public.channel_update_group_proof g join t_hold on g.update_id = t_hold.id), 'a member cannot hold');
set test.uid = '00000000-0000-4000-8000-0000000000f1';
select expect((select public.admin_hold_group_source_v1(id, true) ->> 'ok' = 'true' from t_hold), 'admin hold');
select expect((select not exists (select 1 from public.world_group_source_arrivals_v2(40, '2026-11-10 22:42:00+00') r where r.id = t_hold.id) from t_hold), 'held media is hidden');
select expect((select publish(id) ->> 'error' = 'not_publishable' from t_hold), 'a held proof is not publishable');
select expect((select public.admin_hold_group_source_v1(id, false) ->> 'ok' = 'true' from t_hold), 'admin unhold');
select expect((select exists (select 1 from public.world_group_source_arrivals_v2(40, '2026-11-10 22:42:00+00') r where r.id = t_hold.id) from t_hold), 'unheld media is shown again');
reset test.uid;
create table t_held as select store_media('gilui-yomi', 'image', 'image/jpeg', 300, 'מוחזק') as id;
select expect((select media_proof(id, '000000000101@c.us', 'imageMessage') ->> 'publishable' = 'true' from t_held), 'held_at only: publishable before the hold');
update public.channel_update_group_proof set held_at = now() where update_id = (select id from t_held);
select expect((select media_proof(id, '000000000101@c.us', 'imageMessage') ->> 'publishable' = 'false' and publish(id) ->> 'error' = 'not_publishable' from t_held),
  'a hold on the proof alone (intake marker untouched) blocks publication');
update public.channel_update_group_proof set held_at = null where update_id = (select id from t_held);
select expect((select publish(id) ->> 'ok' = 'true' and shown(id) from t_held), 'released: published');
update public.channel_update_group_proof set held_at = now() where update_id = (select id from t_held);
select expect((select not shown(id) from t_held), 'a hold on the proof alone hides a published copy');
create table t_text_held as select ingest_text('gilui-yomi', '000000000101@c.us', 'טקסט מוחזק') as id;
update public.channel_update_group_proof set held_at = now() where update_id = (select id from t_text_held);
select expect((select not shown(id) from t_text_held), 'a hold on a text proof alone hides it (reader gate, unchanged)');
select expect((select (media_proof(id, '000000000999@c.us', 'imageMessage') ->> 'identity_basis') = 'verified_phone_unique' from t_img), 'replay: the first proof stands (another sender changes nothing)');
select expect((select publish(id) ->> 'ok' = 'true' from t_img) and (select count(*) = 1 from public.group_source_public_media m join t_img on m.update_id = t_img.id), 'replay: recording again is idempotent');
delete from storage.objects where bucket_id = 'media' and name = (select object_path from public.group_source_public_media m join t_vid on m.update_id = t_vid.id);
select expect((select not shown(id) from t_vid), 'deleting the public object takes the video down');
update public.channel_updates set status = 'hidden' where id = (select id from t_ph);
select expect((select not shown(id) from t_ph), 'a hidden row is not shown (status guard closes the marker)');
select 'PASS 5 hold and takedown: member cannot hold, admin hold hides and blocks the copy, unhold restores; replay keeps the first proof and is idempotent; deleting the object or hiding the row takes it down' as result;

-- 6. Grants: anon reads the reader (which uses the internal rule as its owner); nothing else is reachable.
set role anon;
select expect((select count(*) from public.world_group_source_arrivals_v2(40, '2026-11-10 22:42:00+00')) >= 1, 'anon reads the reader, media rows included');
reset role;
select expect(has_function_privilege('anon', 'public.world_group_source_arrivals_v2(integer,timestamp with time zone)', 'execute')
  and has_function_privilege('authenticated', 'public.world_group_source_arrivals_v2(integer,timestamp with time zone)', 'execute'), 'reader for anon and authenticated');
select expect(not has_function_privilege('anon', 'public.group_source_media_publishable_v1(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.group_source_media_publishable_v1(uuid)', 'execute')
  and not has_function_privilege('service_role', 'public.group_source_media_publishable_v1(uuid)', 'execute'), 'the rule is internal');
select expect(not has_function_privilege('anon', 'public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.record_group_source_public_media_v1(uuid,text)', 'execute')
  and has_function_privilege('service_role', 'public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text)', 'execute')
  and has_function_privilege('service_role', 'public.record_group_source_public_media_v1(uuid,text)', 'execute'), 'recorders for service_role only');
select expect(not has_table_privilege('anon', 'public.group_source_public_media', 'select') and not has_table_privilege('authenticated', 'public.group_source_public_media', 'select')
  and not has_table_privilege('service_role', 'public.group_source_public_media', 'insert') and has_table_privilege('service_role', 'public.group_source_public_media', 'select'), 'the copy table is private');
set role anon;
\set ON_ERROR_STOP 0
select public.record_group_source_public_media_v1(gen_random_uuid(), 'x');
select * from public.group_source_public_media;
\set ON_ERROR_STOP 1
reset role;
select 'PASS 6 grants: anon and authenticated read only the reader; the rule is internal; recorders are service_role only; the copy table is private (Supabase default privileges reproduced)' as result;

-- 7. Backfill of the 10.11 message (the live row as read on 11.11.2026, invented ids for the object and the message).
insert into storage.objects(id, bucket_id, name, metadata) values ('00000000-0000-4000-8000-0000000000c1', 'submission-inbox',
  'sod1820/2029/unresolved/2026/11/00000000-0000-4000-8000-0000000000c2/image/original.jpg', '{"mimetype": "image/jpeg", "size": 283882}');
insert into public.channel_updates(id, channel, text, credit, created_at, expires_at, group_source_intake_public, ext_msg_id, image_url)
values ('8d30aba8-e510-443b-9de0-456df8875a22', 'gilui-yomi', 'כיתוב של קנדרו', 'שחר יצחק קנדרו', '2026-11-10 22:41:49+00',
  '2026-11-11 22:41:49+00', false, 'KANDRO1011MSG0000001', 'storage-object:00000000-0000-4000-8000-0000000000c1');
select expect(media_proof('8d30aba8-e510-443b-9de0-456df8875a22', '000000000101@c.us', 'imageMessage') ->> 'error' = 'update_mismatch', 'before the backfill the row is closed');
\ir ../../supabase/proposed/20261111234500_gilui_yomi_kandro_media_backfill_v1_PROPOSAL.sql
select expect((select group_source_intake_public and expires_at is null and status = 'private' and contributor_id is null from public.channel_updates
  where id = '8d30aba8-e510-443b-9de0-456df8875a22'), 'backfill opens only the marker and the expiry');
select expect(not shown('8d30aba8-e510-443b-9de0-456df8875a22'), 'the backfill alone publishes nothing');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111234500_gilui_yomi_kandro_media_backfill_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
-- Step 2 = the targeted recovery: the Edge proves the sender (Kandro's bound number) and writes + records the public copy.
select expect(media_proof('8d30aba8-e510-443b-9de0-456df8875a22', '000000000101@c.us', 'imageMessage') @> '{"identity_basis": "verified_phone_unique", "publishable": true}', 'targeted recovery: verified');
select expect(publish('8d30aba8-e510-443b-9de0-456df8875a22') ->> 'ok' = 'true', 'targeted recovery: public copy recorded');
select expect((select r.media_kind = 'image' and r.contributor_slug = 'shachar-kandro' and r.body = 'כיתוב של קנדרו'
  from public.world_group_source_arrivals_v2(40, '2026-11-10 22:42:00+00') r where r.id = '8d30aba8-e510-443b-9de0-456df8875a22'), 'the 10.11 image is public as Kandro');
\ir ../../supabase/proposed/ROLLBACK_20261111234500_gilui_yomi_kandro_media_backfill_v1.sql
select expect((select not group_source_intake_public and expires_at = '2026-11-11 22:41:49+00' from public.channel_updates where id = '8d30aba8-e510-443b-9de0-456df8875a22')
  and not exists (select 1 from public.channel_update_group_proof where update_id = '8d30aba8-e510-443b-9de0-456df8875a22')
  and not exists (select 1 from public.group_source_public_media where update_id = '8d30aba8-e510-443b-9de0-456df8875a22')
  and not shown('8d30aba8-e510-443b-9de0-456df8875a22'), 'backfill rollback restores the row as read on 11.11.2026');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261111234500_gilui_yomi_kandro_media_backfill_v1.sql
\set ON_ERROR_STOP 1
select 'PASS 7 backfill: refuses before GROUP_SOURCE_MEDIA_V1 and on a second run; opens only the marker and the expiry; publishes only through the verified proof and the recorded copy; rollback restores the row; a second rollback refuses' as result;

-- 8. Rollback of GROUP_SOURCE_MEDIA_V1: the live reader, the text-only proof table, text arrivals as before.
\ir ../../supabase/proposed/ROLLBACK_20261111234000_group_source_media_v1.sql
select expect(md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) = '5e5168904f67f73c1ad1fcb6ecceb5bb', 'the live reader is back');
select expect(to_regclass('public.group_source_public_media') is null and to_regprocedure('public.group_source_media_publishable_v1(uuid)') is null
  and to_regprocedure('public.record_group_source_public_media_v1(uuid,text)') is null, 'media objects removed');
select expect(not exists (select 1 from public.channel_update_group_proof where text_only is not true), 'only text proofs remain');
select expect(not exists (select * from before_reader except select * from public.world_group_source_arrivals_v2(40, null)), 'the original text arrivals are back as before');
select expect(has_function_privilege('anon', 'public.world_group_source_arrivals_v2(integer,timestamp with time zone)', 'execute'), 'reader grant restored');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261111234000_group_source_media_v1.sql
\set ON_ERROR_STOP 1
select expect(md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) = '5e5168904f67f73c1ad1fcb6ecceb5bb', 'a second rollback refuses and changes nothing');
select 'PASS 8 rollback: live reader md5 5e516890 and grants restored, media tables and functions removed, only text proofs remain, text arrivals as before; a second rollback refuses' as result;
