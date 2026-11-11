CREATE OR REPLACE FUNCTION public.fn_raziel_relevant_rules(p_query text DEFAULT NULL::text, p_domains text[] DEFAULT NULL::text[], p_limit integer DEFAULT 8)
 RETURNS TABLE(rule_id text, label text, description text, score integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with terms as (
    select distinct lower(d) as term
    from unnest(coalesce(p_domains, array[]::text[])) as d
    where length(d) >= 2
    union
    select distinct lower(t) as term
    from unnest(regexp_split_to_array(coalesce(p_query, ''), '\s+')) as t
    where length(t) >= 3
  ),
  scored as (
    select
      n.rule_id, n.label, n.description,
      (
        select coalesce(sum(
          (case when n.rule_id ilike '%' || t.term || '%' then 5 else 0 end) +
          (case when n.label    ilike '%' || t.term || '%' then 3 else 0 end) +
          (case when n.description ilike '%' || t.term || '%' then 1 else 0 end)
        ), 0)::int
        from terms t
      ) as score
    from public.nodes n
    where n.type = 'rule'
      and n.is_active
      and n.rule_id is not null
      and public.fn_graph_space_is_public(n.metadata)
  )
  select s.rule_id, s.label, left(s.description, 600) as description, s.score
  from scored s
  where s.score > 0
  order by s.score desc, s.rule_id
  limit greatest(1, least(coalesce(p_limit, 8), 20));
$function$
