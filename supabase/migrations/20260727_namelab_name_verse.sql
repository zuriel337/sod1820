-- ============================================================
--  NameLab — "הפסוק שלך" (personal name-verse) + wire into fn_name_multi
--  Zuriel: unified box (name required · surname/birthdate optional) and
--  the verse recited by one's name — begins with the name's first letter,
--  ends with its last letter (said at the close of the Amidah). Deterministic.
--  Supersedes fn_name_multi from 20260727_namelab_must_multi.sql (adds a track).
-- ============================================================

create or replace function public.fn_name_verse(p_name text)
returns jsonb language sql stable set search_path=public as $$
  with nm as (
    select t, left(t,1) f, right(t,1) l
    from (select btrim(regexp_replace(coalesce(p_name,''),'['||chr(1425)||'-'||chr(1479)||'  ]','','g')) t) z
  ),
  v as (
    select book,chapter,verse,text,
      left(regexp_replace(text,'[^א-ת]','','g'),1) vf,
      right(regexp_replace(text,'[^א-ת]','','g'),1) vl,
      length(regexp_replace(text,'[^א-ת]','','g')) len
    from tanach_verses
  ),
  hits as (select v.* from v, nm where length(nm.t)>=2 and v.vf=nm.f and v.vl=nm.l)
  select jsonb_build_object(
    'name',(select t from nm), 'first',(select f from nm), 'last',(select l from nm),
    'count',(select count(*) from hits),
    'verses', coalesce((select jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text) order by len) from (select * from hits order by len limit 6) z),'[]'::jsonb),
    'note','פסוק שמתחיל באות הראשונה של השם ומסתיים באות האחרונה — «הפסוק לשמך» (נהוג לאומרו בסוף תפילת העמידה)'
  );
$$;
grant execute on function public.fn_name_verse(text) to anon, authenticated;

-- fn_name_multi now includes the name-verse track + top-level name_verse.
create or replace function public.fn_name_multi(
  p_name text, p_surname text default null, p_birthdate text default null, p_question text default null
) returns jsonb language plpgsql stable set search_path=public as $$
declare
  comp jsonb; nfull text; parts text[]; fst text; lst text; nparts int;
  t_together jsonb; t_prox jsonb; t_inverse jsonb; t_split jsonb; t_variants jsonb; nverse jsonb;
  v_full int; w_first int; w_last int; combo_verses jsonb; combo_words int;
  root_first jsonb; root_last jsonb; nota jsonb;
  els jsonb; sparse boolean; tracks jsonb; found_literal boolean;
begin
  comp := fn_name_components(p_name, p_surname);
  nfull := comp->>'full';
  parts := array(select jsonb_array_elements_text(comp->'parts'));
  nparts := coalesce(array_length(parts,1),0);
  fst := comp->>'first'; lst := comp->>'last';

  t_together := case when nparts>=2 then fn_tanach_together(parts) else null end;
  t_prox     := case when nparts>=2 then fn_tanach_proximity(fst,lst,6) else null end;
  t_inverse  := fn_name_in_verse(replace(nfull,' ',''));
  t_split    := fn_split_gematria(parts);
  t_variants := fn_name_variants(nfull);
  nverse     := fn_name_verse(fst);
  v_full     := fn_ragil(nfull);
  w_first    := (fn_name_in_tanach(fst)->>'count')::int;
  w_last     := case when lst is not null and lst<>fst then (fn_name_in_tanach(lst)->>'count')::int else null end;
  combo_verses := fn_verses_by_gematria(v_full,6);
  combo_words  := (select count(*) from gematria_words where ragil=v_full);
  root_first := fn_hebrew_root(fst);
  root_last  := case when lst is not null and lst<>fst then fn_hebrew_root(lst) else null end;
  nota       := fn_notarikon(nfull);

  found_literal := coalesce((t_together->>'same_verse_count')::int,0) > 0 or coalesce((t_inverse->>'count')::int,0) > 0;
  sparse := coalesce((t_together->>'same_verse_count')::int,0)
           + coalesce((t_prox->>'count')::int,0)
           + coalesce((t_inverse->>'count')::int,0) < 3;
  els := case when sparse then fn_els_search(replace(nfull,' ',''),26,8) else null end;

  tracks := jsonb_build_array(
    jsonb_build_object('id','name_verse','label','הפסוק שלך (לפי השם)','strategy','LETTER','tier','must',
      'count', coalesce((nverse->>'count')::int,0),
      'status', case when coalesce((nverse->>'count')::int,0)>0 then 'ok' else 'empty' end,
      'sample', nverse->'verses'->0, 'source_fn','fn_name_verse'),
    jsonb_build_object('id','literal','label','התאמה מילולית מלאה','strategy','FULL_NAME','tier','must',
      'count', coalesce((t_together->>'same_verse_count')::int,0),
      'status', case when coalesce((t_together->>'same_verse_count')::int,0)>0 then 'ok' else 'empty' end,
      'sample', t_together->'same_verse'->0, 'source_fn','fn_tanach_together'),
    jsonb_build_object('id','words','label','כל מילה בנפרד','strategy','FIRST/LAST','tier','must',
      'count', coalesce(w_first,0)+coalesce(w_last,0), 'status', case when coalesce(w_first,0)+coalesce(w_last,0)>0 then 'ok' else 'empty' end,
      'detail', jsonb_build_object(fst,w_first,coalesce(lst,'-'),w_last), 'source_fn','fn_name_in_tanach'),
    jsonb_build_object('id','chapter','label','באותו פרק','strategy','PROXIMITY','tier','must',
      'count', coalesce((t_together->>'same_chapter_count')::int,0),
      'status', case when coalesce((t_together->>'same_chapter_count')::int,0)>0 then 'ok' else 'empty' end,
      'sample', t_together->'same_chapter'->0, 'source_fn','fn_tanach_together'),
    jsonb_build_object('id','proximity','label','קרבה (מרחק + סדר)','strategy','PROXIMITY','tier','must',
      'count', coalesce((t_prox->>'count')::int,0), 'status', case when coalesce((t_prox->>'count')::int,0)>0 then 'ok' else 'empty' end,
      'sample', t_prox->'items'->0, 'source_fn','fn_tanach_proximity'),
    jsonb_build_object('id','in_verse','label','שם בתוך פסוק (רצף אותיות)','strategy','PHRASE','tier','must',
      'count', coalesce((t_inverse->>'count')::int,0), 'status', case when coalesce((t_inverse->>'count')::int,0)>0 then 'ok' else 'empty' end,
      'sample', t_inverse->'items'->0, 'source_fn','fn_name_in_verse'),
    jsonb_build_object('id','combo_gem','label','גימטריית הצירוף','strategy','NUMERIC','tier','must',
      'value', v_full, 'count', combo_words, 'status', case when combo_words>0 then 'ok' else 'empty' end,
      'verses', combo_verses, 'source_fn','fn_verses_by_gematria'),
    jsonb_build_object('id','split_gem','label','גימטריה מפוצלת','strategy','NUMERIC','tier','must',
      'count', jsonb_array_length(coalesce(t_split->'sum_words','[]'::jsonb)), 'status','ok',
      'data', t_split, 'source_fn','fn_split_gematria'),
    jsonb_build_object('id','initials','label','ראשי/סופי תיבות','strategy','LETTER','tier','must',
      'initials', comp->>'initials', 'finals', comp->>'finals',
      'count', coalesce((nota->>'count')::int,0), 'status', case when coalesce((nota->>'count')::int,0)>0 then 'ok' else 'empty' end,
      'source_fn','fn_notarikon'),
    jsonb_build_object('id','roots','label','שורש (לכל רכיב)','strategy','ROOT','tier','must',
      'first', root_first->>'root_candidate', 'last', root_last->>'root_candidate',
      'count', jsonb_array_length(coalesce(root_first->'related','[]'::jsonb)), 'status','ok', 'source_fn','fn_hebrew_root'),
    jsonb_build_object('id','variants','label','וריאציות-כתיב מעוגנות','strategy','VARIANTS','tier','must',
      'count', jsonb_array_length(coalesce(t_variants->'variants','[]'::jsonb)),
      'status', case when jsonb_array_length(coalesce(t_variants->'variants','[]'::jsonb))>0 then 'ok' else 'empty' end,
      'data', t_variants->'variants', 'source_fn','fn_name_variants'),
    jsonb_build_object('id','els','label','דילוגים (ELS)','strategy','LETTER','tier','must',
      'ran', sparse, 'count', coalesce((els->>'els_count')::int,0),
      'status', case when els is null then 'skipped' when coalesce((els->>'els_count')::int,0)>0 then 'ok' else 'empty' end,
      'min_skip', els->>'min_skip', 'note', case when not sparse then 'דולג — נמצאו מספיק ממצאים מילוליים' else null end,
      'source_fn','fn_els_search')
  );

  return jsonb_build_object(
    'protocol','name_multi_v1',
    'input', jsonb_build_object('name',p_name,'surname',p_surname,'birthdate',p_birthdate,'components',comp),
    'name_verse', nverse,
    'literal_full_found', found_literal,
    'tracks', tracks,
    'tracks_with_results', (select count(*) from jsonb_array_elements(tracks) t where t->>'status'='ok'),
    'summary', case when found_literal then 'נמצאה התאמה מילולית — ומסלולי-מחקר נוספים.'
                    else 'לא נמצאה התאמה מילולית מלאה — אך נמצאו מסלולי-מחקר עשירים (הפסוק שלך · גימטריה · קרבה · שורש · וריאציות · דילוגים).' end,
    'question', case when p_question is null or btrim(p_question)='' then null else jsonb_build_object(
       'text', p_question, 'saved', true,
       'ai_facts', 'שם: '||nfull||' · ערך '||v_full||' · '||fst||'='||coalesce(w_first,0)||' '||coalesce(lst,'')||'='||coalesce(w_last,0)
                   ||' · הפסוק שלך: '||coalesce(nverse->'verses'->0->>'ref','—')
                   ||' · פרק משותף: '||coalesce((t_together->>'same_chapter_count')::text,'0')
                   ||' · קרבה: '||coalesce((t_prox->>'count')::text,'0')||' · סכום-מפוצל '||coalesce((t_split->>'sum')::text,'')) end,
    'generated_at', now()
  );
end $$;
