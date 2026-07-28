-- ============================================================
--  NameLab — Advanced #3: transforms → Tanach
--  fn_transforms_tanach(word) — takes the canonical transformed word
--  (atbash / albam from the official engine fn_name_research) and searches
--  it in the Tanach + word-bank. A transform not found is NOT a failure —
--  the transformed word + its value are shown regardless.
--  Example: גד → נס (albam, 12 verses) · גד → רק (atbash, 93 verses).
--  Wired into fn_name_multi as the 'transforms' track (tier=advanced).
--  This file also re-creates fn_name_multi in its final form (adds the track).
-- ============================================================
create or replace function public.fn_transforms_tanach(p_word text)
returns jsonb language sql stable set search_path=public as $$
  with r as (select fn_name_research(p_word) d),
  tf as (
    select 'אתב״ש' method, nullif(btrim(d->'transforms'->'atbash'->>'word'),'') w, (d->'transforms'->'atbash'->>'value')::int val from r
    union all
    select 'אלב״ם', nullif(btrim(d->'transforms'->'albam'->>'word'),''), (d->'transforms'->'albam'->>'value')::int from r
  )
  select jsonb_build_object(
    'transforms', coalesce((select jsonb_agg(jsonb_build_object(
      'method', method, 'word', w, 'value', val,
      'in_tanach', (select count(*) from tanach_verses where words @> array[w]),
      'known_words', coalesce((select jsonb_agg(phrase) from (select phrase from gematria_words where phrase=w limit 5) z),'[]'::jsonb),
      'verses', coalesce((select jsonb_agg(book||' '||chapter||':'||verse) from (select book,chapter,verse from tanach_verses where words @> array[w] order by book_idx,chapter,verse limit 3) z),'[]'::jsonb)
    ) order by method) from tf where w is not null),'[]'::jsonb)
  );
$$;
grant execute on function public.fn_transforms_tanach(text) to anon, authenticated;

create or replace function public.fn_name_multi(
  p_name text, p_surname text default null, p_birthdate text default null, p_question text default null
) returns jsonb language plpgsql stable set search_path=public as $$
declare
  comp jsonb; nfull text; parts text[]; fst text; lst text; nparts int;
  t_together jsonb; t_prox jsonb; t_inverse jsonb; t_split jsonb; t_variants jsonb; nverse jsonb;
  v_full int; w_first int; w_last int; combo_verses jsonb; combo_words int;
  root_first jsonb; root_last jsonb; nota jsonb; sv_words jsonb; neigh jsonb; v_shared jsonb; v_transforms jsonb;
  els jsonb; sparse boolean; tracks jsonb; found_literal boolean; v_consensus jsonb;
begin
  comp := fn_name_components(p_name, p_surname);
  nfull := comp->>'full'; parts := array(select jsonb_array_elements_text(comp->'parts'));
  nparts := coalesce(array_length(parts,1),0); fst := comp->>'first'; lst := comp->>'last';
  t_together := case when nparts>=2 then fn_tanach_together(parts) else null end;
  t_prox     := case when nparts>=2 then fn_tanach_proximity(fst,lst,6) else null end;
  t_inverse  := fn_name_in_verse(replace(nfull,' ',''));
  t_split    := fn_split_gematria(parts);
  t_variants := fn_name_variants(nfull);
  nverse     := fn_name_verse(fst);
  v_full     := fn_ragil(nfull);
  w_first    := (fn_name_in_tanach(fst)->>'count')::int;
  w_last     := case when lst is not null and lst<>fst then (fn_name_in_tanach(lst)->>'count')::int else null end;
  combo_verses := fn_verses_by_gematria(v_full,12);
  combo_words  := (select count(*) from gematria_words where ragil=v_full);
  sv_words     := (select coalesce(jsonb_agg(phrase),'[]'::jsonb) from (select phrase from gematria_words where ragil=v_full and phrase <> all(parts||nfull) limit 120) z);
  neigh        := fn_name_neighbors(fst,20);
  v_shared     := fn_shared_numbers(array(select distinct x from unnest(array[nfull,fst,lst]) x where coalesce(x,'')<>''));
  v_transforms := fn_transforms_tanach(fst);
  root_first := fn_hebrew_root(fst);
  root_last  := case when lst is not null and lst<>fst then fn_hebrew_root(lst) else null end;
  nota       := fn_notarikon(nfull);
  found_literal := coalesce((t_together->>'same_verse_count')::int,0) > 0 or coalesce((t_inverse->>'count')::int,0) > 0;
  sparse := coalesce((t_together->>'same_verse_count')::int,0)+coalesce((t_prox->>'count')::int,0)+coalesce((t_inverse->>'count')::int,0) < 3;
  els := case when sparse then fn_els_search(replace(nfull,' ',''),26,8) else null end;

  with votes as (
    select 'מילה' vtype, p target, 'גימטריה' family, 'ערך שווה ('||v_full||')' method from jsonb_array_elements_text(sv_words) p
    union all select 'מילה', n->>'word', 'שכנות בתנ״ך', 'מופיעה ליד השם' from jsonb_array_elements(coalesce(neigh,'[]'::jsonb)) n
    union all select 'מילה', r, 'שורש', 'נגזרת מהשורש' from jsonb_array_elements_text(coalesce(root_first->'related','[]'::jsonb)) r
    union all select 'מילה', r, 'שורש', 'נגזרת מהשורש' from jsonb_array_elements_text(coalesce(root_last->'related','[]'::jsonb)) r
    union all select 'מילה', v->>'form', 'וריאציה', 'כתיב חלופי' from jsonb_array_elements(coalesce(t_variants->'variants','[]'::jsonb)) v
    union all select 'פסוק', e->>'ref', 'מילולי', 'שתי מילים בפסוק' from jsonb_array_elements(coalesce(t_together->'same_verse','[]'::jsonb)) e
    union all select 'פסוק', e->>'ref', 'מילולי', 'רצף אותיות' from jsonb_array_elements(coalesce(t_inverse->'items','[]'::jsonb)) e
    union all select 'פסוק', e->>'ref', 'גימטריה', 'ערך הפסוק שווה לשם' from jsonb_array_elements(coalesce(combo_verses->'verses','[]'::jsonb)) e
    union all select 'פסוק', e->>'ref', 'צורת-אותיות', 'ראשי-תיבות' from jsonb_array_elements(coalesce(nota->'rashei_tevot','[]'::jsonb)) e
    union all select 'פסוק', e->>'ref', 'צורת-אותיות', 'סופי-תיבות' from jsonb_array_elements(coalesce(nota->'sofei_tevot','[]'::jsonb)) e
  )
  select coalesce(jsonb_agg(jsonb_build_object('type',vtype,'target',target,'consensus',c,'families',families,'voters',voters) order by c desc),'[]'::jsonb)
  into v_consensus
  from (select vtype, target, count(distinct family) c, jsonb_agg(distinct family) families, jsonb_agg(distinct method) voters
        from votes where target is not null and target<>'' group by vtype, target having count(distinct family)>=2
        order by count(distinct family) desc limit 15) z;

  tracks := jsonb_build_array(
    jsonb_build_object('id','name_verse','label','הפסוק שלך (לפי השם)','strategy','LETTER','tier','must','count',coalesce((nverse->>'count')::int,0),'status',case when coalesce((nverse->>'count')::int,0)>0 then 'ok' else 'empty' end,'sample',nverse->'verses'->0,'source_fn','fn_name_verse'),
    jsonb_build_object('id','literal','label','התאמה מילולית מלאה','strategy','FULL_NAME','tier','must','count',coalesce((t_together->>'same_verse_count')::int,0),'status',case when coalesce((t_together->>'same_verse_count')::int,0)>0 then 'ok' else 'empty' end,'sample',t_together->'same_verse'->0,'source_fn','fn_tanach_together'),
    jsonb_build_object('id','words','label','כל מילה בנפרד','strategy','FIRST/LAST','tier','must','count',coalesce(w_first,0)+coalesce(w_last,0),'status',case when coalesce(w_first,0)+coalesce(w_last,0)>0 then 'ok' else 'empty' end,'detail',jsonb_build_object(fst,w_first,coalesce(lst,'-'),w_last),'source_fn','fn_name_in_tanach'),
    jsonb_build_object('id','chapter','label','באותו פרק','strategy','PROXIMITY','tier','must','count',coalesce((t_together->>'same_chapter_count')::int,0),'status',case when coalesce((t_together->>'same_chapter_count')::int,0)>0 then 'ok' else 'empty' end,'sample',t_together->'same_chapter'->0,'source_fn','fn_tanach_together'),
    jsonb_build_object('id','proximity','label','קרבה (מרחק + סדר)','strategy','PROXIMITY','tier','must','count',coalesce((t_prox->>'count')::int,0),'status',case when coalesce((t_prox->>'count')::int,0)>0 then 'ok' else 'empty' end,'sample',t_prox->'items'->0,'source_fn','fn_tanach_proximity'),
    jsonb_build_object('id','in_verse','label','שם בתוך פסוק (רצף אותיות)','strategy','PHRASE','tier','must','count',coalesce((t_inverse->>'count')::int,0),'status',case when coalesce((t_inverse->>'count')::int,0)>0 then 'ok' else 'empty' end,'sample',t_inverse->'items'->0,'source_fn','fn_name_in_verse'),
    jsonb_build_object('id','combo_gem','label','גימטריית הצירוף','strategy','NUMERIC','tier','must','value',v_full,'count',combo_words,'status',case when combo_words>0 then 'ok' else 'empty' end,'verses',combo_verses,'source_fn','fn_verses_by_gematria'),
    jsonb_build_object('id','split_gem','label','גימטריה מפוצלת','strategy','NUMERIC','tier','must','count',jsonb_array_length(coalesce(t_split->'sum_words','[]'::jsonb)),'status','ok','data',t_split,'source_fn','fn_split_gematria'),
    jsonb_build_object('id','shared_num','label','מספר משותף בין רכיבים','strategy','NUMERIC','tier','advanced','count', jsonb_array_length(coalesce(v_shared->'cross_parts','[]'::jsonb)) + jsonb_array_length(coalesce(v_shared->'internal','[]'::jsonb)),'status', case when jsonb_array_length(coalesce(v_shared->'cross_parts','[]'::jsonb))+jsonb_array_length(coalesce(v_shared->'internal','[]'::jsonb))>0 then 'ok' else 'empty' end,'data', v_shared, 'source_fn','fn_shared_numbers'),
    jsonb_build_object('id','transforms','label','תמורות → תנ״ך','strategy','TRANSFORM','tier','advanced',
      'count',(select count(*) from jsonb_array_elements(coalesce(v_transforms->'transforms','[]'::jsonb)) t where (t->>'in_tanach')::int>0),
      'status', case when (select count(*) from jsonb_array_elements(coalesce(v_transforms->'transforms','[]'::jsonb)) t where (t->>'in_tanach')::int>0)>0 then 'ok' else 'empty' end,
      'data', v_transforms->'transforms', 'source_fn','fn_transforms_tanach'),
    jsonb_build_object('id','initials','label','ראשי/סופי תיבות','strategy','LETTER','tier','must','initials',comp->>'initials','finals',comp->>'finals','count',coalesce((nota->>'count')::int,0),'status',case when coalesce((nota->>'count')::int,0)>0 then 'ok' else 'empty' end,'source_fn','fn_notarikon'),
    jsonb_build_object('id','roots','label','שורש (לכל רכיב)','strategy','ROOT','tier','must','first',root_first->>'root_candidate','last',root_last->>'root_candidate','count',jsonb_array_length(coalesce(root_first->'related','[]'::jsonb)),'status','ok','source_fn','fn_hebrew_root'),
    jsonb_build_object('id','variants','label','וריאציות-כתיב מעוגנות','strategy','VARIANTS','tier','must','count',jsonb_array_length(coalesce(t_variants->'variants','[]'::jsonb)),'status',case when jsonb_array_length(coalesce(t_variants->'variants','[]'::jsonb))>0 then 'ok' else 'empty' end,'data',t_variants->'variants','source_fn','fn_name_variants'),
    jsonb_build_object('id','els','label','דילוגים (ELS)','strategy','LETTER','tier','must','ran',sparse,'count',coalesce((els->>'els_count')::int,0),'status',case when els is null then 'skipped' when coalesce((els->>'els_count')::int,0)>0 then 'ok' else 'empty' end,'min_skip',els->>'min_skip','note',case when not sparse then 'דולג — נמצאו מספיק ממצאים מילוליים' else null end,'source_fn','fn_els_search')
  );

  return jsonb_build_object(
    'protocol','name_multi_v1',
    'input', jsonb_build_object('name',p_name,'surname',p_surname,'birthdate',p_birthdate,'components',comp),
    'name_verse', nverse, 'consensus', v_consensus, 'literal_full_found', found_literal, 'tracks', tracks,
    'tracks_with_results', (select count(*) from jsonb_array_elements(tracks) t where t->>'status'='ok'),
    'summary', case when found_literal then 'נמצאה התאמה מילולית — ומסלולי-מחקר נוספים.'
                    else 'לא נמצאה התאמה מילולית מלאה — אך נמצאו מסלולי-מחקר עשירים (הפסוק שלך · גימטריה · קרבה · שורש · וריאציות · דילוגים).' end,
    'question', case when p_question is null or btrim(p_question)='' then null else jsonb_build_object('text',p_question,'saved',true,
       'ai_facts','שם: '||nfull||' · ערך '||v_full||' · הפסוק שלך: '||coalesce(nverse->'verses'->0->>'ref','—')
                  ||' · קונצנזוס עליון: '||coalesce((v_consensus->0->>'target'),'—')||' ('||coalesce((v_consensus->0->>'consensus'),'0')||' משפחות)') end,
    'generated_at', now()
  );
end $$;
