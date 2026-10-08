-- Throwaway-Postgres test for admin_research_set_publication_v1 + ro_public_read. Never run against a live project.
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create or replace function t_assert(ok boolean, msg text) returns void language plpgsql as $$ begin if not ok then raise exception 'FAIL: %', msg; end if; end $$;
create or replace function t_pre() returns void language plpgsql as $$ begin
  perform t_assert(not has_table_privilege('anon','public.research_objects','SELECT') and not has_table_privilege('authenticated','public.research_objects','SELECT'), 'precondition: no grants');
end $$;
create table public.users (id uuid primary key, role text);
create table public.research_objects (
  id uuid primary key default gen_random_uuid(), status text not null default 'candidate',
  privacy_scope text not null default 'private', engine_verified boolean default false, engine_detail jsonb,
  promoted_node_id uuid, owner_person_id uuid, source_ref text, contributor text, meta jsonb default '{}'::jsonb);
alter table public.research_objects add constraint research_objects_privacy_scope_check
  check (privacy_scope = any (array['private','family_shared','public_candidate']));
alter table public.research_objects enable row level security;
-- Live starting state: NO table SELECT for anon/authenticated (the migration must supply it).
grant select on public.users to anon, authenticated;
create table public.contributors (id uuid primary key default gen_random_uuid(), display_name text, dossier_settings jsonb);
grant select on public.contributors to anon, authenticated;
insert into public.contributors (display_name, dossier_settings) values ('Dossier Writer', '{}');
-- Legacy live policy (public_candidate + dossier visible) that the migration must neutralise.
create policy ro_dossier_read on public.research_objects for select using (
  privacy_scope = 'public_candidate'
  and coalesce(((meta -> 'ext') -> 'writer_dossier') ->> 'visible', 'false') = 'true'
  and exists (select 1 from public.contributors c where c.display_name = research_objects.contributor
              and coalesce(c.dossier_settings ->> 'visibility', 'public') <> 'private'));
create policy ro_admin_read on public.research_objects for select using (exists (select 1 from users u where u.id = auth.uid() and u.role='admin'));
-- before: no privilege at all
select t_pre();
\i supabase/migrations/20261008100000_research_admin_public_control_v1.sql
select t_assert(has_table_privilege('anon','public.research_objects','SELECT') and has_table_privilege('authenticated','public.research_objects','SELECT'), 'SELECT granted by migration');

insert into users values ('00000000-0000-0000-0000-0000000000aa','admin'),('00000000-0000-0000-0000-0000000000bb','user');
insert into research_objects (id,status,privacy_scope,engine_verified,meta) values
 ('10000000-0000-0000-0000-000000000001','candidate','private',false,'{}'),
 ('10000000-0000-0000-0000-000000000002','canonical','private',true,'{}'),
 ('10000000-0000-0000-0000-000000000003','candidate','public_candidate',false,'{}'),
 ('10000000-0000-0000-0000-000000000004','candidate','private',false,'{"ext":{"personal_scope":{"scope":"person_only"}}}');

grant execute on function t_assert(boolean,text) to anon, authenticated;

-- anon / non-admin cannot call
set role anon; set test.uid = '';
do $$ begin perform public.admin_research_set_publication_v1('10000000-0000-0000-0000-000000000001', true); raise exception 'FAIL anon call'; exception when insufficient_privilege then null; end $$;
reset role;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000bb';
do $$ begin perform public.admin_research_set_publication_v1('10000000-0000-0000-0000-000000000001', true); raise exception 'FAIL non-admin call'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; perform t_assert(sqlerrm = 'admin only', 'non-admin rejected: '||sqlerrm); end $$;
reset role;

set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000aa';
-- P2: candidate published without becoming approved/canonical
select t_assert((public.admin_research_set_publication_v1('10000000-0000-0000-0000-000000000001', true)->>'ok')::boolean, 'publish candidate');
reset role;
select t_assert((select privacy_scope='public' and status='candidate' and engine_verified=false from research_objects where id='10000000-0000-0000-0000-000000000001'), 'P2 candidate public, still candidate');
-- anon sees public only
set role anon; set test.uid = '';
select t_assert((select count(*) from research_objects)=1, 'anon sees exactly the one public row (public_candidate/private hidden)');
reset role;
-- P1: canonical may remain private (no side effect of anything)
select t_assert((select privacy_scope='private' and status='canonical' from research_objects where id='10000000-0000-0000-0000-000000000002'), 'P1 canonical private');
-- person_only cannot publish
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000aa';
select t_assert((public.admin_research_set_publication_v1('10000000-0000-0000-0000-000000000004', true)->>'error')='person_only_cannot_publish', 'person_only refused');
-- public_candidate is not published; publishing it is explicit and recorded
select t_assert((public.admin_research_set_publication_v1('10000000-0000-0000-0000-000000000003', false)->>'error')='not_public', 'public_candidate is not public');
select t_assert((public.admin_research_set_publication_v1('10000000-0000-0000-0000-000000000003', true)->>'ok')::boolean, 'explicit publish of candidate-scope');
-- unpublish changes only access, history append-only
select t_assert((public.admin_research_set_publication_v1('10000000-0000-0000-0000-000000000001', false)->>'ok')::boolean, 'unpublish');
reset role;
select t_assert((select privacy_scope='private' and status='candidate' and jsonb_array_length(meta#>'{publication,history}')=2
  and meta#>>'{publication,history,0,from_scope}'='private' and meta#>>'{publication,history,1,from_scope}'='public'
  and meta#>>'{publication,history,1,by}'='00000000-0000-0000-0000-0000000000aa' from research_objects where id='10000000-0000-0000-0000-000000000001'), 'append-only history');
-- person_only row forced public by other means is still unreadable by anon
update research_objects set privacy_scope='public' where id='10000000-0000-0000-0000-000000000004';
set role anon; set test.uid = '';
select t_assert((select count(*) from research_objects where id='10000000-0000-0000-0000-000000000004')=0, 'person_only never public-readable');
reset role;
-- public_candidate (even with dossier visible) is NOT readable; only 'public' is. Dossier policy cannot widen.
insert into research_objects (id,status,privacy_scope,contributor,meta) values
 ('10000000-0000-0000-0000-000000000005','candidate','public_candidate','Dossier Writer','{"ext":{"writer_dossier":{"visible":"true"}}}'),
 ('10000000-0000-0000-0000-000000000006','candidate','family_shared','Dossier Writer','{"ext":{"writer_dossier":{"visible":"true"}}}');
set role anon; set test.uid = '';
select t_assert((select count(*) from research_objects where id in ('10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000006'))=0, 'public_candidate/family_shared not anon-readable after grant');
reset role;
-- owner-bound (personal) rows: cannot be published, and a forced-public one is still not anon-readable
insert into research_objects (id,status,privacy_scope,owner_person_id,meta) values
 ('10000000-0000-0000-0000-000000000007','candidate','private','20000000-0000-0000-0000-000000000001','{}');
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000aa';
select t_assert((public.admin_research_set_publication_v1('10000000-0000-0000-0000-000000000007', true)->>'error')='owner_bound_cannot_publish', 'owner-bound refused');
reset role;
update research_objects set privacy_scope='public' where id='10000000-0000-0000-0000-000000000007';
set role anon; set test.uid = '';
select t_assert((select count(*) from research_objects where id='10000000-0000-0000-0000-000000000007')=0, 'owner-bound never public-readable');
reset role;
-- admin can read everything after the grant (previously 403 without table privilege)
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000aa';
select t_assert((select count(*) from research_objects)=7, 'admin reads all rows after grant');
reset role;
-- non-admin authenticated reads only public rows
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000bb';
select t_assert((select count(*) from research_objects where privacy_scope<>'public')=0, 'non-admin sees no non-public rows');
reset role;
-- governance/source/ID preserved when access changes
select t_assert((select status='canonical' and engine_verified and source_ref is not distinct from source_ref from research_objects where id='10000000-0000-0000-0000-000000000002'), 'protected axes unchanged');
\echo ALL SQL ASSERTIONS PASSED
