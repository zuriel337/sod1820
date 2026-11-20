CREATE OR REPLACE FUNCTION public.discover_anchor_families(p_min_words integer DEFAULT 8, p_limit integer DEFAULT 60)
 RETURNS TABLE(root integer, mirror integer, n_words integer, n_methods integer, cross_method boolean, is_existing_anchor boolean, is_family boolean, family_status text, n_traces integer, sample text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  with axis as (
    select distinct phrase from gematria_words
    where (lead_rank is not null
       or (coalesce(array_length(source_wp_ids,1),0)=0 and coalesce(source,'') !~ '^(excel_import|promoted:|auto:|wp_id:)')) and public.gematria_public_word_eligible(gematria_words.id)
  ),
  anchors as (
    select distinct zero_root(v::int) rv from (
      select value v from number_anchors
      union select unnest(numbers) from topic_cards where status='approved'
      union select (jsonb_array_elements_text(metadata->'numbers'))::int from nodes where type='convergence' and is_active and metadata ? 'numbers'
    ) t where v between 10 and 1000000
  ),
  hits as (
    select zero_root(b.value::int) root, b.phrase, b.method from bidim b join axis a on a.phrase=b.phrase
    where b.method in ('רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר')
      and b.value between 100 and 1000000 and b.phrase !~ '[A-Za-z0-9]'
  ),
  traces as (
    select root, sum(c)::int c from (
      select zero_root(bb.value::int) root, count(*) c from visitor_events ve join bidim bb on bb.phrase=ve.slug
        where ve.section='journey_trace' and bb.value between 10 and 1000000 group by 1
      union all
      select zero_root(ve.slug::int) root, count(*) c from visitor_events ve
        where ve.section='journey_trace' and ve.slug ~ '^[0-9]+$' group by 1
    ) x group by root
  )
  select h.root, digit_reverse(h.root), count(distinct h.phrase)::int, count(distinct h.method)::int,
         (count(distinct h.method)>1), (h.root in (select rv from anchors)),
         exists(select 1 from anchor_families f where f.root=h.root),
         (select status from anchor_families f where f.root=h.root),
         coalesce((select c from traces t where t.root=h.root),0),
         (array_agg(distinct h.phrase))[1:6]
  from hits h where h.root>=10 group by h.root
  having count(distinct h.phrase) >= p_min_words
  order by count(distinct h.phrase) desc, count(distinct h.method) desc limit p_limit;
$function$
