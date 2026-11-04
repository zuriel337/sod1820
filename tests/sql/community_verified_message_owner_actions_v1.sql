\set ON_ERROR_STOP on
begin;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;
create table public.users(id uuid primary key,role text);
create function public.rd_is_admin() returns boolean language sql stable security definer
set search_path to 'pg_catalog','public' as $$select exists(select 1 from public.users where id=auth.uid() and role='admin')$$;
create table contributors(id uuid primary key,user_id uuid);
create table persons(person_id uuid primary key,account_user_id uuid unique);
create table identity_edges(person_id uuid,kind text,legacy_id text,confidence integer,meta jsonb);
create table research_contributions(
 id uuid primary key,author_user_id uuid,author_contributor_id uuid,author_name text,origin text,
 status text default 'approved',body text,title text,image_url text,media jsonb default '[]',
 parent_id uuid,created_at timestamptz default '2016-03-08',updated_at timestamptz,
 edited_at timestamptz,deleted_at timestamptz,deleted_by uuid,thread_hidden_at timestamptz,
 graph_node_id uuid,projected_insight_id uuid
);
create table research_contribution_edits(id bigint generated always as identity,contribution_id uuid,body text,edited_by uuid,edited_at timestamptz);
create table research_contribution_deletions(contribution_id uuid primary key,body text,title text,image_url text,media jsonb,status text,deleted_by uuid,deleted_at timestamptz);
alter table research_contribution_edits enable row level security;
alter table research_contribution_deletions enable row level security;
revoke all on research_contribution_edits,research_contribution_deletions,persons,identity_edges from public,anon,authenticated;
-- Existing RPC signatures, whose privileges/OIDs must survive replacement.
create function community_edit_message(uuid,text) returns timestamptz language sql as $$select null::timestamptz$$;
create function community_delete_message(uuid) returns text language sql as $$select 'baseline'::text$$;
create function edit_contribution(uuid,text) returns void language sql as $$select$$;
create function remove_contribution(uuid) returns void language sql as $$select$$;
create temporary table previous_oids as select proname,oid from pg_proc where pronamespace='public'::regnamespace and proname in ('community_edit_message','community_delete_message','edit_contribution','remove_contribution');
create temporary table assertions(message text);
create function test_assert(ok boolean,message text) returns void language plpgsql security definer as $$
begin
 if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if;
 insert into pg_temp.assertions values(message);
end $$;
create function test_failure(statement text,expected_state text,message text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
   if sqlstate<>expected_state then raise; end if;
   perform public.test_assert(true,message); return;
 end;
 raise exception 'Expected SQLSTATE %: %',expected_state,message;
end $$;
create function fid(n integer) returns uuid language sql immutable as $$select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
insert into users values(fid(1),'member'),(fid(2),'member'),(fid(3),'admin');
insert into persons values(fid(21),fid(1)),(fid(22),fid(2));
insert into contributors values(fid(11),fid(1)),(fid(12),fid(2)),(fid(13),null),(fid(14),null),(fid(15),null),(fid(16),null),(fid(17),null),(fid(18),null);
insert into identity_edges values
(fid(21),'legacy_seed','contributor:'||fid(13),100,'{"human_gate":true}'),
(fid(22),'legacy_seed','contributor:'||fid(15),100,'{"human_gate":true}'),
(fid(21),'legacy_seed','contributor:'||fid(12),100,'{"human_gate":true}'),
(fid(21),'legacy_seed','contributor:'||fid(16),100,'{"human_gate":false}'),
(fid(21),'legacy_seed','contributor:'||fid(17),60,'{"human_gate":true}'),
(fid(21),'legacy_seed','contributor:'||fid(18),100,'{"human_gate":true}'),
(fid(22),'legacy_seed','contributor:'||fid(18),100,'{"human_gate":true}');
insert into research_contributions(id,author_user_id,author_contributor_id,author_name,origin,body) values
(fid(101),fid(1),null,'שם משותף','community_2029','native original'),
(fid(102),null,fid(11),'שם משותף','openweb','direct original'),
(fid(103),null,fid(13),'שם משותף','openweb','alias original'),
(fid(104),null,fid(14),'שם משותף','openweb','unclaimed'),
(fid(105),null,fid(15),'אחר','openweb','other Person'),
(fid(106),fid(2),fid(13),'אחר','community_2029','explicit conflicting account'),
(fid(107),null,fid(12),'אחר','openweb','direct Contributor conflict'),
(fid(108),null,fid(16),'שם משותף','openweb','unreviewed'),
(fid(109),null,fid(17),'שם משותף','openweb','low confidence'),
(fid(110),null,fid(18),'שם משותף','openweb','ambiguous Person'),
(fid(111),fid(1),null,'שם משותף','forum','research outside Community'),
(fid(112),fid(1),null,'שם משותף',null,'NULL origin'),
(fid(113),fid(1),null,'שם משותף','community_2029','hidden'),
(fid(114),fid(1),null,'שם משותף','community_2029','pending'),
(fid(115),null,fid(13),'שם משותף','openweb',null),
(fid(116),null,fid(13),'שם משותף','openweb','hidden thread'),
(fid(117),null,fid(13),'שם משותף','openweb','graph-linked source'),
(fid(118),fid(1),null,'שם משותף','community_2029','insight-linked source'),
(fid(119),fid(2),null,'אחר','community_2029','another user'),
(fid(120),fid(2),null,'אחר','community_2029','child must survive');
update research_contributions set status='hidden' where id in(fid(113),fid(115));
update research_contributions set status='pending' where id=fid(114);
update research_contributions set deleted_at=now(),deleted_by=fid(1) where id=fid(115);
update research_contributions set thread_hidden_at=now() where id=fid(116);
update research_contributions set graph_node_id=fid(501) where id=fid(117);
update research_contributions set projected_insight_id=fid(502) where id=fid(118);
update research_contributions set parent_id=fid(102) where id=fid(120);
create temporary table original_identity as select id,author_user_id,author_contributor_id,origin,created_at,parent_id from research_contributions;

\i supabase/migrations/20261026142802_community_verified_message_owner_actions_v1.sql
select test_assert((select count(*)=4 from previous_oids p join pg_proc n on n.oid=p.oid and n.proname=p.proname),'existing mutation signatures and OIDs retained');
select test_assert(not has_function_privilege('anon','community_edit_message(uuid,text)','EXECUTE') and not has_function_privilege('anon','community_delete_message(uuid)','EXECUTE'),'anonymous mutations revoked');
select test_assert(not has_function_privilege('authenticated','_community_message_owned_by_caller_v1(research_contributions)','EXECUTE'),'private ownership helper cannot be called with forged row');
set local role anon;
select test_failure('select * from community_message_actions_v1(array[fid(101)])','42501','anonymous cannot read capabilities');
select test_failure('select community_delete_message(fid(101))','42501','anonymous cannot delete');
set local role authenticated;
set local test.uid='00000000-0000-4000-8000-000000000001';
select test_assert((select count(*)=3 and bool_and(can_edit and can_delete) from community_message_actions_v1(array[fid(101),fid(102),fid(103)])),'native, direct claimed Contributor and reviewed Person ownership share actions');
select test_assert((select count(*)=3 from community_message_actions_v1(array[fid(101),fid(101),fid(102),fid(103)])),'permission page deduplicates IDs');
select test_assert((select count(*)=7 and bool_and(not can_edit and not can_delete and reason='not_owner') from community_message_actions_v1(array[fid(104),fid(105),fid(106),fid(107),fid(108),fid(109),fid(110)])),'same name, foreign, conflicting, unreviewed, weak and ambiguous aliases never grant authority');
select test_assert((select count(*)=0 from community_message_actions_v1(array[fid(111),fid(112)])),'noncommunity and NULL origins stay outside the gateway');
select test_assert((select not can_edit and can_delete from community_message_actions_v1(array[fid(114)])),'pending native message may be removed but not edited');
select test_assert((select count(*)=2 and bool_and(not can_edit and not can_delete and reason='source_requires_review') from community_message_actions_v1(array[fid(117),fid(118)])),'direct graph/insight sources require review');
select test_assert((select count(*)=0 from community_message_actions_v1(null)),'NULL request returns empty page');
select test_failure('select * from community_message_actions_v1(array_fill(fid(101),array[101]))','22023','permission pages are bounded');
select test_failure('select community_edit_message(fid(104),''overwrite'')','42501','same display name never authorizes edit');
select test_failure('select community_delete_message(fid(105))','42501','other Person cannot be deleted');
select test_failure('select community_edit_message(fid(106),''overwrite'')','42501','explicit foreign author wins over owned alias');
select test_failure('select community_delete_message(fid(107))','42501','conflicting direct Contributor cannot be taken via Person');
select test_failure('select community_edit_message(fid(108),''overwrite'')','42501','unreviewed Person cannot edit');
select test_failure('select community_edit_message(fid(109),''overwrite'')','42501','low-confidence Person cannot edit');
select test_failure('select community_delete_message(fid(110))','42501','ambiguous Persons cannot delete');
select test_failure('select community_edit_message(fid(111),''overwrite'')','42501','Community gateway does not mutate research contributions');
select test_failure('select community_delete_message(fid(112))','42501','NULL origin fails closed');
select test_failure('select community_edit_message(fid(113),''overwrite'')','55000','hidden message cannot be edited');
select test_failure('select community_edit_message(fid(114),''overwrite'')','55000','pending message cannot be edited');
select test_failure('select community_delete_message(fid(116))','55000','hidden thread cannot be changed');
select test_failure('select community_edit_message(fid(117),''overwrite'')','55000','projected graph source cannot be rewritten');
select test_failure('select community_delete_message(fid(118))','55000','projected insight source cannot be removed');
select test_failure('select community_edit_message(fid(101),''   '')','22023','blank edit rejected');
select test_failure('select community_edit_message(fid(101),repeat(''א'',6001))','22023','oversized edit rejected without truncation');
select test_assert(community_edit_message(fid(103),'  corrected alias  ') is not null,'reviewed old alias can edit through existing RPC');
select test_assert(community_edit_message(fid(101),'corrected native') is not null,'native editing retained');
select test_assert(community_edit_message(fid(103),'corrected alias') is not null,'same edit replays without another revision');
select test_assert(community_delete_message(fid(102))='deleted','direct historical author can remove old message');
select test_assert(community_delete_message(fid(102))='already_deleted','removal replay is idempotent');
select test_assert(community_delete_message(fid(115))='already_deleted','existing tombstone remains idempotent');
select test_failure('select * from research_contribution_edits','42501','edit archive remains private');
select test_failure('select * from research_contribution_deletions','42501','deletion archive remains private');
select test_failure('select * from identity_edges','42501','capability read does not grant direct identity access');
reset role;
select test_assert((select count(*)=2 from research_contribution_edits),'exactly one revision per changed body');
select test_assert((select body='alias original' and edited_by=fid(1) from research_contribution_edits where contribution_id=fid(103)),'revision preserves original body and real account actor');
select test_assert((select body='corrected alias' from research_contributions where id=fid(103)),'current alias message uses cleaned edit');
select test_assert((select body='direct original' and deleted_by=fid(1) from research_contribution_deletions where contribution_id=fid(102)),'deletion archive preserves original and actual actor');
select test_assert((select body is null and title is null and image_url is null and media='[]'::jsonb and deleted_at is not null from research_contributions where id=fid(102)),'public deleted row contains only tombstone state');
select test_assert((select body='child must survive' and parent_id=fid(102) from research_contributions where id=fid(120)),'other peoples replies remain in the original thread');
select test_assert(not exists(select 1 from research_contributions r join original_identity o using(id) where (r.author_user_id,r.author_contributor_id,r.origin,r.created_at,r.parent_id) is distinct from (o.author_user_id,o.author_contributor_id,o.origin,o.created_at,o.parent_id)),'identity, attribution, original date and thread refs unchanged');
set local role authenticated;
set local test.uid='00000000-0000-4000-8000-000000000002';
select test_assert((select not can_edit and not can_delete from community_message_actions_v1(array[fid(103)])),'account switch cannot retain previous alias rights');
select test_failure('select community_edit_message(fid(103),''foreign overwrite'')','42501','switched account cannot use stale edit control');
select test_assert((select count(*)=0 from community_message_actions_v1(array[fid(113)])),'foreign hidden message existence not exposed');
set local test.uid='00000000-0000-4000-8000-000000000003';
select test_failure('select community_edit_message(fid(119),''admin overwrite'')','42501','admin does not inherit author editing');
select test_assert(community_delete_message(fid(119))='deleted','existing admin moderation removal retained');
select test_failure('select community_delete_message(fid(117))','55000','admin cannot bypass source review through message removal');
set local test.uid='';
select test_failure('select * from community_message_actions_v1(array[fid(103)])','42501','authenticated role without principal is denied');
select test_failure('select community_edit_message(fid(103),''overwrite'')','42501','missing principal cannot mutate');
reset role;
-- Re-apply the exact candidate without replaying any edits/deletions.
\i supabase/migrations/20261026142802_community_verified_message_owner_actions_v1.sql
select test_assert((select count(*)=4 from previous_oids p join pg_proc n on n.oid=p.oid and n.proname=p.proname),'migration replay retains existing RPC identities');
insert into research_contributions(id,author_user_id,origin,body,status) values
(fid(121),fid(1),'community_2029','must not change on failed edit','approved'),
(fid(122),fid(1),'community_2029','must not change on failed removal','approved'),
(fid(123),fid(1),'community_2029','unknown status',null);
create function reject_fixture_update() returns trigger language plpgsql as $$
begin raise exception 'fixture update failure' using errcode='XX000'; end $$;
create trigger reject_fixture_update before update on research_contributions for each row
when (old.id in ('00000000-0000-4000-8000-000000000121'::uuid,'00000000-0000-4000-8000-000000000122'::uuid)) execute function reject_fixture_update();
set local role authenticated;
set local test.uid='00000000-0000-4000-8000-000000000001';
select test_failure('select community_edit_message(fid(121),''failed replacement'')','XX000','failed update propagates without saved acknowledgment');
select test_failure('select community_delete_message(fid(122))','XX000','failed removal propagates without deletion acknowledgment');
select test_assert((select not can_edit and not can_delete and reason='message_unavailable' from community_message_actions_v1(array[fid(123)])),'unknown status never inherits mutation permissions');
select test_failure('select community_delete_message(fid(123))','55000','unknown status cannot be removed');
select test_failure('select edit_contribution(fid(117),''bypass source guard'')','55000','generic edit cannot bypass Community source protection');
select test_failure('select remove_contribution(fid(118))','55000','generic remove cannot bypass Community source protection');
select test_failure('select edit_contribution(fid(104),''steal same name'')','42501','generic edit cannot bypass verified Community identity');
select test_failure('select remove_contribution(fid(119))','42501','generic remove cannot remove another users message');
select edit_contribution(fid(103),'generic corrected alias');
select edit_contribution(fid(111),'noncommunity edit remains compatible');
select remove_contribution(fid(111));
reset role;
select test_assert(not exists(select 1 from research_contribution_edits where contribution_id=fid(121)) and not exists(select 1 from research_contribution_deletions where contribution_id=fid(122)),'failed writes roll back archive insertion atomically');
select test_assert((select count(*)=2 from research_contributions where id in(fid(121),fid(122)) and deleted_at is null and body like 'must not change%'),'failed writes retain original public rows');
select test_assert((select body='generic corrected alias' and edited_at is not null from research_contributions where id=fid(103)) and exists(select 1 from research_contribution_edits where contribution_id=fid(103) and body='corrected alias'),'generic Community edits preserve revision history');
select test_assert((select body='noncommunity edit remains compatible' and status='hidden' and deleted_at is null from research_contributions where id=fid(111)),'general noncommunity edit/remove behavior remains compatible');
select count(*) as passed_assertions from assertions;
select 'Community verified owner actions PostgreSQL17: PASS' as result;
rollback;
