-- #1461 privacy floor — READ-ONLY post-apply canary. Run as postgres AFTER apply.psql:
--   psql "$DB" -X -v ON_ERROR_STOP=1 -f canary.sql
-- Pure read: read-only transaction, only SET/RESET ROLE, ends with ROLLBACK. Prints counts only — never phrases.
-- Static inputs were chosen on 2026-11-20 from live data; each is a PUBLIC (eligible) phrase or a number whose
-- pre-patch output contained hidden phrases. Hidden phrases are never stored here: where a probe needs one,
-- it is selected at run time (as postgres, before the role switch) and never printed.
-- Detection rule: a returned string (or a ' · '-separated piece of one) is a LEAK when gematria_words has that
-- phrase and no row of it passes public.gematria_public_word_eligible(id).
\set ON_ERROR_STOP on
begin;
set transaction read only;
do $canary$
declare
  res jsonb := '{}'::jsonb;  -- function label -> output (jsonb)
  j jsonb; k text; bad int; leaks int := 0; errs int := 0; h text; a record; r record;
begin
  if to_regprocedure('public.gematria_public_word_eligible(uuid)') is null then
    raise exception 'canary: helper missing — apply ../apply.psql first';
  end if;

  -- 1) static probes, executed as anon --------------------------------------------------------------
  for k in select unnest(array['fn_name_multi','fn_en_search','strongest_crossings','fn_split_gematria',
      'fn_anagrams_engine','fn_miluy_engine','fn_hebrew_root','number_dossier_json','fn_cross_research',
      'verified_bridges','atlas_findings','discover_relation_candidates','discover_anchor_families','top_collective'])
  loop
    begin
      execute 'set local role anon';
      j := case k
        when 'fn_name_multi'       then public.fn_name_multi('איפה', null, null, null, '{"skip_els":"1"}'::jsonb)
        when 'fn_en_search'        then (select jsonb_agg(to_jsonb(t)) from public.fn_en_search('איפה', 200) t)
        when 'strongest_crossings' then (select jsonb_agg(to_jsonb(t)) from public.strongest_crossings('איפה', 1, 500) t)
        when 'fn_split_gematria'   then public.fn_split_gematria(array['איפה'])
        when 'fn_anagrams_engine'  then public.fn_anagrams_engine(array['שלום'])
        when 'fn_miluy_engine'     then public.fn_miluy_engine(array['שבר'])
        when 'fn_hebrew_root'      then public.fn_hebrew_root('שתה')
        when 'number_dossier_json' then public.number_dossier_json(826)
        when 'fn_cross_research'   then public.fn_cross_research(array['געש','געש'])
        when 'verified_bridges'    then (select jsonb_agg(to_jsonb(t)) from public.verified_bridges(1000) t)
        when 'atlas_findings'      then (select jsonb_agg(to_jsonb(t)) from public.atlas_findings(null, 1000) t)
        when 'discover_relation_candidates' then (select jsonb_agg(to_jsonb(t)) from public.discover_relation_candidates(null, 1000) t)
        when 'discover_anchor_families'     then (select jsonb_agg(to_jsonb(t)) from public.discover_anchor_families(1, 1000) t)
        when 'top_collective'      then (select jsonb_agg(to_jsonb(t)) from public.top_collective(1, 1000) t)
      end;
      execute 'reset role';
      res := res || jsonb_build_object(k, coalesce(j, 'null'::jsonb));
    exception when others then
      errs := errs + 1; raise warning 'canary ERROR %: %', k, sqlerrm;
    end;
  end loop;

  -- 2) dynamic probes: a hidden phrase is picked as postgres and never printed ------------------------
  select g.phrase into h from public.gematria_words g
   where g.phrase ~ '^[א-ת]{3,8}$' and g.phrase !~ '[ךםןףץ].'
     and not exists(select 1 from public.gematria_words e where e.phrase = g.phrase and public.gematria_public_word_eligible(e.id))
     and not exists(select 1 from public.tanach_verses tv where tv.words @> array[g.phrase]) -- variants may legitimately cite Tanach words
   order by md5(g.phrase) limit 1;
  if h is null then
    raise warning 'canary: no hidden single-word phrase found; dynamic probes skipped';
  else
    begin
      execute 'set local role anon';
      -- atbash of the normalized hidden phrase: pre-patch, known_words returned the hidden phrase
      -- (only known_words is scanned: the computed 'word' is the transform itself, not a corpus read)
      res := res || jsonb_build_object('fn_transforms_tanach', jsonb_path_query_array(public.fn_transforms_tanach(
        translate(translate(h,'ךםןףץ','כמנפצ'),'אבגדהוזחטיכלמנסעפצקרשת','תשרקצפעסנמלכיטחזוהדגבא')), '$.transforms[*].known_words'));
      -- pre-patch, stripping the leading ו revealed the hidden phrase as a variant (only variants[*].form is scanned)
      res := res || jsonb_build_object('fn_name_variants', jsonb_path_query_array(public.fn_name_variants('ו' || h), '$.variants[*].form'));
      j := public.fn_all_methods(h);
      execute 'reset role';
      if coalesce(j->>'מהמאגר','false') <> 'false' or j ? 'כל_הערכים' then
        leaks := leaks + 1; raise warning 'canary LEAK fn_all_methods: hidden phrase still gets corpus marker/blob';
      end if;
    exception when others then
      errs := errs + 1; raise warning 'canary ERROR dynamic(transforms/variants/all_methods): %', sqlerrm;
    end;
  end if;

  -- English alias that maps only to hidden words: must return no rows
  for a in select wa.alias from public.word_aliases wa join public.gematria_words g on g.id = wa.word_id
            where wa.lang = 'en'
              and not exists(select 1 from public.gematria_words e where e.phrase = g.phrase and public.gematria_public_word_eligible(e.id))
            limit 3
  loop
    begin
      execute 'set local role anon';
      j := (select jsonb_agg(to_jsonb(t)) from public.fn_en_search(a.alias, 200) t);
      execute 'reset role';
      if j is not null and not exists(select 1 from public.word_aliases wa2 join public.gematria_words g2 on g2.id = wa2.word_id
                                       where lower(wa2.alias) = lower(a.alias) and wa2.lang = 'en'
                                         and public.gematria_public_word_eligible(g2.id)) then
        leaks := leaks + 1; raise warning 'canary LEAK fn_en_search: hidden-only English alias still resolves';
      end if;
      res := res || jsonb_build_object('fn_en_search_alias_' || md5(a.alias), coalesce(j, 'null'::jsonb));
    exception when others then
      errs := errs + 1; raise warning 'canary ERROR fn_en_search(alias): %', sqlerrm;
    end;
  end loop;

  -- writer_gematria_findings: in_core must be false for hidden claim phrases
  for a in select rc.author_name, rc.author_user_id from public.research_contributions rc
            where rc.status = 'published' and rc.gematria_claim ? 'claim'
              and exists(select 1 from public.gematria_words g where g.phrase =
                    coalesce(nullif(rc.gematria_claim->>'phrase',''), btrim(split_part(split_part(rc.gematria_claim->>'claim', chr(10), 1), '=', 1))))
            limit 20
  loop
    begin
      execute 'set local role anon';
      select count(*) into bad from public.writer_gematria_findings(a.author_name, a.author_user_id) w
       where w.in_core and not exists(select 1 from public.gematria_words e where e.phrase = w.phrase
                                       and public.gematria_public_word_eligible(e.id));
      execute 'reset role';
      if bad > 0 then leaks := leaks + bad; raise warning 'canary LEAK writer_gematria_findings: % hidden in_core marks', bad; end if;
    exception when others then
      errs := errs + 1; raise warning 'canary ERROR writer_gematria_findings: %', sqlerrm;
    end;
  end loop;

  -- 3) generic hidden-string scan over every captured output (as postgres) ----------------------------
  for k, j in select key, value from jsonb_each(res) loop
    select count(*) into bad
      from jsonb_path_query(j, 'strict $.**') s, regexp_split_to_table(s #>> '{}', ' · ') piece
     where jsonb_typeof(s) = 'string'
       and exists(select 1 from public.gematria_words g where g.phrase = piece)
       and not exists(select 1 from public.gematria_words g where g.phrase = piece and public.gematria_public_word_eligible(g.id));
    if bad > 0 then leaks := leaks + bad; raise warning 'canary LEAK %: % hidden strings', k, bad;
    else raise notice 'canary ok %', k; end if;
  end loop;

  -- 4) behavior floors --------------------------------------------------------------------------------
  select count(*) into bad from jsonb_array_elements(coalesce(res->'top_collective','[]'::jsonb)) t
   where (t->>'researchers')::int < 3
      or (t->>'title' is not null and not exists(select 1 from public.research_contributions rc
            where rc.status = 'approved' and coalesce(nullif(rc.target_id,''), rc.title) = t->>'title'));
  if bad > 0 then leaks := leaks + bad; raise warning 'canary FLOOR top_collective: % rows below 3 users or with a non-contribution title', bad; end if;

  for r in select distinct entity_ref from public.research_items where entity_type = 'number' order by entity_ref limit 50 loop
    begin
      execute 'set local role anon';
      bad := public.entity_collective_count('number', r.entity_ref);
      execute 'reset role';
      if bad between 1 and 2 then leaks := leaks + 1; raise warning 'canary FLOOR entity_collective_count: count below 3 returned'; end if;
    exception when others then
      errs := errs + 1; raise warning 'canary ERROR entity_collective_count: %', sqlerrm;
    end;
  end loop;

  begin
    execute 'set local role anon';
    j := public.fn_entity_strength('number', '96');
    execute 'reset role';
    if (j->'engine'->>'convergence')::int <> (select count(*) from public.gematria_words g
          where g.ragil = 96 and coalesce(g.is_encrypted,false) = false and public.gematria_public_word_eligible(g.id)) then
      leaks := leaks + 1; raise warning 'canary LEAK fn_entity_strength: convergence counts non-eligible rows';
    end if;
  exception when others then
    errs := errs + 1; raise warning 'canary ERROR fn_entity_strength: %', sqlerrm;
  end;

  -- Not canaried (count-only output, no phrase-level oracle): number_resonance_stats.
  if leaks > 0 or errs > 0 then
    raise exception 'canary FAILED: % leak/floor violations, % errors', leaks, errs;
  end if;
  raise notice 'canary PASSED';
end
$canary$;
rollback;
