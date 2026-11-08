-- DEF-004 regression for the PROPOSED gallery upload policies, on a DISPOSABLE PostgreSQL (scripts/run-def001-sql-test.sh runs it too).
-- Fixture = the policy set found in production on 2026-11-06 (pg_policy dump), then the proposal is applied.
\set ON_ERROR_STOP on
\set QUIET on
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth; create schema if not exists storage;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
create table public.users (id uuid primary key, role text);
grant usage on schema auth, storage, public to anon, authenticated;
grant select on public.users to authenticated;
insert into public.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'user'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'admin');
create table storage.objects (bucket_id text, name text, primary key (bucket_id, name));
alter table storage.objects enable row level security;
grant select, insert on storage.objects to anon, authenticated;
create policy public_read on storage.objects for select to public using (bucket_id = 'gallery');
create policy community_anon_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = 'community');
create policy public_upload on storage.objects for insert to authenticated with check (bucket_id = 'gallery');
create policy community_authenticated_media_paths_v1 on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'gallery' or name not like 'community/%'
    or (name !~* '\.(mp4|webm|mov)$' and name !~* '^community/[0-9a-f-]{36}/')
    or (auth.uid() is not null and name ~* ('^community/' || auth.uid()::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif|pdf|txt|docx|mp4|webm|mov)$')));

create function pg_temp.try_insert(p_role text, p_uid text, p_name text, p_bucket text default 'gallery') returns boolean language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  perform set_config('test.uid', coalesce(p_uid, ''), true);
  begin
    insert into storage.objects values (p_bucket, p_name);
    reset role; return true;
  exception when insufficient_privilege then reset role; return false;
  end;
end $$;
create function pg_temp.expect(p_ok boolean, p_expected boolean, p_msg text) returns void language plpgsql as $$
begin if p_ok is distinct from p_expected then raise exception 'ASSERTION (expected %): %', p_expected, p_msg; end if; end $$;

-- baseline: the fixture reproduces the exposure
begin;
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/evil.svg'), true, 'BASELINE anon can store an svg under community/');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/payload.html'), true, 'BASELINE anon can store html under community/');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/posts/forged.html'), true, 'BASELINE any user can write anywhere in gallery');
rollback;

\i supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql

begin;
  -- anonymous reporting keeps working for raster images
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000000-a1b2c3.jpg'), true, 'anon flat jpg (ReportHint)');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000001-a1b2c3.PNG'), true, 'anon flat PNG upper-case extension');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000002-a1b2c3.webp'), true, 'anon flat webp');
  -- and nothing else
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000003-a1b2c3.svg'), false, 'anon svg rejected');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000004-a1b2c3.html'), false, 'anon html rejected');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/payload.exe'), false, 'anon exe rejected');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000005-a1b2c3.mp4'), false, 'anon video rejected (restrictive policy still applies)');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000001.png'), false, 'anon account path rejected');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'sod1820/posts/x.jpg'), false, 'anon outside community/ rejected');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/../sod1820/x.jpg'), false, 'path traversal rejected');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000006-a1b2c3.jpg', 'media'), false, 'other buckets are not granted');
rollback;

begin;
  -- signed-in user: every client feature keeps working on its own prefix
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'community/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000002.mp4'), true, 'own community video (communityAttachments.js)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'community/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000003.pdf'), true, 'own community pdf');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'avatars/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1762416000000.png'), true, 'own avatar (ProfileSettings.jsx)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/hints/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/1762416000000-4821.jpg'), true, 'own hint image (hints.js)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/hints/anon/1762416000000-4821.jpg'), true, 'anon-labelled hint folder (hints.js fallback)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/ciphers/c-mst0bx33-kixfu8.png'), true, 'cipher card (TzofenEmbed.jsx)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/hint-thumbs/1762416000000-482100.jpg'), true, 'thumbnail (supabase.js)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'community/1762416000000-a1b2c3.jpg'), true, 'signed-in flat report image');
  -- ...and nothing outside them
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/posts/forged.html'), false, 'user cannot write into editorial paths');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/replaced/1762416000000-1.jpg'), false, 'replace-image path is admin only');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'community/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/10000000-0000-4000-8000-000000000004.png'), false, 'cannot write another user''s community folder');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'avatars/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb-1762416000000.png'), false, 'cannot write another user''s avatar');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'avatars/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1762416000000.svg'), false, 'svg avatar rejected');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/hints/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/1762416000000-1.jpg'), false, 'cannot write another user''s hint folder');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/ciphers/c-x-y.html'), false, 'cipher folder png only');
rollback;

begin;
  -- administrator: unchanged power (admin screens upload anywhere)
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'sod1820/replaced/1762416000000-1.jpg'), true, 'admin replace-image');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'sod1820/posts/new-cover.png'), true, 'admin editorial path');
  -- the restrictive policy still binds admins on community/ videos outside their own folder
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'community/clip.mp4'), false, 'restrictive community video rule still applies');
rollback;
\echo DEF-004 SQL regression: PASS
