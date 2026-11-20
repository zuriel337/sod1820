CREATE OR REPLACE FUNCTION public.number_resonance_stats(p_self text, p_pairs jsonb)
 RETURNS TABLE(n_methods integer, n_connections integer, n_strong_nodes integer, n_axis integer, n_notable integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  with legible as (select unnest(array['רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר']) m),
  ours as (
    select (e->>'method')::text self_method, (e->>'value')::int self_value
    from jsonb_array_elements(p_pairs) e
    where (e->>'method')::text in (select m from legible)
      and (e->>'value')::int between 10 and 100000
  ),
  hits as (
    select o.self_method, o.self_value, b.phrase,
           coalesce((select bool_or(
                g.lead_rank is not null
                or (coalesce(array_length(g.source_wp_ids,1),0) = 0
                    and coalesce(g.source,'') !~ '^(excel_import|promoted:|auto:|wp_id:)')
              ) from gematria_words g where g.phrase = b.phrase and ((select public.rd_is_admin()) or public.gematria_public_word_eligible(g.id))), false) as axis
    from ours o
    join bidim b on b.value = o.self_value and b.method in (select m from legible)
    where b.phrase <> p_self
      and (b.method = 'רגיל' or o.self_method = 'רגיל')
      and b.phrase !~ '[A-Za-z0-9]'
    group by o.self_method, o.self_value, b.phrase
  ),
  axis_hits as (select * from hits where axis),
  perval as (select self_value, count(distinct phrase) c from axis_hits group by self_value),
  agg as (
    select
      (select count(distinct self_method) from axis_hits)::int as m,
      (select count(distinct phrase) from axis_hits)::int      as c,
      (select count(*) from perval where c >= 2)::int          as s,
      (select count(*) from axis_hits)::int                    as a
  )
  select m, c, s, a, a from agg;
$function$
