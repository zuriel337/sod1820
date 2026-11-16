-- ROLLBACK for supabase/proposed/20261116210000_community_feed_reply_count_v1_PROPOSAL.sql (needs ZURIEL's explicit approval).
-- Restores public.community_feed_page exactly as recorded on 12.11.2026 (supabase/migrations/20261112100000_community_thread_bump_staff_v1.sql):
-- the same columns without reply_count, the same owner, settings and execute list (postgres, anon, authenticated).
-- Order: first restore a client that does not request reply_count (the client also falls back by itself when the column is missing),
-- then apply this file in one call, without an outer transaction. On lock timeout stop and inspect; never retry automatically.
begin;
set local lock_timeout='2s';
set local statement_timeout='30s';
do $guard$
declare r record;
begin
  select p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as owner, p.proacl::text as acl,
    pg_get_function_result(p.oid) as result, md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) as body
  into r from pg_proc p where p.oid = to_regprocedure('public.community_feed_page(integer,integer,text)');
  if not found or r.owner <> 'postgres' or not r.prosecdef
    or r.proconfig is distinct from array['search_path=public']::text[]
    or r.acl is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}'
    or r.result not like '%, total_count bigint, reply_count bigint)'
    or r.body is distinct from 'a64071d60da7acc892472d288c547049' then
    raise exception 'community_feed_page is not the reply_count version of 16.11.2026; review before rolling back';
  end if;
end $guard$;

drop function public.community_feed_page(integer, integer, text);

create function public.community_feed_page(p_offset integer default 0, p_limit integer default 40, p_sort text default 'newest')
 returns table(id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid, title text, body text, reactions jsonb, origin text, created_at timestamptz, edited_at timestamptz, is_deleted boolean, contributor_id uuid, contributor_user_id uuid, contributor_display_name text, contributor_avatar_url text, total_count bigint)
 language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
  v_asc boolean := p_sort = 'oldest';
begin
  return query
  with v as (
    select r.id, r.created_at, coalesce(r.thread_bumped_at, r.created_at) as bump, false as tomb
    from public.research_contributions r
    where r.parent_id is null and r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null
    union all
    select r.id, r.created_at, coalesce(r.thread_bumped_at, r.created_at), true
    from public.research_contributions r
    where r.parent_id is null and r.deleted_at is not null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and public.community_has_live_descendant(r.id)
  ), page as (
    select v.*, case when v_offset = 0 then count(*) over () else null end as total
    from v
    order by case when v_asc then v.created_at end asc, case when v_asc then v.id end asc,
             case when not v_asc then v.bump end desc, case when not v_asc then v.id end desc
    offset v_offset limit v_limit
  )
  select r.id, r.parent_id,
         case when p.tomb then null else r.author_name end,
         case when p.tomb then null else r.author_user_id end,
         case when p.tomb then null else r.author_contributor_id end,
         case when p.tomb then null else r.title end,
         case when p.tomb then null else r.body end,
         case when p.tomb then '{}'::jsonb else r.reactions end,
         r.origin, r.created_at,
         case when p.tomb then null else r.edited_at end,
         p.tomb,
         case when p.tomb then null else c.id end,
         case when p.tomb then null else c.user_id end,
         case when p.tomb then null else c.display_name end,
         case when p.tomb then null else c.avatar_url end,
         p.total
  from page p
  join public.research_contributions r on r.id = p.id
  left join public.contributors c on c.id = r.author_contributor_id
  order by case when v_asc then r.created_at end asc, case when v_asc then r.id end asc,
           case when not v_asc then p.bump end desc, case when not v_asc then r.id end desc;
end;
$function$;

alter function public.community_feed_page(integer, integer, text) owner to postgres;
revoke all on function public.community_feed_page(integer, integer, text) from public, anon, authenticated, service_role;
grant execute on function public.community_feed_page(integer, integer, text) to anon, authenticated;

do $check$
declare r record;
begin
  select p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as owner, p.proacl::text as acl,
    md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) as body
  into r from pg_proc p where p.oid = to_regprocedure('public.community_feed_page(integer,integer,text)');
  if not found or r.owner <> 'postgres' or not r.prosecdef
    or r.proconfig is distinct from array['search_path=public']::text[]
    or r.acl is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}'
    or r.body is distinct from '0de8c9c3379fc0c6e7e72b4ec2f5a95e' then
    raise exception 'community_feed_page was not restored to the 12.11.2026 record';
  end if;
end $check$;

notify pgrst, 'reload schema';
commit;
