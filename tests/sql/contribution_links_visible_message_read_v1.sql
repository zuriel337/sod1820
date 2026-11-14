-- CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 — runs on a throwaway local PostgreSQL only (never a live project).
-- Run: bash scripts/run-contribution-links-visible-read-sql-test.sh   (the runner also runs the two-session concurrency cases)
-- The schema below is the live one read on 14.11.2026, reduced to what the policies and the import use: the three roles, auth.uid(), rd_is_admin(),
-- research_contributions with its two live read policies, contribution_links with its live columns, indexes, grants and the policy under test,
-- and the live g3_openweb_import_message (tests/sql/fixtures/contribution_links_live_base_20261114), executable by service_role only as live.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $f$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $f$;
grant usage on schema public to anon, authenticated, service_role;

create table public.users(id uuid primary key, role text);
create function public.rd_is_admin() returns boolean language sql stable security definer set search_path to 'public' as $f$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'); $f$;

create table public.contributors(id uuid primary key default gen_random_uuid(), slug text unique, display_name text, kind text, email text, source text, dossier_settings jsonb default '{}'::jsonb);
create table public.visitor_identity(visitor text primary key, email text, last_seen timestamptz);

create table public.research_contributions(
  id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid, author_name text, intent text, origin text,
  research_state text, status text, target_type text, target_id text, parent_id uuid references public.research_contributions(id) on delete cascade,
  title text, body text, reactions jsonb default '{}'::jsonb, created_at timestamptz default now(), deleted_at timestamptz, thread_hidden_at timestamptz);
alter table public.research_contributions enable row level security;
create policy rc_public_read on public.research_contributions for select using (((status = 'approved'::text) OR (author_user_id = auth.uid())));
create policy research_contributions_admin_read on public.research_contributions for select to authenticated using (( SELECT rd_is_admin() AS rd_is_admin));
grant select on public.research_contributions to anon, authenticated;
grant all on public.research_contributions to service_role;

create table public.contribution_links(
  id uuid primary key default gen_random_uuid(), from_contribution_id uuid not null references public.research_contributions(id) on delete cascade,
  target_type text not null, target_id text not null, relation_type text not null, note text, created_by uuid, created_at timestamptz not null default now());
create index contribution_links_created_by_idx on public.contribution_links using btree (created_by) where (created_by is not null);
create index cl_from_idx on public.contribution_links using btree (from_contribution_id);
create index cl_target_idx on public.contribution_links using btree (target_type, target_id);
create unique index cl_openweb_message_derived_from_uniq on public.contribution_links using btree (target_type, target_id, relation_type)
  where ((target_type = 'openweb_message'::text) and (relation_type = 'derived_from'::text));
alter table public.contribution_links enable row level security;
create policy cl_public_read on public.contribution_links for select using (true);
grant select on public.contribution_links to anon, authenticated;
grant all on public.contribution_links to service_role;

\ir fixtures/contribution_links_live_base_20261114/g3_openweb_import_message.sql
revoke all on function public.g3_openweb_import_message(boolean,text,text,text,text,jsonb,uuid,uuid,text,text,text,text,text,text,jsonb,timestamptz,text,text,text,text,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.g3_openweb_import_message(boolean,text,text,text,text,jsonb,uuid,uuid,text,text,text,text,text,text,jsonb,timestamptz,text,text,text,text,text,text,text,boolean,text) to service_role;
grant all on public.contributors, public.visitor_identity to service_role;

create function expect(p_ok boolean, p_what text) returns void language plpgsql as $f$
  begin if p_ok is not true then raise exception 'FAIL: %', p_what; end if; end $f$;
-- a SECURITY DEFINER writer and a SECURITY DEFINER reader owned by the table owner, like link_contribution and the people_public_* / researcher_reputation functions
create function public.link_contribution_like(p_from uuid, p_type text, p_id text) returns void language plpgsql security definer set search_path to 'public' as $f$
  begin insert into public.contribution_links(from_contribution_id, target_type, target_id, relation_type, created_by) values (p_from, p_type, p_id, 'related', auth.uid()); end $f$;
create function public.definer_reader_like() returns bigint language sql stable security definer set search_path to 'public' as $f$ select count(*) from public.contribution_links $f$;
grant execute on function public.link_contribution_like(uuid, text, text) to authenticated;
grant execute on function public.definer_reader_like() to anon, authenticated;

-- people ---------------------------------------------------------------------------------------------------------------------------------------
create table who(name text primary key, uid uuid);
insert into who values ('A', '00000000-0000-4000-8000-0000000000a1'), ('B', '00000000-0000-4000-8000-0000000000b2'),
  ('ADMIN', '00000000-0000-4000-8000-0000000000ad'), ('OTHER', '00000000-0000-4000-8000-0000000000c3');
insert into public.users values ((select uid from who where name = 'ADMIN'), 'admin'), ((select uid from who where name = 'A'), 'user'),
  ((select uid from who where name = 'B'), 'user'), ((select uid from who where name = 'OTHER'), 'user');

-- messages and their provenance rows ---------------------------------------------------------------------------------------------------------
create table m(name text primary key, id uuid);
insert into public.research_contributions(id, author_user_id, author_name, intent, origin, research_state, status, body, deleted_at) values
  ('10000000-0000-4000-8000-000000000001', null, 'ok1', 'תגובה', 'openweb', 'discussion', 'approved', 'public message 1', null),
  ('10000000-0000-4000-8000-000000000002', (select uid from who where name = 'A'), 'ok2', 'תגובה', 'community_2029', 'discussion', 'approved', 'public message 2 (author A)', null),
  ('10000000-0000-4000-8000-000000000003', (select uid from who where name = 'A'), 'pendA', 'תגובה', 'community_2029', 'discussion', 'pending', 'pending message of A', null),
  ('10000000-0000-4000-8000-000000000004', (select uid from who where name = 'B'), 'pendB', 'תגובה', 'community_2029', 'discussion', 'pending', 'pending message of B', null),
  ('10000000-0000-4000-8000-000000000005', null, 'blocked', 'תגובה', 'openweb', 'discussion', 'hidden', 'blocked at the source', null),
  ('10000000-0000-4000-8000-000000000006', null, 'deleted', 'תגובה', 'openweb', 'discussion', 'hidden', 'deleted at the source', now()),
  ('10000000-0000-4000-8000-000000000007', null, 'hidden', 'תגובה', 'openweb', 'discussion', 'hidden', 'hidden', null);
insert into m select author_name, id from public.research_contributions;
insert into public.contribution_links(from_contribution_id, target_type, target_id, relation_type, note, created_by)
select r.id, 'openweb_message', 'sp_SRC_' || r.author_name, 'derived_from',
  '{"url": "https://sod1820.co.il", "url_kind": "general_chat", "parent_message_id": null, "original_moderation_state": "'
    || case r.author_name when 'blocked' then 'blocked' when 'deleted' then 'deleted' when 'pendA' then 'pending' when 'pendB' then 'pending' else 'approved' end || '"}', null
from public.research_contributions r;
insert into public.contribution_links(from_contribution_id, target_type, target_id, relation_type)
select id, 'openweb_user', 'u_' || name, 'authored_by_external' from m where name in ('ok1', 'hidden', 'pendA');
insert into public.contribution_links(from_contribution_id, target_type, target_id, relation_type, created_by)
  values ((select id from m where name = 'ok2'), 'number', '1237', 'related', (select uid from who where name = 'A'));
-- 7 derived_from + 3 authored_by_external + 1 related = 11 rows. Public messages: ok1, ok2 (links: 2 + 1 + 1 = 4). A's own pending adds 2, B's own pending adds 1.

grant select on m, who to anon, authenticated, service_role;

create function as_role(p_role text, p_who text) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce((select uid::text from who where name = p_who), ''), false);
  execute format('set role %I', p_role);
end $f$;
-- (as_role must run as the table owner: it is executed before each "set role" block and followed by "reset role")
create function links_seen() returns bigint language sql stable as $f$ select count(*) from public.contribution_links $f$;
create function cl_policy_qual() returns text language sql stable as $f$
  select pg_get_expr(polqual, polrelid) from pg_policy where polrelid = 'public.contribution_links'::regclass and polname = 'cl_public_read' $f$;
create function cl_policy_comment() returns text language sql stable as $f$
  select obj_description(oid, 'pg_policy') from pg_policy where polrelid = 'public.contribution_links'::regclass and polname = 'cl_public_read' $f$;

-- 0. Baseline: the finding reproduces on the live policy ---------------------------------------------------------------------------------------
select as_role('anon', '');
select expect((select count(*) from public.contribution_links) = 11, 'baseline: a guest reads all 11 provenance rows');
select expect((select count(*) from public.contribution_links where from_contribution_id = (select id from m where name = 'blocked')) = 1,
  'baseline: a guest reads the link of a blocked message');
select expect((select count(*) from public.contribution_links where note like '%"original_moderation_state": "blocked"%') = 1,
  'baseline: a guest reads the moderation state of a blocked message');
reset role;
select 'PASS 0 baseline on the live policy USING (true): a guest reads all 11 rows, including those of blocked, deleted, hidden and pending messages and their moderation state' as result;

-- 1. Apply -------------------------------------------------------------------------------------------------------------------------------------
create table before_state as
  select (select count(*) from pg_policy where polrelid = 'public.contribution_links'::regclass) policies,
         (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type) from information_schema.role_table_grants
           where table_schema = 'public' and table_name = 'contribution_links') grants,
         (select string_agg(indexdef, ';' order by indexname) from pg_indexes where schemaname = 'public' and tablename = 'contribution_links') indexes,
         (select count(*) from public.contribution_links) rows_n, (select md5(string_agg(to_jsonb(l)::text, '|' order by id)) from public.contribution_links l) rows_md5;
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
select expect(cl_policy_qual() like '%research_contributions%' and cl_policy_qual() <> 'true', 'the policy expression is the new one');
select expect(cl_policy_comment() like 'CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 applied %; qual_md5=' || md5(cl_policy_qual()) || '; before=USING (true)', 'the apply record carries the md5');
select expect((select policies from before_state) = (select count(*) from pg_policy where polrelid = 'public.contribution_links'::regclass), 'still one policy');
select expect((select grants from before_state) is not distinct from (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type) from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'contribution_links'), 'grants unchanged');
select expect((select indexes from before_state) is not distinct from (select string_agg(indexdef, ';' order by indexname) from pg_indexes where schemaname = 'public' and tablename = 'contribution_links'), 'indexes unchanged');
select expect((select rows_n from before_state) = (select count(*) from public.contribution_links) and (select rows_md5 from before_state) = (select md5(string_agg(to_jsonb(l)::text, '|' order by id)) from public.contribution_links l),
  'no row changed');
select 'PASS 1 apply: one policy expression changed in place (name kept); grants, indexes and every row unchanged; the apply record holds the expression md5' as result;

-- 2. Guest -------------------------------------------------------------------------------------------------------------------------------------
select as_role('anon', '');
select expect(links_seen() = 4, 'guest sees exactly the 4 links of the 2 public messages');
select expect((select count(*) from public.contribution_links where from_contribution_id in (select id from m where name in ('ok1', 'ok2'))) = 4, 'guest: the links of public messages are all there');
select expect((select count(*) from public.contribution_links where from_contribution_id in (select id from m where name in ('blocked', 'deleted', 'hidden', 'pendA', 'pendB'))) = 0, 'guest: no link of a non-public message');
select expect((select count(*) from public.contribution_links where target_id in ('sp_SRC_blocked', 'sp_SRC_deleted', 'sp_SRC_hidden', 'sp_SRC_pendA', 'sp_SRC_pendB')) = 0, 'guest cannot find a hidden message by its source id');
select expect((select count(*) from public.contribution_links where note like '%blocked%' or note like '%"deleted"%' or note like '%pending%') = 0, 'guest cannot read a non-public moderation state');
select expect((select count(*) from public.contribution_links where target_type = 'openweb_message' and target_id = 'sp_SRC_ok1') = 1, 'guest still resolves a public message by its source id');
-- the forum feed link count in src/lib/contributions.js: links of the approved contributions it lists
select expect((select count(*) from public.contribution_links where from_contribution_id in (select id from m where name in ('ok1', 'ok2'))) = 4, 'guest: the forum link count query for approved contributions is unchanged');
reset role;
select 'PASS 2 guest (anon): sees only the 4 links of public messages; none of a blocked, deleted, hidden or pending message, none of their moderation states or source ids' as result;

-- 3. Owner -------------------------------------------------------------------------------------------------------------------------------------
select as_role('authenticated', 'A');
select expect(links_seen() = 6, 'owner A sees the 4 public links and the 2 links of their own pending message');
select expect((select count(*) from public.contribution_links where from_contribution_id = (select id from m where name = 'pendA')) = 2, 'owner A sees the links of their own pending message');
select expect((select count(*) from public.contribution_links where from_contribution_id = (select id from m where name = 'pendB')) = 0, 'owner A does not see the links of B''s pending message');
select expect((select count(*) from public.contribution_links where from_contribution_id in (select id from m where name in ('blocked', 'deleted', 'hidden'))) = 0, 'owner A does not see the links of hidden messages');
reset role;
select as_role('authenticated', 'B');
select expect(links_seen() = 5, 'owner B sees the 4 public links and the 1 link of their own pending message');
select expect((select count(*) from public.contribution_links where from_contribution_id = (select id from m where name = 'pendA')) = 0, 'owner B does not see the links of A''s pending message');
reset role;
select as_role('authenticated', 'OTHER');
select expect(links_seen() = 4, 'another signed-in user sees what a guest sees');
reset role;
select as_role('authenticated', '');
select expect(links_seen() = 4, 'an authenticated session without a user id sees what a guest sees');
reset role;
select 'PASS 3 owner (authenticated): A sees 4 public + 2 own (6), B sees 4 + 1 own (5); nobody sees another user''s pending links; another user and a session without a user id see only the 4 public links' as result;

-- 4. Administrator -----------------------------------------------------------------------------------------------------------------------------
select as_role('authenticated', 'ADMIN');
select expect(links_seen() = 11, 'the administrator sees all 11 links');
select expect((select count(*) from public.contribution_links where from_contribution_id in (select id from m where name in ('blocked', 'deleted', 'hidden', 'pendA', 'pendB'))) = 7, 'the administrator sees the links of hidden and pending messages');
reset role;
select 'PASS 4 administrator (rd_is_admin): sees all 11 links, including those of blocked, deleted, hidden and pending messages' as result;

-- 5. Import and the other writers and readers --------------------------------------------------------------------------------------------------
select as_role('service_role', '');
select expect(links_seen() = 11, 'service_role (RLS bypass) sees all 11 links, as the import resolves its idempotency and parents');
select expect((select count(*) from public.contribution_links where target_type = 'openweb_message' and target_id = 'sp_SRC_blocked' and relation_type = 'derived_from') = 1, 'import: the idempotency lookup of a blocked source message works');
-- the real live import function, as service_role: a new reply to a message the guest cannot see, a new public message, and a duplicate
select expect((public.g3_openweb_import_message(true, 'imp-1', 'Importer One', null, 'openweb', '{}'::jsonb, null, null, 'Importer One', 'תגובה', 'openweb', 'discussion', 'pending',
  'imported reply to a blocked message', '{}'::jsonb, now(), null, null, 'sp_SRC_new1', 'derived_from', '{"url": "https://sod1820.co.il", "original_moderation_state": "pending"}',
  'u_new1', 'authored_by_external', false, 'sp_SRC_blocked') ->> 'id') is not null, 'import: a reply to a blocked parent resolves the parent through contribution_links');
select expect((select parent_id from public.research_contributions where author_name = 'Importer One') = (select id from m where name = 'blocked'), 'import: the new row carries the blocked parent as parent_id');
select expect((public.g3_openweb_import_message(false, null, null, null, null, null, null, null, 'Importer Two', 'תגובה', 'openweb', 'discussion', 'approved',
  'imported public message', '{}'::jsonb, now(), null, null, 'sp_SRC_new2', 'derived_from', '{"url": "https://sod1820.co.il", "original_moderation_state": "approved"}',
  'u_new2', 'authored_by_external', false, null) ->> 'id') is not null, 'import: a public message');
do $$ begin
  perform public.g3_openweb_import_message(false, null, null, null, null, null, null, null, 'Importer Dup', 'תגובה', 'openweb', 'discussion', 'approved', 'dup', '{}'::jsonb, now(),
    null, null, 'sp_SRC_new2', 'derived_from', '{}', null, null, false, null);
  raise exception 'FAIL: a duplicate source message was accepted';
exception when unique_violation then null; end $$;
select expect(not exists(select 1 from public.research_contributions where author_name = 'Importer Dup'), 'import: a duplicate source message is refused and leaves no row');
select expect(links_seen() = 15, 'import: exactly 4 new links (2 messages x provenance + identity), all visible to service_role');
reset role;
select as_role('anon', '');
select expect(links_seen() = 6, 'after the import a guest sees the 4 old public links and the 2 links of the new public message, none of the pending reply');
select expect((select count(*) from public.contribution_links where target_id in ('sp_SRC_new1', 'u_new1')) = 0, 'after the import a guest cannot read the links of the pending imported reply');
select expect((select count(*) from public.contribution_links where target_id in ('sp_SRC_new2', 'u_new2')) = 2, 'after the import a guest reads the links of the public imported message');
select expect(public.definer_reader_like() = 15, 'a SECURITY DEFINER reader owned by the table owner still reads every row (unchanged, outside this proposal)');
do $$ begin
  perform public.g3_openweb_import_message(false, null, null, null, null, null, null, null, 'x', 'תגובה', 'openweb', 'discussion', 'approved', 'x', '{}'::jsonb, now(), null, null, 'sp_X', 'derived_from', '{}', null, null, false, null);
  raise exception 'FAIL: anon executed the import function';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.contribution_links(from_contribution_id, target_type, target_id, relation_type) values ((select id from m where name = 'ok1'), 'x', 'y', 'z');
  raise exception 'FAIL: anon wrote to contribution_links';
exception when insufficient_privilege then null; end $$;
reset role;
select as_role('authenticated', 'A');
select public.link_contribution_like((select id from m where name = 'ok2'), 'number', '848');
select expect((select count(*) from public.contribution_links where target_id = '848') = 1, 'a SECURITY DEFINER writer (link_contribution) still inserts for a signed-in user, who reads back the edge of a public message');
do $$ begin
  update public.contribution_links set note = 'x' where relation_type = 'related';
  if found then raise exception 'FAIL: authenticated updated a link'; end if;
exception when insufficient_privilege then null; end $$;
reset role;
select 'PASS 5 import and other paths: service_role (the import) reads and writes every row and resolves a blocked parent; the live g3_openweb_import_message imports, refuses a duplicate, stays executable by service_role only; a guest reads only the links of the public imported message; definer readers and writers are unchanged; anon and authenticated still cannot write' as result;

-- 6. A second apply and every drift refuse, changing nothing ----------------------------------------------------------------------------------
create function snapshot() returns text language sql stable as $f$
  select md5(concat_ws('|', cl_policy_qual(), cl_policy_comment(),
    (select string_agg(polname || ':' || polcmd::text || ':' || polpermissive::text || ':' || polroles::text, ',' order by polname) from pg_policy where polrelid = 'public.contribution_links'::regclass),
    (select string_agg(polname || pg_get_expr(polqual, polrelid), ',' order by polname) from pg_policy where polrelid = 'public.research_contributions'::regclass))) $f$;
create table snap(label text primary key, v text);
-- puts the applied state back exactly (used after each deliberate change below)
create function restore_applied() returns void language plpgsql as $f$
declare q text;
begin
  for q in select polname from pg_policy where polrelid = 'public.contribution_links'::regclass and polname <> 'cl_public_read' loop
    execute format('drop policy %I on public.contribution_links', q);
  end loop;
  alter policy cl_public_read on public.contribution_links to public
    using (exists (select 1 from public.research_contributions rc where rc.id = contribution_links.from_contribution_id));
  execute format('comment on policy cl_public_read on public.contribution_links is %L',
    'CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 applied restored-by-test; qual_md5=' || md5(cl_policy_qual()) || '; before=USING (true)');
end $f$;

insert into snap values ('applied', snapshot());
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(snapshot() = (select v from snap where label = 'applied'), 'a second apply refuses and changes nothing');

-- from the exact live state: restore it with the rollback, then drift one thing at a time
\ir ../../supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
select expect(cl_policy_qual() = 'true' and cl_policy_comment() is null, 'rollback restores USING (true) and clears the record');
select as_role('anon', '');
select expect(links_seen() = 16, 'after the rollback a guest reads every link again (the finding is back, as documented)');
reset role;
insert into snap values ('live', snapshot());
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
\set ON_ERROR_STOP 1
select expect(snapshot() = (select v from snap where label = 'live'), 'a second rollback refuses and changes nothing');

-- drift 1: the policy expression was edited
alter policy cl_public_read on public.contribution_links using (from_contribution_id is not null);
select snapshot() as s \gset drift1_
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(snapshot() = :'drift1_s', 'apply refuses when cl_public_read was edited, changes nothing');
alter policy cl_public_read on public.contribution_links using (true);
-- drift 2: an extra policy on contribution_links
create policy cl_extra on public.contribution_links for select to authenticated using (true);
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(cl_policy_qual() = 'true' and cl_policy_comment() is null, 'apply refuses with an extra policy on contribution_links');
drop policy cl_extra on public.contribution_links;
-- drift 3: row level security off on research_contributions (the rule would expose every link)
alter table public.research_contributions disable row level security;
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(cl_policy_qual() = 'true' and cl_policy_comment() is null, 'apply refuses when research_contributions has no row level security');
alter table public.research_contributions enable row level security;
-- drift 4: the message policy is not the live one
alter policy rc_public_read on public.research_contributions using (true);
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(cl_policy_qual() = 'true' and cl_policy_comment() is null, 'apply refuses when rc_public_read is not the live definition');
alter policy rc_public_read on public.research_contributions using (((status = 'approved'::text) OR (author_user_id = auth.uid())));
-- drift 5: a write privilege for anon
grant insert on public.contribution_links to anon;
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(cl_policy_qual() = 'true' and cl_policy_comment() is null, 'apply refuses when anon holds INSERT');
revoke insert on public.contribution_links from anon;
-- drift 6: the policy is missing
drop policy cl_public_read on public.contribution_links;
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(not exists(select 1 from pg_policy where polrelid = 'public.contribution_links'::regclass), 'apply refuses when the policy is missing (nothing is created)');
create policy cl_public_read on public.contribution_links for select using (true);
select expect(snapshot() = (select v from snap where label = 'live'), 'the live state is restored exactly after the drift cases');
select 'PASS 6 a second apply and a second rollback refuse; apply refuses (changing nothing) when the policy was edited, an extra policy exists, research_contributions has no row security or a different read policy, anon holds INSERT, or the policy is missing' as result;

-- 7. Rollback is exact, and refused after any later change --------------------------------------------------------------------------------------
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
select expect(cl_policy_comment() like 'CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 applied %', 'applied again from the exact live state');
-- (a) the expression was edited after the apply (a concurrent or later change)
alter policy cl_public_read on public.contribution_links using (from_contribution_id is not null);
select snapshot() as s \gset edited_
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
\set ON_ERROR_STOP 1
select expect(snapshot() = :'edited_s', 'rollback refuses when the expression was edited after the apply, changes nothing');
select restore_applied();
-- (b) an extra policy appeared after the apply
create policy cl_extra on public.contribution_links for select to authenticated using (true);
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
\set ON_ERROR_STOP 1
select expect(cl_policy_qual() like '%research_contributions%' and exists(select 1 from pg_policy where polname = 'cl_extra'), 'rollback refuses when an extra policy appeared after the apply');
select restore_applied();
-- (c) the apply record was removed
comment on policy cl_public_read on public.contribution_links is null;
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
\set ON_ERROR_STOP 1
select expect(cl_policy_qual() like '%research_contributions%', 'rollback refuses when the apply record was removed');
select restore_applied();
-- (d) the policy kind changed (roles)
alter policy cl_public_read on public.contribution_links to authenticated;
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
\set ON_ERROR_STOP 1
select expect(cl_policy_qual() like '%research_contributions%' and exists(select 1 from pg_policy where polname = 'cl_public_read' and polroles = array[(select oid from pg_roles where rolname = 'authenticated')]), 'rollback refuses when the policy roles changed');
select restore_applied();
-- (e) the unchanged applied state rolls back exactly, and the apply after it works again
\ir ../../supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
select expect(snapshot() = (select v from snap where label = 'live'), 'rollback from the unchanged applied state restores the live state exactly');
\ir ../../supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
select as_role('anon', '');
select expect(links_seen() = 7, 'after the second apply a guest sees only the links of public messages (4 old + 2 imported + 1 edge added by a signed-in user)');
reset role;
select 'PASS 7 rollback restores the live state exactly (policy, record, behaviour) and refuses, changing nothing, after any later change: edited expression, extra policy, removed record, changed roles; apply works again after a rollback' as result;
