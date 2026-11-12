-- M0-D regression on a DISPOSABLE PostgreSQL: the live view shape (12.11.2026), before -> apply -> after -> re-run -> rollback.
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
insert into public.research_objects (statement, status, privacy_scope, meta) values
  ('approved public', 'approved', 'public', '{}'), ('candidate public', 'candidate', 'public', '{}'),
  ('candidate private', 'candidate', 'private', '{}'), ('candidate person only', 'candidate', 'public', '{"ext":{"personal_scope":{"scope":"person_only"}}}'),
  ('rejected public', 'rejected', 'public', '{}'), ('candidate on a missing channel update', 'candidate', 'public', '{}');
update public.research_objects set source_ref = 'channel_updates:' || gen_random_uuid() where statement = 'candidate on a missing channel update';
create table public.m0d_before as select pg_get_viewdef('public.world_contributor_research_v1'::regclass, true) d;
create function pg_temp.anon_rows() returns text language plpgsql as $$
declare v text; begin
  set local role anon;
  select string_agg(statement, ' | ' order by statement) into v from public.world_contributor_research_v1;
  reset role; return v;
end $$;
do $$ begin if pg_temp.anon_rows() is distinct from 'approved public' then raise exception 'BEFORE: expected only the approved row, got %', pg_temp.anon_rows(); end if; end $$;
\i supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
do $$ begin
  if pg_temp.anon_rows() is distinct from 'approved public | candidate public' then raise exception 'AFTER: expected approved + public candidate, got %', pg_temp.anon_rows(); end if;
  if (select status from public.research_objects where statement = 'candidate public') <> 'candidate' then raise exception 'AFTER: a status changed'; end if;
  if not has_table_privilege('anon', 'public.world_contributor_research_v1', 'SELECT') then raise exception 'AFTER: anon grant lost'; end if;
  if not exists (select 1 from pg_class where oid = 'public.world_contributor_research_v1'::regclass
     and reloptions @> array['security_invoker=true', 'security_barrier=true']) then raise exception 'AFTER: view options lost'; end if;
end $$;
\i supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
\i supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql
do $$ begin
  if pg_get_viewdef('public.world_contributor_research_v1'::regclass, true) <> (select d from public.m0d_before) then raise exception 'ROLLBACK: definition not restored exactly'; end if;
  if pg_temp.anon_rows() is distinct from 'approved public' then raise exception 'ROLLBACK: rows differ'; end if;
end $$;
\o
\echo 'M0-D contributor research view regression: PASS'
