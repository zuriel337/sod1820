CREATE OR REPLACE FUNCTION public.find_similar_words(p_phrase text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with c as (select btrim(p_phrase) ph),
  norm as (select ph, translate(replace(ph,' ',''), 'ךםןףץ', 'כמנפצ') n,
                  translate(translate(replace(ph,' ',''), 'ךםןףץ','כמנפצ'), 'אוי','') skel from c)
  select coalesce(jsonb_agg(distinct jsonb_build_object('phrase', g.phrase, 'ragil', g.ragil, 'why', g.why)), '[]')
  from norm, lateral (
    select gw.phrase, gw.ragil,
      case
        when gw.phrase = norm.ph then 'זהה'
        when translate(replace(gw.phrase,' ',''),'ךםןףץ','כמנפצ') = norm.n then 'אות-סופית/כתיב'
        when translate(translate(replace(gw.phrase,' ',''),'ךםןףץ','כמנפצ'),'אוי','') = norm.skel and length(norm.skel) >= 3 then 'שורש/כתיב'
        when gw.phrase like norm.ph || '%' or norm.ph like gw.phrase || '%' then 'הטיה/קידומת'
        else null end as why
    from gematria_words gw
    where gw.phrase = norm.ph
       or translate(replace(gw.phrase,' ',''),'ךםןףץ','כמנפצ') = norm.n
       or (translate(translate(replace(gw.phrase,' ',''),'ךםןףץ','כמנפצ'),'אוי','') = norm.skel and length(norm.skel) >= 3)
       or gw.phrase like norm.ph || '%'
       or norm.ph like gw.phrase || '%'
    limit 10
  ) g
  where g.why is not null;
$function$
