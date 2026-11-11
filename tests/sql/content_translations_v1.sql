-- Acceptance tests for supabase/proposed/content_translations_v1_PROPOSAL.sql. THROWAWAY local Postgres only
-- (scripts/run-content-translations-sql-test.sh). Synthetic data. Never a live project. Mirrors live roles + posts RLS (anon/authenticated «טיוטה» policies).
\set ON_ERROR_STOP on
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create table public.posts (id bigint generated always as identity primary key, title text, excerpt text, content text, tags text[], author text);
alter table public.posts enable row level security;
create policy posts_anon_read on public.posts for select to anon using (not (coalesce(tags, '{}'::text[]) && array['טיוטה']));
create policy posts_auth_read on public.posts for select to authenticated using (not (coalesce(tags, '{}'::text[]) && array['טיוטה']));
grant usage on schema public to anon, authenticated, service_role;
grant select on public.posts to anon, authenticated; grant all on public.posts to service_role;

create function pg_temp.snap() returns text language sql as $$
  select md5(string_agg(k || '|' || v, E'\n' order by k, v)) from (
    select 'col' k, column_name || ':' || data_type v from information_schema.columns where table_schema = 'public' and table_name = 'posts'
    union all select 'idx', indexdef from pg_indexes where schemaname = 'public' and tablename = 'posts'
    union all select 'trg', tgname from pg_trigger where tgrelid = 'public.posts'::regclass and not tgisinternal
    union all select 'pol', policyname || cmd || coalesce(qual, '') from pg_policies where tablename = 'posts'
    union all select 'con', conname || pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.posts'::regclass
    union all select 'rls', relrowsecurity::text || relforcerowsecurity::text from pg_class where oid = 'public.posts'::regclass
  ) s $$;
create table public._snap as select pg_temp.snap() as s;

\i supabase/proposed/content_translations_v1_PROPOSAL.sql

create function public.expect_error(p_sql text, p_state text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED ERROR % BUT SUCCEEDED: %', p_state, p_sql;
exception when others then
  if sqlstate <> p_state then raise exception 'WRONG SQLSTATE % (wanted %) for %: %', sqlstate, p_state, p_sql, sqlerrm; end if;
end $$;
create function public.visible(p_role text, p_sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'set local role ' || p_role; execute p_sql into n; execute 'reset role'; return n; end $$;
grant execute on function public.expect_error(text, text), public.visible(text, text) to public;

-- fixtures: 1 public post, 2 draft-tagged post, 3 post to be deleted
insert into public.posts (title, excerpt, content, tags) values
  ('כותרת', 'תקציר', '<p>תוכן</p>', '{}'),
  ('טיוטה', 'x', '<p>d</p>', array['טיוטה']),
  ('למחיקה', 'y', '<p>z</p>', '{}');
create function public.h(p_id bigint) returns text language sql as
  $$ select public.content_translation_source_hash(title, excerpt, content) from public.posts where id = p_id $$;
create function public.ins(p_id bigint, p_lang text, p_status text) returns void language plpgsql as $$
begin insert into public.content_translations (entity_type, entity_id, lang, title, content, source_hash, translated_by, status)
      values ('post', p_id::text, p_lang, 't-' || p_lang, '<p>c</p>', public.h(p_id), 'anthropic:test', p_status); end $$;

-- T0: hash parity vector (identical constants asserted in test/entity-translation-policy.test.mjs)
do $$ begin
  assert public.content_translation_source_hash('כותרת', 'תקציר', '<p>תוכן</p>') = 'ec0fcf8287e93f97b761766858b3cf1b49dac7ef6ae3bf91f6411cf4107c3309', 'T0 hash vector';
  assert public.content_translation_source_hash(null, null, null) = '75a11da44c802486bc6f65640aa48a730f0f684c5c07a42ba3cd1735eb3fb070', 'T0 null vector';
end $$;

-- T1: fresh published translation is readable (direct table + view) by anon and authenticated
select public.ins(1, 'en', 'published');
do $$ begin
  assert public.visible('anon', 'select count(*) from public.content_translations where post_id = 1') = 1, 'T1 anon direct';
  assert public.visible('authenticated', 'select count(*) from public.content_translations where post_id = 1') = 1, 'T1 auth direct';
  assert public.visible('anon', 'select count(*) from public.post_translations_public_v1 where post_id = 1') = 1, 'T1 anon view';
end $$;

-- T2 (finding 1): STALE published translation is unreadable by DIRECT table read, not only via the view
update public.posts set content = '<p>שונה</p>' where id = 1;
do $$ begin
  assert public.visible('anon', 'select count(*) from public.content_translations') = 0, 'T2 anon direct stale';
  assert public.visible('authenticated', 'select count(*) from public.content_translations') = 0, 'T2 auth direct stale';
  assert public.visible('anon', 'select count(*) from public.content_translations where post_id = 1 and lang = ''en''') = 0, 'T2 anon direct filtered stale';
  assert public.visible('anon', 'select count(*) from public.post_translations_public_v1') = 0, 'T2 view stale';
  assert (select count(*) from public.content_translations) = 1, 'T2 row preserved for the owner/service (not deleted)';
end $$;
-- T2b: service_role cannot re-publish/refresh with a stale hash (publish guard), but can after re-translating against the new source
select public.expect_error($q$ update public.content_translations set status = 'published' where post_id = 1 $q$, '23514');
update public.content_translations set source_hash = public.h(1) where post_id = 1;
do $$ begin assert public.visible('anon', 'select count(*) from public.content_translations where post_id = 1') = 1, 'T2b fresh again'; end $$;

-- T3: non-published statuses are never exposed, even when the hash is fresh
select public.ins(1, 'ar', 'pending'); select public.ins(1, 'de', 'draft');
do $$ begin assert public.visible('anon', 'select count(*) from public.content_translations where lang in (''ar'',''de'')') = 0, 'T3 pending/draft hidden'; end $$;

-- T4 (draft post): a published, hash-fresh translation of a «טיוטה»-tagged post is NOT exposed (table + view; anon + authenticated)
select public.ins(2, 'en', 'published');
do $$ begin
  assert public.visible('anon', 'select count(*) from public.content_translations where post_id = 2') = 0, 'T4 anon direct';
  assert public.visible('authenticated', 'select count(*) from public.content_translations where post_id = 2') = 0, 'T4 auth direct';
  assert public.visible('anon', 'select count(*) from public.post_translations_public_v1 where post_id = 2') = 0, 'T4 anon view';
  assert public.visible('authenticated', 'select count(*) from public.post_translations_public_v1 where post_id = 2') = 0, 'T4 auth view';
  assert (select count(*) from public.content_translations where post_id = 2) = 1, 'T4 row exists for service';
end $$;
-- T4b: removing the draft tag exposes it (visibility follows the parent post), re-tagging hides it again
update public.posts set tags = '{}' where id = 2;
do $$ begin assert public.visible('anon', 'select count(*) from public.content_translations where post_id = 2') = 1, 'T4b untagged visible'; end $$;
update public.posts set tags = array['טיוטה'] where id = 2;
do $$ begin assert public.visible('anon', 'select count(*) from public.content_translations where post_id = 2') = 0, 'T4b re-tagged hidden'; end $$;

-- T4c: an identical-looking PUBLIC post must not unlock the draft post's translation (visibility is bound to the translation's own post)
insert into public.posts (title, excerpt, content, tags) values ('טיוטה', 'x', '<p>d</p>', '{}');
do $$ begin
  assert public.h(2) = (select public.h(max(id)) from public.posts where title = 'טיוטה' and id <> 2), 'T4c fixture: identical source hash';
  assert public.visible('anon', 'select count(*) from public.content_translations where post_id = 2') = 0, 'T4c anon';
  assert public.visible('authenticated', 'select count(*) from public.post_translations_public_v1 where post_id = 2') = 0, 'T4c auth view';
end $$;
delete from public.posts where title = 'טיוטה' and id <> 2;

-- T5 (finding 2): entity id integrity + safe cast
select public.expect_error(format($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('post', %L, 'en', repeat('a',64), 'x') $q$, v), '23514')
from (values ('abc'), ('007'), ('0'), (''), (' 5'), ('5 '), ('5.0'), ('-5'), ('+5'), ('1e3'), ('٥'), ('1000000000000000000'), ('99999999999999999999'), ('5;drop table posts')) t(v);
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('video', '5', 'en', repeat('a',64), 'x') $q$, '23514');
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('post', '999999', 'en', repeat('a',64), 'x') $q$, '23503');   -- FK: no such post
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('post', '1', 'en', repeat('a',64), 'x') $q$, '23505');           -- unique (post,lang)
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('post', '1', 'he', repeat('a',64), 'x') $q$, '23514');           -- lang = source_lang
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('post', '1', 'EN', repeat('a',64), 'x') $q$, '23514');
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('post', '1', 'english', repeat('a',64), 'x') $q$, '23514');
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('post', '1', 'fr', 'nothex', 'x') $q$, '23514');
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by, status) values ('post', '1', 'fr', repeat('a',64), 'x', 'live') $q$, '23514');
do $$ begin
  assert (select post_id from public.content_translations where entity_id = '1' and lang = 'en') = 1, 'T5 typed projection';
  assert (select count(*) from public.content_translations where post_id is null) = 0, 'T5 no untyped rows';
end $$;

-- T6: column grants + write isolation
select public.expect_error($q$ set local role anon; select status from public.content_translations $q$, '42501');
select public.expect_error($q$ set local role anon; select source_hash from public.content_translations $q$, '42501');
select public.expect_error($q$ set local role authenticated; select validation from public.content_translations $q$, '42501');
select public.expect_error($q$ set local role anon; insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by) values ('post','1','es',repeat('a',64),'x') $q$, '42501');
select public.expect_error($q$ set local role authenticated; update public.content_translations set title = 'x' $q$, '42501');
select public.expect_error($q$ set local role authenticated; delete from public.content_translations $q$, '42501');
do $$ begin
  assert not exists (select 1 from information_schema.columns where table_name = 'post_translations_public_v1' and column_name in ('status', 'source_hash', 'validation')), 'T6 view columns';
  assert (select relrowsecurity from pg_class where oid = 'public.content_translations'::regclass), 'T6 RLS enabled';
end $$;

-- T7: publish guard (service_role / superuser path)
select public.expect_error($q$ insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by, status) values ('post','1','es',repeat('a',64),'x','published') $q$, '23514');
insert into public.content_translations (entity_type, entity_id, lang, source_hash, translated_by, status) values ('post', '1', 'es', repeat('a', 64), 'x', 'pending');   -- pending with unknown hash is allowed (work in progress)
select public.expect_error($q$ update public.content_translations set status = 'published' where post_id = 1 and lang = 'es' $q$, '23514');

-- T8: existing posts are protected — FK cascades only derived rows; posts DML is never blocked
select public.ins(3, 'en', 'published'); select public.ins(3, 'fr', 'published');
delete from public.posts where id = 3;
do $$ begin
  assert (select count(*) from public.content_translations where post_id = 3) = 0, 'T8 cascade removed derived rows';
  assert (select count(*) from public.content_translations where post_id = 1) >= 2, 'T8 other posts untouched';
end $$;
insert into public.posts (title, excerpt, content, tags) values ('חדש', 'n', '<p>n</p>', '{}');
update public.posts set author = 'a' where id = 1;
update public.posts set excerpt = 'שונה' where title = 'חדש';
do $$ begin assert (select count(*) from public.posts) = 3, 'T8 posts DML ok'; end $$;

-- T9: the migration did not alter posts (columns, indexes, user triggers, policies, constraints, RLS flags)
do $$ begin assert pg_temp.snap() = (select s from public._snap), 'T9 posts catalog changed by the migration'; end $$;

select 'content_translations_v1: OK' as result;
