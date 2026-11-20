CREATE OR REPLACE FUNCTION public.fn_hebrew_root(p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
declare
  v_nikud  text := '[' || chr(1425) || '-' || chr(1479) || ']';
  w text; root text; conf text; rel jsonb; pat text; i int; ch text;
  suffixes text[] := array['ימ','ות','יה','נו','כמ','המ','ונ','ית','ה','ת','י','כ'];  -- normalized (finals→base)
begin
  w := regexp_replace(coalesce(p_word,''), v_nikud, '', 'g');
  w := regexp_replace(w, '[^א-ת]', '', 'g');
  w := translate(w, 'ךםןףץ', 'כמנפצ');
  if length(w) = 0 then
    return jsonb_build_object('input', p_word, 'root_candidate', null, 'note', 'אין אותיות עבריות');
  end if;
  select coalesce((
     select substr(w, 1, length(w)-length(s))
     from unnest(suffixes) s
     where w like '%'||s and length(w)-length(s) >= 3
     order by length(s) desc limit 1), w) into root;
  conf := case when length(root) = 3 then 'medium' else 'low' end;
  pat := '';
  for i in 1..length(root) loop
    ch := substr(root,i,1);
    ch := case ch when 'כ' then '[כך]' when 'מ' then '[מם]' when 'נ' then '[נן]'
                  when 'פ' then '[פף]' when 'צ' then '[צץ]' else ch end;
    pat := pat || ch || case when i < length(root) then '.*' else '' end;
  end loop;
  select coalesce(jsonb_agg(distinct phrase), '[]'::jsonb) into rel
  from (select phrase from gematria_words
        where phrase ~ ('^'||pat) and public.gematria_public_word_eligible(gematria_words.id) and length(phrase) between length(root) and length(root)+4
        order by phrase limit 10) q;
  return jsonb_build_object(
    'input', p_word, 'normalized', w, 'root_candidate', root,
    'method', 'suffix_strip_deterministic', 'confidence', conf, 'related', rel,
    'note', 'שורש-מועמד דטרמיניסטי (הסרת סופיות + נרמול). מורפולוגיית תחיליות/בניינים = העשרה עתידית — לא ניתוח סמכותי.');
end $function$
