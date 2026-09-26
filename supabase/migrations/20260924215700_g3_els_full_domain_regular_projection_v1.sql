-- SOD1820 — G3 ELS full-domain regular projection v1
-- Owner: els_research_layer_law v3 + els_single_engine_law v2
-- EXTEND_EXISTING only. This is a service projection over els_torah_occurrences_internal_v1,
-- not a second occurrence engine.

create or replace function public.els_search_regular_core_v1(
  p_term text,
  p_scope text default 'torah',
  p_maxhits integer default 4000,
  p_selection_protocol text default null
) returns jsonb
language plpgsql
stable
set search_path to 'public','extensions'
as $function$
declare
  v_raw text := coalesce(p_term,'');
  v_term text := translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ');
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_len integer := length(v_term);
  v_hi integer;
  v_full_max integer;
  v_cap integer := greatest(1,least(coalesce(p_maxhits,4000),4000));
  v_corpus_id text := public.fn_els_corpus_id(v_scope);
  v_dependency_group text;
  v_total bigint := 0;
  v_hits jsonb := '[]'::jsonb;
  v_allowed_protocols constant text[] := array[
    'SOURCE_CLAIM_REPLAY',
    'PRE_REGISTERED_TARGET',
    'HYPOTHESIS_DRIVEN_FOLLOWUP',
    'POST_HOC_EXPLORATORY'
  ];
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object(
      'contract','els_regular_search_result_v1','status','CORPUS_UNKNOWN',
      'scope',v_scope,'corpus_id',null,'hits','[]'::jsonb,
      'completion',jsonb_build_object('executed',false,'truncated',false)
    );
  end if;

  if v_len < 2 then
    return jsonb_build_object(
      'contract','els_regular_search_result_v1','status','CONTEXT_REQUIRED',
      'reason','ELS regular search requires at least 2 normalized Hebrew letters',
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'completion',jsonb_build_object('executed',false,'truncated',false)
    );
  end if;

  if p_selection_protocol is not null and not (p_selection_protocol = any(v_allowed_protocols)) then
    return jsonb_build_object(
      'contract','els_regular_search_result_v1','status','CONTEXT_REQUIRED',
      'reason','unknown selection protocol; refusing to invent research intent',
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'selection_protocol',p_selection_protocol,
      'completion',jsonb_build_object('executed',false,'truncated',false)
    );
  end if;

  if v_scope='tanakh' then
    return jsonb_build_object(
      'contract','els_regular_search_result_v1','status','MISSING_ADAPTER',
      'scope','tanakh','corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'completion',jsonb_build_object('executed',false,'state','MISSING_ADAPTER','truncated',false)
    );
  end if;

  select max(idx) into v_hi from public.torah_stream;
  v_full_max := greatest(2,floor((v_hi-1)::numeric/greatest(1,v_len-1))::integer);
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':full-domain';

  with candidates as materialized (
    select *
    from public.els_torah_occurrences_internal_v1(v_term,2,v_full_max,0,v_hi-1)
  ), selected as (
    select * from candidates
    order by skip,start0,dir desc
    limit v_cap
  )
  select
    (select count(*) from candidates),
    coalesce(jsonb_agg(jsonb_build_object(
      'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||skip::text||':'||dir::text||':'||start0::text,
      'skip',skip,'dir',dir,'direction',case when dir=1 then 'fwd' else 'back' end,
      'start',start0,'end',start0+dir*skip*(v_len-1),
      'positions',(select jsonb_agg(start0+dir*skip*k order by k) from generate_series(0,v_len-1) k),
      'coordinate_convention','zero_based_character_index',
      'dependency_group',v_dependency_group
    ) order by skip,start0,dir desc),'[]'::jsonb)
  into v_total,v_hits
  from selected;

  return jsonb_build_object(
    'contract','els_regular_search_result_v1',
    'status',case when v_total=0 then 'EXECUTED_EMPTY' else 'OK' end,
    'scope','torah','corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'selection_protocol',p_selection_protocol,
    'search',jsonb_build_object(
      'skip_min',2,'skip_max_executed',v_full_max,'full_domain_max',v_full_max,
      'directions',jsonb_build_array('fwd','back'),
      'ordering','skip,start,forward-before-back-on-exact-tie',
      'sampling',jsonb_build_object(
        'policy','ordered_prefix_v1',
        'representative',false,
        'bias','shorter_skip_then_earlier_corpus_position',
        'legacy_browser_equivalent',false
      ),
      'return_budget',jsonb_build_object('max_returned_hits',v_cap)
    ),
    'hits',v_hits,
    'dependency_group',v_dependency_group,
    'completion',jsonb_build_object(
      'executed',true,
      'negative',v_total=0,
      'total_hits',v_total,
      'returned_hits',jsonb_array_length(v_hits),
      'truncated',v_total>v_cap,
      'truncation_reason',case when v_total>v_cap then 'ordered_prefix_non_representative' else null end
    ),
    'engine',jsonb_build_object(
      'id','els-sql-core','version',2,'function','els_search_regular_core_v1',
      'occurrence_generator','els_torah_occurrences_internal_v1',
      'owner','els_research_layer_law:v3'
    ),
    'provenance',jsonb_build_object(
      'source_relation','public.torah_stream',
      'corpus_letters',v_hi,
      'rule_version','els_research_layer_law:v3',
      'single_engine_owner','els_single_engine_law:v2'
    )
  );
end
$function$;

comment on function public.els_search_regular_core_v1(text,text,integer,text) is
'Service-only full-domain Torah regular-search projection over the single canonical ELS occurrence generator. Returns exact total_count and at most 4000 explicitly non-representative ordered-prefix hits.';

revoke all on function public.els_search_regular_core_v1(text,text,integer,text)
  from public, anon, authenticated;
grant execute on function public.els_search_regular_core_v1(text,text,integer,text)
  to service_role;
