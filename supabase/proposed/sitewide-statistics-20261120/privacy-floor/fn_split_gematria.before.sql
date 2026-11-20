CREATE OR REPLACE FUNCTION public.fn_split_gematria(p_parts text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with pv as (select p, fn_ragil(p) v from unnest(p_parts) p where p<>''),
  agg as (select sum(v)::int s, (max(v)-min(v))::int d from pv)
  select jsonb_build_object(
    'parts', coalesce((select jsonb_agg(jsonb_build_object('part',p,'value',v)) from pv),'[]'::jsonb),
    'sum', (select s from agg),
    'diff', (select d from agg),
    'sum_verses', coalesce((select fn_verses_by_gematria((select s from agg),6)),'null'::jsonb),
    'sum_words', coalesce((select jsonb_agg(phrase) from (select phrase from gematria_words where ragil=(select s from agg) limit 10) z),'[]'::jsonb)
  );
$function$
