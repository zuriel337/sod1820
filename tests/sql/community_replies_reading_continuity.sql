\set ON_ERROR_STOP on
begin;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid',true),'')::uuid
$$;
create table public.contributors(id uuid primary key, user_id uuid);
create table public.persons(person_id uuid primary key, account_user_id uuid unique);
create table public.identity_edges(person_id uuid, kind text, legacy_id text);
create table public.research_contributions(
  id uuid primary key, parent_id uuid, author_user_id uuid, author_contributor_id uuid,
  author_name text, body text, title text, target_type text, target_id text,
  convergence_slug text, origin text, status text, created_at timestamptz
);
create function public.test_assert(ok boolean, message text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if;
end
$$;

-- Two accounts and one reviewed historical Contributor owned by A through Person.
insert into contributors values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
('33333333-3333-4333-8333-333333333333',null),
('44444444-4444-4444-8444-444444444444',null);
insert into persons values ('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into identity_edges values
('55555555-5555-4555-8555-555555555555','legacy_seed','contributor:33333333-3333-4333-8333-333333333333');

-- UUID tails identify readable fixture cases. Unclaimed old author and native A root share a name.
insert into research_contributions(id,parent_id,author_user_id,author_contributor_id,author_name,body,origin,status,created_at) values
('00000000-0000-4000-8000-000000000001',null,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,'שם משותף','native root','community_2029','approved','2026-10-01'),
('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'B','native reply with NULL contributor','community_2029','approved','2026-10-02'),
('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'B','deep reply','community_2029','approved','2026-10-03'),
('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,'A','native self reply','community_2029','approved','2026-10-04'),
('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001',null,'11111111-1111-4111-8111-111111111111','A','contributor self reply','openweb','approved','2026-10-05'),
('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000001',null,'33333333-3333-4333-8333-333333333333','A','Person self reply','openweb','approved','2026-10-06'),
('00000000-0000-4000-8000-000000000007',null,null,'11111111-1111-4111-8111-111111111111','A','legacy direct root','openweb','approved','2016-03-01'),
('00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000007',null,'22222222-2222-4222-8222-222222222222','B','legacy reply','openweb','approved','2016-03-02'),
('00000000-0000-4000-8000-000000000009',null,null,'33333333-3333-4333-8333-333333333333','A','reviewed Person root','openweb','approved','2016-04-01'),
('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000009',null,'22222222-2222-4222-8222-222222222222','B','reply to reviewed Person','openweb','approved','2016-04-02'),
('00000000-0000-4000-8000-000000000011',null,null,'44444444-4444-4444-8444-444444444444','שם משותף','unclaimed same-name root','openweb','approved','2016-05-01'),
('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000011',null,'22222222-2222-4222-8222-222222222222','B','unclaimed reply','openweb','approved','2016-05-02'),
('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'B','hidden','community_2029','hidden','2026-10-07'),
('00000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'B','pending community','community_2029','pending','2026-10-08'),
('00000000-0000-4000-8000-000000000015','00000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'B','rejected','openweb','rejected','2026-10-09'),
('00000000-0000-4000-8000-000000000016',null,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'B','B root','community_2029','approved','2026-09-01'),
('00000000-0000-4000-8000-000000000017','00000000-0000-4000-8000-000000000016','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,'A','reply to B','community_2029','approved','2026-09-02'),
('00000000-0000-4000-8000-000000000018',null,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,'A','research root',null,'approved','2026-09-03'),
('00000000-0000-4000-8000-000000000019','00000000-0000-4000-8000-000000000018','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'B','research reply',null,'approved','2026-09-04');


alter table contributors add column display_name text, add column avatar_url text;
alter table research_contributions add column reactions jsonb default '{}', add column edited_at timestamptz, add column deleted_at timestamptz, add column thread_hidden_at timestamptz;
\i test/fixtures/community-replies-reading-baseline.sql
\i test/fixtures/community-reading-public-context.sql
\i supabase/migrations/20261104143226_community_replies_reading_continuity.sql


select test_assert(not has_function_privilege('anon','public.replies_to_me(integer,timestamptz)','EXECUTE'),'guest cannot execute');
select test_assert(has_function_privilege('authenticated','public.replies_to_me(integer,timestamptz)','EXECUTE'),'authenticated can execute');

set local role authenticated;
set local test.uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select test_assert(exists(select 1 from replies_to_me() where body='native reply with NULL contributor'),'native reply remains visible to contributor-owning account');
select test_assert((select count(*)=5 from replies_to_me()),'A receives native, deep, legacy direct, Person and research replies only');
select test_assert(not exists(select 1 from replies_to_me() where body in ('native self reply','contributor self reply','Person self reply','unclaimed reply','hidden','pending community','rejected','reply to B')),'self, unclaimed, other-account and non-public community excluded');
select test_assert((select thread_root_id='00000000-0000-4000-8000-000000000001'::uuid and thread_path=array['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003']::uuid[] from replies_to_me() where body='deep reply'),'deep reply returns exact path');
select test_assert((select count(*)=1 from replies_to_me(1)),'page limit respected');
select test_assert((select count(*)=3 from replies_to_me(40,'2026-10-02')),'cursor returns older history');

set local test.uid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select test_assert((select count(*)=1 and bool_and(body='reply to B') from replies_to_me()),'account switch returns B replies only');
set local test.uid='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
select test_assert((select count(*)=0 from replies_to_me()),'unrelated account receives no replies');
set local test.uid='';
select test_assert((select count(*)=0 from replies_to_me()),'no principal receives no replies');
reset role;

-- Public projection is independent of account identity and never returns bodies.
set local role anon;
select test_assert((select new_count=5 and first_reply_id='00000000-0000-4000-8000-000000000002'::uuid from community_thread_updates('[{"root_id":"00000000-0000-4000-8000-000000000001","message_id":"00000000-0000-4000-8000-000000000001","created_at":"2026-10-01T00:00:00Z"}]')),'counts only approved visible descendants');
select test_assert((select new_count=4 and cardinality(first_path)=3 from community_thread_updates('[{"root_id":"00000000-0000-4000-8000-000000000001","message_id":"00000000-0000-4000-8000-000000000002","created_at":"2026-10-02T00:00:00Z"}]')),'cursor excludes the message itself and resolves first nested reply');
select test_assert((select new_count=0 and first_path is null from community_thread_updates('[{"root_id":"00000000-0000-4000-8000-999999999999","message_id":"00000000-0000-4000-8000-999999999999","created_at":"2026-10-01T00:00:00Z"}]')),'missing root is indistinguishable from no new replies');
reset role;
update research_contributions set thread_hidden_at=now() where id='00000000-0000-4000-8000-000000000001';
set local test.uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select test_assert((select count(*)=3 from replies_to_me()),'hidden ancestry suppresses native and nested replies from private inbox');
select test_assert((select new_count=0 from community_thread_updates('[{"root_id":"00000000-0000-4000-8000-000000000001","message_id":"00000000-0000-4000-8000-000000000001","created_at":"2026-10-01T00:00:00Z"}]')),'hidden root leaks no child count');
update research_contributions set thread_hidden_at=null where id='00000000-0000-4000-8000-000000000001';
update research_contributions set deleted_at=now(),title='DELETED PRIVATE TITLE' where id='00000000-0000-4000-8000-000000000002';
select test_assert(not exists(select 1 from replies_to_me() where id='00000000-0000-4000-8000-000000000002'),'deleted replies excluded');
select test_assert((select parent_title is null from replies_to_me() where body='deep reply'),'deleted parent title never leaks');
select test_assert((select new_count=4 and first_reply_id='00000000-0000-4000-8000-000000000003'::uuid from community_thread_updates('[{"root_id":"00000000-0000-4000-8000-000000000001","message_id":"00000000-0000-4000-8000-000000000001","created_at":"2026-10-01T00:00:00Z"}]')),'tombstones retain public descendants without counting deleted body');
update research_contributions set thread_hidden_at=now() where id='00000000-0000-4000-8000-000000000002';
select test_assert(not exists(select 1 from replies_to_me() where body='deep reply'),'hidden middle ancestor suppresses nested reply');
do $$begin
  begin perform community_thread_updates('{}'); raise exception 'accepted object'; exception when invalid_parameter_value then null; end;
  begin perform community_thread_updates('[{"root_id":"bad","message_id":"bad","created_at":"2026-01-01T00:00:00Z"}]'); raise exception 'accepted bad uuid'; exception when invalid_parameter_value then null; end;
  begin perform community_thread_updates((select jsonb_agg(jsonb_build_object('root_id','00000000-0000-4000-8000-000000000001','message_id','00000000-0000-4000-8000-000000000001','created_at','2026-01-01T00:00:00Z')) from generate_series(1,41))); raise exception 'accepted too many'; exception when invalid_parameter_value then null; end;
  begin perform community_thread_updates((select jsonb_agg(jsonb_build_object('root_id','00000000-0000-4000-8000-000000000001','message_id','00000000-0000-4000-8000-000000000001','created_at','2026-01-01T00:00:00Z')) from generate_series(1,2))); raise exception 'accepted duplicate'; exception when invalid_parameter_value then null; end;
end$$;
select 'community replies and reading acceptance: PASS' as result;
rollback;
