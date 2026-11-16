-- Community feed carries each root's public reply count (supabase/proposed/20261116210000_community_feed_reply_count_v1_PROPOSAL.sql).
-- Fixture: the 12.11.2026 feed function with its live execute list, the live helper and the live reply-count reader (the oracle).
-- Proves: every row and column of the old pages is unchanged in both sorts and on a later page; reply_count equals
-- community_reply_counts for every root (public children, deleted children with a live descendant; never pending, empty, hidden,
-- other-origin or grandchildren); owner, settings and execute list are the same; PUBLIC cannot call it; the rollback restores the
-- 12.11.2026 shape and rows. Run: psql -v ON_ERROR_STOP=1 -f tests/sql/community_feed_reply_count_v1.sql (empty database).
\set ON_ERROR_STOP on
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'feed_outsider') then create role feed_outsider nologin; end if;
end $$;
grant usage on schema public to anon, authenticated, feed_outsider;
create function public.test_assert(ok boolean, m text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %', m; end if; end $$;
grant execute on function public.test_assert(boolean, text) to public;
create table public.users(id uuid primary key, role text, community_moderator boolean);
create table public.contributors(id uuid primary key, user_id uuid, display_name text, avatar_url text);
create table public.research_contributions(id uuid primary key, parent_id uuid, author_user_id uuid, author_contributor_id uuid, author_name text, title text, body text,
  reactions jsonb default '{}', origin text, status text, created_at timestamptz, edited_at timestamptz, deleted_at timestamptz, thread_hidden_at timestamptz);
-- live definitions (read 16.11.2026)
create function public.community_has_live_descendant(p_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  with recursive d(id, deleted, live, depth) as (
    select c.id, c.deleted_at is not null and c.thread_hidden_at is null,
           c.status = 'approved' and c.deleted_at is null and c.thread_hidden_at is null and c.origin in ('openweb','community_2029') and nullif(btrim(c.body), '') is not null, 1
    from public.research_contributions c where c.parent_id = p_id
    union all
    select c.id, c.deleted_at is not null and c.thread_hidden_at is null,
           c.status = 'approved' and c.deleted_at is null and c.thread_hidden_at is null and c.origin in ('openweb','community_2029') and nullif(btrim(c.body), '') is not null, d.depth + 1
    from public.research_contributions c join d on c.parent_id = d.id where d.deleted and d.depth < 64
  )
  select exists (select 1 from d where live);
$function$;
create function public.community_reply_counts(p_ids uuid[]) returns table(parent_id uuid, reply_count bigint) language sql stable security definer set search_path to 'public' as $function$
  select c.parent_id, count(*)::bigint from public.research_contributions c
  where c.parent_id = any (p_ids[1:200]) and c.origin in ('openweb','community_2029') and c.thread_hidden_at is null
    and ((c.status = 'approved' and c.deleted_at is null and nullif(btrim(c.body), '') is not null) or (c.deleted_at is not null and public.community_has_live_descendant(c.id)))
  group by c.parent_id;
$function$;

insert into public.contributors values ('cccccccc-0000-4000-8000-000000000001', null, 'Archive author', 'https://example.invalid/a.png');
-- roots: 1 three kinds of children + a grandchild; 2 no replies; 3 deleted children with/without a live descendant; 4 a tomb root
-- with a live child; 5 hidden and other-origin children; 6 a hidden root (never listed); 7 an openweb root by a contributor
insert into public.research_contributions(id, parent_id, author_name, author_contributor_id, title, body, origin, status, created_at, edited_at, deleted_at, thread_hidden_at) values
('00000000-0000-4000-8000-000000000001', null, 'A', null, 't1', 'root one', 'community_2029', 'approved', '2026-10-01', '2026-10-05', null, null),
('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'B', null, null, 'public reply', 'community_2029', 'approved', '2026-10-01 01:00', null, null, null),
('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'B', null, null, '   ', 'community_2029', 'approved', '2026-10-01 02:00', null, null, null),
('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'B', null, null, 'pending reply', 'community_2029', 'pending', '2026-10-01 03:00', null, null, null),
('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000011', 'C', null, null, 'grandchild', 'community_2029', 'approved', '2026-10-01 04:00', null, null, null),
('00000000-0000-4000-8000-000000000002', null, 'A', null, null, 'root two, no replies', 'community_2029', 'approved', '2026-10-02', null, null, null),
('00000000-0000-4000-8000-000000000003', null, 'A', null, null, 'root three', 'community_2029', 'approved', '2026-10-03', null, null, null),
('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000003', 'B', null, null, 'deleted with live child', 'community_2029', 'approved', '2026-10-03 01:00', null, '2026-10-04', null),
('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000031', 'C', null, null, 'live under deleted', 'community_2029', 'approved', '2026-10-03 02:00', null, null, null),
('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000003', 'B', null, null, 'deleted alone', 'community_2029', 'approved', '2026-10-03 03:00', null, '2026-10-04', null),
('00000000-0000-4000-8000-000000000004', null, 'A', null, 'gone', 'deleted root', 'community_2029', 'approved', '2026-10-04', null, '2026-10-06', null),
('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000004', 'B', null, null, 'live child of a tomb', 'community_2029', 'approved', '2026-10-04 01:00', null, null, null),
('00000000-0000-4000-8000-000000000005', null, 'A', null, null, 'root five', 'openweb', 'approved', '2026-10-05', null, null, null),
('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000005', 'B', null, null, 'hidden reply', 'openweb', 'approved', '2026-10-05 01:00', null, null, '2026-10-06'),
('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000005', 'B', null, null, 'other origin', 'site', 'approved', '2026-10-05 02:00', null, null, null),
('00000000-0000-4000-8000-000000000006', null, 'A', null, null, 'hidden root', 'community_2029', 'approved', '2026-10-06', null, null, '2026-10-07'),
('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000006', 'B', null, null, 'reply in a hidden thread', 'community_2029', 'approved', '2026-10-06 01:00', null, null, null),
('00000000-0000-4000-8000-000000000007', null, 'Archive', 'cccccccc-0000-4000-8000-000000000001', null, 'root seven', 'openweb', 'approved', '2026-10-07', null, null, null),
('00000000-0000-4000-8000-000000000071', '00000000-0000-4000-8000-000000000007', 'B', null, null, 'r1', 'openweb', 'approved', '2026-10-07 01:00', null, null, null),
('00000000-0000-4000-8000-000000000072', '00000000-0000-4000-8000-000000000007', 'B', null, null, 'r2', 'community_2029', 'approved', '2026-10-07 02:00', null, null, null);

-- the 12.11.2026 function as recorded, with the live execute list
\i supabase/migrations/20261112100000_community_thread_bump_staff_v1.sql
-- one bump so the newest order differs from the creation order (root 1 surfaces first)
update public.research_contributions set thread_bumped_at = '2026-10-08' where id = '00000000-0000-4000-8000-000000000001';
revoke all on function public.community_feed_page(integer, integer, text) from public;
grant execute on function public.community_feed_page(integer, integer, text) to anon, authenticated;

create table public.before_pages as
  select 'newest' as page, row_number() over () as ord, f.* from public.community_feed_page(0, 10, 'newest') f
  union all select 'oldest', row_number() over (), f.* from public.community_feed_page(0, 10, 'oldest') f
  union all select 'second', row_number() over (), f.* from public.community_feed_page(2, 2, 'newest') f;
select public.test_assert((select count(*) from public.before_pages where page = 'newest') = 6, 'fixture: six listed roots (the hidden root is not listed)');
select public.test_assert((select array_agg(id order by ord) from public.before_pages where page = 'newest')
  = array['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000005',
          '00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002']::uuid[], 'fixture: newest order with the bump');

\i supabase/proposed/20261116210000_community_feed_reply_count_v1_PROPOSAL.sql

create table public.after_pages as
  select 'newest' as page, row_number() over () as ord, f.* from public.community_feed_page(0, 10, 'newest') f
  union all select 'oldest', row_number() over (), f.* from public.community_feed_page(0, 10, 'oldest') f
  union all select 'second', row_number() over (), f.* from public.community_feed_page(2, 2, 'newest') f;
-- every old row and column, in order, is unchanged
select public.test_assert(not exists (
  (select page, ord, id, parent_id, author_name, author_user_id, author_contributor_id, title, body, reactions, origin, created_at, edited_at, is_deleted,
          contributor_id, contributor_user_id, contributor_display_name, contributor_avatar_url, total_count from public.before_pages
   except select page, ord, id, parent_id, author_name, author_user_id, author_contributor_id, title, body, reactions, origin, created_at, edited_at, is_deleted,
          contributor_id, contributor_user_id, contributor_display_name, contributor_avatar_url, total_count from public.after_pages)
  union all
  (select page, ord, id, parent_id, author_name, author_user_id, author_contributor_id, title, body, reactions, origin, created_at, edited_at, is_deleted,
          contributor_id, contributor_user_id, contributor_display_name, contributor_avatar_url, total_count from public.after_pages
   except select page, ord, id, parent_id, author_name, author_user_id, author_contributor_id, title, body, reactions, origin, created_at, edited_at, is_deleted,
          contributor_id, contributor_user_id, contributor_display_name, contributor_avatar_url, total_count from public.before_pages)), 'old columns, rows and order unchanged (both sorts, later page)');
select public.test_assert((select total_count from public.after_pages where page = 'newest' and ord = 1) = 6 and (select bool_and(total_count is null) from public.after_pages where page = 'second'), 'total only on the first page');
-- reply_count is the public reader's count for every root
select public.test_assert(not exists (select 1 from public.after_pages a left join public.community_reply_counts((select array_agg(id) from public.after_pages)) c on c.parent_id = a.id
  where a.reply_count is distinct from coalesce(c.reply_count, 0)), 'reply_count equals community_reply_counts for every root');
select public.test_assert((select jsonb_object_agg(right(id::text, 1), reply_count) from public.after_pages where page = 'newest')
  = '{"1": 1, "2": 0, "3": 1, "4": 1, "5": 0, "7": 2}'::jsonb, 'expected counts: public child only; none; deleted child with a live descendant; tomb root; hidden and other origin excluded; both origins');
-- owner, settings, execute list; anon reads the new column, a role with only PUBLIC rights cannot call the function
select public.test_assert((select pg_get_userbyid(proowner) = 'postgres' and prosecdef and proconfig = array['search_path=public']::text[]
  and proacl::text = '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}' from pg_proc where oid = to_regprocedure('public.community_feed_page(integer,integer,text)')), 'owner, settings and execute list unchanged');
set role anon;
select public.test_assert((select sum(reply_count) from public.community_feed_page(0, 10, 'newest')) = 5, 'anon reads reply_count');
reset role;
set role authenticated;
select public.test_assert((select count(*) from public.community_feed_page(0, 10, 'oldest')) = 6, 'authenticated reads the feed');
reset role;
set role feed_outsider;
do $$ begin
  perform public.community_feed_page(0, 1, 'newest');
  raise exception 'ASSERTION FAILED: a role with only PUBLIC rights called the feed';
exception when insufficient_privilege then null;
end $$;
reset role;

\i supabase/proposed/ROLLBACK_20261116210000_community_feed_reply_count_v1.sql

select public.test_assert(pg_get_function_result(to_regprocedure('public.community_feed_page(integer,integer,text)')) not like '%reply_count%', 'rollback removes reply_count');
select public.test_assert((select proacl::text = '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}' from pg_proc where oid = to_regprocedure('public.community_feed_page(integer,integer,text)')), 'rollback keeps the execute list');
create table public.rolled_back as
  select 'newest' as page, row_number() over () as ord, f.* from public.community_feed_page(0, 10, 'newest') f
  union all select 'oldest', row_number() over (), f.* from public.community_feed_page(0, 10, 'oldest') f
  union all select 'second', row_number() over (), f.* from public.community_feed_page(2, 2, 'newest') f;
select public.test_assert(not exists ((select * from public.before_pages except select * from public.rolled_back) union all (select * from public.rolled_back except select * from public.before_pages)),
  'rollback restores the 12.11.2026 rows');
select 'community_feed_reply_count_v1: all assertions passed' as result;
