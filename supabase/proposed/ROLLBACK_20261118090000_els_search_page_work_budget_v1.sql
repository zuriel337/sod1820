-- ROLLBACK of supabase/migrations/20261118090000_els_search_page_work_budget_v1.sql (ELS ordered page, bounded work per call).
-- PROPOSED ONLY: apply only on an explicit ZURIEL decision. It puts back the exact previous body of
-- public.els_search_page_core_v1 (the text of supabase/migrations/20260930083354_g3_els_tanakh_canonical_stream_build_v1.sql,
-- md5 385d18edf84b4b7bc7f9c445aec981b4, verified equal to the live definition on 18.11.2026). Nothing else was changed by the
-- migration, so nothing else is touched here. No website change is needed before or after: the answer keeps the same contract;
-- only the added fields (completion.stop_reason, completion.scanned_through_skip, engine.page_scan) disappear, and the heavy
-- requests time out again as they did before.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';

do $guard$
begin
  if md5(pg_get_functiondef('public.els_search_page_core_v1(text,text,integer,integer,integer,integer,integer,integer,text)'::regprocedure))
     <> 'd791426fb9837e464732ece3e1c08121' then
    raise exception 'els_search_page_core_v1 is not the work-budget definition; nothing to roll back';
  end if;
end $guard$;

CREATE OR REPLACE FUNCTION public.els_search_page_core_v1(p_term text, p_scope text DEFAULT 'torah'::text, p_skip_min integer DEFAULT 2, p_skip_max integer DEFAULT NULL::integer, p_page_size integer DEFAULT 100, p_after_skip integer DEFAULT NULL::integer, p_after_start integer DEFAULT NULL::integer, p_after_dir integer DEFAULT NULL::integer, p_selection_protocol text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_raw text := coalesce(p_term,'');
  v_term text := translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ');
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_len integer := length(v_term);
  v_hi integer;
  v_full_max integer;
  v_smin integer;
  v_smax integer;
  v_page integer;
  v_corpus_id text;
  v_dependency_group text;
  v_rows jsonb := '[]'::jsonb;
  v_returned integer := 0;
  v_has_more boolean := false;
  v_last jsonb;
  v_allowed_protocols constant text[] := array[
    'SOURCE_CLAIM_REPLAY','PRE_REGISTERED_TARGET','HYPOTHESIS_DRIVEN_FOLLOWUP','POST_HOC_EXPLORATORY'
  ];
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object('contract','els_search_page_v1','status','CORPUS_UNKNOWN','scope',v_scope,'hits','[]'::jsonb);
  end if;
  v_corpus_id := public.fn_els_corpus_id(v_scope);
  if v_len < 2 then
    return jsonb_build_object('contract','els_search_page_v1','status','CONTEXT_REQUIRED','scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;
  if p_selection_protocol is not null and not (p_selection_protocol = any(v_allowed_protocols)) then
    return jsonb_build_object('contract','els_search_page_v1','status','CONTEXT_REQUIRED','reason','unknown selection protocol','scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;
  if (p_after_skip is null) <> (p_after_start is null)
     or (p_after_skip is null) <> (p_after_dir is null)
     or (p_after_dir is not null and p_after_dir not in (-1,1)) then
    return jsonb_build_object(
      'contract','els_search_page_v1','status','CONTEXT_REQUIRED','reason','continuation cursor must supply skip,start,dir together',
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb
    );
  end if;

  v_hi := public.els_stream_letters_v1(v_scope);
  v_full_max := greatest(1,floor((v_hi-1)::numeric/greatest(1,v_len-1))::integer);
  v_smin := greatest(2,coalesce(p_skip_min,2));
  v_smax := least(v_full_max,greatest(v_smin,coalesce(p_skip_max,v_full_max)));
  v_page := greatest(1,least(coalesce(p_page_size,100),500));
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':skip'||v_smin::text||'-'||v_smax::text;

  with candidates as materialized (
    select *
    from public.els_occurrences_internal_v1(v_scope,v_term,v_smin,v_smax,0,v_hi-1) o
    where p_after_skip is null
       or o.skip > p_after_skip
       or (o.skip = p_after_skip and o.start0 > coalesce(p_after_start,-1))
       or (o.skip = p_after_skip and o.start0 = coalesce(p_after_start,-1) and o.dir < coalesce(p_after_dir,2))
    order by o.skip,o.start0,o.dir desc
    limit v_page+1
  ), selected as (
    select * from candidates order by skip,start0,dir desc limit v_page
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||skip::text||':'||dir::text||':'||start0::text,
      'skip',skip,'dir',dir,'direction',case when dir=1 then 'fwd' else 'back' end,
      'start',start0,'end',start0+dir*skip*(v_len-1),
      'positions',(select jsonb_agg(start0+dir*skip*k order by k) from generate_series(0,v_len-1) k),
      'coordinate_convention','zero_based_character_index','dependency_group',v_dependency_group
    ) order by skip,start0,dir desc),'[]'::jsonb),
    (select count(*) from selected),
    (select count(*) > v_page from candidates)
  into v_rows,v_returned,v_has_more
  from selected;

  if v_returned > 0 then v_last := v_rows -> (v_returned-1); end if;

  return jsonb_build_object(
    'contract','els_search_page_v1','status',case when v_returned=0 and p_after_skip is null then 'EXECUTED_EMPTY' else 'OK' end,'scope',v_scope,'corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'selection_protocol',p_selection_protocol,
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_search_page_core_v1','owner','els_research_layer_law:v9'),
    'search',jsonb_build_object(
      'skip_min',v_smin,'skip_max_executed',v_smax,'full_domain_max',v_full_max,
      'ordering','skip,start,forward-before-back-on-exact-tie','page_size',v_page,
      'exhaustive_with_continuation',true
    ),
    'hits',v_rows,'dependency_group',v_dependency_group,
    'completion',jsonb_build_object(
      'executed',true,'returned_hits',v_returned,'has_more',v_has_more,'truncated',v_has_more,
      'continuation',case when v_has_more and v_last is not null then jsonb_build_object(
        'kind','els_keyset_v1','after',jsonb_build_object(
          'skip',(v_last->>'skip')::int,'start',(v_last->>'start')::int,'dir',(v_last->>'dir')::int
        )
      ) else null end
    ),
    'provenance',jsonb_build_object(
      'source_relation','public.'||public.els_stream_relation_v1(v_scope),'occurrence_generator',case when v_scope='torah' then 'els_torah_occurrences_internal_v1' else 'els_occurrences_internal_v1' end,
      'engine_version',2,'rule_version','els_research_layer_law:v9'
    )
  );
end
$function$;

commit;
