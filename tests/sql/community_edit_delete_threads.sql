-- Throwaway-Postgres test for supabase/migrations/20261019130000_community_edit_soft_delete_threads.sql.
-- Never run against a live project. Prints PASS lines; any failed assertion aborts (ON_ERROR_STOP).
\set ON_ERROR_STOP on
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.users (id uuid primary key, role text, email text, display_name text, username text);
create table public.user_notifications (id bigserial primary key, user_id uuid, email text, kind text, title text, body text, link text);
create table public.notification_prefs (user_id uuid, topics text[]);
create table public.contributors (id uuid primary key, user_id uuid, display_name text, avatar_url text, email text, source text, merged_into text, trusted boolean, vip boolean, locked boolean, active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now());
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create table public.research_contributions (
  id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid, author_name text,
  origin text not null default 'beit_midrash', status text not null default 'pending', parent_id uuid references public.research_contributions(id),
  title text, body text, reactions jsonb not null default '{}', image_url text, media jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_activity_at timestamptz default now(), intent text default 'תגובה');
-- Same behaviour as the live standing-approve trigger: a status flip to hidden is reverted for this author.
create function public.zvi_stub() returns trigger language plpgsql as $$ begin
  if new.status in ('pending','hidden') and new.author_user_id = '24be4fb3-59f2-4cdf-ad86-47d8a43f274e'::uuid then new.status := 'approved'; end if; return new; end $$;
create trigger trg_zvi before insert or update of status on public.research_contributions for each row execute function public.zvi_stub();

\i supabase/migrations/20261019130000_community_edit_soft_delete_threads.sql
\i supabase/migrations/20261019140000_community_restore_report_search_history.sql
\i supabase/migrations/20261019145000_community_reply_notification_link.sql
\i supabase/migrations/20261019150000_community_auto_claim_legacy_by_email.sql
\i supabase/migrations/20261020020135_community_feed_sort_filters.sql

-- fixtures
insert into public.users (id, role, email, display_name) values
 ('00000000-0000-0000-0000-0000000000a1','user','a1@example.invalid','אילנה'),('00000000-0000-0000-0000-0000000000a2','user','a2@example.invalid','בועז'),
 ('00000000-0000-0000-0000-0000000000ad','admin','ad@example.invalid','מנהל'),('24be4fb3-59f2-4cdf-ad86-47d8a43f274e','user','z@example.invalid','צבי');
create trigger trg_rc_notify after insert on public.research_contributions for each row execute function public.notify_on_contribution();
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

-- v2 feed: archive-wide order/filter semantics, with a bounded period for popularity.
update public.research_contributions set reactions='{"likes":1,"👍":["u1","u2"]}'::jsonb where id='10000000-0000-0000-0000-000000000001';
update public.research_contributions set reactions='{"likes":9}'::jsonb, created_at=now()-interval '40 days', image_url='https://example.invalid/source.pdf' where id='20000000-0000-0000-0000-000000000001';
select pg_temp.assert((select id from community_feed_page_v2(0,1,'discussed','all','all')) = '10000000-0000-0000-0000-000000000001', 'most discussed ranks by visible direct replies');
select pg_temp.assert((select id from community_feed_page_v2(0,1,'active','all','all')) = '30000000-0000-0000-0000-000000000001', 'recently active ranks by latest direct reply');
select pg_temp.assert((select id from community_feed_page_v2(0,1,'liked','all','all')) = '20000000-0000-0000-0000-000000000001', 'most liked combines imported and canonical likes');
select pg_temp.assert((select id from community_feed_page_v2(0,1,'liked','all','week')) = '10000000-0000-0000-0000-000000000001', 'popular period excludes roots older than the selected window');
select pg_temp.assert((select count(*) from community_feed_page_v2(0,40,'newest','unanswered','all')) = 1, 'unanswered filter keeps roots with no visible direct replies');
select pg_temp.assert((select id from community_feed_page_v2(0,40,'newest','media','all')) = '20000000-0000-0000-0000-000000000001', 'media filter recognizes an attached file link');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.assert((select count(*) from community_feed_page_v2(0,40,'newest','mine','all')) = 1, 'my messages is bound to auth.uid');
select pg_temp.as_user(null);
select pg_temp.assert((select count(*) from community_feed_page_v2(0,40,'newest','community','all')) = 2, 'new Community source filter');
select pg_temp.assert((select count(*) from community_feed_page_v2(0,40,'newest','legacy','all')) = 1, 'legacy chat source filter');

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

-- ===== second migration: restore, history, context, search, reports, notification link =====
-- fresh fixtures (fixed ids, outside the first section's tree)
insert into public.research_contributions (id, author_user_id, origin, status, parent_id, body, created_at) values
 ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','community_2029','approved',null,'חיפוש מילת-מפתח אחת', now()-interval '30 min'),
 ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a2','community_2029','approved','40000000-0000-0000-0000-000000000001','תגובה 100% עם _קו_ תחתון', now()-interval '29 min'),
 ('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','community_2029','approved','40000000-0000-0000-0000-000000000002','תגובה מקוננת', now()-interval '28 min');

-- notification link for a community reply (insert as the replier; the parent author is notified)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
insert into public.research_contributions (id, author_user_id, author_name, origin, status, parent_id, body)
values ('40000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000a2','בועז','community_2029','approved','40000000-0000-0000-0000-000000000001','עוד תגובה');
select pg_temp.assert((select link from user_notifications where user_id='00000000-0000-0000-0000-0000000000a1' order by id desc limit 1) = '/community/chat?message=40000000-0000-0000-0000-000000000009', 'reply notification opens the community message');
insert into public.research_contributions (id, author_user_id, author_name, origin, status, parent_id, body)
values ('40000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a2','בועז','forum','approved','40000000-0000-0000-0000-000000000001','תגובת פורום');
select pg_temp.assert((select link from user_notifications where user_id='00000000-0000-0000-0000-0000000000a1' order by id desc limit 1) like '/forum/%', 'non-community replies keep the forum link');

-- edit history (admin only) and preserved previous body
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select community_edit_message('40000000-0000-0000-0000-000000000001','חיפוש מילת-מפתח אחת — מתוקן');
select community_edit_message('40000000-0000-0000-0000-000000000001','חיפוש מילת-מפתח אחת — מתוקן שוב');
select pg_temp.expect_error($$select * from community_edit_history('40000000-0000-0000-0000-000000000001')$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.assert((select count(*) from community_edit_history('40000000-0000-0000-0000-000000000001')) = 2 and (select body from community_edit_history('40000000-0000-0000-0000-000000000001') offset 1 limit 1) = 'חיפוש מילת-מפתח אחת', 'admin sees both previous bodies, newest first');

-- context for deep links: root first, target last; invisible target gives nothing
select pg_temp.as_user(null);
select pg_temp.assert((select array_agg(id order by ord) from (select id, row_number() over () ord from community_message_context('40000000-0000-0000-0000-000000000003')) t) = array['40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000003']::uuid[], 'context returns root to target');
select pg_temp.assert((select count(*) from community_message_context('20000000-0000-0000-0000-000000000002')) = 0, 'context of an imported-hidden message is empty');
select pg_temp.assert((select count(*) from community_message_context('20000000-0000-0000-0000-000000000003')) = 0, 'context of a reply under a hidden parent is empty');

-- search: matches live text, escapes wildcards, skips deleted/hidden text, short queries return nothing
select pg_temp.assert((select count(*) from community_search('מילת-מפתח',0,20)) = 1, 'search finds live message');
select pg_temp.assert((select total_count from community_search('מילת-מפתח',0,20) limit 1) = 1, 'search first page carries total');
select pg_temp.assert((select count(*) from community_search('100%',0,20)) = 1 and (select count(*) from community_search('%',0,20)) = 0, 'search escapes LIKE wildcards');
select pg_temp.assert((select count(*) from community_search('_קו_',0,20)) = 1 and (select count(*) from community_search('__',0,20)) = 0, 'search escapes underscores');
select pg_temp.assert((select count(*) from community_search('a',0,20)) = 0, 'one-character query returns nothing');
select pg_temp.assert((select count(*) from community_search('reply to imported hidden',0,20)) = 0, 'search skips replies whose parent was hidden by moderation');
select pg_temp.assert((select count(*) from community_search('imported hidden',0,20)) = 0 and (select count(*) from community_search('child two',0,20)) = 0, 'search never returns hidden or deleted text');

-- reports: guest refused, own message refused, duplicates idempotent, admin queue, resolve actions
select pg_temp.expect_error($$select community_report_message('40000000-0000-0000-0000-000000000002','spam')$$, 'auth required');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error($$select community_report_message('40000000-0000-0000-0000-000000000001','spam')$$, 'own message');
select pg_temp.expect_error($$select community_report_message('40000000-0000-0000-0000-000000000002','nonsense')$$, 'bad reason');
select pg_temp.expect_error($$select community_report_message('20000000-0000-0000-0000-000000000002','spam')$$, 'not found');
select pg_temp.assert(community_report_message('40000000-0000-0000-0000-000000000002','abuse','פוגעני') = 'reported', 'user reports a live message');
select pg_temp.assert(community_report_message('40000000-0000-0000-0000-000000000002','abuse') = 'already_reported', 'duplicate report is idempotent');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_error($$select * from community_admin_reports()$$, 'not authorized');
select pg_temp.expect_error($$select community_resolve_report((select id from community_reports limit 1),'dismiss')$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.assert((select count(*) from community_admin_reports()) = 1 and (select body from community_admin_reports()) like 'תגובה 100%%', 'admin queue lists the open report with text');
select pg_temp.assert(community_resolve_report((select id from community_reports limit 1),'delete') = 'delete', 'admin resolves by soft delete');
select pg_temp.assert((select count(*) from community_admin_reports()) = 0, 'resolved report leaves the queue');
select pg_temp.assert((select deleted_at is not null from research_contributions where id='40000000-0000-0000-0000-000000000002'), 'reported message soft-deleted');
select pg_temp.assert((select count(*) from community_replies_page('40000000-0000-0000-0000-000000000002',0,20)) = 1, 'its nested reply is still readable');

-- admin removed list, then restore (admin) of the deleted message
select pg_temp.assert((select count(*) from community_admin_removed(50) where kind='deleted' and id='40000000-0000-0000-0000-000000000002' and body like 'תגובה 100%%') = 1, 'admin removed list shows the deleted message with its private text');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_error($$select * from community_admin_removed(5)$$, 'not authorized');
select pg_temp.expect_error($$select community_restore('40000000-0000-0000-0000-000000000002')$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.assert(community_restore('40000000-0000-0000-0000-000000000002') = 'restored', 'admin restores a deleted message');
select pg_temp.assert((select body = 'תגובה 100% עם _קו_ תחתון' and deleted_at is null and status = 'approved' from research_contributions where id='40000000-0000-0000-0000-000000000002'), 'restored text, status and marker are back');
select pg_temp.assert(not exists (select 1 from research_contribution_deletions where contribution_id='40000000-0000-0000-0000-000000000002'), 'archive row consumed by restore');

-- author undo window: own delete restorable within 5 minutes, not after; other users never
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select community_delete_message('40000000-0000-0000-0000-000000000002');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error($$select community_restore('40000000-0000-0000-0000-000000000002')$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.assert(community_restore('40000000-0000-0000-0000-000000000002') = 'restored', 'author undoes own delete inside the window');
select community_delete_message('40000000-0000-0000-0000-000000000002');
update research_contributions set deleted_at = now() - interval '6 minutes' where id='40000000-0000-0000-0000-000000000002';
select pg_temp.expect_error($$select community_restore('40000000-0000-0000-0000-000000000002')$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select community_restore('40000000-0000-0000-0000-000000000002');

-- thread hide and restore; restore brings back exactly what the hide changed
select community_hide_thread('40000000-0000-0000-0000-000000000001');
select pg_temp.assert((select count(*) from community_admin_removed(50) where kind='thread' and id='40000000-0000-0000-0000-000000000001') = 1, 'hidden thread listed once, at its top');
select pg_temp.as_user(null);
select pg_temp.assert(not exists (select 1 from community_feed_page(0,40,'newest') where id='40000000-0000-0000-0000-000000000001'), 'hidden thread is out of the feed');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.assert(community_restore('40000000-0000-0000-0000-000000000001') = 'thread_restored', 'admin restores the thread');
select pg_temp.as_user(null);
select pg_temp.assert(exists (select 1 from community_feed_page(0,40,'newest') where id='40000000-0000-0000-0000-000000000001') and (select count(*) from community_replies_page('40000000-0000-0000-0000-000000000001',0,20)) = 2, 'restored thread and all its replies are readable again');
select pg_temp.assert((select status from research_contributions where id='20000000-0000-0000-0000-000000000002') = 'hidden', 'imported hidden rows still untouched');

-- grants for the new functions
set role anon;
select pg_temp.assert((select count(*) from community_search('מילת',0,20)) >= 1, 'anon can search');
select pg_temp.expect_error($$select community_restore('40000000-0000-0000-0000-000000000002')$$, 'permission denied');
select pg_temp.expect_error($$select * from community_admin_removed(5)$$, 'permission denied');
select pg_temp.expect_error($$select * from community_admin_reports(5)$$, 'permission denied');
select pg_temp.expect_error($$select community_report_message('40000000-0000-0000-0000-000000000002','spam')$$, 'permission denied');
select pg_temp.expect_error($$select * from community_reports$$, 'permission denied');
select pg_temp.expect_error($$select * from research_contribution_edits$$, 'permission denied');
reset role;

-- ===== third migration: automatic legacy link by confirmed email =====
insert into auth.users (id, email, email_confirmed_at) values
 ('00000000-0000-0000-0000-0000000000a1','Ilana@Example.invalid', now()),   -- confirmed, mixed case; matches c1 below
 ('00000000-0000-0000-0000-0000000000a2','boaz@example.invalid', null),     -- NOT confirmed; matches c2
 ('00000000-0000-0000-0000-0000000000ad','admin@example.invalid', now()),
 ('50000000-0000-0000-0000-0000000000e1','owner@example.invalid', now()),   -- already owns a contributor; matches c3
 ('50000000-0000-0000-0000-0000000000e2','trusted@example.invalid', now()), -- matches a trusted contributor
 ('50000000-0000-0000-0000-0000000000e3','nomatch@example.invalid', now()),
 ('50000000-0000-0000-0000-0000000000e4','other@example.invalid', now()),   -- matches an already-claimed contributor
 ('50000000-0000-0000-0000-0000000000e5','wa@example.invalid', now()),      -- matches a non-openweb contributor
 ('50000000-0000-0000-0000-0000000000e6','reg@example.invalid', now());     -- backfill candidate (no contributor yet)
insert into public.contributors (id, display_name, email, source, user_id, trusted) values
 ('c0000000-0000-0000-0000-0000000000c1','ilana-old','  ilana@example.invalid ','openweb_import',null,false),
 ('c0000000-0000-0000-0000-0000000000c2','boaz-old','boaz@example.invalid','openweb_import',null,false),
 ('c0000000-0000-0000-0000-0000000000c3','owner-old','owner@example.invalid','openweb_import',null,false),
 ('c0000000-0000-0000-0000-0000000000c9','owner-own','own@example.invalid','manual','50000000-0000-0000-0000-0000000000e1',false),
 ('c0000000-0000-0000-0000-0000000000c4','trusted-old','trusted@example.invalid','openweb_import',null,true),
 ('c0000000-0000-0000-0000-0000000000c5','claimed-old','other@example.invalid','openweb_import','00000000-0000-0000-0000-0000000000ad',false),
 ('c0000000-0000-0000-0000-0000000000c6','wa-contact','wa@example.invalid','whatsapp_group',null,false),
 ('c0000000-0000-0000-0000-0000000000c7','reg-old','reg@example.invalid','openweb_import',null,false);
insert into public.research_contributions (id, author_contributor_id, origin, status, body) values
 ('60000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-0000000000c1','openweb','approved','old one'),
 ('60000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-0000000000c1','openweb','approved','old two'),
 ('60000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-0000000000c1','openweb','hidden','old hidden');

select pg_temp.as_user(null);
select pg_temp.expect_error($$select contributors_claim_legacy_by_email()$$, 'not_authenticated');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.assert((select contributors_claim_legacy_by_email()->>'reason') = 'email_not_confirmed', 'unconfirmed email never claims');
select pg_temp.assert((select user_id is null from contributors where id='c0000000-0000-0000-0000-0000000000c2'), 'unconfirmed email left the record unclaimed');
select pg_temp.as_user('50000000-0000-0000-0000-0000000000e3');
select pg_temp.assert((select contributors_claim_legacy_by_email()->>'reason') = 'no_match', 'no matching email, nothing claimed');
select pg_temp.as_user('50000000-0000-0000-0000-0000000000e1');
select pg_temp.assert((select contributors_claim_legacy_by_email()->>'reason') = 'account_has_contributor', 'account that already owns a contributor is skipped');
select pg_temp.as_user('50000000-0000-0000-0000-0000000000e2');
select pg_temp.assert((select contributors_claim_legacy_by_email()->>'reason') = 'no_match', 'trusted contributor is never auto-claimed');
select pg_temp.as_user('50000000-0000-0000-0000-0000000000e4');
select pg_temp.assert((select contributors_claim_legacy_by_email()->>'reason') = 'no_match' and (select user_id from contributors where id='c0000000-0000-0000-0000-0000000000c5') = '00000000-0000-0000-0000-0000000000ad', 'an already-claimed contributor is not taken over');
select pg_temp.as_user('50000000-0000-0000-0000-0000000000e5');
select pg_temp.assert((select contributors_claim_legacy_by_email()->>'reason') = 'no_match', 'non-OpenWeb contributors are not auto-claimed');
-- the real match: confirmed, case/space-insensitive, counts only approved OpenWeb messages
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.assert((select (r->>'claimed')::int = 1 and (r->>'messages')::int = 2 from (select contributors_claim_legacy_by_email() r) x), 'confirmed matching email claims the old author (2 approved messages)');
select pg_temp.assert((select user_id from contributors where id='c0000000-0000-0000-0000-0000000000c1') = '00000000-0000-0000-0000-0000000000a1', 'record now belongs to the signed-in account');
select pg_temp.assert((select count(*) from contributor_claim_events where method='auto_login') = 1, 'claim is logged for audit and undo');
select pg_temp.assert((select contributors_claim_legacy_by_email()->>'reason') = 'account_has_contributor', 'second call is a harmless no-op');
-- the messages now resolve to the account through the existing contributor join
select pg_temp.as_user(null);
select pg_temp.assert((select count(*) from research_contributions r join contributors c on c.id = r.author_contributor_id where c.user_id = '00000000-0000-0000-0000-0000000000a1' and r.origin = 'openweb') = 3, 'all of the old author''s rows now join to the account');

-- admin backfill: links the registered, skips accounts that already own a contributor, idempotent, admin only
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_error($$select contributors_link_registered_legacy()$$, 'not authorized');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.assert((select (r->>'linked')::int = 1 and (r->>'skipped_account_has_contributor')::int = 1 from (select contributors_link_registered_legacy() r) x), 'backfill links the one registered author and reports the one needing review');
select pg_temp.assert((select user_id from contributors where id='c0000000-0000-0000-0000-0000000000c7') = '50000000-0000-0000-0000-0000000000e6', 'registered author linked by backfill');
select pg_temp.assert((select user_id is null from contributors where id='c0000000-0000-0000-0000-0000000000c3'), 'account owning another contributor not touched by backfill');
select pg_temp.assert((select (contributors_link_registered_legacy()->>'linked')::int) = 0, 'backfill is idempotent');
select pg_temp.assert((select count(*) from contributor_claim_events where method='auto_backfill') = 1, 'backfill logged');
set role anon;
select pg_temp.expect_error($$select contributors_claim_legacy_by_email()$$, 'permission denied');
select pg_temp.expect_error($$select contributors_link_registered_legacy()$$, 'permission denied');
select pg_temp.expect_error($$select * from contributor_claim_events$$, 'permission denied');
reset role;

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
