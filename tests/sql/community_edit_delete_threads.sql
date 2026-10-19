-- Throwaway-Postgres test for supabase/migrations/20261019130000_community_edit_soft_delete_threads.sql.
-- Never run against a live project. Prints PASS lines; any failed assertion aborts (ON_ERROR_STOP).
\set ON_ERROR_STOP on
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.users (id uuid primary key, role text);
create table public.contributors (id uuid primary key, user_id uuid, display_name text, avatar_url text);
create table public.research_contributions (
  id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid, author_name text,
  origin text not null default 'beit_midrash', status text not null default 'pending', parent_id uuid references public.research_contributions(id),
  title text, body text, reactions jsonb not null default '{}', image_url text, media jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_activity_at timestamptz default now());
-- Same behaviour as the live standing-approve trigger: a status flip to hidden is reverted for this author.
create function public.zvi_stub() returns trigger language plpgsql as $$ begin
  if new.status in ('pending','hidden') and new.author_user_id = '24be4fb3-59f2-4cdf-ad86-47d8a43f274e'::uuid then new.status := 'approved'; end if; return new; end $$;
create trigger trg_zvi before insert or update of status on public.research_contributions for each row execute function public.zvi_stub();

\i supabase/migrations/20261019130000_community_edit_soft_delete_threads.sql

-- fixtures
insert into public.users values
 ('00000000-0000-0000-0000-0000000000a1','user'),('00000000-0000-0000-0000-0000000000a2','user'),
 ('00000000-0000-0000-0000-0000000000ad','admin'),('24be4fb3-59f2-4cdf-ad86-47d8a43f274e','user');
insert into public.research_contributions (id, author_user_id, origin, status, parent_id, body, created_at) values
 -- tree T1: root r1 (A1) -> c1 (A2) -> g1 (A1);  r1 -> c2 (A2)
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','community_2029','approved',null,'root one', now()-interval '10 min'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a2','community_2029','approved','10000000-0000-0000-0000-000000000001','child one', now()-interval '9 min'),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','community_2029','approved','10000000-0000-0000-0000-000000000002','grandchild', now()-interval '8 min'),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a2','community_2029','approved','10000000-0000-0000-0000-000000000001','child two', now()-interval '7 min'),
 -- historical openweb root with no account author + one ex-hidden imported root that must stay hidden
 ('20000000-0000-0000-0000-000000000001',null,'openweb','approved',null,'old openweb', now()-interval '1 day'),
 ('20000000-0000-0000-0000-000000000002',null,'openweb','hidden',null,'imported hidden', now()-interval '2 day'),
 ('20000000-0000-0000-0000-000000000003',null,'openweb','approved','20000000-0000-0000-0000-000000000002','reply to imported hidden', now()-interval '2 day'),
 -- standing-approve author
 ('30000000-0000-0000-0000-000000000001','24be4fb3-59f2-4cdf-ad86-47d8a43f274e','community_2029','approved',null,'zvi root', now()-interval '3 min'),
 ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a2','community_2029','approved','30000000-0000-0000-0000-000000000001','reply to zvi', now()-interval '2 min');

create function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', coalesce(u,''), false); end $$;
create function pg_temp.expect_error(q text, msg text) returns void language plpgsql as $$ declare ok boolean := false; begin
  begin execute q; exception when others then ok := sqlerrm like '%'||msg||'%'; if not ok then raise exception 'wrong error for %: %', q, sqlerrm; end if; end;
  if not ok then raise exception 'expected error % for %', msg, q; end if; end $$;

create function pg_temp.assert(cond boolean, label text) returns void language plpgsql as $$ begin
  if cond is not true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;

-- baseline: feed shows live roots only; imported hidden stays hidden; first page carries a verified count
select pg_temp.as_user(null);
select pg_temp.assert((select count(*) from community_feed_page(0,40,'newest')) = 3, 'baseline feed has 3 live roots (imported hidden root excluded)');
select pg_temp.assert((select max(total_count) from community_feed_page(0,40,'newest')) = 3, 'first page total_count verified');
select pg_temp.assert((select total_count from community_feed_page(1,1,'newest') limit 1) is null, 'later pages skip total_count');
select pg_temp.assert((select reply_count from community_reply_counts(array['10000000-0000-0000-0000-000000000001']::uuid[])) = 2, 'direct reply count of r1 = 2 (not 3 nested)');

-- permissions: guest, wrong user, historical openweb, admin-edit-others
select pg_temp.as_user(null);
select pg_temp.expect_error($$select community_edit_message('10000000-0000-0000-0000-000000000001','x')$$, 'auth required');
select pg_temp.expect_error($$select community_delete_message('10000000-0000-0000-0000-000000000001')$$, 'auth required');
select pg_temp.expect_error($$select community_hide_thread('10000000-0000-0000-0000-000000000001')$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_error($$select community_edit_message('10000000-0000-0000-0000-000000000001','hijack')$$, 'not authorized');
select pg_temp.expect_error($$select community_delete_message('10000000-0000-0000-0000-000000000001')$$, 'not authorized');
select pg_temp.expect_error($$select community_hide_thread('10000000-0000-0000-0000-000000000001')$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.expect_error($$select community_edit_message('10000000-0000-0000-0000-000000000001','admin edits other')$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error($$select community_edit_message('20000000-0000-0000-0000-000000000001','edit history')$$, 'not authorized');
select pg_temp.expect_error($$select community_delete_message('20000000-0000-0000-0000-000000000001')$$, 'not authorized');

-- edit: own message; marks edited; identity/parent/time/reactions preserved
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
create temp table before_edit as select id, parent_id, created_at, author_user_id, reactions from research_contributions where id='10000000-0000-0000-0000-000000000002';
select community_edit_message('10000000-0000-0000-0000-000000000002','child one (edited) https://example.org');
select pg_temp.assert((select r.body = 'child one (edited) https://example.org' and r.edited_at is not null and r.parent_id=b.parent_id and r.created_at=b.created_at and r.author_user_id=b.author_user_id and r.reactions=b.reactions from research_contributions r join before_edit b using (id)), 'edit keeps link text, id, parent, time, author, reactions and stamps edited_at');
select pg_temp.expect_error($$select community_edit_message('10000000-0000-0000-0000-000000000002','   ')$$, 'empty body');

-- single leaf delete (case a): author deletes own leaf reply; it disappears; no tombstone; siblings stay
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.assert(community_delete_message('10000000-0000-0000-0000-000000000004') = 'deleted', 'leaf delete returns deleted');
select pg_temp.assert(community_delete_message('10000000-0000-0000-0000-000000000004') = 'already_deleted', 'delete is idempotent');
select pg_temp.as_user(null);
select pg_temp.assert((select count(*) from community_replies_page('10000000-0000-0000-0000-000000000001',0,20)) = 1, 'deleted leaf reply is gone, sibling remains');
select pg_temp.assert((select reply_count from community_reply_counts(array['10000000-0000-0000-0000-000000000001']::uuid[])) = 1, 'direct count drops to 1');
select pg_temp.assert((select body is null and title is null from research_contributions where id='10000000-0000-0000-0000-000000000004'), 'deleted content blanked in public row');
select pg_temp.assert((select body from research_contribution_deletions where contribution_id='10000000-0000-0000-0000-000000000004') = 'child two', 'deleted content preserved in private archive');
select pg_temp.expect_error($$set role anon; select * from research_contribution_deletions$$, 'permission denied');
reset role;

-- deleted reply with children (case b): tombstone in place, grandchild stays reachable
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select community_delete_message('10000000-0000-0000-0000-000000000002');
select pg_temp.as_user(null);
select pg_temp.assert((select is_deleted and body is null and author_name is null and author_user_id is null and reactions='{}'::jsonb and contributor_id is null from community_replies_page('10000000-0000-0000-0000-000000000001',0,20) where id='10000000-0000-0000-0000-000000000002'), 'tombstone exposes no body/author/reactions');
select pg_temp.assert((select count(*) from community_replies_page('10000000-0000-0000-0000-000000000002',0,20)) = 1, 'grandchild reachable under tombstone');
select pg_temp.assert((select reply_count from community_reply_counts(array['10000000-0000-0000-0000-000000000001']::uuid[])) = 1, 'tombstone counts as one direct reply');
select pg_temp.assert(not exists (select 1 from community_replies_page('10000000-0000-0000-0000-000000000001',0,20) where body ilike '%edited%'), 'deleted text not exposed through reply reader');

-- deleted main message with thread (case c): root becomes tombstone in feed, whole thread stays readable
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select community_delete_message('10000000-0000-0000-0000-000000000001');
select pg_temp.as_user(null);
select pg_temp.assert((select is_deleted and body is null from community_feed_page(0,40,'newest') where id='10000000-0000-0000-0000-000000000001'), 'deleted root stays in feed as tombstone');
select pg_temp.assert((select count(*) from community_feed_page(0,40,'newest')) = 3, 'feed count unchanged by tombstone');
select pg_temp.assert((select count(*) from community_replies_page('10000000-0000-0000-0000-000000000001',0,20)) = 1, 'replies of deleted root still readable');
select pg_temp.assert((select body from community_replies_page('10000000-0000-0000-0000-000000000002',0,20)) = 'grandchild', 'nested reply of deleted chain still readable');

-- deleting the last live descendant lets the tombstone chain disappear
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select community_delete_message('10000000-0000-0000-0000-000000000003');
select pg_temp.as_user(null);
select pg_temp.assert(not exists (select 1 from community_feed_page(0,40,'newest') where id='10000000-0000-0000-0000-000000000001'), 'tombstone root with no live thread leaves the feed');

-- standing-approve trigger cannot resurrect deleted content
select pg_temp.as_user('24be4fb3-59f2-4cdf-ad86-47d8a43f274e');
select community_delete_message('30000000-0000-0000-0000-000000000001');
select pg_temp.as_user(null);
select pg_temp.assert((select status='approved' and body is null from research_contributions where id='30000000-0000-0000-0000-000000000001'), 'trigger reverted status but body stays blank');
select pg_temp.assert((select is_deleted and body is null from community_feed_page(0,40,'newest') where id='30000000-0000-0000-0000-000000000001'), 'deleted root of standing-approve author is a tombstone, not live');

-- admin: hide whole thread; replies disappear; imported-hidden rows untouched
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.assert(community_hide_thread('30000000-0000-0000-0000-000000000001') >= 1, 'admin hides thread');
select pg_temp.as_user(null);
select pg_temp.assert(not exists (select 1 from community_feed_page(0,40,'newest') where id='30000000-0000-0000-0000-000000000001'), 'hidden thread leaves feed');
select pg_temp.assert((select count(*) from community_replies_page('30000000-0000-0000-0000-000000000001',0,20)) = 0, 'hidden thread replies are not readable');
select pg_temp.assert((select status from research_contributions where id='20000000-0000-0000-0000-000000000002') = 'hidden' and (select thread_hidden_at is null from research_contributions where id='20000000-0000-0000-0000-000000000002'), 'imported hidden rows untouched');
select pg_temp.assert((select count(*) from research_contributions) = 9, 'no row was physically deleted');

-- historical openweb stays intact and visible
select pg_temp.assert(exists (select 1 from community_feed_page(0,40,'newest') where id='20000000-0000-0000-0000-000000000001' and body='old openweb'), 'historical OpenWeb message intact');

-- role grants: anon can read through the definer functions but cannot call any write function or the private helper
set role anon;
select pg_temp.assert((select count(*) from community_feed_page(0,40,'newest')) >= 1, 'anon can read the feed through the function');
select pg_temp.assert((select count(*) from community_reply_counts(array['10000000-0000-0000-0000-000000000001']::uuid[])) >= 0, 'anon can read reply counts');
select pg_temp.expect_error($$select community_edit_message('10000000-0000-0000-0000-000000000001','x')$$, 'permission denied');
select pg_temp.expect_error($$select community_delete_message('10000000-0000-0000-0000-000000000001')$$, 'permission denied');
select pg_temp.expect_error($$select community_hide_thread('10000000-0000-0000-0000-000000000001')$$, 'permission denied');
select pg_temp.expect_error($$select community_has_live_descendant('10000000-0000-0000-0000-000000000001')$$, 'permission denied');
select pg_temp.expect_error($$select * from research_contribution_deletions$$, 'permission denied');
reset role;
set role authenticated;
select pg_temp.expect_error($$select community_has_live_descendant('10000000-0000-0000-0000-000000000001')$$, 'permission denied');
select pg_temp.expect_error($$select * from research_contribution_deletions$$, 'permission denied');
reset role;
select 'COMMUNITY_SQL_TESTS_OK';
