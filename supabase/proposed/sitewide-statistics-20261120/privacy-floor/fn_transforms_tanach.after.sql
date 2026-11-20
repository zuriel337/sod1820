CREATE OR REPLACE FUNCTION public.fn_transforms_tanach(p_word text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  with base as (select translate(regexp_replace(coalesce(p_word,''),'['||chr(1425)||'-'||chr(1479)||'  ]','','g'),'ךםןףץ','כמנפצ') b),
  tf as (
    select 'אתב״ש' method, translate(b,'אבגדהוזחטיכלמנסעפצקרשת','תשרקצפעסנמלכיטחזוהדגבא') w from base
    union all
    select 'אלב״ם', translate(b,'אבגדהוזחטיכלמנסעפצקרשת','למנסעפצקרשתאבגדהוזחטיכ') from base
  ),
  tf2 as (select method, w, left(w,length(w)-1)||translate(right(w,1),'כמנפצ','ךםןףץ') wf from tf where w<>'')
  select jsonb_build_object(
    'transforms', coalesce((select jsonb_agg(jsonb_build_object(
      'method', method, 'word', w, 'value', fn_ragil(w),
      'in_tanach', (select count(*) from tanach_verses where words @> array[w] or words @> array[wf]),
      'known_words', coalesce((select jsonb_agg(phrase) from (select phrase from gematria_words where phrase in (w,wf) and ((select public.rd_is_admin()) or public.gematria_public_word_eligible(gematria_words.id)) limit 5) z),'[]'::jsonb),
      'verses', coalesce((select jsonb_agg(book||' '||chapter||':'||verse) from (select book,chapter,verse from tanach_verses where words @> array[w] or words @> array[wf] order by book_idx,chapter,verse limit 3) z),'[]'::jsonb)
    ) order by method) from tf2),'[]'::jsonb)
  );
$function$
