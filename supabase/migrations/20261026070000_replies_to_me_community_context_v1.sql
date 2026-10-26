-- Replies in My Workspace use the existing research_contributions tree for both
-- community conversations and research discussions.  Older imported messages
-- often carry author_contributor_id rather than author_user_id, so ownership is
-- resolved only through contributors.user_id or the reviewed contributor-to-Person
-- bridge. Names, email, client-side verified pairs and URL parameters never
-- establish ownership.

drop function if exists public.replies_to_me(integer, timestamptz);

create function public.replies_to_me(p_limit integer default 40, p_before timestamptz default null)
 returns table(
   id uuid,
   author_name text,
   body text,
   target_type text,
   target_id text,
   parent_id uuid,
   parent_title text,
   convergence_slug text,
   created_at timestamp with time zone,
   origin text,
   thread_root_id uuid,
   thread_path uuid[]
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with recursive my_contributors as (
    select c.id
    from public.contributors c
    where c.user_id = (select auth.uid())
    union
    select c.id
    from public.contributors c
    join public.identity_edges edge
      on edge.kind = 'legacy_seed'
     and edge.legacy_id = 'contributor:' || c.id::text
    join public.persons person on person.person_id = edge.person_id
    where person.account_user_id = (select auth.uid())
  ),
  ancestors as (
    select c.id, c.parent_id, c.author_user_id, c.author_contributor_id,
           c.id as reply_id, array[c.id]::uuid[] as thread_path, 0 as depth
    from public.research_contributions c
    union all
    select p.id, p.parent_id, p.author_user_id, p.author_contributor_id,
           a.reply_id, array[p.id]::uuid[] || a.thread_path, a.depth + 1
    from ancestors a
    join public.research_contributions p on p.id = a.parent_id
    where a.depth < 25
  ),
  mine as (
    select distinct a.reply_id
    from ancestors a
    where a.depth > 0
      and (
        a.author_user_id = (select auth.uid())
        or a.author_contributor_id in (select id from my_contributors)
      )
  ),
  roots as (
    select distinct on (a.reply_id)
           a.reply_id, a.id as thread_root_id, a.thread_path
    from ancestors a
    order by a.reply_id, a.depth desc
  )
  select r.id, r.author_name, r.body, r.target_type, r.target_id, r.parent_id,
         p.title as parent_title, r.convergence_slug, r.created_at, r.origin,
         roots.thread_root_id, roots.thread_path
  from public.research_contributions r
  join mine on mine.reply_id = r.id
  join roots on roots.reply_id = r.id
  join public.research_contributions p on p.id = r.parent_id
  where not (
      coalesce(r.author_user_id = (select auth.uid()), false)
      or r.author_contributor_id in (select id from my_contributors)
    )
    and coalesce(r.status, '') not in ('hidden', 'rejected')
    and (coalesce(r.origin, '') not in ('openweb', 'community_2029') or r.status = 'approved')
    and (p_before is null or r.created_at < p_before)
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
$function$;

revoke all on function public.replies_to_me(integer, timestamptz) from public, anon;
grant execute on function public.replies_to_me(integer, timestamptz) to authenticated;

comment on function public.replies_to_me(integer, timestamptz) is
  'Owner-only replies across community and research trees. Imported history is included only through an exact account-to-contributor or reviewed Person identity edge; returns canonical community thread context.';
