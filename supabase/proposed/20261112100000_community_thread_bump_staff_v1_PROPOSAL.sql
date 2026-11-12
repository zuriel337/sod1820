-- PROPOSAL ONLY (ZURIEL, 12.11.2026): not applied. Community chat — (1) bump a thread to the top when a
-- REGISTERED member replies (also reply-to-reply: the ROOT rises), (2) public list of staff ids for the «צוות» label.
-- Live finding: community_feed_page orders by created_at, and last_activity_at is also touched by reactions,
-- so a dedicated column is used; reactions and guest messages never bump.
-- Apply in the Supabase dashboard SQL editor (DDL via the MCP shows an invisible confirmation card).
begin;

alter table public.research_contributions add column if not exists thread_bumped_at timestamptz;

create or replace function public.fn_community_thread_bump_v1()
returns trigger language plpgsql security definer set search_path = public as $f$
begin
  if new.parent_id is null or new.author_user_id is null
     or new.status is distinct from 'approved' or new.deleted_at is not null then
    return new;
  end if;
  -- walk to the root (depth-limited), bump only the root: that is the row the feed lists
  with recursive up as (
    select r.id, r.parent_id, 1 as d from public.research_contributions r where r.id = new.parent_id
    union all
    select r.id, r.parent_id, up.d + 1 from public.research_contributions r join up on r.id = up.parent_id where up.d < 12
  )
  update public.research_contributions t
     set thread_bumped_at = greatest(coalesce(t.thread_bumped_at, t.created_at), now())
   where t.id in (select id from up where parent_id is null);
  return new;
end
$f$;

drop trigger if exists trg_community_thread_bump_v1 on public.research_contributions;
create trigger trg_community_thread_bump_v1
  after insert or update of status on public.research_contributions
  for each row execute function public.fn_community_thread_bump_v1();

-- Feed: identical to the live function except the 'newest' order uses the bump time.
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

-- Staff ids (moderators + admins). Only ids are exposed; names/avatars come from the existing profile lookup.
create or replace function public.community_staff_user_ids_v1()
returns table(user_id uuid) language sql stable security definer set search_path = public as $f$
  select u.id from public.users u where u.community_moderator is true or u.role = 'admin'
$f$;
revoke all on function public.community_staff_user_ids_v1() from public;
grant execute on function public.community_staff_user_ids_v1() to anon, authenticated;

commit;
