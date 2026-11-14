-- M0-D regression on a DISPOSABLE PostgreSQL: the live view shape (12.11.2026), before -> apply -> after -> re-run -> rollback.
-- Round 3: the proposal creates world_contributor_research_v2 and must leave v1 byte for byte (older clients keep reading v1).
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;
\o /dev/null
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create schema auth; grant usage on schema auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.users (id uuid primary key, role text); grant select on public.users to anon, authenticated;
create function public.rd_is_admin() returns boolean language sql stable security definer set search_path to 'public'
  as $$ select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') $$;
create table public.research_objects (id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), kind text, statement text,
  terms text[], value int, relates text[], source text, source_ref text, contributor text, confidence int, engine_verified boolean,
  engine_detail jsonb, evidence text, status text, promoted_node_id uuid, parent_id uuid, meta jsonb default '{}', privacy_scope text);
create table public.channel_updates (id uuid primary key default gen_random_uuid(), contributor_id uuid);
alter table public.research_objects enable row level security;
create policy ro_public_read on public.research_objects for select to anon, authenticated
  using (privacy_scope = 'public' and coalesce(meta #>> '{ext,personal_scope,scope}', '') <> 'person_only');
grant select on public.research_objects, public.channel_updates to anon, authenticated;
create view public.world_contributor_research_v1 with (security_invoker = true, security_barrier = true) as
 SELECT ro.id, ro.created_at, ro.kind, ro.statement, ro.terms, ro.value, ro.relates, ro.source, ro.source_ref, ro.contributor, ro.confidence,
    ro.engine_verified, ro.engine_detail, ro.evidence, ro.status, ro.promoted_node_id, ro.parent_id, ro.meta, ro.privacy_scope,
    cu.contributor_id AS source_contributor_id
   FROM research_objects ro
     LEFT JOIN channel_updates cu ON split_part(COALESCE(ro.source_ref, ''::text), '#'::text, 1) = ('channel_updates:'::text || cu.id::text)
  WHERE (CURRENT_USER = ANY (ARRAY['postgres'::name, 'service_role'::name])) OR ( SELECT rd_is_admin() AS rd_is_admin) OR ro.privacy_scope = 'public'::text AND (ro.status = ANY (ARRAY['approved'::text, 'canonical'::text])) AND COALESCE(ro.meta #>> '{ext,personal_scope,scope}'::text[], ''::text) <> 'person_only'::text AND (split_part(COALESCE(ro.source_ref, ''::text), '#'::text, 1) !~~ 'channel_updates:%'::text OR cu.id IS NOT NULL);
grant select on public.world_contributor_research_v1 to anon, authenticated;
grant all on public.world_contributor_research_v1 to service_role;
-- Worst case for a NEW object: default privileges that would hand anon and authenticated every privilege (as supabase_admin's do).
alter default privileges in schema public grant all on tables to anon, authenticated;
insert into public.research_objects (statement, status, privacy_scope, meta) values
  ('approved public', 'approved', 'public', '{}'), ('candidate public', 'candidate', 'public', '{}'),
  ('candidate private', 'candidate', 'private', '{}'), ('candidate person only', 'candidate', 'public', '{"ext":{"personal_scope":{"scope":"person_only"}}}'),
  ('rejected public', 'rejected', 'public', '{}'), ('candidate on a missing channel update', 'candidate', 'public', '{}');
update public.research_objects set source_ref = 'channel_updates:' || gen_random_uuid() where statement = 'candidate on a missing channel update';
create table public.m0d_before as select pg_get_viewdef('public.world_contributor_research_v1'::regclass, true) d,
  (select relacl::text from pg_class where oid = 'public.world_contributor_research_v1'::regclass) acl;
create function pg_temp.anon_rows(v regclass) returns text language plpgsql as $$
declare t text; begin
  set local role anon;
  execute format('select string_agg(statement, %L order by statement) from %s', ' | ', v) into t;
  reset role; return t;
end $$;
create function pg_temp.acl_set(v regclass) returns text language sql as $$
  select string_agg(e, ',' order by e) from (select a.grantee::regrole::text || ':' || a.privilege_type as e from pg_class c, aclexplode(c.relacl) a
   where c.oid = v and a.grantee <> c.relowner) s $$;
do $$ begin
  if pg_temp.anon_rows('public.world_contributor_research_v1') is distinct from 'approved public' then raise exception 'BEFORE: expected only the approved row in v1'; end if;
  if to_regclass('public.world_contributor_research_v2') is not null then raise exception 'BEFORE: v2 must not exist'; end if;
end $$;
\i supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
do $$ begin
  if pg_temp.anon_rows('public.world_contributor_research_v2') is distinct from 'approved public | candidate public' then
    raise exception 'AFTER: v2 expected approved + public candidate, got %', pg_temp.anon_rows('public.world_contributor_research_v2'); end if;
  if pg_temp.anon_rows('public.world_contributor_research_v1') is distinct from 'approved public' then raise exception 'AFTER: v1 rows changed'; end if;
  if pg_get_viewdef('public.world_contributor_research_v1'::regclass, true) <> (select d from public.m0d_before) then raise exception 'AFTER: v1 definition changed'; end if;
  if (select relacl::text from pg_class where oid = 'public.world_contributor_research_v1'::regclass) <> (select acl from public.m0d_before) then raise exception 'AFTER: v1 privileges changed'; end if;
  if (select status from public.research_objects where statement = 'candidate public') <> 'candidate' then raise exception 'AFTER: a status changed'; end if;
  if pg_temp.acl_set('public.world_contributor_research_v2') is distinct from pg_temp.acl_set('public.world_contributor_research_v1') then
    raise exception 'AFTER: v2 privileges % differ from v1 %', pg_temp.acl_set('public.world_contributor_research_v2'), pg_temp.acl_set('public.world_contributor_research_v1'); end if;
  if has_table_privilege('anon', 'public.world_contributor_research_v2', 'INSERT') or has_table_privilege('authenticated', 'public.world_contributor_research_v2', 'UPDATE') then
    raise exception 'AFTER: default privileges leaked a write grant onto v2'; end if;
  if not exists (select 1 from pg_class where oid = 'public.world_contributor_research_v2'::regclass
     and reloptions @> array['security_invoker=true', 'security_barrier=true']) then raise exception 'AFTER: v2 options missing'; end if;
end $$;
-- Re-run is a no-op (extraction check: the same view object, definition, options and privileges as before the re-run);
-- a foreign v2 makes the proposal stop (negative controls below).
create table public.m0d_applied as select c.oid::int8 as oid, pg_get_viewdef(c.oid, true) as d, c.relacl::text as acl, c.reloptions::text as opts
  from pg_class c where c.oid = 'public.world_contributor_research_v2'::regclass;
\i supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
do $$ begin
  if (select count(*) from public.m0d_applied a join pg_class c on c.oid = a.oid
        where c.oid = 'public.world_contributor_research_v2'::regclass and pg_get_viewdef(c.oid, true) = a.d
          and c.relacl::text = a.acl and c.reloptions::text = a.opts) <> 1 then
    raise exception 'RE-RUN: the second run changed or replaced v2'; end if;
  if pg_temp.anon_rows('public.world_contributor_research_v2') is distinct from 'approved public | candidate public' then raise exception 'RE-RUN: v2 rows changed'; end if;
  if pg_get_viewdef('public.world_contributor_research_v1'::regclass, true) <> (select d from public.m0d_before) then raise exception 'RE-RUN: v1 changed'; end if;
end $$;
\i supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql
do $$ begin
  if to_regclass('public.world_contributor_research_v2') is not null then raise exception 'ROLLBACK: v2 still present'; end if;
  if pg_get_viewdef('public.world_contributor_research_v1'::regclass, true) <> (select d from public.m0d_before) then raise exception 'ROLLBACK: v1 changed'; end if;
  if pg_temp.anon_rows('public.world_contributor_research_v1') is distinct from 'approved public' then raise exception 'ROLLBACK: v1 rows differ'; end if;
  if (select relacl::text from pg_class where oid = 'public.world_contributor_research_v1'::regclass) <> (select acl from public.m0d_before) then raise exception 'ROLLBACK: v1 privileges changed'; end if;
  if (select count(*) from public.research_objects) <> 6 or (select status from public.research_objects where statement = 'candidate public') <> 'candidate' then
    raise exception 'ROLLBACK: a row or a status changed'; end if;
end $$;
\i supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql
-- Negative control: a foreign world_contributor_research_v2 must make the proposal stop without replacing it.
create view public.world_contributor_research_v2 as select 1 as x;
\set ON_ERROR_STOP off
\i supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
\set ON_ERROR_STOP on
\if :ERROR
\else
do $$ begin raise exception 'NEGATIVE (foreign v2): the proposal did not stop'; end $$;
\endif
do $$ begin
  if pg_get_viewdef('public.world_contributor_research_v2'::regclass, true) not like '%1 AS x%' then raise exception 'NEGATIVE: the foreign v2 was replaced'; end if;
  if pg_get_viewdef('public.world_contributor_research_v1'::regclass, true) <> (select d from public.m0d_before) then raise exception 'NEGATIVE: v1 changed'; end if;
end $$;
drop view public.world_contributor_research_v2;
-- Round 5 (independent review): a hand-made v2 with the right TEXT but without security_invoker, or with broader grants, must stop the
-- proposal (an existing v2 is verified, never accepted on its text alone) and must not be replaced.
create function pg_temp.v2_text() returns text language sql as $$
  select rtrim(btrim(replace(pg_get_viewdef('public.world_contributor_research_v1'::regclass, true),
    $a$(ro.status = ANY (ARRAY['approved'::text, 'canonical'::text]))$a$,
    $a$(ro.status = ANY (ARRAY['approved'::text, 'canonical'::text, 'candidate'::text]))$a$)), ';') $$;
do $$ begin execute 'create view public.world_contributor_research_v2 as ' || pg_temp.v2_text(); end $$;
revoke all on public.world_contributor_research_v2 from anon, authenticated;
grant select on public.world_contributor_research_v2 to anon, authenticated;
\set ON_ERROR_STOP off
\i supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
\set ON_ERROR_STOP on
\if :ERROR
\else
do $$ begin raise exception 'NEGATIVE (options): the proposal did not stop'; end $$;
\endif
do $$ begin
  if exists (select 1 from pg_class where oid = 'public.world_contributor_research_v2'::regclass and reloptions @> array['security_invoker=true']) then
    raise exception 'NEGATIVE (options): the hand-made v2 was replaced or altered'; end if;
end $$;
drop view public.world_contributor_research_v2;
do $$ begin execute 'create view public.world_contributor_research_v2 with (security_invoker = true, security_barrier = true) as ' || pg_temp.v2_text(); end $$;
revoke all on public.world_contributor_research_v2 from public, anon, authenticated, service_role;
grant select on public.world_contributor_research_v2 to anon, authenticated;
grant all on public.world_contributor_research_v2 to service_role;
grant insert on public.world_contributor_research_v2 to anon;
\set ON_ERROR_STOP off
\i supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
\set ON_ERROR_STOP on
\if :ERROR
\else
do $$ begin raise exception 'NEGATIVE (privileges): the proposal did not stop'; end $$;
\endif
do $$ begin
  if not has_table_privilege('anon', 'public.world_contributor_research_v2', 'INSERT') then raise exception 'NEGATIVE (privileges): the hand-made v2 was changed'; end if;
end $$;
drop view public.world_contributor_research_v2;
-- Round 5: v1 that differs from the reviewed definition (here: one extra "AND true") must stop the proposal before anything is created.
do $$ begin
  execute 'create or replace view public.world_contributor_research_v1 as ' || rtrim(btrim(replace(
    pg_get_viewdef('public.world_contributor_research_v1'::regclass, true), $a$ro.privacy_scope = 'public'::text$a$,
    $a$ro.privacy_scope = 'public'::text AND true$a$)), ';');
end $$;
\set ON_ERROR_STOP off
\i supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
\set ON_ERROR_STOP on
\if :ERROR
\else
do $$ begin raise exception 'NEGATIVE (v1 drift): the proposal did not stop'; end $$;
\endif
do $$ begin
  if to_regclass('public.world_contributor_research_v2') is not null then raise exception 'NEGATIVE (v1 drift): v2 was created'; end if;
end $$;
\o
\echo 'M0-D contributor research view regression: PASS'
