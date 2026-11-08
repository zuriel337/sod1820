-- PROPOSED — NOT APPLIED. Requires ZURIEL's explicit approval of this exact file.
-- ZURIEL: the "N guest messages pending review" banner text alone makes a moderator
-- hunt for them in the feed. This returns the same ids plus enough to jump straight
-- to each one (author_name, a one-line body, and its thread path), the same shape
-- as community_tree_hints_list, so the client can render an expandable panel with
-- direct links instead of plain text. Moderator-only (community_can_moderate_guests()),
-- same as before; nothing about who may call it changes.
drop function if exists public.community_guest_unreviewed(uuid[]);

create or replace function public.community_guest_unreviewed(p_ids uuid[] default null)
returns table (id uuid, author_name text, body text, created_at timestamptz, path uuid[])
language sql
stable
security definer
set search_path to 'public'
as $function$
  select r.id, r.author_name, r.body, g.created_at,
         (with recursive up as (
            select c.id, c.parent_id, array[c.id] as chain, 1 as depth
            from public.research_contributions c where c.id = r.id
            union all
            select p.id, p.parent_id, p.id || up.chain, up.depth + 1
            from public.research_contributions p join up on p.id = up.parent_id
            where up.depth < 30
          )
          select chain from up where parent_id is null limit 1) as path
  from public.community_guest_posts g
  join public.research_contributions r on r.id = g.contribution_id
  where public.community_can_moderate_guests()
    and g.reviewed_at is null
    and r.status = 'approved' and r.deleted_at is null
    and (p_ids is null or g.contribution_id = any(p_ids))
  order by g.created_at desc
  limit 200
$function$;
revoke all on function public.community_guest_unreviewed(uuid[]) from public;
grant execute on function public.community_guest_unreviewed(uuid[]) to authenticated;
