-- GROUP_CHAT_SYNC_V1 — throwaway local PostgreSQL only. Tables carry the columns the sync reads; all ids are invented.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
create function expect(p_ok boolean, p_what text) returns void language plpgsql as $f$ begin if p_ok is not true then raise exception 'FAIL: %', p_what; end if; end $f$;
create schema storage; create table storage.objects(bucket_id text, name text);
create table public.contributors(id uuid primary key default gen_random_uuid(), slug text, display_name text, user_id uuid, active boolean default true);
create table public.channel_ingest_sources(id uuid primary key default gen_random_uuid(), channel text, chat_id text, enabled boolean default true, intake_mode text default 'research_first');
create table public.channel_updates(id uuid primary key default gen_random_uuid(), channel text, text text, created_at timestamptz default now(), group_source_intake_public boolean default true,
  contributor_id uuid, ext_msg_id text, source text default 'auto', status text default 'private', image_url text, thumb_url text);
create table public.channel_update_group_proof(update_id uuid primary key, source_id uuid, channel text, ext_msg_id text, group_chat_id text, identity_contributor_id uuid,
  identity_basis text, text_only boolean, media_kind text, held_at timestamptz);
create table public.group_source_public_media(update_id uuid primary key, media_kind text, object_path text);
create function public.group_source_media_publishable_v1(uuid) returns boolean language sql as $f$ select true $f$;
create table public.research_contributions(id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid, author_name text, intent text not null default 'תגובה',
  origin text not null default 'beit_midrash', research_state text not null default 'idea', status text not null default 'pending', parent_id uuid, title text, body text,
  created_at timestamptz not null default now(), deleted_at timestamptz);

insert into public.contributors(id, slug, display_name, user_id) values
 ('fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf','sod','sod1820','b6ce542a-2b07-4749-8aba-532c886f6de7'),
 ('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86','yaniv-levi','יניב לוי','0b2ffee9-9c2a-4a07-bb74-8091739e27c5'),
 ('e4fc2c19-9669-49e5-9564-d27cc3558f67','shachar-kandro','יצחק שחר קנדרו',null),
 ('99999999-9999-4999-8999-999999999999','other','מישהו אחר','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.channel_ingest_sources(id, channel, chat_id) values ('00000000-0000-4000-8000-0000000000b1','gilui-yomi','100000000000000002@g.us');

\ir ../../supabase/proposed/20261112150000_group_chat_sync_gilui_v1_PROPOSAL.sql

create function ingest(p_contrib uuid, p_text text, p_at timestamptz, p_intake boolean default true, p_media text default null, p_basis text default 'verified_phone_unique') returns uuid language plpgsql as $f$
declare v_id uuid; v_msg text := 'm-' || gen_random_uuid();
begin
  insert into public.channel_updates(channel, text, created_at, group_source_intake_public, contributor_id, ext_msg_id)
    values ('gilui-yomi', p_text, p_at, p_intake, p_contrib, v_msg) returning id into v_id;
  insert into public.channel_update_group_proof(update_id, source_id, channel, ext_msg_id, group_chat_id, identity_contributor_id, identity_basis, text_only, media_kind)
    values (v_id, '00000000-0000-4000-8000-0000000000b1', 'gilui-yomi', v_msg, '100000000000000002@g.us', p_contrib, p_basis, p_media is null, p_media);
  return v_id;
end $f$;

-- 1. disabled channel: nothing is published
select ingest('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86', 'ראשון', '2026-11-12 12:00+00');
select expect((select count(*) from public.research_contributions) = 0, 'disabled channel publishes nothing');

-- 2. enable + backfill: only messages from since_at onward, writers only
update public.group_chat_sync_channels set enabled = true;
select ingest('99999999-9999-4999-8999-999999999999', 'לא כותב מורשה', '2026-11-12 12:01+00');
select ingest('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86', 'ישן מדי', '2026-11-09 12:00+00');
select expect(public.group_chat_sync_pending_v1(50) = 1, 'backfill syncs exactly the one eligible message');
select expect((select count(*) from public.research_contributions where parent_id is null) = 1, 'one daily root');
select expect((select title from public.research_contributions where parent_id is null) = 'גילוי יומי — 12.11.2026', 'root title is the Israel date');
select expect((select count(*) from public.research_contributions where parent_id is not null and author_user_id = '0b2ffee9-9c2a-4a07-bb74-8091739e27c5' and status='approved' and origin='community_2029') = 1, 'Yaniv reply is approved, authored by his account');
select expect(public.group_chat_sync_pending_v1(50) = 0, 'second catch-up is a no-op (idempotent)');

-- 3. live insert: same day -> same root; next Israel day (22:30 UTC is already the next day) -> new root; Kandro has no account
select ingest('fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf', 'שלי', '2026-11-12 12:05+00');
select expect((select count(*) from public.research_contributions where parent_id is null) = 1, 'same day reuses the root');
select ingest('e4fc2c19-9669-49e5-9564-d27cc3558f67', 'קנדרו בלילה', '2026-11-12 22:30+00');
select expect((select count(*) from public.research_contributions where parent_id is null) = 2, 'next Israel day opens a new root');
select expect((select author_user_id is null and author_contributor_id = 'e4fc2c19-9669-49e5-9564-d27cc3558f67' and author_name = 'יצחק שחר קנדרו' from public.research_contributions where body = 'קנדרו בלילה'), 'Kandro reply is authored by his contributor, no account');

-- 4. gates: intake flag off, wrong identity basis, vcard text
select ingest('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86', 'בלי הסכמה', '2026-11-12 13:00+00', false);
select ingest('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86', 'בלי זהות', '2026-11-12 13:01+00', true, null, 'claimed');
select ingest('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86', 'BEGIN:VCARD', '2026-11-12 13:02+00');
select expect((select count(*) from public.research_contributions where body in ('בלי הסכמה','בלי זהות','BEGIN:VCARD')) = 0, 'gates block unconsented / unverified / vcard');

-- 5. censoring identical to the public reader
select ingest('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86', 'ראו https://example.com/x?y=1 וגם yaniv@example.com וטל 050-1234567 ויוטיוב https://youtu.be/dQw4w9WgXcQ?si=abc', '2026-11-12 13:03+00');
select expect((select body from public.research_contributions where body like 'ראו%') = 'ראו [קישור] וגם [דוא״ל] וטל [מספר] ויוטיוב https://youtu.be/dQw4w9WgXcQ', 'text censored like the group reader');

-- 6. media: not published until the public copy exists; the media trigger then publishes it
select ingest('e4fc2c19-9669-49e5-9564-d27cc3558f67', 'תמונה', '2026-11-12 13:10+00', true, 'image') \gset media_
select expect((select count(*) from public.research_contributions where body like 'תמונה%') = 0, 'media waits for the public copy');
insert into storage.objects values ('media', 'sod1820/2029/image/2026/11/x/original.jpg');
insert into public.group_source_public_media values ((select update_id from public.channel_update_group_proof where media_kind='image'), 'image', 'sod1820/2029/image/2026/11/x/original.jpg');
select expect((select body from public.research_contributions where body like 'תמונה%') = E'תמונה\n📷 https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/11/x/original.jpg', 'media message carries the public URL');

-- 7. hold after publish soft-deletes the chat copy; hidden source row too
update public.channel_update_group_proof set held_at = now() where update_id = (select update_id from public.group_chat_sync_map m join public.research_contributions r on r.id = m.contribution_id where r.body = 'שלי');
select expect((select deleted_at is not null from public.research_contributions where body = 'שלי'), 'hold soft-deletes the chat copy');
update public.channel_updates set status = 'hidden' where id = (select update_id from public.group_chat_sync_map m join public.research_contributions r on r.id = m.contribution_id where r.body = 'קנדרו בלילה');
select expect((select deleted_at is not null from public.research_contributions where body = 'קנדרו בלילה'), 'hidden source row soft-deletes the chat copy');

-- 8. a failing chat insert never breaks the ingest
alter table public.research_contributions add constraint boom check (body <> 'פיצוץ');
select ingest('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86', 'פיצוץ', '2026-11-12 14:00+00') is not null as ingest_survived \gset
select expect(:'ingest_survived'::boolean, 'ingest survives a failing sync');
select expect((select count(*) from public.channel_update_group_proof g join public.channel_updates cu on cu.id=g.update_id where cu.text = 'פיצוץ') = 1, 'proof row exists although the chat insert failed');
alter table public.research_contributions drop constraint boom;

-- 9. kill switch
update public.group_chat_sync_channels set enabled = false;
select ingest('d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86', 'אחרי כיבוי', '2026-11-12 14:10+00');
select expect((select count(*) from public.research_contributions where body = 'אחרי כיבוי') = 0, 'kill switch stops publishing');

-- 10. no direct access for anon / authenticated
select expect(not has_function_privilege('anon', 'public.group_chat_sync_update_v1(uuid)', 'execute') and not has_function_privilege('authenticated', 'public.group_chat_sync_pending_v1(integer)', 'execute'), 'sync functions are not callable by clients');

-- 11. rollback file removes triggers and functions
\ir ../../supabase/proposed/20261112150000_group_chat_sync_gilui_v1_ROLLBACK.sql
select expect(to_regprocedure('public.group_chat_sync_update_v1(uuid)') is null and not exists (select 1 from pg_trigger where tgname like 'trg_group_chat_%'), 'rollback removes functions and triggers');
\echo group_chat_sync_v1: OK
