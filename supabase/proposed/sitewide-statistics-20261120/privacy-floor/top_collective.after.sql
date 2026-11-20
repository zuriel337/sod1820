CREATE OR REPLACE FUNCTION public.top_collective(min_users integer DEFAULT 2, lim integer DEFAULT 12)
 RETURNS TABLE(entity_type text, entity_ref text, title text, researchers integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  with touches as (
    select case when entity_type='number' then nullif(regexp_replace(entity_ref,'\D','','g'),'')::int
                when entity_type='phrase' then public.fn_ragil(entity_ref) else null end as val,
           user_id::text as ident, null::text as title, created_at
      from public.research_items where user_id is not null
    union all
    select case when target_type='number' then nullif(regexp_replace(target_id,'\D','','g'),'')::int
                when target_type='phrase' then public.fn_ragil(target_id) else null end,
           coalesce(author_user_id::text,'name:'||author_name),
           coalesce(nullif(target_id,''), title), created_at
      from public.research_contributions
      where status='approved' and (author_user_id is not null or coalesce(author_name,'')<>'')
  )
  select 'number'::text as entity_type, val::text as entity_ref,
         max(title) as title, count(distinct ident)::int as researchers
  from touches
  where val is not null and val > 0
  group by val
  having count(distinct ident) >= greatest(min_users,3)
  order by count(distinct ident) desc, max(created_at) desc
  limit lim;
$function$
