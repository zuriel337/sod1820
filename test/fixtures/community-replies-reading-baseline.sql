CREATE OR REPLACE FUNCTION public.replies_to_me(p_limit integer DEFAULT 40, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, author_name text, body text, target_type text, target_id text, parent_id uuid, parent_title text, convergence_slug text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with recursive ancestors as (
    select c.id, c.parent_id, c.author_user_id, c.id as reply_id, 0 as depth
    from public.research_contributions c
    union all
    select p.id, p.parent_id, p.author_user_id, a.reply_id, a.depth + 1
    from ancestors a
    join public.research_contributions p on p.id = a.parent_id
    where a.depth < 25
  ),
  mine as (
    select distinct reply_id
    from ancestors
    where depth > 0
      and author_user_id = auth.uid()
  )
  select r.id, r.author_name, r.body, r.target_type, r.target_id, r.parent_id,
         p.title as parent_title, r.convergence_slug, r.created_at
  from public.research_contributions r
  join mine m on m.reply_id = r.id
  join public.research_contributions p on p.id = r.parent_id
  where r.author_user_id is distinct from auth.uid()
    and coalesce(r.status,'') not in ('hidden','rejected')
    and (p_before is null or r.created_at < p_before)
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit,40), 100));
$function$

