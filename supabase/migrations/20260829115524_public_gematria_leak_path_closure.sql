-- Restore Public Gematria Visibility Law: close leak paths found while re-auditing the
-- verified-gematria-projection branch against the new contract
--   PUBLIC GEMATRIA = is_verified=true AND is_published=true
--
-- Root cause found this pass: several SECURITY DEFINER functions read gematria_words/bidim
-- directly (SECURITY DEFINER bypasses RLS entirely), with either no verification filter at
-- all (fn_name_multi -- direct gematria_words read, most severe) or an is_verified-only
-- filter predating today's is_published axis (strongest_crossings, fn_en_search read bidim
-- directly with zero filter at all; verified_bridges checked wa.verified but not the
-- underlying gematria_words row's own verification state).
--
-- None of these are new regressions from today's Verified≠Published/bidim migrations --
-- they are pre-existing gaps, independent of that work, first identified in this pass.
-- gematria_words/bidim data itself is untouched: no rows deleted, no phrase altered, no
-- row's is_verified/is_published flipped, no gematria_methods registry row touched.

-- 1) strongest_crossings: was reading bidim directly with zero verification filter.
CREATE OR REPLACE FUNCTION public.strongest_crossings(p_self text, p_min integer DEFAULT 2, p_limit integer DEFAULT 5)
 RETURNS TABLE(partner text, n_methods integer, methods_detail text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with legit as (select unnest(array['רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר','ריבוע','הכפלה','מילוי דמילוי']) m),
  mine as (select method, value from bidim where phrase = p_self and method in (select m from legit)),
  pairs as (
    select b.phrase partner, b.method, b.value
    from bidim b join mine on mine.method = b.method and mine.value = b.value
    join gematria_words gw on gw.id = b.word_id and gw.is_verified = true and gw.is_published = true
    where b.phrase <> p_self and b.phrase !~ '[A-Za-z0-9]'
      and heb_letter_key(b.phrase) <> heb_letter_key(p_self)      -- 🚫 בלי אנגרמות
      and not exists (select 1 from gematria_blocklist bl where position(bl.pattern in b.phrase) > 0)
  )
  select partner, count(distinct method)::int,
         string_agg(distinct method || '=' || value, ' · ')
  from pairs group by partner
  having count(distinct method) >= p_min
  order by count(distinct method) desc, char_length(partner)
  limit p_limit;
$function$;

-- 2) fn_en_search: same class of gap -- reads bidim directly, zero filter.
CREATE OR REPLACE FUNCTION public.fn_en_search(p_word text, p_max_matches integer DEFAULT 8)
 RETURNS TABLE(input_hebrew text, method text, value bigint, rarity integer, signal text, matches text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
declare v_heb text;
begin
  if p_word ~ '[א-ת]' then
     v_heb := p_word;
  else
     select gw.phrase into v_heb
     from word_aliases a join gematria_words gw on gw.id = a.word_id
     where lower(a.alias) = lower(p_word) and a.lang = 'en'
     order by a.verified desc nulls last, a.confidence desc nulls last
     limit 1;
  end if;
  if v_heb is null then return; end if;

  return query
  with vals as (
    select 'רגיל'::text m, fn_ragil(v_heb)::bigint v
    union all select 'מסתתר', fn_misratar(v_heb)
    union all select 'גדול',  fn_gadol(v_heb)
    union all select 'קדמי',  fn_kadmi(v_heb)
    union all select 'אתבש',  fn_atbash(v_heb)
    union all select 'אלבם',  fn_albam(v_heb)
    union all select 'מילוי', fn_miluy(v_heb)
    union all select 'ריבוע', fn_ribua(v_heb)
  )
  select v_heb, vals.m, vals.v, cnt.sharers,
    case when cnt.sharers <= 6 then 'gold'
         when cnt.sharers <= 20 then 'strong'
         else 'weak' end,
    mt.matches
  from vals
  cross join lateral (
    select count(distinct b.phrase)::int sharers
    from bidim b join gematria_words gw on gw.id = b.word_id and gw.is_verified = true and gw.is_published = true
    where b.method = vals.m and b.value = vals.v
  ) cnt
  cross join lateral (
    select array_agg(p order by p) matches
    from (select distinct b.phrase p from bidim b
          join gematria_words gw on gw.id = b.word_id and gw.is_verified = true and gw.is_published = true
          where b.method = vals.m and b.value = vals.v and b.phrase <> v_heb
          limit p_max_matches) s
  ) mt
  where mt.matches is not null and cnt.sharers <= 40
  order by cnt.sharers asc, vals.v;
end $function$;

-- 3) verified_bridges: the word_aliases branch checked wa.verified and g.is_encrypted,
--    but never the underlying gematria_words row's own is_verified/is_published.
CREATE OR REPLACE FUNCTION public.verified_bridges(p_limit integer DEFAULT 60)
 RETURNS TABLE(alias text, lang text, hebrew text, value integer, method text, note text, evidence text, human_verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with ll as (
    select l.foreign_word as alias, l.lang, l.hebrew, l.gematria_he as value,
           l.method, l.note, coalesce(l.evidence_level,'medium') as evidence,
           coalesce(l.human_verified,false) as human_verified, l.created_at
    from language_links l
    where l.status = 'approved'
  ),
  wa as (
    select wa.alias, wa.lang, g.phrase as hebrew, g.ragil as value,
           wa.method, null::text as note, 'medium'::text as evidence,
           true as human_verified, wa.created_at
    from word_aliases wa
    join gematria_words g on g.id = wa.word_id
    where wa.verified
      and g.is_verified = true and g.is_published = true
      and coalesce(wa.lang,'he') not in ('he','heb','עברית')
      and coalesce(g.is_encrypted,false) = false
      and not exists (select 1 from gematria_blocklist bl where position(bl.pattern in g.phrase) > 0)
      and not exists (select 1 from ll where lower(ll.alias) = lower(wa.alias) and ll.hebrew = g.phrase)
  )
  select alias, lang, hebrew, value, method, note, evidence, human_verified
  from (select * from ll union all select * from wa) u
  order by (evidence='strong') desc, created_at desc
  limit p_limit;
$function$;

-- 4) fn_name_multi: the most severe gap found -- reads gematria_words DIRECTLY (not via
--    bidim) with NO verification filter at all, returning real phrase text
--    (combo_words/sv_words, surfaced in the public "גימטריית הצירוף" track).
CREATE OR REPLACE FUNCTION public.fn_name_multi(p_name text, p_surname text DEFAULT NULL::text, p_birthdate text DEFAULT NULL::text, p_question text DEFAULT NULL::text, p_opts jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  comp jsonb; nfull text; parts text[]; fst text; lst text; nparts int; dparts text[];
  t_together jsonb; t_prox jsonb; t_inverse jsonb; t_split jsonb; t_variants jsonb; nverse jsonb;
  v_full int; w_first int; w_last int; combo_verses jsonb; combo_words int;
  root_first jsonb; root_last jsonb; nota jsonb; sv_words jsonb; neigh jsonb; v_shared jsonb; v_transforms jsonb; v_graded jsonb; v_milui jsonb; v_anagram jsonb;
  els jsonb; sparse boolean; tracks jsonb; found_literal boolean; v_consensus jsonb;
begin
  comp := fn_name_components(p_name, p_surname);
  nfull := comp->>'full'; parts := array(select jsonb_array_elements_text(comp->'parts'));
  nparts := coalesce(array_length(parts,1),0); fst := comp->>'first'; lst := comp->>'last';
  dparts := array(select distinct x from unnest(array[fst,lst]) x where coalesce(x,'')<>'');
  t_together := case when nparts>=2 then fn_tanach_together(parts) else null end;
  t_prox     := case when nparts>=2 then fn_tanach_proximity(fst,lst,6) else null end;
  v_graded   := case when nparts>=2 and lst<>fst then fn_graded_proximity(fst,lst) else null end;
  t_inverse  := fn_name_in_verse(replace(nfull,' ',''));
  t_split    := fn_split_gematria(parts);
  t_variants := fn_name_variants(nfull);
  nverse     := fn_name_verse(fst);
  v_full     := fn_ragil(nfull);
  w_first    := (fn_name_in_tanach(fst)->>'count')::int;
  w_last     := case when lst is not null and lst<>fst then (fn_name_in_tanach(lst)->>'count')::int else null end;
  combo_verses := fn_verses_by_gematria(v_full,12);
  combo_words  := (select count(*) from gematria_words where ragil=v_full and is_verified=true and is_published=true);
  sv_words     := (select coalesce(jsonb_agg(phrase),'[]'::jsonb) from (select phrase from gematria_words where ragil=v_full and is_verified=true and is_published=true and phrase <> all(parts||nfull) limit 120) z);
  neigh        := fn_name_neighbors(fst,20);
  v_shared     := fn_shared_numbers(array(select distinct x from unnest(array[nfull,fst,lst]) x where coalesce(x,'')<>''));
  v_transforms := fn_transforms_tanach(fst);
  v_milui      := fn_miluy_engine(dparts);
  v_anagram    := fn_anagrams_engine(dparts);
  root_first := fn_hebrew_root(fst);
  root_last  := case when lst is not null and lst<>fst then fn_hebrew_root(lst) else null end;
  nota       := fn_notarikon(nfull);
  found_literal := coalesce((t_together->>'same_verse_count')::int,0) > 0 or coalesce((t_inverse->>'count')::int,0) > 0;
  sparse := coalesce((t_together->>'same_verse_count')::int,0)+coalesce((t_prox->>'count')::int,0)+coalesce((t_inverse->>'count')::int,0) < 3;
  els := case when sparse and coalesce(p_opts->>'skip_els','0')<>'1' then fn_els_search(replace(nfull,' ',''),26,8) else null end;

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
    jsonb_build_object('id','name_verse','label','הפסוק שלך (לפי השם)','strategy','LETTER','tier','must','evidence','direct','count',coalesce((nverse->>'count')::int,0),'status',case when coalesce((nverse->>'count')::int,0)>0 then 'ok' else 'empty' end,'sample',nverse->'verses'->0,'source_fn','fn_name_verse'),
    jsonb_build_object('id','literal','label','התאמה מילולית מלאה','strategy','FULL_NAME','tier','must','evidence','direct','count',coalesce((t_together->>'same_verse_count')::int,0),'status',case when coalesce((t_together->>'same_verse_count')::int,0)>0 then 'ok' else 'empty' end,'sample',t_together->'same_verse'->0,'source_fn','fn_tanach_together'),
    jsonb_build_object('id','words','label','כל מילה בנפרד','strategy','FIRST/LAST','tier','must','evidence','direct','count',coalesce(w_first,0)+coalesce(w_last,0),'status',case when coalesce(w_first,0)+coalesce(w_last,0)>0 then 'ok' else 'empty' end,'detail',jsonb_build_object(fst,w_first,coalesce(lst,'-'),w_last),'source_fn','fn_name_in_tanach'),
    jsonb_build_object('id','graded_prox','label','קרבה מדורגת (שם↔משפחה)','strategy','PROXIMITY','tier','advanced','evidence','direct','count',coalesce((v_graded->>'top_grade')::int,0),'status',case when v_graded is null then 'skipped' when coalesce((v_graded->>'top_grade')::int,0)>0 then 'ok' else 'empty' end,'data',v_graded,'source_fn','fn_graded_proximity'),
    jsonb_build_object('id','chapter','label','באותו פרק','strategy','PROXIMITY','tier','must','evidence','direct','count',coalesce((t_together->>'same_chapter_count')::int,0),'status',case when coalesce((t_together->>'same_chapter_count')::int,0)>0 then 'ok' else 'empty' end,'sample',t_together->'same_chapter'->0,'source_fn','fn_tanach_together'),
    jsonb_build_object('id','proximity','label','קרבה (מרחק + סדר)','strategy','PROXIMITY','tier','must','evidence','direct','count',coalesce((t_prox->>'count')::int,0),'status',case when coalesce((t_prox->>'count')::int,0)>0 then 'ok' else 'empty' end,'sample',t_prox->'items'->0,'source_fn','fn_tanach_proximity'),
    jsonb_build_object('id','in_verse','label','שם בתוך פסוק (רצף אותיות)','strategy','PHRASE','tier','must','evidence','direct','count',coalesce((t_inverse->>'count')::int,0),'status',case when coalesce((t_inverse->>'count')::int,0)>0 then 'ok' else 'empty' end,'sample',t_inverse->'items'->0,'source_fn','fn_name_in_verse'),
    jsonb_build_object('id','anagrams','label','אנגרמות (מאומתות במאגר)','strategy','LETTER','tier','advanced','evidence','direct','count',(select coalesce(sum(jsonb_array_length(pt->'anagrams')),0) from jsonb_array_elements(coalesce(v_anagram->'parts','[]'::jsonb)) pt),'status',case when (select coalesce(sum(jsonb_array_length(pt->'anagrams')),0) from jsonb_array_elements(coalesce(v_anagram->'parts','[]'::jsonb)) pt)>0 then 'ok' else 'empty' end,'data',v_anagram->'parts','source_fn','fn_anagrams_engine'),
    jsonb_build_object('id','combo_gem','label','גימטריית הצירוף','strategy','NUMERIC','tier','must','evidence','value_match','value',v_full,'count',combo_words,'status',case when combo_words>0 then 'ok' else 'empty' end,'verses',combo_verses,'words',sv_words,'source_fn','fn_verses_by_gematria'),
    jsonb_build_object('id','split_gem','label','גימטריה מפוצלת','strategy','NUMERIC','tier','must','evidence','value_match','count',jsonb_array_length(coalesce(t_split->'sum_words','[]'::jsonb)),'status','ok','data',t_split,'source_fn','fn_split_gematria'),
    jsonb_build_object('id','milui','label','מילוי לרכיבים','strategy','NUMERIC','tier','advanced','evidence','value_match','count',(select coalesce(sum((pt->>'match_count')::int),0) from jsonb_array_elements(coalesce(v_milui->'parts','[]'::jsonb)) pt),'status',case when (select coalesce(sum((pt->>'match_count')::int),0) from jsonb_array_elements(coalesce(v_milui->'parts','[]'::jsonb)) pt)>0 then 'ok' else 'empty' end,'data',v_milui->'parts','source_fn','fn_miluy_engine'),
    jsonb_build_object('id','shared_num','label','מספר משותף בין רכיבים','strategy','NUMERIC','tier','advanced','evidence','value_match','count', jsonb_array_length(coalesce(v_shared->'cross_parts','[]'::jsonb)) + jsonb_array_length(coalesce(v_shared->'internal','[]'::jsonb)),'status', case when jsonb_array_length(coalesce(v_shared->'cross_parts','[]'::jsonb))+jsonb_array_length(coalesce(v_shared->'internal','[]'::jsonb))>0 then 'ok' else 'empty' end,'data', v_shared, 'source_fn','fn_shared_numbers'),
    jsonb_build_object('id','transforms','label','תמורות → תנ״ך','strategy','TRANSFORM','tier','advanced','evidence','direct','count',(select count(*) from jsonb_array_elements(coalesce(v_transforms->'transforms','[]'::jsonb)) t where (t->>'in_tanach')::int>0),'status', case when (select count(*) from jsonb_array_elements(coalesce(v_transforms->'transforms','[]'::jsonb)) t where (t->>'in_tanach')::int>0)>0 then 'ok' else 'empty' end,'data', v_transforms->'transforms', 'source_fn','fn_transforms_tanach'),
    jsonb_build_object('id','initials','label','ראשי/סופי תיבות','strategy','LETTER','tier','must','evidence','direct','initials',comp->>'initials','finals',comp->>'finals','count',coalesce((nota->>'count')::int,0),'status',case when coalesce((nota->>'count')::int,0)>0 then 'ok' else 'empty' end,'source_fn','fn_notarikon'),
    jsonb_build_object('id','roots','label','שורש (לכל רכיב)','strategy','ROOT','tier','must','evidence','direct','first',root_first->>'root_candidate','last',root_last->>'root_candidate','count',jsonb_array_length(coalesce(root_first->'related','[]'::jsonb)),'status','ok','source_fn','fn_hebrew_root'),
    jsonb_build_object('id','variants','label','וריאציות-כתיב מעוגנות','strategy','VARIANTS','tier','must','evidence','direct','count',jsonb_array_length(coalesce(t_variants->'variants','[]'::jsonb)),'status',case when jsonb_array_length(coalesce(t_variants->'variants','[]'::jsonb))>0 then 'ok' else 'empty' end,'data',t_variants->'variants','source_fn','fn_name_variants'),
    jsonb_build_object('id','els','label','דילוגים (ELS)','strategy','LETTER','tier','must','evidence','direct','ran',sparse,'count',coalesce((els->>'els_count')::int,0),'status',case when els is null then 'skipped' when coalesce((els->>'els_count')::int,0)>0 then 'ok' else 'empty' end,'min_skip',els->>'min_skip','note',case when coalesce(p_opts->>'skip_els','0')='1' then 'לא הופעל למילה בודדת (רעש)' when not sparse then 'דולג — נמצאו מספיק ממצאים מילוליים' else null end,'source_fn','fn_els_search')
  );

  return jsonb_build_object(
    'protocol','name_multi_v1',
    'input', jsonb_build_object('name',p_name,'surname',p_surname,'birthdate',p_birthdate,'components',comp),
    'name_verse', nverse, 'consensus', v_consensus, 'graded', v_graded, 'literal_full_found', found_literal, 'tracks', tracks,
    'evidence_legend', jsonb_build_object('direct','ממצא ישיר (הופעה בתנ״ך / אנגרמה מאומתת / חישוב)','value_match','התאמת-ערך (ביטוי בעל אותה גימטריה — לא הוכחת קשר)','interpretive','קשר פרשני (הצעת מטטרון/AI על בסיס כמה ממצאים)'),
    'tracks_with_results', (select count(*) from jsonb_array_elements(tracks) t where t->>'status'='ok'),
    'summary', case when found_literal then 'נמצאה התאמה מילולית — ומסלולי-מחקר נוספים.'
                    else 'לא נמצאה התאמה מילולית מלאה — אך נמצאו מסלולי-מחקר עשירים (הפסוק שלך · גימטריה · קרבה · שורש · וריאציות · דילוגים).' end,
    'question', case when p_question is null or btrim(p_question)='' then null else jsonb_build_object('text',p_question,'saved',true,
       'ai_facts','שם: '||nfull||' · ערך '||v_full||' · הפסוק שלך: '||coalesce(nverse->'verses'->0->>'ref','—')
                  ||' · קונצנזוס עליון: '||coalesce((v_consensus->0->>'target'),'—')||' ('||coalesce((v_consensus->0->>'consensus'),'0')||' משפחות)'
                  ||case when v_graded is not null then ' · קרבה שם↔משפחה דרגה '||coalesce((v_graded->>'top_grade'),'0') else '' end) end,
    'generated_at', now()
  );
end $function$;
