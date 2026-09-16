\set ON_ERROR_STOP on

-- Core revision preserves explicit truth metadata and no longer hides prefix bias.
do $$
declare r jsonb;
begin
  r := public.els_search_core_v1('אבג','torah',10,1,'HYPOTHESIS_DRIVEN_FOLLOWUP');
  if r->'engine'->>'version' <> '2' then raise exception 'engine version not bumped: %', r; end if;
  if r->'search'->'sampling'->>'representative' <> 'false' then raise exception 'sampling honesty missing: %', r; end if;
  if coalesce((r->'completion'->>'truncated')::boolean,false) is not true then raise exception 'expected truncated fixture result: %', r; end if;
  if r->'completion'->'continuation'->>'kind' <> 'els_keyset_v1' then raise exception 'continuation missing: %', r; end if;
end $$;

-- Exhaustive page cursor never repeats the first occurrence.
do $$
declare p1 jsonb; p2 jsonb; h1 jsonb; h2 jsonb;
begin
  p1 := public.els_search_page_core_v1('אבג','torah',2,10,1,null,null,null,'HYPOTHESIS_DRIVEN_FOLLOWUP');
  h1 := p1->'hits'->0;
  if h1 is null then raise exception 'page1 empty: %',p1; end if;
  if coalesce((p1->'completion'->>'has_more')::boolean,false) is not true then raise exception 'page1 should have continuation: %',p1; end if;
  p2 := public.els_search_page_core_v1(
    'אבג','torah',2,10,1,
    (h1->>'skip')::int,(h1->>'start')::int,(h1->>'dir')::int,
    'HYPOTHESIS_DRIVEN_FOLLOWUP'
  );
  h2 := p2->'hits'->0;
  if h2 is null then raise exception 'page2 empty: %',p2; end if;
  if h1->>'occurrence_id' = h2->>'occurrence_id' then raise exception 'cursor repeated occurrence: % / %',h1,h2; end if;
end $$;

-- Exact replay matches a known fixture occurrence and mismatches a shifted anchor.
do $$
declare ok jsonb; bad jsonb;
begin
  ok := public.els_verify_occurrence_v1('אבג','torah',3,1,0);
  if ok->>'verification_state' <> 'MATCH' then raise exception 'known occurrence did not replay: %',ok; end if;
  bad := public.els_verify_occurrence_v1('אבג','torah',3,1,1);
  if bad->>'verification_state' <> 'MISMATCH' then raise exception 'shifted occurrence should mismatch: %',bad; end if;
end $$;

-- Matrix geometry search delegates occurrence truth to the same generator.
do $$
declare r jsonb;
begin
  r := public.els_search_geometry_core_v1('אבג','torah',7,0,0,0,7,array[3],10);
  if r->>'status' <> 'OK' then raise exception 'geometry search failed: %',r; end if;
  if (r->'hits'->0->>'start')::int <> 0 then raise exception 'unexpected geometry first hit: %',r; end if;
end $$;

-- Every Tanakh execution contract remains fail-closed until exact witness admission.
do $$
declare a jsonb; b jsonb; c jsonb;
begin
  a := public.els_search_core_v1('אבג','tanakh',10,10,null);
  b := public.els_search_page_core_v1('אבג','tanakh',2,10,10,null,null,null,null);
  c := public.els_verify_occurrence_v1('אבג','tanakh',3,1,0);
  if a->>'status' <> 'MISSING_ADAPTER' or b->>'status' <> 'MISSING_ADAPTER' or c->>'status' <> 'MISSING_ADAPTER' then
    raise exception 'Tanakh fail-closed contract broken: % / % / %',a,b,c;
  end if;
end $$;

select 'ELS_CORE_COMPATIBILITY_SQL_ACCEPTANCE_PASS' as result;
