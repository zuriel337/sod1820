-- Community feed page with each root's public reply count (ZURIEL 16.11.2026, "לתקן", speed series 2 step 2: Community layout shifts;
-- "אני מאשר לך מראש הכל"). The replies control is known at first paint instead of appearing in every thread at once when the thread totals
-- arrive, and a root without replies skips its preview read (no "loading replies" line that appears and collapses).
-- EXTEND_EXISTING, additive only: nothing is dropped, revoked or replaced.
--   * community_feed_page_v2 is a SECURITY INVOKER wrapper over the two existing public readers: community_feed_page (the page, its rows,
--     order, bounds and visibility, unchanged) and community_reply_counts (the count, the reader's own predicate). The caller runs them with
--     its own rights, so a role that may not run them gets nothing from this wrapper.
--   * community_feed_page itself is untouched; the client falls back to it while this wrapper is missing.
-- Apply this exact file in one call. Rollback: supabase/proposed/ROLLBACK_20261116230000_community_feed_page_v2.sql
-- Test: tests/sql/community_feed_reply_count_v1.sql (local Postgres; .github/workflows/community-feed-reply-count-gate.yml)
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';
do $guard$
begin
  if to_regprocedure('public.community_feed_page(integer,integer,text)') is null or to_regprocedure('public.community_reply_counts(uuid[])') is null then
    raise exception 'the two public readers this wrapper uses are missing; review before applying';
  end if;
  if to_regprocedure('public.community_feed_page_v2(integer,integer,text)') is not null then
    raise exception 'community_feed_page_v2 already exists; review before applying';
  end if;
end $guard$;

create function public.community_feed_page_v2(p_offset integer default 0, p_limit integer default 40, p_sort text default 'newest')
 returns table(id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid, title text, body text, reactions jsonb, origin text, created_at timestamptz, edited_at timestamptz, is_deleted boolean, contributor_id uuid, contributor_user_id uuid, contributor_display_name text, contributor_avatar_url text, total_count bigint, reply_count bigint)
 language sql stable security invoker set search_path to 'public'
as $function$
  with page as (
    select f.*, f.ordinality as page_order
    from public.community_feed_page(p_offset, p_limit, p_sort) with ordinality as f
  ), counts as (
    select c.parent_id, c.reply_count from public.community_reply_counts((select coalesce(array_agg(page.id), '{}'::uuid[]) from page)) c
  )
  select page.id, page.parent_id, page.author_name, page.author_user_id, page.author_contributor_id, page.title, page.body, page.reactions, page.origin,
         page.created_at, page.edited_at, page.is_deleted, page.contributor_id, page.contributor_user_id, page.contributor_display_name,
         page.contributor_avatar_url, page.total_count, coalesce(counts.reply_count, 0)::bigint
  from page left join counts on counts.parent_id = page.id
  order by page.page_order;
$function$;

grant execute on function public.community_feed_page_v2(integer, integer, text) to anon, authenticated;

do $check$
declare r record;
begin
  select p.prosecdef, p.provolatile, pg_get_function_result(p.oid) as result into r
  from pg_proc p where p.oid = to_regprocedure('public.community_feed_page_v2(integer,integer,text)');
  if not found or r.prosecdef or r.provolatile <> 's' or r.result not like '%, total_count bigint, reply_count bigint)'
    or not has_function_privilege('anon', 'public.community_feed_page_v2(integer,integer,text)', 'execute')
    or not has_function_privilege('authenticated', 'public.community_feed_page_v2(integer,integer,text)', 'execute') then
    raise exception 'community_feed_page_v2 was not created as a stable invoker wrapper callable by anon and authenticated';
  end if;
end $check$;

notify pgrst, 'reload schema';
commit;
