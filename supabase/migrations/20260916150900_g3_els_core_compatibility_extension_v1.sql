-- SOD1820 — G3-C2 ELS core compatibility extension v1
-- Owner: els_research_layer_law v3 + els_single_engine_law v2
-- EXTEND_EXISTING only. No second engine/store/corpus/registry/graph.
--
-- This migration does NOT retire tzofen/browser execution. It extends the SAME callable Torah
-- core with truth-safe compatibility primitives needed before a later cutover:
--   1) one internal occurrence generator shared by all projections;
--   2) explicit truncation bias/continuation metadata on els_search_core_v1;
--   3) exhaustive keyset paging (service/core + bounded public projection);
--   4) exact occurrence replay/verification;
--   5) bounded matrix-geometry search for cross/recompute consumers.
-- Tanakh remains MISSING_ADAPTER until the exact canonical tk-letters witness is server-admitted.

-- ---------------------------------------------------------------------------
-- ONE OCCURRENCE GENERATOR
-- ---------------------------------------------------------------------------
-- This is an internal relation primitive of the existing ELS core, not a second engine/API.
-- All server-side occurrence-producing projections below delegate to it.
create or replace function public.els_torah_occurrences_internal_v1(
  p_term text,
  p_skip_min integer default 1,
  p_skip_max integer default null,
  p_start_min integer default 0,
  p_start_max integer default null
) returns table(skip integer, dir integer, start0 integer)
language sql
stable
set search_path to 'public'
as $function$
  with q0 as (
    select translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ') t
  ),
  q as (
    select
      t,
      length(t) ln,
      (select max(idx) from public.torah_stream) hi,
      substr(t,1,1) c1,
      substr(t,2,1) c2,
      greatest(1,coalesce(p_skip_min,1)) smin,
      least(
        greatest(1,floor((((select max(idx) from public.torah_stream)-1)::numeric) / greatest(1,length(t)-1))::integer),
        greatest(1,coalesce(
          p_skip_max,
          greatest(1,floor((((select max(idx) from public.torah_stream)-1)::numeric) / greatest(1,length(t)-1))::integer)
        ))
      ) smax,
      greatest(0,coalesce(p_start_min,0)) start_min,
      least(
        (select max(idx)-1 from public.torah_stream),
        greatest(0,coalesce(p_start_max,(select max(idx)-1 from public.torah_stream)))
      ) start_max
    from q0
    where length(t) >= 2
  ),
  fpair as (
    select a.idx st, (b.idx-a.idx) skip
    from public.torah_stream a
    join public.torah_stream b
      on b.ch=(select c2 from q)
     and b.idx between a.idx+(select smin from q) and a.idx+(select smax from q)
    where a.ch=(select c1 from q)
      and (select smax from q) >= (select smin from q)
  ),
  bpair as (
    select a.idx st, (a.idx-b.idx) skip
    from public.torah_stream a
    join public.torah_stream b
      on b.ch=(select c2 from q)
     and b.idx between a.idx-(select smax from q) and a.idx-(select smin from q)
    where a.ch=(select c1 from q)
      and (select smax from q) >= (select smin from q)
  ),
  allh as (
    select skip, 1 dir, st from fpair
    where st+((select ln from q)-1)*skip <= (select hi from q)
      and not exists (
        select 1 from generate_series(3,(select ln from q)) j
        where coalesce((select ch from public.torah_stream t3 where t3.idx=st+(j-1)*skip),'')
              <> substr((select t from q),j,1)
      )
    union all
    select skip, -1 dir, st from bpair
    where st-((select ln from q)-1)*skip >= 1
      and not exists (
        select 1 from generate_series(3,(select ln from q)) j
        where coalesce((select ch from public.torah_stream t3 where t3.idx=st-(j-1)*skip),'')
              <> substr((select t from q),j,1)
      )
  )
  select h.skip, h.dir, h.st-1 start0
  from allh h
  cross join q
  where h.st-1 between q.start_min and q.start_max
  order by h.skip, h.st, h.dir desc
$function$;

comment on function public.els_torah_occurrences_internal_v1(text,integer,integer,integer,integer) is
'Internal row primitive of the canonical ELS core. Single Torah occurrence generator used by search/page/replay/geometry projections; not a product API.';

revoke all on function public.els_torah_occurrences_internal_v1(text,integer,integer,integer,integer)
  from public, anon, authenticated;
grant execute on function public.els_torah_occurrences_internal_v1(text,integer,integer,integer,integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- CORE SEARCH: PRESERVE RETURN ORDER, REMOVE *SILENT* TRUNCATION
-- ---------------------------------------------------------------------------
-- Existing hits stay ordered exactly as before (skip,start,forward-before-back) so fn_els_search
-- golden parity is preserved. The change is semantic honesty: a capped ordered prefix is explicitly
-- labelled non-representative and points to the exhaustive page contract instead of pretending the
-- returned prefix is a complete/representative sample.
create or replace function public.els_search_core_v1(
  p_term text,
  p_scope text default 'torah',
  p_maxskip integer default 40,
  p_maxhits integer default 16,
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
      'engine',jsonb_build_object('id','els-sql-core','version',2,'owner','els_research_layer_law:v3'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false)
    );
  end if;

  v_corpus_id := public.fn_els_corpus_id(v_scope);

  if v_len < 2 then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','CONTEXT_REQUIRED','reason','ELS search requires at least 2 normalized Hebrew letters',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'engine',jsonb_build_object('id','els-sql-core','version',2,'owner','els_research_layer_law:v3'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false)
    );
  end if;

  if p_selection_protocol is not null and not (p_selection_protocol = any(v_allowed_protocols)) then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','CONTEXT_REQUIRED','reason','unknown selection protocol; refusing to invent research intent',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'selection_protocol',p_selection_protocol,
      'engine',jsonb_build_object('id','els-sql-core','version',2,'owner','els_research_layer_law:v3'),
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
      'engine',jsonb_build_object('id','els-sql-core','version',2,'owner','els_research_layer_law:v3'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false,'state','MISSING_ADAPTER'),
      'provenance',jsonb_build_object('corpus_identity_function','fn_els_corpus_id','canonical_source','tools/els/data/tk-letters.txt')
    );
  end if;

  select max(idx) into v_hi from public.torah_stream;
  v_full_max := greatest(1, floor((v_hi - 1)::numeric / greatest(1,v_len - 1))::integer);
  v_maxskip := least(v_full_max, greatest(2, least(coalesce(p_maxskip,40), 20000)));
  v_maxhits := greatest(1, least(coalesce(p_maxhits,16), 1000));
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':skip2-'||v_maxskip::text;

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
      'owner','els_research_layer_law:v3','single_engine_owner','els_single_engine_law:v2'
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
      'engine_function','els_search_core_v1','engine_version',2,'rule_version','els_research_layer_law:v3'
    )
  );
end
$function$;

comment on function public.els_search_core_v1(text,text,integer,integer,text) is
'Canonical callable ELS execution core v1 boundary, engine revision 2. Ordered-prefix truncation is explicit/non-representative and points to exhaustive page continuation. Torah live; Tanakh MISSING_ADAPTER.';

-- Preserve core privilege surface after replacement.
revoke all on function public.els_search_core_v1(text,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.els_search_core_v1(text,text,integer,integer,text) to service_role;

-- ---------------------------------------------------------------------------
-- EXHAUSTIVE KEYSET PAGE CONTRACT (SERVICE/CORE)
-- ---------------------------------------------------------------------------
create or replace function public.els_search_page_core_v1(
  p_term text,
  p_scope text default 'torah',
  p_skip_min integer default 2,
  p_skip_max integer default null,
  p_page_size integer default 100,
  p_after_skip integer default null,
  p_after_start integer default null,
  p_after_dir integer default null,
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
  if v_scope='tanakh' then
    return jsonb_build_object(
      'contract','els_search_page_v1','status','MISSING_ADAPTER','scope','tanakh','corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'completion',jsonb_build_object('executed',false,'state','MISSING_ADAPTER','truncated',false)
    );
  end if;
  if (p_after_skip is null) <> (p_after_start is null)
     or (p_after_skip is null) <> (p_after_dir is null)
     or (p_after_dir is not null and p_after_dir not in (-1,1)) then
    return jsonb_build_object(
      'contract','els_search_page_v1','status','CONTEXT_REQUIRED','reason','continuation cursor must supply skip,start,dir together',
      'scope','torah','corpus_id',v_corpus_id,'hits','[]'::jsonb
    );
  end if;

  select max(idx) into v_hi from public.torah_stream;
  v_full_max := greatest(1,floor((v_hi-1)::numeric/greatest(1,v_len-1))::integer);
  v_smin := greatest(2,coalesce(p_skip_min,2));
  v_smax := least(v_full_max,greatest(v_smin,coalesce(p_skip_max,v_full_max)));
  v_page := greatest(1,least(coalesce(p_page_size,100),500));
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':skip'||v_smin::text||'-'||v_smax::text;

  with candidates as materialized (
    select *
    from public.els_torah_occurrences_internal_v1(v_term,v_smin,v_smax,0,v_hi-1) o
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
    'contract','els_search_page_v1','status',case when v_returned=0 and p_after_skip is null then 'EXECUTED_EMPTY' else 'OK' end,'scope','torah','corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'selection_protocol',p_selection_protocol,
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_search_page_core_v1','owner','els_research_layer_law:v3'),
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
      'source_relation','public.torah_stream','occurrence_generator','els_torah_occurrences_internal_v1',
      'engine_version',2,'rule_version','els_research_layer_law:v3'
    )
  );
end
$function$;

comment on function public.els_search_page_core_v1(text,text,integer,integer,integer,integer,integer,integer,text) is
'Service/core exhaustive keyset page projection over the single canonical ELS occurrence generator. Supports full Torah skip domain; no hidden sampling.';

revoke all on function public.els_search_page_core_v1(text,text,integer,integer,integer,integer,integer,integer,text)
  from public, anon, authenticated;
grant execute on function public.els_search_page_core_v1(text,text,integer,integer,integer,integer,integer,integer,text)
  to service_role;

-- Public page projection remains compute-bounded like els_search_v1. Full-domain compatibility
-- remains a server/orchestration concern until release/performance gating is complete.
create or replace function public.els_search_page_v1(
  p_term text,
  p_scope text default 'torah',
  p_skip_min integer default 2,
  p_skip_max integer default 40,
  p_page_size integer default 50,
  p_after_skip integer default null,
  p_after_start integer default null,
  p_after_dir integer default null,
  p_selection_protocol text default null
) returns jsonb
language sql
stable
security definer
set search_path to 'public','extensions'
as $function$
  select public.els_search_page_core_v1(
    p_term,p_scope,
    greatest(2,coalesce(p_skip_min,2)),
    least(greatest(coalesce(p_skip_max,40),2),500),
    least(greatest(coalesce(p_page_size,50),1),100),
    p_after_skip,p_after_start,p_after_dir,p_selection_protocol
  )
$function$;

revoke all on function public.els_search_page_v1(text,text,integer,integer,integer,integer,integer,integer,text) from public;
grant execute on function public.els_search_page_v1(text,text,integer,integer,integer,integer,integer,integer,text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- EXACT OCCURRENCE REPLAY / VERIFICATION
-- ---------------------------------------------------------------------------
create or replace function public.els_verify_occurrence_v1(
  p_term text,
  p_scope text,
  p_skip integer,
  p_dir integer,
  p_start integer
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_raw text := coalesce(p_term,'');
  v_term text := translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ');
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_len integer := length(v_term);
  v_corpus_id text := public.fn_els_corpus_id(v_scope);
  v_match boolean := false;
  v_dependency_group text;
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object('contract','els_occurrence_replay_v1','status','CORPUS_UNKNOWN','verification_state','NOT_TESTED');
  end if;
  if v_len < 2 or coalesce(p_skip,0) < 2 or coalesce(p_dir,0) not in (-1,1) or coalesce(p_start,-1) < 0 then
    return jsonb_build_object('contract','els_occurrence_replay_v1','status','CONTEXT_REQUIRED','verification_state','NOT_TESTED','scope',v_scope,'corpus_id',v_corpus_id);
  end if;
  if v_scope='tanakh' then
    return jsonb_build_object('contract','els_occurrence_replay_v1','status','MISSING_ADAPTER','verification_state','NOT_TESTED','scope','tanakh','corpus_id',v_corpus_id);
  end if;

  select exists(
    select 1 from public.els_torah_occurrences_internal_v1(v_term,p_skip,p_skip,p_start,p_start) o
    where o.skip=p_skip and o.dir=p_dir and o.start0=p_start
  ) into v_match;

  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':skip'||p_skip::text;

  return jsonb_build_object(
    'contract','els_occurrence_replay_v1',
    'status',case when v_match then 'OK' else 'REPLAY_MISMATCH' end,
    'verification_state',case when v_match then 'MATCH' else 'MISMATCH' end,
    'scope','torah','corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'occurrence',jsonb_build_object(
      'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||p_skip::text||':'||p_dir::text||':'||p_start::text,
      'skip',p_skip,'dir',p_dir,'direction',case when p_dir=1 then 'fwd' else 'back' end,
      'start',p_start,'end',p_start+p_dir*p_skip*(v_len-1),
      'positions',(select jsonb_agg(p_start+p_dir*p_skip*k order by k) from generate_series(0,v_len-1) k),
      'coordinate_convention','zero_based_character_index','dependency_group',v_dependency_group
    ),
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_verify_occurrence_v1','owner','els_research_layer_law:v3'),
    'provenance',jsonb_build_object('source_relation','public.torah_stream','occurrence_generator','els_torah_occurrences_internal_v1','rule_version','els_research_layer_law:v3')
  );
end
$function$;

revoke all on function public.els_verify_occurrence_v1(text,text,integer,integer,integer) from public;
grant execute on function public.els_verify_occurrence_v1(text,text,integer,integer,integer)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- BOUNDED MATRIX-GEOMETRY SEARCH
-- ---------------------------------------------------------------------------
-- The renderer/search-plan supplies the matrix geometry and allowed skips. The ELS core alone
-- decides whether an occurrence exists at those coordinates. Geometry stays representation/search
-- context; it does not become a second truth engine.
create or replace function public.els_search_geometry_core_v1(
  p_term text,
  p_scope text,
  p_axis_width integer,
  p_r0 integer,
  p_r1 integer,
  p_c0 integer,
  p_cw integer,
  p_skips integer[],
  p_maxhits integer default 500
) returns jsonb
language plpgsql
stable
set search_path to 'public','extensions'
as $function$
declare
  v_term text := translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ');
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_len integer := length(v_term);
  v_corpus_id text := public.fn_els_corpus_id(v_scope);
  v_skips integer[];
  v_min integer;
  v_max integer;
  v_cap integer := greatest(1,least(coalesce(p_maxhits,500),4000));
  v_rows jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_dependency_group text;
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CORPUS_UNKNOWN','hits','[]'::jsonb);
  end if;
  if v_len < 2 or coalesce(p_axis_width,0) < 1 or coalesce(p_r0,-1) < 0 or p_r1 < p_r0
     or coalesce(p_c0,-1) < 0 or coalesce(p_cw,0) < 1 or p_c0+p_cw > p_axis_width then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CONTEXT_REQUIRED','scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;
  if v_scope='tanakh' then
    return jsonb_build_object('contract','els_geometry_search_v1','status','MISSING_ADAPTER','scope','tanakh','corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;

  select coalesce(array_agg(distinct abs(s) order by abs(s)) filter (where abs(s)>=1),'{}'::integer[])
    into v_skips
  from unnest(coalesce(p_skips,'{}'::integer[])) s;
  if cardinality(v_skips)=0 then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CONTEXT_REQUIRED','reason','explicit skip set required','scope','torah','corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;
  select min(x),max(x) into v_min,v_max from unnest(v_skips) x;
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':geometry:'||p_axis_width::text||':'||p_r0::text||'-'||p_r1::text||':'||p_c0::text||'+'||p_cw::text;

  with candidates as materialized (
    select o.*
    from public.els_torah_occurrences_internal_v1(
      v_term,v_min,v_max,
      greatest(0,p_r0*p_axis_width),
      least((select max(idx)-1 from public.torah_stream),(p_r1+1)*p_axis_width-1)
    ) o
    where o.skip = any(v_skips)
      and floor(o.start0::numeric/p_axis_width)::int between p_r0 and p_r1
      and mod(o.start0,p_axis_width) between p_c0 and p_c0+p_cw-1
      and not exists (
        select 1 from generate_series(0,v_len-1) k
        where floor((o.start0+o.dir*o.skip*k)::numeric/p_axis_width)::int not between p_r0 and p_r1
           or mod(o.start0+o.dir*o.skip*k,p_axis_width) not between p_c0 and p_c0+p_cw-1
      )
  ), ordered as (
    select * from candidates order by skip,start0,dir desc limit v_cap
  )
  select
    (select count(*) from candidates),
    coalesce(jsonb_agg(jsonb_build_object(
      'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||skip::text||':'||dir::text||':'||start0::text,
      'skip',skip,'dir',dir,'direction',case when dir=1 then 'fwd' else 'back' end,
      'start',start0,'end',start0+dir*skip*(v_len-1),
      'positions',(select jsonb_agg(start0+dir*skip*k order by k) from generate_series(0,v_len-1) k),
      'coordinate_convention','zero_based_character_index','dependency_group',v_dependency_group
    ) order by skip,start0,dir desc),'[]'::jsonb)
  into v_total,v_rows
  from ordered;

  return jsonb_build_object(
    'contract','els_geometry_search_v1','status',case when v_total=0 then 'EXECUTED_EMPTY' else 'OK' end,
    'scope','torah','corpus_id',v_corpus_id,
    'input',jsonb_build_object('normalized',v_term,'length',v_len),
    'geometry',jsonb_build_object('axis_width',p_axis_width,'r0',p_r0,'r1',p_r1,'c0',p_c0,'cw',p_cw),
    'search',jsonb_build_object('skips',to_jsonb(v_skips),'max_hits',v_cap,'ordering','skip,start,forward-before-back-on-exact-tie'),
    'hits',v_rows,'dependency_group',v_dependency_group,
    'completion',jsonb_build_object('executed',true,'negative',v_total=0,'total_hits',v_total,'returned_hits',jsonb_array_length(v_rows),'truncated',v_total>v_cap),
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_search_geometry_core_v1','owner','els_research_layer_law:v3'),
    'provenance',jsonb_build_object('source_relation','public.torah_stream','occurrence_generator','els_torah_occurrences_internal_v1','rule_version','els_research_layer_law:v3')
  );
end
$function$;

revoke all on function public.els_search_geometry_core_v1(text,text,integer,integer,integer,integer,integer,integer[],integer)
  from public, anon, authenticated;
grant execute on function public.els_search_geometry_core_v1(text,text,integer,integer,integer,integer,integer,integer[],integer)
  to service_role;

-- Public geometry wrapper is deliberately bounded to the live legacy geometry envelope (CW<=80,
-- row span <=256) and a bounded skip set. It does not expose arbitrary corpus scans.
create or replace function public.els_search_geometry_v1(
  p_term text,
  p_scope text,
  p_axis_width integer,
  p_r0 integer,
  p_r1 integer,
  p_c0 integer,
  p_cw integer,
  p_skips integer[],
  p_maxhits integer default 100
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','extensions'
as $function$
begin
  if coalesce(p_axis_width,0) < 1 or coalesce(p_r0,-1) < 0 or p_r1 < p_r0
     or p_r1-p_r0+1 > 256 or coalesce(p_cw,0) < 1 or p_cw > 80
     or p_c0 < 0 or p_c0+p_cw > p_axis_width
     or cardinality(coalesce(p_skips,'{}'::integer[])) > 128 then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CONTEXT_REQUIRED','reason','bounded geometry/search budget exceeded','hits','[]'::jsonb);
  end if;
  return public.els_search_geometry_core_v1(
    p_term,p_scope,p_axis_width,p_r0,p_r1,p_c0,p_cw,p_skips,
    least(greatest(coalesce(p_maxhits,100),1),500)
  );
end
$function$;

revoke all on function public.els_search_geometry_v1(text,text,integer,integer,integer,integer,integer,integer[],integer) from public;
grant execute on function public.els_search_geometry_v1(text,text,integer,integer,integer,integer,integer,integer[],integer)
  to anon, authenticated, service_role;
