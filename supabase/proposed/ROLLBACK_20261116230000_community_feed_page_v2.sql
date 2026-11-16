-- ROLLBACK for supabase/migrations/20261116230000_community_feed_page_v2.sql. Removes only the wrapper; community_feed_page and
-- community_reply_counts are untouched by the migration and by this rollback. The client reads community_feed_page when the wrapper is missing.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';
do $guard$
begin
  if to_regprocedure('public.community_feed_page_v2(integer,integer,text)') is null then raise exception 'community_feed_page_v2 is not there; nothing to roll back'; end if;
  if (select prosecdef from pg_proc where oid = to_regprocedure('public.community_feed_page_v2(integer,integer,text)')) then
    raise exception 'community_feed_page_v2 is not the invoker wrapper of 16.11.2026; review before rolling back';
  end if;
end $guard$;
drop function public.community_feed_page_v2(integer, integer, text);
notify pgrst, 'reload schema';
commit;
