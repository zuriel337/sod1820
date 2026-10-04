-- Focused SQL test for 20261004110000_research_path_public_reader_v1.sql.
-- Runs against a THROWAWAY local Postgres (never the live project). Every check raises on failure.
-- Harness: create roles, apply 20260907142000 + 20260913160507 + the migration under test, then \i this file.
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

-- fixtures (inserted as superuser, bypass RLS) ------------------------------------------------
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
   '[{"step_index":0,"entity_type":"x","entity_ref":"r","href":"/ok/path","surface":"s","evil":"drop","created_by":"leak"},{"step_index":1,"href":"javascript:alert(1)"},{"step_index":2,"href":"//evil.example/x"}]',
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

-- constraints --------------------------------------------------------------------------------
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,access_scope) values ('00000000-0000-0000-0000-0000000000b1',9,'[]','team')$$,'23514');
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,published_at) values ('00000000-0000-0000-0000-0000000000b1',9,'[]',now())$$,'23514'); -- candidate+private
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,published_at,governance_status) values ('00000000-0000-0000-0000-0000000000b1',9,'[]',now(),'approved')$$,'23514'); -- private
select pg_temp.expect_err($$insert into research_path_revisions(path_id,revision_no,steps,published_at,governance_status,access_scope) values ('00000000-0000-0000-0000-0000000000b1',9,'[]',now(),'rejected','public')$$,'23514');
select pg_temp.expect_err($$update research_path_revisions set published_at=now() where id='10000000-0000-0000-0000-0000000000c1'$$,'23514'); -- approved+private cannot be published

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
update research_path_revisions set governance_status='approved', access_scope='public', published_at=now()-interval '1 minute' where id='10000000-0000-0000-0000-0000000000f9'; -- promotion still possible
select pg_temp.expect_err($$update research_path_revisions set steps='[]' where id='10000000-0000-0000-0000-0000000000f9'$$,'23001'); -- ...then frozen
-- remove the promoted fixture from the reader matrix expectations by using its own id below

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
select pg_temp.ok(pg_temp.r('A_default')->'steps' = '[{"step_index":0,"entity_type":"x","entity_ref":"r","href":"/ok/path","surface":"s"},{"step_index":1},{"step_index":2}]'::jsonb, 'steps sanitized: unknown keys dropped, non-relative href dropped');
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

-- promoted fixture (f9) becomes readable only after promotion and is then frozen
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000f9')->>'ok')::boolean, 'promoted revision readable');

-- migration did not touch pre-existing rows: constraint validation only (checked by harness via row count / md5)
-- default revision = highest ELIGIBLE revision when several are eligible
insert into research_paths(id) values ('00000000-0000-0000-0000-0000000000a9');
insert into research_path_revisions(path_id,revision_no,governance_status,published_at,access_scope,steps) values
 ('00000000-0000-0000-0000-0000000000a9',1,'approved',now()-interval '2 days','public','[{"step_index":0}]'),
 ('00000000-0000-0000-0000-0000000000a9',2,'canonical',now()-interval '1 day','public','[{"step_index":0}]'),
 ('00000000-0000-0000-0000-0000000000a9',3,'candidate',null,'private','[{"step_index":0}]');
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a9')->>'revision_no')::int = 2, 'default = highest eligible among several');
select pg_temp.ok((public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000a9',1)->>'revision_no')::int = 1, 'older eligible revision addressable');

-- defense in depth: reader's own filter holds even if the publication CHECK were absent (rolled back)
begin;
alter table research_path_revisions drop constraint research_path_revisions_published_requires_approved_public_ck;
insert into research_paths(id) values ('00000000-0000-0000-0000-0000000000aa');
insert into research_path_revisions(path_id,revision_no,governance_status,published_at,access_scope,steps) values
 ('00000000-0000-0000-0000-0000000000aa',1,'approved',now()-interval '1 day','private','[{"step_index":0}]'),
 ('00000000-0000-0000-0000-0000000000aa',2,'rejected',now()-interval '1 day','public','[{"step_index":0}]'),
 ('00000000-0000-0000-0000-0000000000aa',3,'candidate',now()-interval '1 day','public','[{"step_index":0}]');
select pg_temp.ok(public.fn_research_path_public_read_v1('00000000-0000-0000-0000-0000000000aa') = '{"ok":false,"error":"not_found"}'::jsonb, 'reader filter independent of CHECK');
rollback;

select 'ALL RESEARCH PATH PUBLIC READER TESTS PASSED' as result;
