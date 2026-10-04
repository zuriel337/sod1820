-- Focused SQL test for 20261004110000_research_path_public_reader_v1.sql.
-- Runs against a THROWAWAY local Postgres (never the live project). Every check raises on failure.
-- Harness: create roles (anon/authenticated/service_role), auth.uid() reading request.jwt.claim.sub, public.users and the REAL
-- public.rd_is_admin() body (users.id = auth.uid() and role='admin'), apply 20260907142000 + 20260913160507 + 20260922205800
-- + the migration under test, then \i this file. Tested V1 reader behaviour + V2 retraction (bottom section).
\set ON_ERROR_STOP on

create or replace function pg_temp.expect_err(p_sql text, p_state text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then
    if sqlstate = p_state then return; end if;
    raise exception 'FAIL: % raised % (%), wanted %', p_sql, sqlstate, sqlerrm, p_state;
  end;
  raise exception 'FAIL: no error for %, wanted %', p_sql, p_state;
end $$;
create or replace function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin if p_cond is not true then raise exception 'FAIL: %', p_msg; end if; end $$;

-- fixtures emulate rows that could predate this migration. Disable user triggers ONLY while seeding.
set session_replication_role = replica;
insert into research_paths(id, created_by_user_id, identity_metadata) values
 ('00000000-0000-0000-0000-0000000000a1','11111111-1111-1111-1111-111111111111','{"secret":"identity"}'),   -- A: public r1 + newer private candidate r2
 ('00000000-0000-0000-0000-0000000000b1','11111111-1111-1111-1111-111111111111','{}'),                      -- B: candidate/private only
 ('00000000-0000-0000-0000-0000000000c1','11111111-1111-1111-1111-111111111111','{}'),                      -- C: approved+private
 ('00000000-0000-0000-0000-0000000000d1','11111111-1111-1111-1111-111111111111','{}'),                      -- D: approved+public, unpublished
 ('00000000-0000-0000-0000-0000000000e1','11111111-1111-1111-1111-111111111111','{}'),                      -- E: rejected+public (unpublished)
 ('00000000-0000-0000-0000-0000000000f1','11111111-1111-1111-1111-111111111111','{}'),                      -- F: approved+public, future published_at
 ('00000000-0000-0000-0000-0000000000a2','11111111-1111-1111-1111-111111111111','{}');                      -- A2: canonical public

insert into research_path_revisions(id,path_id,revision_no,created_by_user_id,governance_status,published_at,access_scope,steps,provenance,representation) values
 ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1',1,'11111111-1111-1111-1111-111111111111','approved',now()-interval '1 day','public',
   '[{"step_index":0,"entity_type":"x","entity_ref":"r","href":"/ok/path","surface":"s","reason":"public reason","finding_refs":["PRIVATE_FINDING"],"source_refs":["PRIVATE_SOURCE"],"version_refs":["PRIVATE_VERSION"],"negative_scope":{"secret":"PRIVATE_SCOPE"},"evil":"drop","created_by":"leak"},{"step_index":1,"href":"javascript:alert(1)"},{"step_index":2,"href":"//evil.example/x"},{"step_index":3,"href":"/\t/evil.example"},{"step_index":4,"href":"/\n/evil.example"}]',
   '{"save_key":"SECRET_SAVE","fork_key":"SECRET_FORK","writer":"w"}','{"surface":"s","href":"/rep","leak":"x"}'),
 ('10000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a1',2,'11111111-1111-1111-1111-111111111111','candidate',null,'private',
   '[{"step_index":0,"entity_ref":"NEWER_PRIVATE"}]','{}','{}'),
 ('10000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1',1,null,'candidate',null,'private','[{"step_index":0}]','{}','{}'),
 ('10000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1',1,null,'approved',null,'private','[{"step_index":0}]','{}','{}'),
 ('10000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d1',1,null,'approved',null,'public','[{"step_index":0}]','{}','{}'),
 ('10000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000e1',1,null,'rejected',null,'public','[{"step_index":0}]','{}','{}'),
 ('10000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f1',1,null,'approved',now()+interval '1 day','public','[{"step_index":0}]','{}','{}'),
 ('10000000-0000-0000-0000-0000000000a4','00000000-0000-0000-0000-0000000000a2',1,null,'canonical',now()-interval '1 hour','public','[{"step_index":0}]','{}','{}');

-- fork whose parent branch point is public (A r1) and one whose parent is private (B r1)
insert into research_paths(id,created_by_user_id,parent_path_id,branch_point_revision_id,branch_point_step_index) values
 ('00000000-0000-0000-0000-0000000000a3',null,'00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',0),
 ('00000000-0000-0000-0000-0000000000b3',null,'00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000b1',0);
insert into research_path_revisions(id,path_id,revision_no,governance_status,published_at,access_scope,steps) values
 ('10000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000a3',1,'approved',now()-interval '1 hour','public','[{"step_index":0}]'),
 ('10000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000b3',1,'approved',now()-interval '1 hour','public','[{"step_index":0}]');
set session_replication_role = origin;

-- constraints --------------------------------------------------------------------------------
set session_replication_role = replica;
select pg_temp.expect_err($insert into research_path_revisions(path_id,revision_no,steps,access_scope) values ('00000000-0000-0000-0000-0000000000b1',9,'[]','team')$$,'23514');
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,published_at) values ('00000000-0000-0000-0000-0000000000b1',9,'[]',now())$$,'23514'); -- candidate+private
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,published_at,governance_status) values ('00000000-0000-0000-0000-0000000000b1',9,'[]',now(),'approved')$$,'23514'); -- private
select pg_temp.expect_err($insert into research_path_revisions(path_id,revision_no,steps,published_at,governance_status,access_scope) values ('00000000-0000-0000-0000-0000000000b1',9,'[]',now(),'rejected','public')$,'23514');
set session_replication_role = origin;
select pg_temp.expect_err($update research_path_revisions set published_at=now() where id='10000000-0000-0000-0000-0000000000c1'$$,'42501'); -- direct publication has no Human Gate

-- immutability -------------------------------------------------------------------------------
select pg_temp.expect_err($$update research_path_revisions set steps='[{"step_index":0,"entity_ref":"mutated"}]' where id='10000000-0000-0000-0000-0000000000a1'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set representation='{}' where id='10000000-0000-0000-0000-0000000000a1'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set governance_status='rejected' where id='10000000-0000-0000-0000-0000000000a1'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set published_at=null where id='10000000-0000-0000-0000-0000000000a1'$$,'23001');
select pg_temp.expect_err($$delete from research_path_revisions where id='10000000-0000-0000-0000-0000000000a1'$$,'23001');
select pg_temp.expect_err($$truncate research_path_revisions cascade$$,'23001');
select pg_temp.expect_err($$update research_paths set identity_metadata='{"x":1}' where id='00000000-0000-0000-0000-0000000000a1'$$,'23001');
select pg_temp.expect_err($$delete from research_paths where id='00000000-0000-0000-0000-0000000000a1'$$,'23001');
-- unpublished rows stay writable (candidate append path / promotion path unaffected)
update research_path_revisions set steps='[{"step_index":0,"entity_ref":"edited"}]' where id='10000000-0000-0000-0000-0000000000a2';
update research_paths set identity_metadata='{"ok":1}' where id='00000000-0000-0000-0000-0000000000b1';
insert into research_paths(id) values ('00000000-0000-0000-0000-0000000000f9');
insert into research_path_revisions(id,path_id,revision_no,steps) values ('10000000-0000-0000-0000-0000000000f9','00000000-0000-0000-0000-0000000000f9',1,'[{"step_index":0}]');
select pg_temp.expect_err($$update research_path_revisions set governance_status='approved', access_scope='public', published_at=now()-interval '1 minute' where id='10000000-0000-0000-0000-0000000000f9'$$,'42501'); -- direct combined governance+publication is forbidden
select pg_temp.ok((select governance_status='candidate' and published_at is null and access_scope='private' from research_path_revisions where id='10000000-0000-0000-0000-0000000000f9'), 'failed direct promotion changed nothing');
-- f9 stays candidate/private for the Human-Gate governance+publication tests below

-- ACL / definition ---------------------------------------------------------------------------
select pg_temp.ok((select prosecdef and provolatile='s' and proconfig = array['search_path=pg_catalog, public'] from pg_proc where oid='public.fn_research_path_public_read_v1(uuid,integer)'::regprocedure), 'reader definer/stable/search_path');
select pg_temp.ok(has_function_privilege('anon','public.fn_research_path_public_read_v1(uuid,integer)','execute'), 'anon exec');
select pg_temp.ok(has_function_privilege('authenticated','public.fn_research_path_public_read_v1(uuid,integer)','execute'), 'auth exec');
select pg_temp.ok(has_function_privilege('service_role','public.fn_research_path_public_read_v1(uuid,integer)','execute'), 'service exec');
select pg_temp.ok(not exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a where p.oid='public.fn_research_path_public_read_v1(uuid,integer)'::regprocedure and a.grantee=0), 'PUBLIC has no exec on reader');
select pg_temp.ok(not has_function_privilege('anon','public.fn_research_path_public_project_v1(jsonb,jsonb)','execute') and not has_function_privilege('authenticated','public.fn_research_path_public_project_v1(jsonb,jsonb)','execute'), 'helper not client-callable');
select pg_temp.ok(not has_function_privilege('anon','public.fn_research_path_published_immutable_v1()','execute'), 'trigger fn not client-callable');
select pg_temp.ok(not has_table_privilege('anon','public.research_paths','select') and not has_table_privilege('authenticated','public.research_paths','select') and not has_table_privilege('anon','public.research_path_revisions','select') and not has_table_privilege('authenticated','public.research_path_revisions','select'), 'no table select for clients');
select pg_temp.ok((select count(*) from pg_policy where polrelid in ('public.research_paths'::regclass,'public.research_path_revisions'::regclass))=0, 'no policies');
select pg_temp.ok(not exists (select 1 from pg_views where schemaname='public' and definition ilike '%research_path%'), 'no views over path tables');

-- reader behaviour, run as the client roles --------------------------------------------------
create temp table res(who text, label text, j jsonb);
grant all on res to anon, authenticated;
create or replace function pg_temp.call(p_path text, p_rev int default null) returns jsonb language sql as $$ select public.fn_research_path_public_read_v1(p_path::uuid, p_rev) $$;
grant execute on function pg_temp.call(text,int) to anon, authenticated;

set role anon;
insert into res select 'anon','random', public.fn_research_path_public_read_v1('99999999-9999-9999-9999-999999999999');
insert into res select 'anon','null_id', public.fn_research_path_public_read_v1(null);
insert into res select 'anon','B_candidate_private', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000b1');
insert into res select 'anon','C_approved_private', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000c1');
insert into res select 'anon','D_public_unpublished', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000d1');
insert into res select 'anon','E_rejected_public', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000e1');
insert into res select 'anon','F_future_published', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000f1');
insert into res select 'anon','A_newer_private_explicit', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a1', 2);
insert into res select 'anon','A_missing_rev', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a1', 99);
insert into res select 'anon','A_default', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a1');
insert into res select 'anon','A_rev1', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a1', 1);
insert into res select 'anon','A2_canonical', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a2');
insert into res select 'anon','A3_fork_public_parent', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a3');
insert into res select 'anon','B3_fork_private_parent', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000b3');
select pg_temp.expect_err($$select count(*) from public.research_paths$$,'42501');
select pg_temp.expect_err($$select count(*) from public.research_path_revisions$$,'42501');
select pg_temp.expect_err($$insert into public.research_path_revisions(path_id,revision_no,steps) values ('00000000-0000-0000-0000-0000000000b1',50,'[]')$$,'42501');
select pg_temp.expect_err($$update public.research_path_revisions set governance_status='approved'$$,'42501');
select pg_temp.expect_err($$delete from public.research_paths$$,'42501');
select pg_temp.expect_err($$select public.fn_research_path_resume_v1()$$,'42501');
reset role;

-- existing private runtime unchanged: no anon/PUBLIC exec on resume/append/fork, authenticated still has it
select pg_temp.ok(not has_function_privilege('anon', p.oid, 'execute') and has_function_privilege('authenticated', p.oid, 'execute'), 'private runtime ACL unchanged: '||p.proname)
  from pg_proc p where p.proname in ('fn_research_path_resume_v1','fn_research_path_append_v1','fn_research_path_fork_v1') and p.pronamespace='public'::regnamespace;

-- result assertions --------------------------------------------------------------------------
create or replace function pg_temp.r(p_label text) returns jsonb language sql as $$ select j from res where label=p_label $$;
select pg_temp.ok(pg_temp.r(l) = '{"ok":false,"error":"not_found"}'::jsonb, 'generic not_found byte-identical: '||l)
  from unnest(array['random','null_id','B_candidate_private','C_approved_private','D_public_unpublished','E_rejected_public','F_future_published','A_newer_private_explicit','A_missing_rev']) l;
select pg_temp.ok((pg_temp.r('random'))::text = (pg_temp.r('B_candidate_private'))::text, 'ineligible output identical to nonexistent');

-- newer private candidate must not hide the older public revision
select pg_temp.ok((pg_temp.r('A_default')->>'revision_no')::int = 1 and pg_temp.r('A_default')->>'revision_id' = '10000000-0000-0000-0000-0000000000a1', 'default = latest ELIGIBLE revision');
select pg_temp.ok(pg_temp.r('A_default') = pg_temp.r('A_rev1'), 'explicit rev1 == default');
select pg_temp.ok(pg_temp.r('A_default')::text not like '%NEWER_PRIVATE%', 'newer private candidate content not served');

-- exact allowlist ----------------------------------------------------------------------------
select pg_temp.ok((select array_agg(k order by k) from jsonb_object_keys(pg_temp.r('A_default')) k) =
  array['branch_point_step_index','governance_status','ok','parent_path_id','path_id','published_at','reference_validation','representation','revision_id','revision_no','steps'], 'top-level key allowlist exact');
select pg_temp.ok(pg_temp.r('A_default')->>'governance_status'='approved' and pg_temp.r('A2_canonical')->>'governance_status'='canonical', 'governance_status passed through as-is (no approved->published/canonical mapping)');
select pg_temp.ok(pg_temp.r('A_default')->>'published_at' is not null, 'published_at separate axis present');
select pg_temp.ok(pg_temp.r('A_default')->'steps' = '[{"step_index":0,"entity_type":"x","entity_ref":"r","href":"/ok/path","surface":"s","reason":"public reason"},{"step_index":1},{"step_index":2},{"step_index":3},{"step_index":4}]'::jsonb, 'steps sanitized: only bounded scalars + safe relative href survive');
select pg_temp.ok(pg_temp.r('A_default')::text !~* '(PRIVATE_FINDING|PRIVATE_SOURCE|PRIVATE_VERSION|PRIVATE_SCOPE|negative_scope|finding_refs|source_refs|version_refs)', 'nested/private reference envelopes are not public projection v1');
select pg_temp.ok(pg_temp.r('A_default')->'representation' = '{"surface":"s","href":"/rep"}'::jsonb, 'representation allowlist');
select pg_temp.ok(pg_temp.r('A_default')::text !~* '(provenance|save_key|fork_key|SECRET|created_by|identity_metadata|identity|parent_revision|11111111-1111|evil|leak)', 'no provenance/created_by/identity_metadata leakage');

-- lineage
select pg_temp.ok(pg_temp.r('A3_fork_public_parent')->>'parent_path_id' = '00000000-0000-0000-0000-0000000000a1' and (pg_temp.r('A3_fork_public_parent')->>'branch_point_step_index')::int = 0, 'public parent lineage disclosed');
select pg_temp.ok(pg_temp.r('B3_fork_private_parent')->'parent_path_id' = 'null'::jsonb and pg_temp.r('B3_fork_private_parent')->'branch_point_step_index' = 'null'::jsonb, 'private parent lineage hidden');
select pg_temp.ok(pg_temp.r('B3_fork_private_parent')::text not like '%00000000-0000-0000-0000-0000000000b1%' and pg_temp.r('B3_fork_private_parent')::text not like '%10000000-0000-0000-0000-0000000000b1%', 'private parent ids absent');

-- search_path hijack: shadow objects in a user schema / pg_temp must not affect the definer fn
create schema evil; grant usage on schema evil to anon;
create table evil.research_path_revisions (like public.research_path_revisions);
insert into evil.research_path_revisions select * from public.research_path_revisions where id='10000000-0000-0000-0000-0000000000b1';
update evil.research_path_revisions set governance_status='approved', access_scope='public', published_at=now()-interval '1 day';
set role anon; set search_path = evil, pg_temp, public;
select pg_temp.ok(public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000b1') = '{"ok":false,"error":"not_found"}'::jsonb, 'search_path hijack ineffective');
reset role; reset search_path;

-- non-owner authenticated behaves identically to anon (no owner-based widening)
set role authenticated;
select pg_temp.ok(public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000b1') = '{"ok":false,"error":"not_found"}'::jsonb, 'authenticated non-owner: candidate -> not_found');
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a1')->>'revision_no')::int = 1, 'authenticated can read public revision');
select pg_temp.expect_err($$select count(*) from public.research_path_revisions$$,'42501');
reset role;

-- candidate fixture (f9) remains private until explicit V3 Human Gate below
select pg_temp.ok(public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000f9')='{"ok":false,"error":"not_found"}'::jsonb, 'candidate fixture stays private before Human Gate');

-- migration did not touch pre-existing rows: constraint validation only (checked by harness via row count / md5)
-- default revision = latest published revision; newer private draft does not hide it
set session_replication_role = replica;
insert into research_paths(id) values ('00000000-0000-0000-0000-0000000000a9');
insert into research_path_revisions(path_id,revision_no,governance_status,published_at,access_scope,steps) values
 ('00000000-0000-0000-0000-0000000000a9',1,'approved',now()-interval '2 days','public','[{"step_index":0}]'),
 ('00000000-0000-0000-0000-0000000000a9',2,'canonical',now()-interval '1 day','public','[{"step_index":0}]'),
 ('00000000-0000-0000-0000-0000000000a9',3,'candidate',null,'private','[{"step_index":0}]');
set session_replication_role = origin;
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a9')->>'revision_no')::int = 2, 'default = latest published while newer private draft stays hidden');
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a9',1)->>'revision_no')::int = 1, 'older eligible revision addressable');

-- defense in depth: reader's own filter holds even if the publication CHECK were absent (rolled back)
begin;
alter table research_path_revisions drop constraint research_path_revisions_published_requires_approved_public_ck;
set local session_replication_role = replica;
insert into research_paths(id) values ('00000000-0000-0000-0000-0000000000aa');
insert into research_path_revisions(path_id,revision_no,governance_status,published_at,access_scope,steps) values
 ('00000000-0000-0000-0000-0000000000aa',1,'approved',now()-interval '1 day','private','[{"step_index":0}]'),
 ('00000000-0000-0000-0000-0000000000aa',2,'rejected',now()-interval '1 day','public','[{"step_index":0}]'),
 ('00000000-0000-0000-0000-0000000000aa',3,'candidate',now()-interval '1 day','public','[{"step_index":0}]');
set local session_replication_role = origin;
select pg_temp.ok(public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000aa') = '{"ok":false,"error":"not_found"}'::jsonb, 'reader filter independent of CHECK');
rollback;


-- =================================================================================================
-- V2: Human-Gate retraction (work_log 605bc8ad-be64-4f19-8fac-dd664a476873)
-- =================================================================================================
-- real rd_is_admin() contract exercised unmodified: admin = public.users row with role='admin' matching auth.uid()
insert into public.users(id, role) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','admin'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','user');
create or replace function pg_temp.as_uid(p_uid text) returns void language sql as $ select set_config('request.jwt.claim.sub', coalesce(p_uid,''), false) $;

set session_replication_role = replica;
insert into research_paths(id) values ('00000000-0000-0000-0000-0000000000c9'),('00000000-0000-0000-0000-0000000000c8');
insert into research_path_revisions(id,path_id,revision_no,governance_status,published_at,access_scope,steps) values
 ('10000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-0000000000c9',1,'approved',now()-interval '2 days','public','[{"step_index":0,"entity_ref":"R1"}]'),
 ('10000000-0000-0000-0000-0000000000c8','00000000-0000-0000-0000-0000000000c9',2,'canonical',now()-interval '1 day','public','[{"step_index":0,"entity_ref":"R2"}]'),
 ('10000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-0000000000c9',3,'candidate',null,'private','[{"step_index":0}]'),
 ('10000000-0000-0000-0000-0000000000d9','00000000-0000-0000-0000-0000000000c8',1,'approved',now()-interval '1 day','public','[{"step_index":0}]');
insert into research_paths(id,parent_path_id,branch_point_revision_id,branch_point_step_index) values
 ('00000000-0000-0000-0000-0000000000c6','00000000-0000-0000-0000-0000000000c8','10000000-0000-0000-0000-0000000000d9',0);
insert into research_path_revisions(path_id,revision_no,governance_status,published_at,access_scope,steps) values
 ('00000000-0000-0000-0000-0000000000c6',1,'approved',now()-interval '1 hour','public','[{"step_index":0}]');
set session_replication_role = origin;

-- columns + coherence CHECK
select pg_temp.ok((select count(*)=3 from information_schema.columns where table_schema='public' and table_name='research_path_revisions' and column_name in ('retracted_at','retracted_by_user_id','retraction_reason')), 'retraction columns exist');
set session_replication_role = replica;
select pg_temp.expect_err($insert into research_path_revisions(path_id,revision_no,steps,retracted_at) values ('00000000-0000-0000-0000-0000000000b1',70,'[]',now())$$,'23514'); -- partial
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,retraction_reason) values ('00000000-0000-0000-0000-0000000000b1',71,'[]','why')$$,'23514'); -- partial
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,retracted_at,retracted_by_user_id,retraction_reason) values ('00000000-0000-0000-0000-0000000000b1',72,'[]',now(),'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','x')$$,'23514'); -- unpublished
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,governance_status,access_scope,published_at,retracted_at,retracted_by_user_id,retraction_reason) values ('00000000-0000-0000-0000-0000000000b1',73,'[]','approved','public',now()-interval '1 day',now(),'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','   ')$$,'23514'); -- blank reason
select pg_temp.expect_err(format($insert into research_path_revisions(path_id,revision_no,steps,governance_status,access_scope,published_at,retracted_at,retracted_by_user_id,retraction_reason) values ('00000000-0000-0000-0000-0000000000b1',74,'[]','approved','public',now()-interval '1 day',now(),'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',%L)$, repeat('x',1001)),'23514'); -- too long
set session_replication_role = origin;

-- ACL
select pg_temp.ok((select prosecdef and proconfig = array['search_path=pg_catalog, public'] from pg_proc where oid='public.fn_research_path_public_retract_v1(uuid,integer,text)'::regprocedure), 'retract definer/search_path');
select pg_temp.ok(has_function_privilege('authenticated','public.fn_research_path_public_retract_v1(uuid,integer,text)','execute'), 'authenticated exec retract');
select pg_temp.ok(not has_function_privilege('anon','public.fn_research_path_public_retract_v1(uuid,integer,text)','execute'), 'anon no exec retract');
select pg_temp.ok(not has_function_privilege('service_role','public.fn_research_path_public_retract_v1(uuid,integer,text)','execute'), 'service_role no exec retract');
select pg_temp.ok(not exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a where p.oid='public.fn_research_path_public_retract_v1(uuid,integer,text)'::regprocedure and a.grantee=0), 'PUBLIC no exec retract');
select pg_temp.ok(not has_function_privilege('authenticated','public.fn_research_path_published_immutable_v1()','execute') and not has_function_privilege('service_role','public.fn_research_path_published_immutable_v1()','execute'), 'trigger fn not client-callable');
select pg_temp.ok((select prosecdef and proconfig = array['search_path=pg_catalog, public'] from pg_proc where oid='public.fn_research_path_governance_decide_v1(uuid,integer,text,text)'::regprocedure), 'governance definer/search_path');
select pg_temp.ok((select prosecdef and proconfig = array['search_path=pg_catalog, public'] from pg_proc where oid='public.fn_research_path_public_publish_v1(uuid,integer,text)'::regprocedure), 'publish definer/search_path');
select pg_temp.ok(has_function_privilege('authenticated','public.fn_research_path_governance_decide_v1(uuid,integer,text,text)','execute'), 'authenticated exec governance');
select pg_temp.ok(has_function_privilege('authenticated','public.fn_research_path_public_publish_v1(uuid,integer,text)','execute'), 'authenticated exec publish');
select pg_temp.ok(not has_function_privilege('anon','public.fn_research_path_governance_decide_v1(uuid,integer,text,text)','execute')
  and not has_function_privilege('service_role','public.fn_research_path_governance_decide_v1(uuid,integer,text,text)','execute'), 'anon/service no governance exec');
select pg_temp.ok(not has_function_privilege('anon','public.fn_research_path_public_publish_v1(uuid,integer,text)','execute')
  and not has_function_privilege('service_role','public.fn_research_path_public_publish_v1(uuid,integer,text)','execute'), 'anon/service no publish exec');

-- denied callers
set role anon;
select pg_temp.expect_err($$select public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',1,'r')$$,'42501');
reset role;
set role service_role;
select pg_temp.expect_err($$select public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',1,'r')$$,'42501');
reset role;
set role authenticated;
select pg_temp.as_uid(null);
select pg_temp.expect_err($$select public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',1,'r')$$,'42501'); -- no uid
select pg_temp.as_uid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select pg_temp.expect_err($$select public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',1,'r')$$,'42501'); -- non-admin
select pg_temp.as_uid('cccccccc-cccc-cccc-cccc-cccccccccccc');
select pg_temp.expect_err($$select public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',1,'r')$$,'42501'); -- unknown uid
reset role;
select pg_temp.ok((select retracted_at is null from research_path_revisions where id='10000000-0000-0000-0000-0000000000c9'), 'denied callers changed nothing');

-- direct table mutation of retraction fields without admin actor
select pg_temp.as_uid(null);
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now(), retracted_by_user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', retraction_reason='direct' where id='10000000-0000-0000-0000-0000000000c9'$$,'23001'); -- superuser, no auth.uid
set role service_role;
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now(), retracted_by_user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', retraction_reason='direct' where id='10000000-0000-0000-0000-0000000000c9'$$,'23001'); -- service_role, no auth.uid
reset role;
select pg_temp.as_uid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
set role service_role;
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now(), retracted_by_user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', retraction_reason='direct' where id='10000000-0000-0000-0000-0000000000c9'$$,'23001'); -- non-admin uid
reset role;
set role authenticated;
select pg_temp.as_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now() where id='10000000-0000-0000-0000-0000000000c9'$$,'42501'); -- admin has no table grant
reset role;
-- admin uid but spoofed actor / extra column changes / not an exact retraction transition
select pg_temp.as_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now(), retracted_by_user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', retraction_reason='spoof' where id='10000000-0000-0000-0000-0000000000c9'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now(), retracted_by_user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', retraction_reason='x', steps='[]' where id='10000000-0000-0000-0000-0000000000c9'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now(), retracted_by_user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', retraction_reason='x', governance_status='canonical' where id='10000000-0000-0000-0000-0000000000c9'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now(), retracted_by_user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', retraction_reason='x', published_at=now() where id='10000000-0000-0000-0000-0000000000c9'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now(), retracted_by_user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', retraction_reason='x', access_scope='private' where id='10000000-0000-0000-0000-0000000000c9'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set steps='[]' where id='10000000-0000-0000-0000-0000000000c9'$$,'23001'); -- admin cannot edit content directly
select pg_temp.expect_err($$delete from research_path_revisions where id='10000000-0000-0000-0000-0000000000c9'$$,'23001');
select pg_temp.as_uid(null);

-- RPC as admin: validation and eligibility
create temp table rt(label text, j jsonb);
grant all on rt to authenticated;
select pg_temp.as_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
set role authenticated;
select pg_temp.expect_err($$select public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',1,null)$$,'22023');
select pg_temp.expect_err($$select public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',1,'   ')$$,'22023');
select pg_temp.expect_err(format($$select public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',1,%L)$$, repeat('x',1001)),'22023');
insert into rt select 'unpublished', public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',3,'not published');
insert into rt select 'missing_rev', public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',99,'nope');
insert into rt select 'missing_path', public.fn_research_path_public_retract_v1('99999999-9999-9999-9999-999999999999',1,'nope');
reset role;
select pg_temp.ok((select j = '{"ok":false,"error":"not_found"}'::jsonb from rt where label='unpublished') and (select j = '{"ok":false,"error":"not_found"}'::jsonb from rt where label='missing_rev') and (select j = '{"ok":false,"error":"not_found"}'::jsonb from rt where label='missing_path'), 'retract ineligible -> not_found');

-- RPC as admin: success; snapshot proves only the three retraction fields change
create temp table snap as select to_jsonb(r) j from research_path_revisions r where id='10000000-0000-0000-0000-0000000000c8';
select pg_temp.as_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
set role authenticated;
insert into rt select 'ok_r2', public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',2,'withdrawn: error found');
reset role;
select pg_temp.ok((select (j->>'ok')::boolean from rt where label='ok_r2'), 'admin retract ok');
select pg_temp.ok((select retracted_at is not null and retracted_by_user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and retraction_reason='withdrawn: error found' and retracted_at <= now() and retracted_at > now()-interval '1 minute'
  from research_path_revisions where id='10000000-0000-0000-0000-0000000000c8'), 'actor=auth.uid, reason, time stored');
select pg_temp.ok((select (to_jsonb(r) - 'retracted_at' - 'retracted_by_user_id' - 'retraction_reason') = (j - 'retracted_at' - 'retracted_by_user_id' - 'retraction_reason')
  from research_path_revisions r, snap where r.id='10000000-0000-0000-0000-0000000000c8'), 'content/governance/published_at/access_scope unchanged');
select pg_temp.ok((select governance_status='canonical' and access_scope='public' and published_at is not null from research_path_revisions where id='10000000-0000-0000-0000-0000000000c8'), 'governance/access/published_at preserved');
select pg_temp.ok((select retracted_at is null from research_path_revisions where id in ('10000000-0000-0000-0000-0000000000c9')), 'sibling revision untouched');

-- second retract + unretract/mutation after retraction
set role authenticated;
insert into rt select 'again', public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c9',2,'again');
reset role;
select pg_temp.ok((select j = '{"ok":false,"error":"already_retracted"}'::jsonb from rt where label='again'), 'double retract rejected, original kept');
select pg_temp.ok((select retraction_reason='withdrawn: error found' from research_path_revisions where id='10000000-0000-0000-0000-0000000000c8'), 'original retraction not overwritten');
select pg_temp.expect_err($$update research_path_revisions set retracted_at=null, retracted_by_user_id=null, retraction_reason=null where id='10000000-0000-0000-0000-0000000000c8'$$,'23001'); -- unretract (admin uid)
select pg_temp.expect_err($$update research_path_revisions set retraction_reason='edited' where id='10000000-0000-0000-0000-0000000000c8'$$,'23001');
select pg_temp.expect_err($$update research_path_revisions set retracted_at=now() where id='10000000-0000-0000-0000-0000000000c8'$$,'23001');
select pg_temp.expect_err($$delete from research_path_revisions where id='10000000-0000-0000-0000-0000000000c8'$$,'23001');
select pg_temp.as_uid(null);
select pg_temp.expect_err($$update research_path_revisions set retracted_at=null, retracted_by_user_id=null, retraction_reason=null where id='10000000-0000-0000-0000-0000000000c8'$$,'23001'); -- unretract (no uid)
select pg_temp.expect_err($$update research_path_revisions set published_at=null where id='10000000-0000-0000-0000-0000000000c8'$$,'23001');
select pg_temp.ok(not exists (select 1 from pg_proc where pronamespace='public'::regnamespace and (proname ilike '%unretract%' or proname ilike '%restore_public%')), 'no unretract RPC');

-- reader after retraction: default fails closed; older revision requires explicit address.
set role anon;
insert into res select 'anon','R_retracted_explicit', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000c9', 2);
insert into res select 'anon','R_default_after', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000c9');
insert into res select 'anon','R_older_explicit', public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000c9', 1);
reset role;
select pg_temp.ok(pg_temp.r('R_retracted_explicit') = '{"ok":false,"error":"not_found"}'::jsonb, 'retracted revision -> generic not_found');
select pg_temp.ok(pg_temp.r('R_default_after') = '{"ok":false,"error":"not_found"}'::jsonb, 'default does not silently fall back after latest publication retraction');
select pg_temp.ok((pg_temp.r('R_older_explicit')->>'revision_no')::int = 1, 'older public revision remains explicitly addressable');
select pg_temp.ok(pg_temp.r('R_default_after')::text !~* 'retract|withdrawn', 'no retraction metadata leaked');
select pg_temp.ok((select array_agg(k order by k) from jsonb_object_keys(pg_temp.r('A_default')) k) =
  array['branch_point_step_index','governance_status','ok','parent_path_id','path_id','published_at','reference_validation','representation','revision_id','revision_no','steps'], 'reader key allowlist unchanged by V2');

-- single-revision path: retraction makes the whole path generic not_found; fork lineage to retracted branch point hidden
select pg_temp.as_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
set role authenticated;
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000c6')->>'parent_path_id') = '00000000-0000-0000-0000-0000000000c8', 'fork lineage disclosed before parent branch point retracted');
insert into rt select 'ok_d9', public.fn_research_path_public_retract_v1('00000000-0000-0000-0000-0000000000c8',1,'retire path');
select pg_temp.ok(public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000c8') = '{"ok":false,"error":"not_found"}'::jsonb, 'fully retracted path -> not_found');
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000c6')->'parent_path_id') = 'null'::jsonb, 'lineage to retracted branch point hidden');
reset role;
select pg_temp.as_uid(null);

-- =================================================================================================
-- V3: Human-Gate governance + publication, separate Truth axes
-- =================================================================================================

-- No direct/service-role bypass for INSERT, unpublished governance or publication.
select pg_temp.as_uid(null);
set role service_role;
select pg_temp.expect_err($insert into research_path_revisions(path_id,revision_no,governance_status,access_scope,published_at,steps) values ('00000000-0000-0000-0000-0000000000b1',88,'approved','public',now(),'[{"step_index":0}]')$,'42501');
reset role;
select pg_temp.ok(not exists (select 1 from research_path_revisions where path_id='00000000-0000-0000-0000-0000000000b1' and revision_no=88), 'service_role cannot mint approved+published revision');
select pg_temp.as_uid(null);
select pg_temp.expect_err($$update research_path_revisions set governance_status='approved' where id='10000000-0000-0000-0000-0000000000f9'$$,'42501');
set role service_role;
select pg_temp.expect_err($$update research_path_revisions set governance_status='approved' where id='10000000-0000-0000-0000-0000000000f9'$$,'42501');
select pg_temp.expect_err($$update research_path_revisions set access_scope='public', published_at=now() where id='10000000-0000-0000-0000-0000000000d1'$$,'42501');
reset role;

-- RPCs are authenticated-admin only.
set role anon;
select pg_temp.expect_err($$select public.fn_research_path_governance_decide_v1('00000000-0000-0000-0000-0000000000f9',1,'approve','x')$$,'42501');
select pg_temp.expect_err($$select public.fn_research_path_public_publish_v1('00000000-0000-0000-0000-0000000000f9',1,'x')$$,'42501');
reset role;
set role service_role;
select pg_temp.expect_err($$select public.fn_research_path_governance_decide_v1('00000000-0000-0000-0000-0000000000f9',1,'approve','x')$$,'42501');
select pg_temp.expect_err($$select public.fn_research_path_public_publish_v1('00000000-0000-0000-0000-0000000000f9',1,'x')$$,'42501');
reset role;
set role authenticated;
select pg_temp.as_uid(null);
select pg_temp.expect_err($$select public.fn_research_path_governance_decide_v1('00000000-0000-0000-0000-0000000000f9',1,'approve','x')$$,'42501');
select pg_temp.as_uid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select pg_temp.expect_err($$select public.fn_research_path_governance_decide_v1('00000000-0000-0000-0000-0000000000f9',1,'approve','x')$$,'42501');
select pg_temp.expect_err($$select public.fn_research_path_public_publish_v1('00000000-0000-0000-0000-0000000000f9',1,'x')$$,'42501');
reset role;

-- Admin cannot publish a candidate: governance first.
create temp table gp(label text, j jsonb);
grant all on gp to authenticated;
select pg_temp.as_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
set role authenticated;
insert into gp select 'candidate_publish_blocked', public.fn_research_path_public_publish_v1('00000000-0000-0000-0000-0000000000f9',1,'too early');
insert into gp select 'approve_f9', public.fn_research_path_governance_decide_v1('00000000-0000-0000-0000-0000000000f9',1,'approve','guided path reviewed');
reset role;
select pg_temp.ok((select j->>'error'='governance_required' from gp where label='candidate_publish_blocked'), 'candidate cannot publish');
select pg_temp.ok((select (j->>'ok')::boolean and j->>'governance_status'='approved' and j ? 'decision_ledger_id' from gp where label='approve_f9'), 'governance approve ok + ledger id');
select pg_temp.ok((select governance_status='approved' and access_scope='private' and published_at is null from research_path_revisions where id='10000000-0000-0000-0000-0000000000f9'), 'approve does not publish');
set role service_role;
select pg_temp.expect_err($update research_path_revisions set steps='[{"step_index":0,"entity_ref":"tampered-after-approval"}]' where id='10000000-0000-0000-0000-0000000000f9'$,'23001');
reset role;
select pg_temp.ok((select steps='[{"step_index":0}]'::jsonb from research_path_revisions where id='10000000-0000-0000-0000-0000000000f9'), 'approved content frozen before publication');
select pg_temp.ok((select count(*)=1 from decision_ledger where subject_ref='10000000-0000-0000-0000-0000000000f9' and decision_type='research_path_governance' and human_decision='approve' and status='confirmed' and decided_by='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and provenance->>'truth_axis'='governance' and (provenance->>'human_gate')::boolean), 'governance ledger provenance');
set role anon;
select pg_temp.ok(public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000f9')='{"ok":false,"error":"not_found"}'::jsonb, 'approved-private still not public');
reset role;

-- Publication is a second explicit Human-Gate act and freezes content.
select pg_temp.as_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
set role authenticated;
insert into gp select 'publish_f9', public.fn_research_path_public_publish_v1('00000000-0000-0000-0000-0000000000f9',1,'publish guided path');
reset role;
select pg_temp.ok((select (j->>'ok')::boolean and j->>'access_scope'='public' and j ? 'published_at' and j ? 'decision_ledger_id' from gp where label='publish_f9'), 'publication ok + ledger id');
select pg_temp.ok((select governance_status='approved' and access_scope='public' and published_at is not null from research_path_revisions where id='10000000-0000-0000-0000-0000000000f9'), 'publication axis stored');
select pg_temp.ok((select count(*)=1 from decision_ledger where subject_ref='10000000-0000-0000-0000-0000000000f9' and decision_type='research_path_publication' and human_decision='approve' and status='confirmed' and decided_by='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and provenance->>'truth_axis'='publication'), 'publication ledger provenance');
set role anon;
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000f9')->>'ok')::boolean, 'published revision publicly readable');
reset role;
select pg_temp.expect_err($$update research_path_revisions set steps='[]' where id='10000000-0000-0000-0000-0000000000f9'$$,'23001');

-- Reject is governance only and permanently blocks publication of that revision.
select pg_temp.as_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
set role authenticated;
insert into gp select 'reject_b1', public.fn_research_path_governance_decide_v1('00000000-0000-0000-0000-0000000000b1',1,'reject','not suitable');
insert into gp select 'publish_rejected', public.fn_research_path_public_publish_v1('00000000-0000-0000-0000-0000000000b1',1,'should not publish');
reset role;
select pg_temp.ok((select j->>'governance_status'='rejected' from gp where label='reject_b1'), 'candidate rejection works');
select pg_temp.ok((select j->>'error'='governance_required' and j->>'governance_status'='rejected' from gp where label='publish_rejected'), 'rejected cannot publish');
select pg_temp.ok((select count(*)=1 from decision_ledger where subject_ref='10000000-0000-0000-0000-0000000000b1' and decision_type='research_path_governance' and human_decision='reject' and status='rejected'), 'rejection ledger row');

-- Retraction is also ledgered on the publication axis.
select pg_temp.ok((select count(*)>=1 from decision_ledger where subject_ref='10000000-0000-0000-0000-0000000000c8' and decision_type='research_path_publication' and human_decision='modify' and status='executed' and provenance->>'truth_axis'='publication'), 'retraction decision ledger provenance');

select pg_temp.as_uid(null);

-- migration is purely additive for existing data: unpublished rows stay writable
update research_path_revisions set steps='[{"step_index":0,"entity_ref":"still-editable"}]' where id='10000000-0000-0000-0000-0000000000c7';

select 'ALL RESEARCH PATH PUBLIC READER TESTS PASSED' as result;
