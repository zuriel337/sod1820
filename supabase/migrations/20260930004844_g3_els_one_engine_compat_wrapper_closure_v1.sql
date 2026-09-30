-- SOD1820 — G3 ELS One-Engine compatibility closure.
-- EXTEND_EXISTING only. The legacy fn_els_search name remains temporarily for
-- existing NameLab consumers, but it is not an engine: all occurrence generation
-- delegates to the canonical els_search_core_v1 / els_torah_occurrences_internal_v1 tree.
-- Also removes unused public geometry surface from anon/authenticated.
-- Core edge-case hardening: maxskip<=1 fails closed instead of widening to 2; maxhits=0 remains zero.

CREATE OR REPLACE FUNCTION public.els_search_core_v1(p_term text, p_scope text DEFAULT 'torah'::text, p_maxskip integer DEFAULT 40, p_maxhits integer DEFAULT 16, p_selection_protocol text DEFAULT NULL::text)
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
  v_maxskip integer;
  v_maxhits integer;
  v_corpus_id text;
  v_total bigint := 0;
  v_plain bigint := 0;
  v_min_skip integer;
  v_hits jsonb := '[]'::jsonb;
  v_truncated boolean := false;
  v_coverage text;
  v_status text;
  v_dependency_group text;
  v_last jsonb;
  v_allowed_protocols constant text[] := array[
    'SOURCE_CLAIM_REPLAY',
    'PRE_REGISTERED_TARGET',
    'HYPOTHESIS_DRIVEN_FOLLOWUP',
    'POST_HOC_EXPLORATORY'
  ];
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','CORPUS_UNKNOWN','reason','unsupported ELS corpus scope',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope',v_scope,'corpus_id',null,'hits','[]'::jsonb,
      'engine',jsonb_build_object('id','els-sql-core','version',2,'owner','els_research_layer_law:v9'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false)
    );
  end if;

  v_corpus_id := public.fn_els_corpus_id(v_scope);

  if v_len < 2 then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','CONTEXT_REQUIRED','reason','ELS search requires at least 2 normalized Hebrew letters',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'engine',jsonb_build_object('id','els-sql-core','version',2,'owner','els_research_layer_law:v9'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false)
    );
  end if;

  if p_selection_protocol is not null and not (p_selection_protocol = any(v_allowed_protocols)) then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','CONTEXT_REQUIRED','reason','unknown selection protocol; refusing to invent research intent',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'selection_protocol',p_selection_protocol,
      'engine',jsonb_build_object('id','els-sql-core','version',2,'owner','els_research_layer_law:v9'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false)
    );
  end if;

  if v_scope = 'tanakh' then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','MISSING_ADAPTER',
      'reason','canonical Tanakh corpus identity exists, but no server-callable canonical Tanakh stream is live; legacy browser corpus is not server authority',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope','tanakh','corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'selection_protocol',p_selection_protocol,
      'engine',jsonb_build_object('id','els-sql-core','version',2,'owner','els_research_layer_law:v9'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false,'state','MISSING_ADAPTER'),
      'provenance',jsonb_build_object('corpus_identity_function','fn_els_corpus_id','canonical_source','tools/els/data/tk-letters.txt')
    );
  end if;

  select max(idx) into v_hi from public.torah_stream;
  v_full_max := greatest(1, floor((v_hi - 1)::numeric / greatest(1,v_len - 1))::integer);
  v_maxskip := least(v_full_max, greatest(0, least(coalesce(p_maxskip,40), 20000)));
  v_maxhits := greatest(0, least(coalesce(p_maxhits,16), 1000));
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':skip2-'||v_maxskip::text;

  -- Fail closed on a request that does not admit any ELS skip (skip>=2).
  -- Do not silently widen maxskip=0/1 to 2. Preserve the legacy plain count for
  -- maxskip=1 through the same canonical occurrence primitive; maxskip=0 executes
  -- no search at all.
  if v_maxskip <= 1 then
    if v_maxskip = 1 then
      select count(*) into v_plain
      from public.els_torah_occurrences_internal_v1(v_term,1,1,0,v_hi-1)
      where skip=1 and dir=1;
    else
      v_plain := 0;
    end if;

    return jsonb_build_object(
      'contract','els_search_result_v1',
      'status','EXECUTED_EMPTY',
      'scope','torah',
      'corpus_id',v_corpus_id,
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len,'language','he','script','Hebrew'),
      'selection_protocol',p_selection_protocol,
      'engine',jsonb_build_object(
        'id','els-sql-core','version',2,'function','els_search_core_v1',
        'owner','els_research_layer_law:v9','single_engine_owner','els_single_engine_law:v2'
      ),
      'coordinate',jsonb_build_object(
        'position_base',0,'space','canonical_corpus_character_index',
        'start_semantics','first_letter_of_searched_expression','direction_values',jsonb_build_object('fwd',1,'back',-1)
      ),
      'search',jsonb_build_object(
        'skip_min',2,'skip_max_requested',p_maxskip,'skip_max_executed',v_maxskip,
        'full_domain_max',v_full_max,'max_hits',v_maxhits,'directions',jsonb_build_array('fwd','back'),
        'plain_excluded',true,'ordering','skip,start,forward-before-back-on-exact-tie',
        'budget',jsonb_build_object('kind','bounded_skip_domain','max_skip',v_maxskip,'max_returned_hits',v_maxhits),
        'sampling',jsonb_build_object(
          'policy','ordered_prefix_v1','representative',false,
          'bias','shorter_skip_then_earlier_corpus_position','legacy_browser_equivalent',false,
          'exhaustive_contracts',jsonb_build_object('public','els_search_page_v1','service','els_search_page_core_v1')
        )
      ),
      'plain_count',v_plain,
      'els_count',0,
      'min_skip',null,
      'hits','[]'::jsonb,
      'dependency_group',v_dependency_group,
      'completion',jsonb_build_object(
        'executed',true,'state','EXECUTED_EMPTY','coverage','no_els_skip_admitted',
        'negative',true,'truncated',false,'total_hits',0,'returned_hits',0,
        'truncation_reason',null,'continuation',null
      ),
      'negative_result',jsonb_build_object(
        'state','EXECUTED_EMPTY','scope','torah','corpus_id',v_corpus_id,
        'searched_expression',v_term,'skip_min',2,'skip_max',v_maxskip,
        'directions',jsonb_build_array('fwd','back')
      ),
      'provenance',jsonb_build_object(
        'source_relation','public.torah_stream','corpus_letters',v_hi,
        'corpus_identity_function','fn_els_corpus_id','occurrence_generator','els_torah_occurrences_internal_v1',
        'engine_function','els_search_core_v1','engine_version',2,'rule_version','els_research_layer_law:v9'
      )
    );
  end if;

  with allh as materialized (
    select * from public.els_torah_occurrences_internal_v1(v_term,1,v_maxskip,0,v_hi-1)
  ),
  els_only as materialized (
    select * from allh where skip>=2
  ),
  ordered as materialized (
    select * from els_only order by skip,start0,dir desc limit v_maxhits
  )
  select
    (select count(*) from allh where skip=1 and dir=1),
    (select count(*) from els_only),
    (select min(skip) from els_only),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||skip::text||':'||dir::text||':'||start0::text,
          'skip',skip,
          'dir',dir,
          'direction',case when dir=1 then 'fwd' else 'back' end,
          'start',start0,
          'end',start0+dir*skip*(v_len-1),
          'positions',(select jsonb_agg(start0+dir*skip*k order by k) from generate_series(0,v_len-1) k),
          'coordinate_convention','zero_based_character_index',
          'dependency_group',v_dependency_group
        ) order by skip,start0,dir desc
      ) from ordered
    ),'[]'::jsonb)
  into v_plain,v_total,v_min_skip,v_hits;

  v_truncated := v_total > v_maxhits;
  v_coverage := case when v_maxskip >= v_full_max then 'full_skip_domain' else 'bounded_partial' end;
  v_status := case when v_total=0 then 'EXECUTED_EMPTY' else 'OK' end;
  if jsonb_array_length(v_hits) > 0 then
    v_last := v_hits -> (jsonb_array_length(v_hits)-1);
  end if;

  return jsonb_build_object(
    'contract','els_search_result_v1',
    'status',v_status,
    'scope','torah',
    'corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len,'language','he','script','Hebrew'),
    'selection_protocol',p_selection_protocol,
    'engine',jsonb_build_object(
      'id','els-sql-core','version',2,'function','els_search_core_v1',
      'owner','els_research_layer_law:v9','single_engine_owner','els_single_engine_law:v2'
    ),
    'coordinate',jsonb_build_object(
      'position_base',0,'space','canonical_corpus_character_index',
      'start_semantics','first_letter_of_searched_expression','direction_values',jsonb_build_object('fwd',1,'back',-1)
    ),
    'search',jsonb_build_object(
      'skip_min',2,'skip_max_requested',p_maxskip,'skip_max_executed',v_maxskip,
      'full_domain_max',v_full_max,'max_hits',v_maxhits,'directions',jsonb_build_array('fwd','back'),
      'plain_excluded',true,'ordering','skip,start,forward-before-back-on-exact-tie',
      'budget',jsonb_build_object('kind','bounded_skip_domain','max_skip',v_maxskip,'max_returned_hits',v_maxhits),
      'sampling',jsonb_build_object(
        'policy','ordered_prefix_v1',
        'representative',false,
        'bias','shorter_skip_then_earlier_corpus_position',
        'legacy_browser_equivalent',false,
        'exhaustive_contracts',jsonb_build_object('public','els_search_page_v1','service','els_search_page_core_v1')
      )
    ),
    'plain_count',v_plain,
    'els_count',v_total,
    'min_skip',v_min_skip,
    'hits',v_hits,
    'dependency_group',v_dependency_group,
    'completion',jsonb_build_object(
      'executed',true,'state',v_status,'coverage',v_coverage,'negative',v_total=0,
      'truncated',v_truncated,'total_hits',v_total,'returned_hits',jsonb_array_length(v_hits),
      'truncation_reason',case when v_truncated then 'return_budget_ordered_prefix_non_representative' else null end,
      'continuation',case when v_truncated and v_last is not null then jsonb_build_object(
        'kind','els_keyset_v1',
        'after',jsonb_build_object('skip',(v_last->>'skip')::int,'start',(v_last->>'start')::int,'dir',(v_last->>'dir')::int),
        'contracts',jsonb_build_object('public','els_search_page_v1','service','els_search_page_core_v1')
      ) else null end
    ),
    'negative_result',case when v_total=0 then jsonb_build_object(
      'state','EXECUTED_EMPTY','scope','torah','corpus_id',v_corpus_id,
      'searched_expression',v_term,'skip_min',2,'skip_max',v_maxskip,'directions',jsonb_build_array('fwd','back')
    ) else null end,
    'provenance',jsonb_build_object(
      'source_relation','public.torah_stream','corpus_letters',v_hi,
      'corpus_identity_function','fn_els_corpus_id','occurrence_generator','els_torah_occurrences_internal_v1',
      'engine_function','els_search_core_v1','engine_version',2,'rule_version','els_research_layer_law:v9'
    )
  );
end
$function$;

create or replace function public.fn_els_search(
  p_term text,
  p_maxskip integer default 40,
  p_maxhits integer default 16
) returns jsonb
language sql
stable
security definer
set search_path to 'public','extensions'
as $function$
  with r as (
    select public.els_search_core_v1(p_term,'torah',p_maxskip,p_maxhits,null) x
  )
  select jsonb_build_object(
    'term', x->'input'->>'normalized',
    'letters', coalesce((x->'input'->>'length')::int,0),
    'plain', coalesce((x->>'plain_count')::bigint,0),
    'els_count', coalesce((x->>'els_count')::bigint,0),
    'min_skip', case when x->>'min_skip' is null then null else (x->>'min_skip')::int end,
    'hits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'skip',(h->>'skip')::int,
        'dir',(h->>'dir')::int,
        'start',(h->>'start')::int
      ) order by (h->>'skip')::int,(h->>'start')::int,(h->>'dir')::int desc)
      from jsonb_array_elements(coalesce(x->'hits','[]'::jsonb)) h
    ),'[]'::jsonb),
    'searched_maxskip', coalesce((x->'search'->>'skip_max_executed')::int,least(greatest(coalesce(p_maxskip,40),2),20000)),
    'scope','torah',
    'corpus_id',x->>'corpus_id',
    'position_base',0,
    'engine','sql-scan',
    'profile','server-scan',
    'coverage','partial',
    'skip_domain',jsonb_build_object(
      'min',2,
      'max',coalesce((x->'search'->>'skip_max_executed')::int,0),
      'full_domain_max',case when x->'search'->>'full_domain_max' is null then null else (x->'search'->>'full_domain_max')::int end
    ),
    'plain_excluded',true,
    'truncated',coalesce((x->'completion'->>'truncated')::boolean,false),
    'ordering','skip,start'
  )
  from r
$function$;

revoke all on function public.fn_els_search(text,integer,integer) from public;
grant execute on function public.fn_els_search(text,integer,integer) to anon, authenticated, service_role;

revoke all on function public.els_search_geometry_v1(text,text,integer,integer,integer,integer,integer,integer[],integer) from public;
revoke execute on function public.els_search_geometry_v1(text,text,integer,integer,integer,integer,integer,integer[],integer) from anon, authenticated;
grant execute on function public.els_search_geometry_v1(text,text,integer,integer,integer,integer,integer,integer[],integer) to service_role;

comment on function public.fn_els_search(text,integer,integer) is
  'TEMPORARY_COMPATIBILITY legacy projection over canonical els_search_core_v1. No independent occurrence generation. Retire after fn_els_for_name/fn_name_multi consumer rewire.';

comment on function public.els_search_geometry_v1(text,text,integer,integer,integer,integer,integer,integer[],integer) is
  'Internal/service compatibility wrapper over els_search_geometry_core_v1. Public anon/auth execution revoked in G3 One-Engine closure.';
