\set ON_ERROR_STOP on
begin;
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
create function public.test_assert(ok boolean, m text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',m; end if; end $$;
create table public.users(id uuid primary key, role text, community_moderator boolean);
create table public.contributors(id uuid primary key, user_id uuid, display_name text, avatar_url text);
create table public.research_contributions(id uuid primary key, parent_id uuid, author_user_id uuid, author_contributor_id uuid, author_name text, title text, body text,
  reactions jsonb default '{}', origin text, status text, created_at timestamptz, edited_at timestamptz, deleted_at timestamptz, thread_hidden_at timestamptz);
create function public.community_has_live_descendant(uuid) returns boolean language sql as $$ select false $$;
insert into users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','user',true),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','user',false),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','admin',false);
insert into research_contributions(id,parent_id,author_user_id,author_name,body,origin,status,created_at) values
('00000000-0000-4000-8000-000000000001',null,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B','old root','community_2029','approved','2026-10-01'),
('00000000-0000-4000-8000-000000000002',null,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B','newer root','community_2029','approved','2026-10-02'),
('00000000-0000-4000-8000-000000000003',null,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B','newest root','community_2029','approved','2026-10-03'),
('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B','first reply','community_2029','approved','2026-10-01 01:00');
\i supabase/proposed/20261112100000_community_thread_bump_staff_v1_PROPOSAL.sql
begin;
-- before any bump: created_at order (the migration only acts on new events)
select public.test_assert((select array_agg(id order by ord) from (select id, row_number() over () ord from public.community_feed_page(0,10,'newest')) s)
  = array['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001']::uuid[], 'baseline order');
-- registered reply to a reply bumps the ROOT 1 to the top
insert into research_contributions(id,parent_id,author_user_id,author_name,body,origin,status,created_at) values
('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A','reply to reply','community_2029','approved','2026-10-04');
select public.test_assert((select id from public.community_feed_page(0,10,'newest') limit 1) = '00000000-0000-4000-8000-000000000001', 'root 1 bumped by reply-to-reply');
select public.test_assert((select count(*) from research_contributions where thread_bumped_at is not null) = 1, 'only the root has a bump');
-- guest (no user), pending and deleted replies do not bump
insert into research_contributions(id,parent_id,author_user_id,author_name,body,origin,status,created_at,deleted_at) values
('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000002',null,'guest','guest','community_2029','approved','2026-10-05',null),
('00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B','pending','community_2029','pending','2026-10-05',null),
('00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B','deleted','community_2029','approved','2026-10-05',now());
select public.test_assert((select thread_bumped_at from research_contributions where id='00000000-0000-4000-8000-000000000002') is null, 'guest/pending/deleted do not bump');
-- a pending reply that is later approved bumps
update research_contributions set status='approved' where id='00000000-0000-4000-8000-000000000007';
select public.test_assert((select id from public.community_feed_page(0,10,'newest') limit 1) = '00000000-0000-4000-8000-000000000002', 'approval bumps');
-- a reaction-style update (last_activity) never bumps
update research_contributions set reactions='{"likes":1}' where id='00000000-0000-4000-8000-000000000003';
select public.test_assert((select id from public.community_feed_page(0,10,'newest') limit 1) = '00000000-0000-4000-8000-000000000002', 'reaction does not bump');
-- oldest order is untouched
select public.test_assert((select id from public.community_feed_page(0,10,'oldest') limit 1) = '00000000-0000-4000-8000-000000000001', 'oldest unchanged');
-- staff ids: moderator + admin only
select public.test_assert((select array_agg(user_id order by user_id) from public.community_staff_user_ids_v1()) = array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'staff ids');
select public.test_assert(has_function_privilege('anon','public.community_staff_user_ids_v1()','execute'), 'anon can read staff ids');
rollback;
-- rollback file leaves the feed in the old order
\i supabase/proposed/20261112100000_community_thread_bump_staff_v1_ROLLBACK.sql
select public.test_assert(to_regprocedure('public.community_staff_user_ids_v1()') is null, 'rollback drops staff fn');
rollback;
\echo community_thread_bump_staff_v1: OK
