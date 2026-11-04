CREATE OR REPLACE FUNCTION public.community_message_context(p_id uuid)
 RETURNS TABLE(id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid, title text, body text, reactions jsonb, origin text, created_at timestamp with time zone, edited_at timestamp with time zone, is_deleted boolean, contributor_id uuid, contributor_user_id uuid, contributor_display_name text, contributor_avatar_url text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with recursive up(rid, pid, depth, tomb) as (
    select r.id, r.parent_id, 1,
           case when r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
                     and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null then false
                when r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029') then true
                else null end
    from public.research_contributions r where r.id = p_id
    union all
    select r.id, r.parent_id, up.depth + 1,
           case when r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
                     and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null then false
                when r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029') then true
                else null end
    from public.research_contributions r join up on r.id = up.pid
    where up.tomb is not null and up.depth < 30
  ), chain as (
    select * from up where tomb is not null
  )
  select r.id, r.parent_id,
         case when c.tomb then null else r.author_name end,
         case when c.tomb then null else r.author_user_id end,
         case when c.tomb then null else r.author_contributor_id end,
         case when c.tomb then null else r.title end,
         case when c.tomb then null else r.body end,
         case when c.tomb then '{}'::jsonb else r.reactions end,
         r.origin, r.created_at,
         case when c.tomb then null else r.edited_at end,
         c.tomb,
         case when c.tomb then null else ct.id end,
         case when c.tomb then null else ct.user_id end,
         case when c.tomb then null else ct.display_name end,
         case when c.tomb then null else ct.avatar_url end,
         null::bigint
  from chain c
  join public.research_contributions r on r.id = c.rid
  left join public.contributors ct on ct.id = r.author_contributor_id
  -- the target itself must be visible; ancestors stop at the first invisible one
  where exists (select 1 from chain t where t.rid = p_id)
    and exists (select 1 from chain t where t.pid is null)
  order by c.depth desc;
end;
$function$

