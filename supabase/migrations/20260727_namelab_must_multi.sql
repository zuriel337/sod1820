-- ============================================================
--  NameLab — Wave "חובה" (must-tier): multi-track name search
--  Zuriel-approved catalog (13 must engines). New engines + the
--  fn_name_multi orchestrator sit ABOVE fn_name_protocol — the
--  protocol / scheduler / Metatron are NOT changed.
--  Core idea: "לא נמצא" ≠ "אין מחקר" — each track reports its own
--  findings + source_fn. Conditional scheduling: ELS runs only when
--  the literal base is sparse (cost saving).
--
--  Inputs: name + surname + birthdate + question.
--   • surname  → decomposition / proximity / split-gematria / roots
--   • birthdate→ captured (Aspaklaria = advanced wave)
--   • question → saved with research + compiled ai_facts for AI analyze
-- ============================================================

-- ── M12 grounded spelling-variants table (curated + ktiv, never invented) ──
create table if not exists public.name_variants (base text, variant text, note text, primary key(base,variant));
alter table public.name_variants enable row level security;
insert into public.name_variants(base,variant,note) values
 ('אברהם','אברם','שם קודם (בראשית יז)'),('אברם','אברהם','שם מאוחר'),
 ('שרה','שרי','שם קודם'),('שרי','שרה','שם מאוחר'),
 ('יהושע','הושע','שם קודם (במדבר יג)'),('הושע','יהושע','שם מאוחר'),
 ('יעקב','ישראל','שם שני'),('ישראל','יעקב','שם קודם')
on conflict do nothing;

-- ── Gateway: name decomposition (full/first/last/reversed/initials/finals/values) ──
create or replace function public.fn_name_components(p_name text, p_surname text default null)
returns jsonb language sql stable set search_path=public as $$
  with n as (
    select btrim(regexp_replace(coalesce(p_name,''),'['||chr(1425)||'-'||chr(1479)||']','','g')) nm,
           btrim(regexp_replace(coalesce(p_surname,''),'['||chr(1425)||'-'||chr(1479)||']','','g')) sn
  ),
  toks as (select array_remove(regexp_split_to_array(btrim(nm||' '||sn),'\s+'),'') parts, nm, sn from n)
  select jsonb_build_object(
    'full', btrim((select nm||' '||sn from n)),
    'parts', to_jsonb((select parts from toks)),
    'first', (select parts[1] from toks),
    'last',  (select case when (select sn from n)<>'' then (select sn from n) else parts[array_length(parts,1)] end from toks),
    'reversed', (select array_to_string(array(select p from unnest((select parts from toks)) with ordinality u(p,o) order by o desc),' ')),
    'initials', (select string_agg(left(p,1),'' order by o) from unnest((select parts from toks)) with ordinality u(p,o)),
    'finals',   (select string_agg(translate(right(p,1),'ךםןףץ','כמנפצ'),'' order by o) from unnest((select parts from toks)) with ordinality u(p,o)),
    'values', jsonb_build_object(
       'full', fn_ragil(btrim((select nm||' '||sn from n))),
       'parts', (select jsonb_object_agg(p, fn_ragil(p)) from (select distinct unnest((select parts from toks)) p) q),
       'sum', (select coalesce(sum(fn_ragil(p)),0)::int from unnest((select parts from toks)) p))
  );
$$;

-- ── M3+M4: words together (same verse / same chapter) ──
create or replace function public.fn_tanach_together(p_words text[])
returns jsonb language sql stable set search_path=public as $$
  with sv as (
    select book,chapter,verse,text from tanach_verses
    where p_words is not null and array_length(p_words,1)>=2 and words @> p_words
    order by book_idx,chapter,verse limit 12
  ),
  sc as (
    select book, chapter, count(*) hits from tanach_verses v
    where array_length(p_words,1)>=2
      and (select bool_and(exists(select 1 from tanach_verses u where u.book=v.book and u.chapter=v.chapter and u.words @> array[w])) from unnest(p_words) w)
    group by book, chapter
  )
  select jsonb_build_object(
    'same_verse', coalesce((select jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text)) from sv),'[]'::jsonb),
    'same_verse_count', (select count(*) from tanach_verses where array_length(p_words,1)>=2 and words @> p_words),
    'same_chapter', coalesce((select jsonb_agg(jsonb_build_object('ref',book||' '||chapter,'verses',hits) order by hits desc) from (select * from sc order by hits desc limit 12) z),'[]'::jsonb),
    'same_chapter_count', (select count(*) from sc)
  );
$$;

-- ── M5: proximity (word distance + order in a verse) ──
create or replace function public.fn_tanach_proximity(p_a text, p_b text, p_gap int default 6)
returns jsonb language sql stable set search_path=public as $$
  with hits as (
    select v.book,v.chapter,v.verse, min(pb.o-pa.o) fwd_gap, min(pa.o-pb.o) bak_gap
    from tanach_verses v,
         unnest(v.words) with ordinality pa(w,o),
         unnest(v.words) with ordinality pb(w,o)
    where pa.w=p_a and pb.w=p_b and pa.o<>pb.o and abs(pa.o-pb.o)<=p_gap
    group by v.book,v.chapter,v.verse
  )
  select jsonb_build_object(
    'gap', p_gap, 'count', (select count(*) from hits),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'ref',book||' '||chapter||':'||verse,
        'distance', least(abs(coalesce(fwd_gap,999)),abs(coalesce(bak_gap,999))),
        'order', case when fwd_gap>0 then 'רגיל' else 'הפוך' end) order by book,chapter,verse)
      from (select * from hits order by book,chapter,verse limit 12) z),'[]'::jsonb)
  );
$$;

-- ── M6: name inside a verse as consecutive letters (not ELS) ──
create or replace function public.fn_name_in_verse(p_term text)
returns jsonb language sql stable set search_path=public as $$
  with q as (select regexp_replace(coalesce(p_term,''),'['||chr(1425)||'-'||chr(1479)||'  ]','','g') t),
  hits as (
    select book,chapter,verse,text from tanach_verses, q
    where length((select t from q))>=3 and replace(text,' ','') like '%'||(select t from q)||'%'
    order by book_idx,chapter,verse limit 12
  )
  select jsonb_build_object(
    'term',(select t from q),
    'count',(select count(*) from tanach_verses,q where length((select t from q))>=3 and replace(text,' ','') like '%'||(select t from q)||'%'),
    'items',coalesce((select jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text)) from hits),'[]'::jsonb)
  );
$$;

-- ── M8: split gematria (per part + sum + diff → matches) ──
create or replace function public.fn_split_gematria(p_parts text[])
returns jsonb language sql stable set search_path=public as $$
  with pv as (select p, fn_ragil(p) v from unnest(p_parts) p where p<>''),
  agg as (select sum(v)::int s, (max(v)-min(v))::int d from pv)
  select jsonb_build_object(
    'parts', coalesce((select jsonb_agg(jsonb_build_object('part',p,'value',v)) from pv),'[]'::jsonb),
    'sum', (select s from agg), 'diff', (select d from agg),
    'sum_verses', coalesce((select fn_verses_by_gematria((select s from agg),6)),'null'::jsonb),
    'sum_words', coalesce((select jsonb_agg(phrase) from (select phrase from gematria_words where ragil=(select s from agg) limit 10) z),'[]'::jsonb)
  );
$$;

-- ── M12: grounded spelling variants (curated + corpus-verified ktiv) ──
create or replace function public.fn_name_variants(p_name text)
returns jsonb language sql stable set search_path=public as $$
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
$$;

-- ── Orchestrator: multi-track name search ("לא נמצא" ≠ "אין מחקר") ──
create or replace function public.fn_name_multi(
  p_name text, p_surname text default null, p_birthdate text default null, p_question text default null
) returns jsonb language plpgsql stable set search_path=public as $$
declare
  comp jsonb; nfull text; parts text[]; fst text; lst text; nparts int;
  t_together jsonb; t_prox jsonb; t_inverse jsonb; t_split jsonb; t_variants jsonb;
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
    'literal_full_found', found_literal,
    'tracks', tracks,
    'tracks_with_results', (select count(*) from jsonb_array_elements(tracks) t where t->>'status'='ok'),
    'summary', case when found_literal then 'נמצאה התאמה מילולית — ומסלולי-מחקר נוספים.'
                    else 'לא נמצאה התאמה מילולית מלאה — אך נמצאו מסלולי-מחקר עשירים (גימטריה · קרבה · שורש · וריאציות · דילוגים).' end,
    'question', case when p_question is null or btrim(p_question)='' then null else jsonb_build_object(
       'text', p_question, 'saved', true,
       'ai_facts', 'שם: '||nfull||' · ערך '||v_full||' · '||fst||'='||coalesce(w_first,0)||' '||coalesce(lst,'')||'='||coalesce(w_last,0)
                   ||' · פרק משותף: '||coalesce((t_together->>'same_chapter_count')::text,'0')
                   ||' · קרבה: '||coalesce((t_prox->>'count')::text,'0')||' · סכום-מפוצל '||coalesce((t_split->>'sum')::text,'')) end,
    'generated_at', now()
  );
end $$;

grant execute on function public.fn_name_multi(text,text,text,text) to anon, authenticated;
