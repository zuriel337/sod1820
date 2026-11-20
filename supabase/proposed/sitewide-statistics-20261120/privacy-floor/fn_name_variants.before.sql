CREATE OR REPLACE FUNCTION public.fn_name_variants(p_name text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with q as (select btrim(regexp_replace(coalesce(p_name,''),'['||chr(1425)||'-'||chr(1479)||']','','g')) t),
  curated as (select variant form, note from name_variants, q where base=(select t from q)),
  ktiv as (
    select distinct cand form, 'כתיב חלופי (מעוגן במאגר)' note from (
      select regexp_replace((select t from q),'ו','',1) cand
      union all select regexp_replace((select t from q),'י','',1)
    ) c
    where cand <> (select t from q) and length(cand)>=2
      and (exists(select 1 from gematria_words where phrase=cand) or exists(select 1 from tanach_verses where words @> array[cand]))
  )
  select jsonb_build_object('base',(select t from q),
    'variants', (select coalesce(jsonb_agg(jsonb_build_object('form',form,'note',note)),'[]'::jsonb) from (select form,note from curated union select form,note from ktiv) z));
$function$
