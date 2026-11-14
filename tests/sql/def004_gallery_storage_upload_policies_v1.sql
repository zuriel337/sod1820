-- DEF-004 regression for the PROPOSED gallery upload policies, on a DISPOSABLE PostgreSQL only
-- (scripts/run-def004-gallery-sql-test.sh on port 55441; scripts/run-def001-sql-test.sh runs it too, docker or SOD_SQL_TEST_SOCKET_DIR).
-- Fixture = the policy set and bucket settings read from production (pg_policy / storage.buckets) on 2026-11-12, verbatim; then the proposal
-- is applied, rolled back and re-applied. Revision M0 · 12.11.2026 (cluster M0-C): mock storage schema with the live helper functions,
-- service_role, a writer, every upload route of the route map (docs/reviews/m0-security-stabilization-20261112/cluster-C-gallery.md), the 120 MiB
-- bucket ceiling, existing objects untouched, public SELECT unchanged, exact rollback, idempotent re-apply.
-- pg_temp.upload() EMULATES the Storage API order (permission probe as the caller's role -> bucket MIME list -> min(bucket, global) size limit ->
-- completion by the storage role). It is a model of documented behaviour, not Storage itself; the real check is the post-apply plan in the doc.
-- Optional psql variables (used by the runner): def004_negative=1 (an object > 120 MiB must stop the proposal), def004_skip_apply=1 (negative
-- control: the "after" assertions must fail without the proposal). Synthetic identifiers only.
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth; create schema if not exists storage;
-- auth / storage helpers: production definitions (12.11.2026), verbatim.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
create or replace function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[]; begin select string_to_array(name, '/') into _parts; return _parts[1 : array_length(_parts,1) - 1]; end $$;
create or replace function storage.filename(name text) returns text language plpgsql immutable as $$
declare _parts text[]; begin select string_to_array(name, '/') into _parts; return _parts[array_length(_parts, 1)]; end $$;
create or replace function storage.extension(name text) returns text language plpgsql immutable as $$
declare _parts text[]; _filename text; begin select string_to_array(name, '/') into _parts; select _parts[array_length(_parts, 1)] into _filename;
  return reverse(split_part(reverse(_filename), '.', 1)); end $$;
create table public.users (id uuid primary key, role text);
create table public.contributors (id uuid primary key, user_id uuid, kind text);
create table public.authorized_uploaders (user_id uuid);
grant usage on schema auth, storage, public to anon, authenticated, service_role;
grant select on public.users, public.authorized_uploaders to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null,
  owner_id text, metadata jsonb, created_at timestamptz default now());
create unique index bucketid_objname on storage.objects (bucket_id, name);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

-- Production bucket settings (12.11.2026).
insert into storage.buckets values
  ('gallery', 'gallery', true, null, null),
  ('magar', 'magar', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('media', 'media', true, null, null),
  ('submission-inbox', 'submission-inbox', false, 2147483648, array['image/png','image/jpeg','image/webp','image/gif','image/avif','video/mp4',
    'video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg','application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']);
-- Production policy set on storage.objects (12.11.2026, pg_policy), verbatim.
create policy community_anon_upload on storage.objects as permissive for insert to anon, authenticated
  with check ((bucket_id = 'gallery'::text) AND ((storage.foldername(name))[1] = 'community'::text));
create policy community_authenticated_media_paths_v1 on storage.objects as restrictive for insert to anon, authenticated
  with check ((bucket_id <> 'gallery'::text) OR (name !~~ 'community/%'::text) OR ((name !~* '\.(mp4|webm|mov)$'::text) AND (name !~* '^community/[0-9a-f-]{36}/'::text))
    OR ((auth.uid() IS NOT NULL) AND (name ~* (('^community/'::text || (auth.uid())::text) || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif|pdf|txt|docx|mp4|webm|mov)$'::text))));
create policy magar_authorized_delete on storage.objects as permissive for delete to authenticated
  using ((bucket_id = 'magar'::text) AND (auth.uid() IN ( SELECT authorized_uploaders.user_id FROM authorized_uploaders)));
create policy magar_authorized_insert on storage.objects as permissive for insert to authenticated
  with check ((bucket_id = 'magar'::text) AND (auth.uid() IN ( SELECT authorized_uploaders.user_id FROM authorized_uploaders)));
create policy magar_authorized_update on storage.objects as permissive for update to authenticated
  using ((bucket_id = 'magar'::text) AND (auth.uid() IN ( SELECT authorized_uploaders.user_id FROM authorized_uploaders)));
create policy magar_public_read on storage.objects as permissive for select to public using ((bucket_id = 'magar'::text));
create policy public_read on storage.objects as permissive for select to public using ((bucket_id = 'gallery'::text));
create policy public_upload on storage.objects as permissive for insert to authenticated with check ((bucket_id = 'gallery'::text));

-- Actors: U = user, W = writer (contributors.kind = 'writer' bound to a 'user' account), A = admin, M = magar uploader.
insert into public.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'user'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'admin'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'user'), ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'user');
insert into public.contributors values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'writer');
insert into public.authorized_uploaders values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
create temp table actors (label text primary key, role text, uid uuid);
insert into actors values ('anon', 'anon', null), ('nouid', 'authenticated', null), ('user', 'authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('admin', 'authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), ('writer', 'authenticated', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  ('magar', 'authenticated', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'), ('service', 'service_role', null);
set test.global_limit = '5368709120'; -- ASSUMED project global limit (5 GiB): not readable by SQL; production value is read in plan step V0.

-- Existing objects (one per production prefix shape; sizes from the 12.11 aggregates). They must never change.
insert into storage.objects (bucket_id, name, owner_id, metadata) values
  ('gallery', 'sod1820/videos/existing-largest.mp4', null, '{"size":114883491,"mimetype":"video/mp4"}'),
  ('gallery', 'sod1820/videos/existing.vtt', null, '{"size":4100,"mimetype":"text/vtt"}'),
  ('gallery', 'sod1820/videos/existing.html', null, '{"size":2100,"mimetype":"text/html; charset=utf-8"}'),
  ('gallery', 'sod1820/broadcasts/existing.jpg', null, '{"size":44997361,"mimetype":"video/mp4"}'),
  ('gallery', 'sod1820/channel-thumbs/existing.jpg', null, '{"size":178361,"mimetype":"image/jpeg"}'),
  ('gallery', 'Book/existing.pdf', null, '{"size":51714643,"mimetype":"application/pdf"}'),
  ('gallery', 'posts/existing.svg', null, '{"size":9073,"mimetype":"image/svg+xml"}'),
  ('gallery', 'temp/existing.html', null, '{"size":7641,"mimetype":"text/html"}'),
  ('gallery', 'community/existing-legacy.svg', null, '{"size":4000,"mimetype":"image/svg+xml"}'),
  ('gallery', 'community/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000900.mp4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"size":4912011,"mimetype":"video/mp4"}'),
  ('gallery', 'avatars/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1762000000000.png', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"size":3861429,"mimetype":"image/png"}'),
  ('gallery', 'sod1820/ciphers/c-mexist00-abc123.png', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"size":1093393,"mimetype":"image/png"}'),
  ('gallery', 'sod1820/replaced/1762000000000-1.png', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '{"size":126914,"mimetype":"image/png"}'),
  ('media', 'sod1820/2029/video/2026/10/20000000-0000-4000-8000-000000000001/original.mp4', null, '{"size":1288490188,"mimetype":"video/mp4"}'),
  ('magar', 'existing.jpg', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '{"size":200000,"mimetype":"image/jpeg"}');

create function pg_temp.mib(n numeric) returns bigint language sql immutable as $$ select (n * 1048576)::bigint $$;
create function pg_temp.objects_digest() returns text language sql stable as $$
  select md5(string_agg(format('%s|%s|%s|%s|%s', id, bucket_id, name, owner_id, metadata), E'\n' order by bucket_id, name)) from storage.objects $$;
create function pg_temp.policies_digest() returns text language sql stable as $$
  select md5(string_agg(format('%s|%s|%s|%s|%s|%s', p.polname, p.polcmd, p.polpermissive,
           array_to_string(array(select coalesce(r.rolname, 'public') from unnest(p.polroles) x left join pg_roles r on r.oid = x order by 1), ','),
           pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)), E'\n' order by p.polname))
  from pg_policy p where p.polrelid = 'storage.objects'::regclass $$;
create function pg_temp.policy_text(p_name text) returns text language sql stable as $$
  select coalesce(pg_get_expr(polqual, polrelid), '') || '#' || coalesce(pg_get_expr(polwithcheck, polrelid), '')
  from pg_policy where polrelid = 'storage.objects'::regclass and polname = p_name $$;
create function pg_temp.buckets_digest(p_except text default '') returns text language sql stable as $$
  select md5(string_agg(format('%s|%s|%s|%s', id, public, file_size_limit, allowed_mime_types), E'\n' order by id)) from storage.buckets where id <> p_except $$;
create function pg_temp.expect(p_ok boolean, p_expected boolean, p_msg text) returns void language plpgsql as $$
begin if p_ok is distinct from p_expected then raise exception 'ASSERTION (expected %): %', p_expected, p_msg; end if; end $$;
-- 06.11 helper (kept for the original assertions): a bare INSERT as the given role, no size/MIME modelling.
create function pg_temp.try_insert(p_role text, p_uid text, p_name text, p_bucket text default 'gallery') returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', p_role, 'sub', nullif(coalesce(p_uid, ''), ''))::text, true);
  execute format('set local role %I', p_role);
  begin
    insert into storage.objects (bucket_id, name) values (p_bucket, p_name);
    reset role; return true;
  exception when insufficient_privilege then reset role; return false;
  end;
end $$;
-- Storage API model: '200' stored, '403' AccessDenied (RLS), '409' already exists, '413' EntityTooLarge, '415' InvalidMimeType, '404' no bucket.
create function pg_temp.upload(p_actor text, p_bucket text, p_name text, p_size bigint, p_mime text, p_upsert boolean default false)
returns text language plpgsql as $$
declare a record; b record; v_global bigint := current_setting('test.global_limit')::bigint;
begin
  select * into a from pg_temp.actors where label = p_actor;
  if not found then raise exception 'unknown actor %', p_actor; end if;
  select * into b from storage.buckets where id = p_bucket;
  if not found then return '404'; end if;
  begin -- (1) permission probe as the caller (rolled back), like Storage's canUpload; upsert probes INSERT .. ON CONFLICT DO UPDATE
    perform set_config('request.jwt.claims', json_build_object('role', a.role, 'sub', a.uid)::text, true);
    execute format('set local role %I', a.role);
    if p_upsert then
      insert into storage.objects (bucket_id, name, owner_id) values (p_bucket, p_name, a.uid::text)
        on conflict (bucket_id, name) do update set owner_id = excluded.owner_id;
    else
      insert into storage.objects (bucket_id, name, owner_id) values (p_bucket, p_name, a.uid::text);
    end if;
    raise exception using errcode = 'P0004';
  exception
    when insufficient_privilege then return '403';
    when unique_violation then return '409';
    when sqlstate 'P0004' then null;
  end;
  if b.allowed_mime_types is not null and not exists (select 1 from unnest(b.allowed_mime_types) m
      where m = split_part(p_mime, ';', 1) or (m like '%/*' and split_part(m, '/', 1) = split_part(p_mime, '/', 1))) then return '415'; end if;
  if p_size > least(coalesce(b.file_size_limit, v_global), v_global) then return '413'; end if;
  insert into storage.objects (bucket_id, name, owner_id, metadata) values (p_bucket, p_name, a.uid::text, jsonb_build_object('size', p_size, 'mimetype', p_mime))
    on conflict (bucket_id, name) do update set owner_id = excluded.owner_id, metadata = excluded.metadata;
  return '200';
end $$;

-- Route matrix. {U} {W} {A} = account ids of user / writer / admin. Every case runs alone and is rolled back.
create temp table cases (ord serial, phase text, route text, actor text, bucket text, name text, size bigint, mime text, upsert boolean, expected text);
insert into cases (phase, route, actor, bucket, name, size, mime, upsert, expected) values
-- BEFORE = production today (also re-checked after the rollback)
  ('before', 'R1 report image', 'anon', 'gallery', 'community/1762900000000-a1b2c3.jpg', pg_temp.mib(3), 'image/jpeg', false, '200'),
  ('before', 'R1 exposure: anon svg', 'anon', 'gallery', 'community/1762900000001-a1b2c3.svg', 4000, 'image/svg+xml', false, '200'),
  ('before', 'R1 exposure: anon 600 MiB html', 'anon', 'gallery', 'community/payload.html', pg_temp.mib(600), 'text/html', false, '200'),
  ('before', 'R1 anon flat video', 'anon', 'gallery', 'community/1762900000002-a1b2c3.mp4', pg_temp.mib(5), 'video/mp4', false, '403'),
  ('before', 'R1 anon outside community', 'anon', 'gallery', 'sod1820/posts/x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('before', 'R2 own video', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000001.mp4', pg_temp.mib(40), 'video/mp4', false, '200'),
  ('before', 'R3 own avatar', 'user', 'gallery', 'avatars/{U}-1762900000000.png', pg_temp.mib(2), 'image/png', false, '200'),
  ('before', 'R3 overwrite existing avatar (no UPDATE policy)', 'user', 'gallery', 'avatars/{U}-1762000000000.png', pg_temp.mib(2), 'image/png', true, '403'),
  ('before', 'R3 same name again', 'user', 'gallery', 'avatars/{U}-1762000000000.png', pg_temp.mib(2), 'image/png', false, '409'),
  ('before', 'R4 cipher card', 'user', 'gallery', 'sod1820/ciphers/c-mhx1a2b3-k9z8y7.png', pg_temp.mib(1), 'image/png', false, '200'),
  ('before', 'R5 hint image', 'user', 'gallery', 'sod1820/hints/{U}/1762900000000-4821.jpg', pg_temp.mib(1), 'image/jpeg', false, '200'),
  ('before', 'R6 poster thumb', 'user', 'gallery', 'sod1820/channel-thumbs/1762900000000-482100.jpg', 90000, 'image/jpeg', false, '200'),
  ('before', 'R7 replace image (upsert, new name)', 'user', 'gallery', 'sod1820/replaced/1762900000000-2.png', pg_temp.mib(1), 'image/png', true, '200'),
  ('before', 'exposure: user editorial html', 'user', 'gallery', 'sod1820/posts/forged.html', 2000, 'text/html', false, '200'),
  ('before', 'exposure: user 1 GiB anywhere', 'user', 'gallery', 'Book/huge.pdf', pg_temp.mib(1024), 'application/pdf', false, '200'),
  ('before', 'exposure: writer editorial path', 'writer', 'gallery', 'posts/forged.png', pg_temp.mib(1), 'image/png', false, '200'),
  ('before', 'R8 admin 200 MiB video (no ceiling)', 'admin', 'gallery', 'sod1820/videos/new-200mib.mp4', pg_temp.mib(200), 'video/mp4', false, '200'),
  ('before', 'R9 service vtt', 'service', 'gallery', 'sod1820/posts/agent-new.vtt', 4000, 'text/vtt', false, '200'),
  ('before', 'R10 gateway: admin 1.5 GiB into media', 'service', 'media', 'sod1820/2029/video/2026/11/20000000-0000-4000-8000-000000000002/original.mp4', pg_temp.mib(1536), 'video/mp4', false, '200'),
  ('before', 'R10 user direct into media', 'user', 'media', 'x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('before', 'R10 submission 1 GiB', 'service', 'submission-inbox', 'sod1820/2029/accounts/{W}/2026/11/30000000-0000-4000-8000-000000000001/video/original.mp4', pg_temp.mib(1024), 'video/mp4', false, '200'),
  ('before', 'R10 submission 3 GiB', 'service', 'submission-inbox', 'sod1820/2029/accounts/{W}/2026/11/30000000-0000-4000-8000-000000000002/video/original.mp4', pg_temp.mib(3072), 'video/mp4', false, '413'),
  ('before', 'R10 submission html', 'service', 'submission-inbox', 'sod1820/2029/accounts/{W}/2026/11/30000000-0000-4000-8000-000000000003/document/original.html', 2000, 'text/html', false, '415'),
  ('before', 'R11 magar uploader', 'magar', 'magar', 'new.jpg', pg_temp.mib(3), 'image/jpeg', false, '200'),
  ('before', 'R11 magar 11 MiB', 'magar', 'magar', 'big.jpg', pg_temp.mib(11), 'image/jpeg', false, '413'),
  ('before', 'R11 magar html', 'magar', 'magar', 'x.html', 2000, 'text/html', false, '415'),
  ('before', 'R11 magar other user', 'user', 'magar', 'x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
-- AFTER = with the proposal
  -- R1 ReportHint flat image (anon and signed-in)
  ('after', 'R1 jpg', 'anon', 'gallery', 'community/1762900000000-a1b2c3.jpg', pg_temp.mib(3), 'image/jpeg', false, '200'),
  ('after', 'R1 jpeg', 'anon', 'gallery', 'community/1762900000003-a1b2c3.jpeg', pg_temp.mib(3), 'image/jpeg', false, '200'),
  ('after', 'R1 PNG upper case', 'anon', 'gallery', 'community/1762900000004-a1b2c3.PNG', pg_temp.mib(3), 'image/png', false, '200'),
  ('after', 'R1 webp', 'anon', 'gallery', 'community/1762900000005-a1b2c3.webp', pg_temp.mib(3), 'image/webp', false, '200'),
  ('after', 'R1 gif', 'anon', 'gallery', 'community/1762900000006-a1b2c3.gif', pg_temp.mib(3), 'image/gif', false, '200'),
  ('after', 'R1 avif', 'anon', 'gallery', 'community/1762900000007-a1b2c3.avif', pg_temp.mib(3), 'image/avif', false, '200'),
  ('after', 'R1 exactly 120 MiB', 'anon', 'gallery', 'community/1762900000008-a1b2c3.jpg', pg_temp.mib(120), 'image/jpeg', false, '200'),
  ('after', 'R1 120 MiB + 1 byte', 'anon', 'gallery', 'community/1762900000009-a1b2c3.jpg', pg_temp.mib(120) + 1, 'image/jpeg', false, '413'),
  ('after', 'R1 signed-in reporter', 'user', 'gallery', 'community/1762900000010-a1b2c3.jpg', pg_temp.mib(3), 'image/jpeg', false, '200'),
  ('after', 'R1 svg', 'anon', 'gallery', 'community/1762900000011-a1b2c3.svg', 4000, 'image/svg+xml', false, '403'),
  ('after', 'R1 html', 'anon', 'gallery', 'community/1762900000012-a1b2c3.html', 4000, 'text/html', false, '403'),
  ('after', 'R1 heic (not a web image)', 'anon', 'gallery', 'community/1762900000013-a1b2c3.heic', pg_temp.mib(3), 'image/heic', false, '403'),
  ('after', 'R1 free name', 'anon', 'gallery', 'community/payload.html', pg_temp.mib(1), 'text/html', false, '403'),
  ('after', 'R1 anon video', 'anon', 'gallery', 'community/1762900000014-a1b2c3.mp4', pg_temp.mib(5), 'video/mp4', false, '403'),
  ('after', 'R1 anon pdf', 'anon', 'gallery', 'community/1762900000015-a1b2c3.pdf', pg_temp.mib(1), 'application/pdf', false, '403'),
  ('after', 'R1 anon account path', 'anon', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000101.png', pg_temp.mib(1), 'image/png', false, '403'),
  ('after', 'R1 anon outside community', 'anon', 'gallery', 'sod1820/posts/x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('after', 'R1 traversal', 'anon', 'gallery', 'community/../sod1820/x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('after', 'R1 nested folder', 'anon', 'gallery', 'community/x/1762900000016-a1b2c3.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  -- R2 community attachments (user and writer): image, document, video
  ('after', 'R2 jpg', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000201.jpg', pg_temp.mib(7), 'image/jpeg', false, '200'),
  ('after', 'R2 jpeg', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000202.jpeg', pg_temp.mib(7), 'image/jpeg', false, '200'),
  ('after', 'R2 png', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000203.png', pg_temp.mib(7), 'image/png', false, '200'),
  ('after', 'R2 webp', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000204.webp', pg_temp.mib(7), 'image/webp', false, '200'),
  ('after', 'R2 gif', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000205.gif', pg_temp.mib(7), 'image/gif', false, '200'),
  ('after', 'R2 pdf', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000206.pdf', pg_temp.mib(7), 'application/pdf', false, '200'),
  ('after', 'R2 txt', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000207.txt', 9000, 'text/plain', false, '200'),
  ('after', 'R2 docx', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000208.docx', pg_temp.mib(7), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', false, '200'),
  ('after', 'R2 mp4 50 MB', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000209.mp4', 52428800, 'video/mp4', false, '200'),
  ('after', 'R2 webm', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000210.webm', pg_temp.mib(30), 'video/webm', false, '200'),
  ('after', 'R2 mov', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000211.mov', pg_temp.mib(30), 'video/quicktime', false, '200'),
  ('after', 'R2 writer png', 'writer', 'gallery', 'community/{W}/10000000-0000-4000-8000-000000000212.png', pg_temp.mib(2), 'image/png', false, '200'),
  ('after', 'R2 writer docx', 'writer', 'gallery', 'community/{W}/10000000-0000-4000-8000-000000000213.docx', pg_temp.mib(2), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', false, '200'),
  ('after', 'R2 writer mp4', 'writer', 'gallery', 'community/{W}/10000000-0000-4000-8000-000000000214.mp4', pg_temp.mib(45), 'video/mp4', false, '200'),
  ('after', 'R2 video 120 MiB + 1', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000215.mp4', pg_temp.mib(120) + 1, 'video/mp4', false, '413'),
  ('after', 'R2 html', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000216.html', 2000, 'text/html', false, '403'),
  ('after', 'R2 svg', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000217.svg', 2000, 'image/svg+xml', false, '403'),
  ('after', 'R2 avif (not in the community policy)', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000218.avif', 2000, 'image/avif', false, '403'),
  ('after', 'R2 zip', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000219.zip', 2000, 'application/zip', false, '403'),
  ('after', 'R2 foreign folder', 'user', 'gallery', 'community/{W}/10000000-0000-4000-8000-000000000220.png', 2000, 'image/png', false, '403'),
  ('after', 'R2 not a uuid', 'user', 'gallery', 'community/{U}/photo.png', 2000, 'image/png', false, '403'),
  ('after', 'R2 nested', 'user', 'gallery', 'community/{U}/x/10000000-0000-4000-8000-000000000221.png', 2000, 'image/png', false, '403'),
  ('after', 'R2 no verified uid', 'nouid', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000222.png', 2000, 'image/png', false, '403'),
  ('after', 'R2 overwrite own existing video', 'user', 'gallery', 'community/{U}/10000000-0000-4000-8000-000000000900.mp4', pg_temp.mib(1), 'video/mp4', true, '403'),
  -- R3 avatars (user and writer); replacement is a new name, never an overwrite
  ('after', 'R3 png', 'user', 'gallery', 'avatars/{U}-1762900000000.png', pg_temp.mib(4), 'image/png', false, '200'),
  ('after', 'R3 jpg', 'user', 'gallery', 'avatars/{U}-1762900000001.jpg', pg_temp.mib(4), 'image/jpeg', false, '200'),
  ('after', 'R3 jpeg', 'user', 'gallery', 'avatars/{U}-1762900000002.jpeg', pg_temp.mib(4), 'image/jpeg', false, '200'),
  ('after', 'R3 webp', 'user', 'gallery', 'avatars/{U}-1762900000003.webp', pg_temp.mib(4), 'image/webp', false, '200'),
  ('after', 'R3 gif', 'user', 'gallery', 'avatars/{U}-1762900000004.gif', pg_temp.mib(4), 'image/gif', false, '200'),
  ('after', 'R3 avif', 'user', 'gallery', 'avatars/{U}-1762900000005.avif', pg_temp.mib(4), 'image/avif', false, '200'),
  ('after', 'R3 writer avatar', 'writer', 'gallery', 'avatars/{W}-1762900000000.jpg', pg_temp.mib(4), 'image/jpeg', false, '200'),
  ('after', 'R3 120 MiB + 1', 'user', 'gallery', 'avatars/{U}-1762900000006.png', pg_temp.mib(120) + 1, 'image/png', false, '413'),
  ('after', 'R3 svg', 'user', 'gallery', 'avatars/{U}-1762900000007.svg', 2000, 'image/svg+xml', false, '403'),
  ('after', 'R3 foreign avatar', 'user', 'gallery', 'avatars/{W}-1762900000008.png', 2000, 'image/png', false, '403'),
  ('after', 'R3 anon', 'anon', 'gallery', 'avatars/{U}-1762900000009.png', 2000, 'image/png', false, '403'),
  ('after', 'R3 overwrite existing avatar', 'user', 'gallery', 'avatars/{U}-1762000000000.png', pg_temp.mib(2), 'image/png', true, '403'),
  ('after', 'R3 same name again', 'user', 'gallery', 'avatars/{U}-1762000000000.png', pg_temp.mib(2), 'image/png', false, '409'),
  -- R4 cipher card
  ('after', 'R4 png', 'user', 'gallery', 'sod1820/ciphers/c-mhx1a2b3-k9z8y7.png', pg_temp.mib(1), 'image/png', false, '200'),
  ('after', 'R4 writer png', 'writer', 'gallery', 'sod1820/ciphers/c-mhx1a2b4-k9z8y7.png', pg_temp.mib(1), 'image/png', false, '200'),
  ('after', 'R4 html', 'user', 'gallery', 'sod1820/ciphers/c-x-y.html', 2000, 'text/html', false, '403'),
  ('after', 'R4 anon', 'anon', 'gallery', 'sod1820/ciphers/c-mhx1a2b5-k9z8y7.png', pg_temp.mib(1), 'image/png', false, '403'),
  -- R5 / R6 / R7 dormant or admin helpers: admin only
  ('after', 'R5 user own hint', 'user', 'gallery', 'sod1820/hints/{U}/1762900000000-4821.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('after', 'R5 user shared anon hint folder', 'user', 'gallery', 'sod1820/hints/anon/1762900000000-4821.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('after', 'R5 admin hint', 'admin', 'gallery', 'sod1820/hints/{A}/1762900000000-4821.jpg', pg_temp.mib(1), 'image/jpeg', false, '200'),
  ('after', 'R6 user broadcast thumb', 'user', 'gallery', 'sod1820/broadcast-thumbs/1762900000000-482100.jpg', 90000, 'image/jpeg', false, '403'),
  ('after', 'R6 user into backend channel-thumbs', 'user', 'gallery', 'sod1820/channel-thumbs/1762900000000-482100.jpg', 90000, 'image/jpeg', false, '403'),
  ('after', 'R6 admin thumb', 'admin', 'gallery', 'sod1820/broadcast-thumbs/1762900000000-482100.jpg', 90000, 'image/jpeg', false, '200'),
  ('after', 'R7 user replace image', 'user', 'gallery', 'sod1820/replaced/1762900000000-2.png', pg_temp.mib(1), 'image/png', true, '403'),
  ('after', 'R7 admin replace image (upsert, new name)', 'admin', 'gallery', 'sod1820/replaced/1762900000000-2.png', pg_temp.mib(1), 'image/png', true, '200'),
  ('after', 'R7 admin cannot overwrite an existing file', 'admin', 'gallery', 'sod1820/replaced/1762000000000-1.png', pg_temp.mib(1), 'image/png', true, '403'),
  -- R8 admin: any path, any type, up to the ceiling; the restrictive community video rule is unchanged
  ('after', 'R8 admin svg in posts', 'admin', 'gallery', 'posts/new.svg', 9000, 'image/svg+xml', false, '200'),
  ('after', 'R8 admin html in temp', 'admin', 'gallery', 'temp/new.html', 7000, 'text/html', false, '200'),
  ('after', 'R8 admin book pdf', 'admin', 'gallery', 'Book/new.pdf', pg_temp.mib(49), 'application/pdf', false, '200'),
  ('after', 'R8 admin docx', 'admin', 'gallery', 'sod1820/new.docx', pg_temp.mib(4), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', false, '200'),
  ('after', 'R8 admin audio', 'admin', 'gallery', 'sod1820/videos/new.m4a', pg_temp.mib(30), 'audio/mp4', false, '200'),
  ('after', 'R8 admin vtt', 'admin', 'gallery', 'sod1820/videos/new.vtt', 4000, 'text/vtt', false, '200'),
  ('after', 'R8 admin 110 MiB video', 'admin', 'gallery', 'sod1820/videos/new-110mib.mp4', pg_temp.mib(110), 'video/mp4', false, '200'),
  ('after', 'R8 admin exactly 120 MiB', 'admin', 'gallery', 'sod1820/videos/new-120mib.mp4', pg_temp.mib(120), 'video/mp4', false, '200'),
  ('after', 'R8 admin 120 MiB + 1 in gallery (use R10)', 'admin', 'gallery', 'sod1820/videos/new-121mib.mp4', pg_temp.mib(120) + 1, 'video/mp4', false, '413'),
  ('after', 'R8 admin replies path', 'admin', 'gallery', 'sod1820/replies/r-mhx1a2b3-abcde.jpg', pg_temp.mib(1), 'image/jpeg', false, '200'),
  ('after', 'R8 admin own community video', 'admin', 'gallery', 'community/{A}/10000000-0000-4000-8000-000000000301.mp4', pg_temp.mib(40), 'video/mp4', false, '200'),
  ('after', 'R8 admin flat community video (restrictive, as today)', 'admin', 'gallery', 'community/clip.mp4', pg_temp.mib(5), 'video/mp4', false, '403'),
  -- users and writers outside their paths
  ('after', 'user editorial html', 'user', 'gallery', 'sod1820/posts/forged.html', 2000, 'text/html', false, '403'),
  ('after', 'user posts', 'user', 'gallery', 'posts/forged.png', pg_temp.mib(1), 'image/png', false, '403'),
  ('after', 'user book', 'user', 'gallery', 'Book/x.pdf', pg_temp.mib(1), 'application/pdf', false, '403'),
  ('after', 'user video folder', 'user', 'gallery', 'sod1820/videos/x.mp4', pg_temp.mib(1), 'video/mp4', false, '403'),
  ('after', 'user replies (historic)', 'user', 'gallery', 'sod1820/replies/r-mhx1a2b3-abcde.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('after', 'user root file', 'user', 'gallery', 'x.txt', 10, 'text/plain', false, '403'),
  ('after', 'writer posts', 'writer', 'gallery', 'posts/forged.png', pg_temp.mib(1), 'image/png', false, '403'),
  ('after', 'writer editorial', 'writer', 'gallery', 'sod1820/posts/x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('after', 'writer 1 GiB', 'writer', 'gallery', 'Book/huge.pdf', pg_temp.mib(1024), 'application/pdf', false, '403'),
  ('after', 'no verified uid anywhere', 'nouid', 'gallery', 'sod1820/posts/x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  -- R9 service-role pipelines (RLS bypass) still write any type; only the ceiling binds them in gallery
  ('after', 'R9 service jpg', 'service', 'gallery', 'sod1820/posts/agent-new.jpg', pg_temp.mib(3), 'image/jpeg', false, '200'),
  ('after', 'R9 service vtt', 'service', 'gallery', 'sod1820/posts/agent-new.vtt', 4000, 'text/vtt', false, '200'),
  ('after', 'R9 service html', 'service', 'gallery', 'posts/new.html', 20000, 'text/html; charset=utf-8', false, '200'),
  ('after', 'R9 service exactly 120 MiB', 'service', 'gallery', 'sod1820/videos/svc-120mib.mp4', pg_temp.mib(120), 'video/mp4', false, '200'),
  ('after', 'R9 service 120 MiB + 1 in gallery', 'service', 'gallery', 'sod1820/videos/svc-121mib.mp4', pg_temp.mib(120) + 1, 'video/mp4', false, '413'),
  -- R10 the existing gateway: admin large files into media, submissions into submission-inbox (unchanged)
  ('after', 'R10 gateway: admin 1.5 GiB video into media', 'service', 'media', 'sod1820/2029/video/2026/11/20000000-0000-4000-8000-000000000002/original.mp4', pg_temp.mib(1536), 'video/mp4', false, '200'),
  ('after', 'R10 gateway: admin 400 MiB audio into media', 'service', 'media', 'sod1820/2029/audio/2026/11/20000000-0000-4000-8000-000000000003/original.mp3', pg_temp.mib(400), 'audio/mpeg', false, '200'),
  ('after', 'R10 gateway: admin 200 MiB document into media', 'service', 'media', 'sod1820/2029/document/2026/11/20000000-0000-4000-8000-000000000004/original.pdf', pg_temp.mib(200), 'application/pdf', false, '200'),
  ('after', 'R10 user direct into media', 'user', 'media', 'x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  ('after', 'R10 writer submission 1 GiB', 'service', 'submission-inbox', 'sod1820/2029/contributors/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/2026/11/30000000-0000-4000-8000-000000000001/video/original.mp4', pg_temp.mib(1024), 'video/mp4', false, '200'),
  ('after', 'R10 submission 3 GiB', 'service', 'submission-inbox', 'sod1820/2029/accounts/{U}/2026/11/30000000-0000-4000-8000-000000000002/video/original.mp4', pg_temp.mib(3072), 'video/mp4', false, '413'),
  ('after', 'R10 submission html', 'service', 'submission-inbox', 'sod1820/2029/accounts/{U}/2026/11/30000000-0000-4000-8000-000000000003/document/original.html', 2000, 'text/html', false, '415'),
  ('after', 'R10 user direct into submission-inbox', 'user', 'submission-inbox', 'sod1820/2029/accounts/{U}/x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403'),
  -- R11 magar unchanged
  ('after', 'R11 magar uploader', 'magar', 'magar', 'new.jpg', pg_temp.mib(3), 'image/jpeg', false, '200'),
  ('after', 'R11 magar 11 MiB', 'magar', 'magar', 'big.jpg', pg_temp.mib(11), 'image/jpeg', false, '413'),
  ('after', 'R11 magar html', 'magar', 'magar', 'x.html', 2000, 'text/html', false, '415'),
  ('after', 'R11 magar other user', 'user', 'magar', 'x.jpg', pg_temp.mib(1), 'image/jpeg', false, '403');

create function pg_temp.run_cases(p_phase text) returns integer language plpgsql as $$
declare c record; v text; v_name text; n integer := 0; failures text := '';
begin
  for c in select * from pg_temp.cases where phase = p_phase order by ord loop
    v_name := replace(replace(replace(c.name, '{U}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), '{A}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), '{W}', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    begin
      v := pg_temp.upload(c.actor, c.bucket, v_name, c.size, c.mime, c.upsert);
      raise exception using errcode = 'P0003';
    exception when sqlstate 'P0003' then null;
    end;
    if v is distinct from c.expected then
      failures := failures || format(E'\n  [%s] %s: %s %s/%s (%s bytes, %s, upsert=%s) expected %s, got %s',
        p_phase, c.route, c.actor, c.bucket, v_name, c.size, c.mime, c.upsert, c.expected, v);
    end if;
    n := n + 1;
  end loop;
  if failures <> '' then raise exception 'ASSERTION failures:%', failures; end if;
  return n;
end $$;
create function pg_temp.anon_can_read_all() returns boolean language plpgsql as $$
declare v_total bigint; v_seen bigint;
begin
  select count(*) into v_total from storage.objects where bucket_id in ('gallery', 'magar');
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into v_seen from storage.objects where bucket_id in ('gallery', 'magar');
  reset role;
  return v_total = v_seen and v_total > 0;
end $$;

-- Snapshot of production state before anything is applied.
create temp table snap as select pg_temp.objects_digest() as objects, pg_temp.policies_digest() as policies, pg_temp.buckets_digest() as buckets,
  pg_temp.buckets_digest('gallery') as other_buckets, pg_temp.policy_text('public_read') as public_read,
  pg_temp.policy_text('community_authenticated_media_paths_v1') as restrictive;

-- baseline: the fixture reproduces the exposure (06.11 assertions)
begin;
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/evil.svg'), true, 'BASELINE anon can store an svg under community/');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/payload.html'), true, 'BASELINE anon can store html under community/');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/posts/forged.html'), true, 'BASELINE any user can write anywhere in gallery');
rollback;
select pg_temp.run_cases('before') as n \gset before_
\echo DEF-004 before: :before_n route cases match production behaviour
select pg_temp.expect(pg_temp.anon_can_read_all(), true, 'BEFORE public read of gallery and magar');

\if :{?def004_drift}
  -- Drift mode (foundation package, 14.11.2026): the catalogue fingerprint guard. A policy the proposal drops was edited: the apply refuses and
  -- changes nothing; with the drift reverted the same file applies; a later change after the apply makes the exact rollback refuse.
  alter policy public_upload on storage.objects with check (((bucket_id = 'gallery'::text) AND true));
  \set ON_ERROR_STOP off
  \i supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql
  \set ON_ERROR_STOP on
  select pg_temp.expect(exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polname = 'community_anon_upload')
    and not exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polname = 'gallery_admin_upload_v1')
    and (select file_size_limit from storage.buckets where id = 'gallery') is null, true, 'DRIFT: the apply refused and changed nothing');
  alter policy public_upload on storage.objects with check ((bucket_id = 'gallery'::text));
  \i supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql
  select pg_temp.expect(exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polname = 'gallery_admin_upload_v1')
    and (select file_size_limit from storage.buckets where id = 'gallery') = 125829120, true, 'DRIFT: with the drift reverted the same file applies');
  alter policy gallery_flat_image_upload_v1 on storage.objects with check ((bucket_id = 'gallery'::text));
  \set ON_ERROR_STOP off
  \i supabase/proposed/ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql
  \set ON_ERROR_STOP on
  select pg_temp.expect(exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polname = 'gallery_admin_upload_v1')
    and not exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polname = 'public_upload'), true, 'DRIFT: the rollback refused after a later change and changed nothing');
  \echo DEF-004 drift: the apply and the rollback refuse on a drifted catalogue and change nothing
  \q
\endif
\if :{?def004_negative}
  -- Negative mode: a gallery object above 120 MiB must stop the proposal before any change.
  insert into storage.objects (bucket_id, name, metadata) values ('gallery', 'sod1820/videos/oversized.mp4', '{"size":136314880,"mimetype":"video/mp4"}');
  \i supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql
  \echo DEF-004 NEGATIVE: the precondition did not fire
  select 1 / 0;
\endif
\if :{?def004_skip_apply}
  \echo DEF-004 negative control: proposal NOT applied, the after assertions must fail
\else
  \i supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql
\endif

-- 06.11 assertions, kept. Three expectations flipped by the M0 revision (dormant helpers are admin-only now), marked "M0".
begin;
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000000-a1b2c3.jpg'), true, 'anon flat jpg (ReportHint)');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000001-a1b2c3.PNG'), true, 'anon flat PNG upper-case extension');
  select pg_temp.expect(pg_temp.try_insert('anon', null, 'community/1762416000002-a1b2c3.webp'), true, 'anon flat webp');
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
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'community/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000002.mp4'), true, 'own community video (communityAttachments.js)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'community/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000003.pdf'), true, 'own community pdf');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'avatars/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1762416000000.png'), true, 'own avatar (ProfileSettings.jsx)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/hints/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/1762416000000-4821.jpg'), false, 'M0: own hint image is admin-only (uploadHintImage has no caller)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/hints/anon/1762416000000-4821.jpg'), false, 'M0: shared anon hint folder no longer writable by every account');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/ciphers/c-mst0bx33-kixfu8.png'), true, 'cipher card (TzofenEmbed.jsx)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/hint-thumbs/1762416000000-482100.jpg'), false, 'M0: thumbnail path is admin-only (captureAndUploadPoster has no live caller)');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'community/1762416000000-a1b2c3.jpg'), true, 'signed-in flat report image');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/posts/forged.html'), false, 'user cannot write into editorial paths');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/replaced/1762416000000-1.jpg'), false, 'replace-image path is admin only');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'community/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/10000000-0000-4000-8000-000000000004.png'), false, 'cannot write another user''s community folder');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'avatars/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb-1762416000000.png'), false, 'cannot write another user''s avatar');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'avatars/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1762416000000.svg'), false, 'svg avatar rejected');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/hints/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/1762416000000-1.jpg'), false, 'cannot write another user''s hint folder');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sod1820/ciphers/c-x-y.html'), false, 'cipher folder png only');
rollback;
begin;
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'sod1820/replaced/1762416000000-1.jpg'), true, 'admin replace-image');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'sod1820/posts/new-cover.png'), true, 'admin editorial path');
  select pg_temp.expect(pg_temp.try_insert('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'community/clip.mp4'), false, 'restrictive community video rule still applies');
rollback;

-- M0 route matrix and state checks after the proposal.
select pg_temp.run_cases('after') as n \gset after_
\echo DEF-004 after: :after_n route cases (image, video and file, every route, every actor)
create temp table applied as select pg_temp.policies_digest() as policies;
select pg_temp.expect((select objects from snap) = pg_temp.objects_digest(), true, 'existing objects untouched (ids, names, owners, metadata)');
select pg_temp.expect((select public_read from snap) = pg_temp.policy_text('public_read'), true, 'public_read unchanged');
select pg_temp.expect((select restrictive from snap) = pg_temp.policy_text('community_authenticated_media_paths_v1'), true, 'restrictive community policy unchanged');
select pg_temp.expect((select other_buckets from snap) = pg_temp.buckets_digest('gallery'), true, 'magar, media, submission-inbox unchanged');
select pg_temp.expect(pg_temp.anon_can_read_all(), true, 'AFTER public read of every existing gallery and magar object');
select pg_temp.expect((select file_size_limit = 125829120 and allowed_mime_types is null and public from storage.buckets where id = 'gallery'), true, 'gallery: 120 MiB, no MIME list, public');
select pg_temp.expect(125829120 > (select max((metadata->>'size')::bigint) from storage.objects where bucket_id = 'gallery'), true, 'ceiling above every existing object');
select pg_temp.expect((select array_agg(polname::text order by polname) from pg_policy where polrelid = 'storage.objects'::regclass and polcmd = 'a')
  = array['community_authenticated_media_paths_v1','gallery_admin_upload_v1','gallery_client_upload_scoped_v1','gallery_flat_image_upload_v1','magar_authorized_insert'], true, 'exact INSERT policy set');
select pg_temp.expect(not exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polcmd in ('w', 'd', '*')
  and coalesce(pg_get_expr(polqual, polrelid), '') || coalesce(pg_get_expr(polwithcheck, polrelid), '') like '%''gallery''%'), true, 'no UPDATE/DELETE for gallery');

-- Exact rollback, then the production behaviour returns; then re-apply twice (idempotent).
\i supabase/proposed/ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql
select pg_temp.expect((select policies from snap) = pg_temp.policies_digest(), true, 'ROLLBACK restores the 12.11 policy set exactly');
select pg_temp.expect((select buckets from snap) = pg_temp.buckets_digest(), true, 'ROLLBACK restores every bucket setting (gallery NULL limits)');
select pg_temp.expect((select objects from snap) = pg_temp.objects_digest(), true, 'ROLLBACK leaves existing objects untouched');
select pg_temp.expect(pg_temp.policy_text('community_anon_upload') = '#((bucket_id = ''gallery''::text) AND ((storage.foldername(name))[1] = ''community''::text))', true, 'community_anon_upload verbatim');
select pg_temp.expect(pg_temp.policy_text('public_upload') = '#(bucket_id = ''gallery''::text)', true, 'public_upload verbatim');
select pg_temp.run_cases('before') as n \gset rollback_
\echo DEF-004 rollback: :rollback_n route cases back to production behaviour
\i supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql
\i supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql
select pg_temp.expect((select policies from applied) = pg_temp.policies_digest(), true, 're-apply is idempotent');
select pg_temp.run_cases('after') as n \gset reapply_
select pg_temp.expect((select objects from snap) = pg_temp.objects_digest(), true, 'existing objects untouched after rollback and re-apply');
\echo DEF-004 SQL regression: PASS
