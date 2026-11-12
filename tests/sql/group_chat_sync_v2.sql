-- GROUP_CHAT_SYNC_V2 (prelude shared with group_source_media_v1.sql: the LIVE pre-media functions byte for byte) — throwaway local PostgreSQL only (never a live project).
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


-- Bring the local database to the LIVE state of 12.11.2026 (media proposal applied), then the sod1820 contributor as it is live.
\ir ../../supabase/proposed/20261111234000_group_source_media_v1_PROPOSAL.sql
insert into public.contributors(id, slug, display_name, phone, user_id, active, dossier_settings) values
  ('fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf', 'r-b6ce542a2b0747498aba532c886f6de7', 'sod1820', '000000000701', '00000000-0000-4000-8000-0000000000a7', true, '{}');
create table public.research_contributions(id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid, author_name text,
  intent text not null default 'תגובה', origin text not null default 'beit_midrash', research_state text not null default 'idea', status text not null default 'pending',
  target_type text, target_id text, parent_id uuid, title text, body text, created_at timestamptz not null default now(), deleted_at timestamptz);
create function reader_md5() returns text language sql as $f$ select md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) $f$;
create table t_md5 as select reader_md5() as before_patch;

-- PART 1 (reader literal + flag + indexes) — copied from the proposal's PART 1 block
\ir ../../supabase/proposed/20261112150000_group_chat_sync_gilui_v2_PROPOSAL.sql
select expect(reader_md5() <> (select before_patch from t_md5), 'the reader text changed by the patch');
select expect(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure) like '%r-b6ce542a2b0747498aba532c886f6de7%', 'sod1820 is in the reader list');
select expect((select dossier_settings ->> 'general_feed_enabled' from public.contributors where slug = 'r-b6ce542a2b0747498aba532c886f6de7') = 'true', 'sod1820 flag set');

-- PART 3 is the switch: until it runs nothing is copied. The whole file was applied above, so switch the three sync triggers off to model PARTS 1+2 only.
alter table public.channel_update_group_proof disable trigger trg_group_chat_sync_v1;
alter table public.group_source_public_media disable trigger trg_group_chat_sync_v1;
alter table public.channel_updates disable trigger trg_group_chat_sync_v1;

-- Messages: Yaniv, Kandro, sod1820 (all verified writers in gilui-yomi), a non-listed writer, a message before the cut, a message in another group.
create table t_in as
  select 'yaniv' k, ingest_text('gilui-yomi', '000000000201@c.us', 'יניב: ראו https://evil.example/x ו־050-0000000 youtu.be/dQw4w9WgXcQ?si=abc', now() - interval '3 hours') id union all
  select 'kandro', ingest_text('gilui-yomi', '000000000101@c.us', 'קנדרו: גילוי', now() - interval '2 hours') union all
  select 'sod', ingest_text('gilui-yomi', '000000000701@c.us', 'שלי: גילוי 1237', now() - interval '90 minutes') union all
  select 'other', ingest_text('gilui-yomi', '000000000501@c.us', 'כותב לא ברשימה', now() - interval '80 minutes') union all
  select 'old', ingest_text('gilui-yomi', '000000000201@c.us', 'לפני החיתוך', timestamptz '2026-11-01 10:00+00') union all
  select 'tzvi', ingest_text('torat-haremez', '000000000301@c.us', 'צבי: קבוצה אחרת', now() - interval '1 hour');
select expect((select count(*) from public.research_contributions) = 0, 'nothing is copied before the triggers exist');
select expect((select count(*) from public.world_group_source_arrivals_v2(40, null) where group_channel = 'gilui-yomi') = 4, 'the reader shows Yaniv, Kandro, sod1820 and the pre-cut Yaniv message of this group, not the unlisted writer (single eligibility source; the cut-off is the chat copy only)');

-- Backfill through the catch-up function (the explicit enable step); then the triggers (PART 3) switch the live path on.
select expect(public.group_chat_sync_pending_v1(50) = 3, 'backfill copies exactly the three reader-eligible messages');
select expect((select count(*) from public.research_contributions where parent_id is null and target_type = 'group_day') = 1, 'one daily root for the day');
select expect((select count(*) from public.research_contributions where target_type = 'channel_update' and parent_id is not null) = 3, 'three replies under it');
select expect(public.group_chat_sync_pending_v1(50) = 0, 'idempotent');
select expect(not exists (select 1 from public.research_contributions r where r.target_type = 'channel_update' and r.target_id in (select id::text from t_in where k in ('other','old','tzvi'))), 'non-eligible messages are never copied');
select expect((select r.body from public.research_contributions r where r.target_id = (select id::text from t_in where k = 'yaniv')) = (select (arrival(id) ->> 'body') from t_in where k = 'yaniv'), 'chat text is exactly the public reader text (same censoring)');
select expect((select r.body from public.research_contributions r where r.target_id = (select id::text from t_in where k = 'yaniv')) like '%[קישור]%[מספר]%youtu.be/dQw4w9WgXcQ', 'links and numbers masked, YouTube kept');
select expect((select author_user_id is null and author_name = 'שחר יצחק קנדרו' from public.research_contributions where target_id = (select id::text from t_in where k = 'kandro')), 'Kandro: contributor identity, no account');
select expect((select author_user_id = '00000000-0000-4000-8000-0000000000a7' from public.research_contributions where target_id = (select id::text from t_in where k = 'sod')), 'sod1820 reply carries his account');
select expect((select status = 'approved' and origin = 'community_2029' from public.research_contributions where target_type = 'channel_update' limit 1), 'approved community rows');
do $$ begin
  insert into public.research_contributions(origin, target_type, target_id, body) values ('community_2029', 'channel_update', (select id::text from t_in where k = 'yaniv'), 'dup');
  raise exception 'FAIL: duplicate copy accepted';
exception when unique_violation then null; end $$;

-- PART 3: switch the triggers on. New message through the live path:
alter table public.channel_update_group_proof enable trigger trg_group_chat_sync_v1;
alter table public.group_source_public_media enable trigger trg_group_chat_sync_v1;
alter table public.channel_updates enable trigger trg_group_chat_sync_v1;
select expect(exists (select 1 from pg_trigger where tgname = 'trg_group_chat_sync_v1'), 'sync trigger exists');
create table t_live as select ingest_text('gilui-yomi', '000000000201@c.us', 'חדש מיניב', now()) id;
select expect((select count(*) from public.research_contributions where target_id = (select id::text from t_live)) = 1, 'a new proven message is copied by the trigger');
select expect((select count(*) from public.research_contributions where parent_id is null and target_type = 'group_day') = 1, 'same day, same root');

-- media: nothing until the public copy exists; the media trigger then copies it with the public URL
create table t_media as select store_media('gilui-yomi', 'image', 'image/jpeg', 1000, 'תמונה', now() - interval '5 minutes') id;
select media_proof((select id from t_media), '000000000101@c.us', 'imageMessage');
select expect((select count(*) from public.research_contributions where target_id = (select id::text from t_media)) = 0, 'media waits for the public copy');
select publish((select id from t_media), null, null);
select expect((select body like E'תמונה\n📷 https://%/storage/v1/object/public/media/sod1820/2029/image/%' from public.research_contributions where target_id = (select id::text from t_media)), 'media message carries the public URL after the copy is published');

-- hold after copy soft-deletes; unheld rows stay
update public.channel_update_group_proof set held_at = now() where update_id = (select id from t_live);
select expect((select deleted_at is not null from public.research_contributions where target_id = (select id::text from t_live)), 'hold soft-deletes the chat copy');
update public.channel_updates set status = 'hidden' where id = (select id from t_in where k = 'kandro');
select expect((select deleted_at is not null from public.research_contributions where target_id = (select id::text from t_in where k = 'kandro')), 'hidden source row soft-deletes the chat copy');

-- a failing chat insert never breaks the ingest
alter table public.research_contributions add constraint boom check (body is distinct from 'פיצוץ');
create table t_boom as select ingest_text('gilui-yomi', '000000000201@c.us', 'פיצוץ', now()) id;
select expect((select count(*) from public.channel_update_group_proof where update_id = (select id from t_boom)) = 1, 'proof row exists although the chat copy failed');
alter table public.research_contributions drop constraint boom;

-- per-writer stop = the reader's own flag
update public.contributors set dossier_settings = '{"general_feed_enabled": false}' where slug = 'yaniv-levi';
create table t_off as select ingest_text('gilui-yomi', '000000000201@c.us', 'אחרי כיבוי הדגל', now()) id;
select expect((select count(*) from public.research_contributions where target_id = (select id::text from t_off)) = 0, 'turning the reader flag off stops the chat copy too');

-- no client access
select expect(not has_function_privilege('anon', 'public.group_chat_sync_update_v1(uuid)', 'execute') and not has_function_privilege('authenticated', 'public.group_chat_sync_pending_v1(integer)', 'execute'), 'sync functions are not callable by clients');
select expect(not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name like 'group_chat_%'), 'no new table (EXTEND_EXISTING)');

-- rollback restores the reader text exactly, the flag, and removes the functions, triggers and indexes
\ir ../../supabase/proposed/20261112150000_group_chat_sync_gilui_v2_ROLLBACK.sql
select expect(reader_md5() = (select before_patch from t_md5), 'rollback restores the live reader text byte for byte');
select expect(to_regprocedure('public.group_chat_sync_update_v1(uuid)') is null and not exists (select 1 from pg_trigger where tgname like 'trg_group_chat_%')
  and to_regclass('public.research_contributions_group_source_copy_uq') is null, 'rollback removes functions, triggers and indexes');
select expect(not (select dossier_settings ? 'general_feed_enabled' from public.contributors where slug = 'r-b6ce542a2b0747498aba532c886f6de7'), 'rollback removes the sod1820 flag');
\echo group_chat_sync_v2: OK
