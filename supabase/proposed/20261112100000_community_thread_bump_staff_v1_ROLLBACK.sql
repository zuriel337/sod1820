-- ROLLBACK for 20261112100000_community_thread_bump_staff_v1_PROPOSAL.sql (restores the live feed function text of 12.11.2026).
begin;
drop trigger if exists trg_community_thread_bump_v1 on public.research_contributions;
drop function if exists public.fn_community_thread_bump_v1();
drop function if exists public.community_staff_user_ids_v1();
create or replace function public.community_feed_page(p_offset integer default 0, p_limit integer default 40, p_sort text default 'newest')
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
    select r.id, r.created_at, false as tomb
    from public.research_contributions r
    where r.parent_id is null and r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null
    union all
    select r.id, r.created_at, true
    from public.research_contributions r
    where r.parent_id is null and r.deleted_at is not null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and public.community_has_live_descendant(r.id)
  ), page as (
    select v.*, case when v_offset = 0 then count(*) over () else null end as total
    from v
    order by case when v_asc then v.created_at end asc, case when v_asc then v.id end asc,
             case when not v_asc then v.created_at end desc, case when not v_asc then v.id end desc
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
           case when not v_asc then r.created_at end desc, case when not v_asc then r.id end desc;
end;
$function$;
-- the thread_bumped_at column is left in place (nullable, harmless); drop it only if explicitly requested:
-- alter table public.research_contributions drop column thread_bumped_at;
commit;
