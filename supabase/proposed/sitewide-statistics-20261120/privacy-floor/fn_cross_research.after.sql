CREATE OR REPLACE FUNCTION public.fn_cross_research(p_items text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
declare
  it text; m text; r int; mobj jsonb;
  triples jsonb := '[]'::jsonb;
  items_out jsonb := '[]'::jsonb;
  combined text := array_to_string(p_items,' ');
  res jsonb;
begin
  foreach it in array p_items loop
    r := public.fn_ragil(it);
    mobj := jsonb_build_object(
      'רגיל',r,'מסתתר',public.fn_misratar(it),'סידורי',public.fn_siduri(it),
      'גדול',public.fn_gadol(it),'אתבש',public.fn_atbash(it),'קדמי',public.fn_kadmi(it),
      'קטן',(r-1)%9+1);
    items_out := items_out || jsonb_build_object('item',it,'methods',mobj,'letters',public.fn_letter_sig(it));
    for m in select jsonb_object_keys(mobj) loop
      triples := triples || jsonb_build_object('item',it,'method',m,'value',(mobj->>m)::int);
    end loop;
  end loop;
  res := jsonb_build_object(
    'principle','נקודת-מפגש = עובדה. המשמעות = השערה לבדיקה.',
    'items', items_out,
    'combined', jsonb_build_object('text',combined,'רגיל',public.fn_ragil(combined),'מסתתר',public.fn_misratar(combined)),
    'meeting_points', (
      with t as (select (e->>'value')::int v, e->>'item' item, e->>'method' method from jsonb_array_elements(triples) e),
           g as (select v, count(*) n, count(distinct item) span, jsonb_agg(distinct (item||'·'||method)) frm
                 from t group by v having count(*)>=2)
      select coalesce(jsonb_agg(jsonb_build_object(
        'value',v,'hits',n,'across_items',span,'from',frm,
        'equals',(select string_agg(phrase,' · ') from (select phrase from gematria_words where ragil=v and is_verified and space='core' and ((select public.rd_is_admin()) or public.gematria_public_word_eligible(gematria_words.id)) order by lead_rank nulls last limit 4) p),
        'tanach_verses',(select count(*) from tanach_verses where ragil=v)
      ) order by span desc, n desc),'[]'::jsonb) from g),
    'shared_letters', (
      select coalesce(string_agg(distinct c,''),'') from
       (select c from regexp_split_to_table(translate(p_items[1],'ךםןףץ','כמנפצ'),'') c where c ~ '[א-ת]') a
      where not exists (select 1 from unnest(p_items[2:array_length(p_items,1)]) oth
                        where position(a.c in translate(oth,'ךםןףץ','כמנפצ'))=0))
  );
  return res;
end $function$
