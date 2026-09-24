-- SOD1820 — G3 callable ELS core v1
-- Owner: els_research_layer_law v3 + els_single_engine_law v2
-- EXTEND_EXISTING only. No second engine/store/corpus/graph/context system.
--
-- This migration turns the already-live Torah SQL scanner into the one callable/versioned
-- 2029 server boundary and makes legacy fn_els_search a compatibility projection over it.
-- It deliberately DOES NOT claim full-Tanakh server execution: live tanach_verses is not the
-- canonical 1,204,583-letter tk-letters witness and fails Torah-prefix parity (306,269 != 304,805).
-- scope=tanakh therefore fails honestly with MISSING_ADAPTER while preserving the already-locked
-- canonical Tanakh corpus identity from fn_els_corpus_id('tanakh').

create or replace function public.els_search_core_v1(
  p_term text,
  p_scope text default 'torah',
  p_maxskip integer default 40,
  p_maxhits integer default 16,
  p_selection_protocol text default null
) returns jsonb
language plpgsql
stable
set search_path to 'public'
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
  v_allowed_protocols constant text[] := array[
    'SOURCE_CLAIM_REPLAY',
    'PRE_REGISTERED_TARGET',
    'HYPOTHESIS_DRIVEN_FOLLOWUP',
    'POST_HOC_EXPLORATORY'
  ];
begin
  -- Semantic/identity validation is fail-closed and never fabricates a corpus.
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','CORPUS_UNKNOWN','reason','unsupported ELS corpus scope',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope',v_scope,'corpus_id',null,'hits','[]'::jsonb,
      'engine',jsonb_build_object('id','els-sql-core','version',1,'owner','els_research_layer_law:v3'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false)
    );
  end if;

  v_corpus_id := public.fn_els_corpus_id(v_scope);

  if v_len < 2 then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','CONTEXT_REQUIRED','reason','ELS search requires at least 2 normalized Hebrew letters',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'engine',jsonb_build_object('id','els-sql-core','version',1,'owner','els_research_layer_law:v3'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false)
    );
  end if;

  if p_selection_protocol is not null and not (p_selection_protocol = any(v_allowed_protocols)) then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','CONTEXT_REQUIRED','reason','unknown selection protocol; refusing to invent research intent',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'selection_protocol',p_selection_protocol,
      'engine',jsonb_build_object('id','els-sql-core','version',1,'owner','els_research_layer_law:v3'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false)
    );
  end if;

  -- The canonical full-Tanakh witness exists as tools/els/data/tk-letters.txt and has a locked
  -- corpus identity, but it is not admitted into a server-callable stream today. Never substitute
  -- tanach_verses: its normalized Torah prefix is a different witness.
  if v_scope = 'tanakh' then
    return jsonb_build_object(
      'contract','els_search_result_v1','status','MISSING_ADAPTER',
      'reason','canonical Tanakh corpus identity exists, but no server-callable canonical Tanakh stream is live; legacy browser corpus is not server authority',
      'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
      'scope','tanakh','corpus_id',v_corpus_id,'hits','[]'::jsonb,
      'selection_protocol',p_selection_protocol,
      'engine',jsonb_build_object('id','els-sql-core','version',1,'owner','els_research_layer_law:v3'),
      'completion',jsonb_build_object('executed',false,'negative',false,'truncated',false,'state','MISSING_ADAPTER'),
      'provenance',jsonb_build_object('corpus_identity_function','fn_els_corpus_id','canonical_source','tools/els/data/tk-letters.txt')
    );
  end if;

  select max(idx) into v_hi from public.torah_stream;
  v_full_max := greatest(1, floor((v_hi - 1)::numeric / greatest(1,v_len - 1))::integer);

  -- Internal core permits a deeper bounded plan than the public wrapper, but is still hard-bounded
  -- to protect runtime. The public wrapper below applies a much smaller user-facing ceiling.
  v_maxskip := least(v_full_max, greatest(2, least(coalesce(p_maxskip,40), 20000)));
  v_maxhits := greatest(1, least(coalesce(p_maxhits,16), 1000));
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':skip2-'||v_maxskip::text;

  with qq as (
    select v_term t, v_len ln, v_hi hi, substr(v_term,1,1) c1, substr(v_term,2,1) c2
  ),
  fpair as (
    select a.idx st, (b.idx-a.idx) skip
    from public.torah_stream a
    join public.torah_stream b on b.ch=(select c2 from qq) and b.idx between a.idx+1 and a.idx+v_maxskip
    where a.ch=(select c1 from qq)
  ),
  bpair as (
    select a.idx st, (a.idx-b.idx) skip
    from public.torah_stream a
    join public.torah_stream b on b.ch=(select c2 from qq) and b.idx between a.idx-v_maxskip and a.idx-1
    where a.ch=(select c1 from qq)
  ),
  allh as materialized (
    select skip, 1 dir, st from fpair
    where st+((select ln from qq)-1)*skip<=(select hi from qq)
      and not exists(select 1 from generate_series(3,(select ln from qq)) j
        where coalesce((select ch from public.torah_stream t3 where t3.idx=st+(j-1)*skip),'')<>substr((select t from qq),j,1))
    union all
    select skip, -1 dir, st from bpair
    where st-((select ln from qq)-1)*skip>=1
      and not exists(select 1 from generate_series(3,(select ln from qq)) j
        where coalesce((select ch from public.torah_stream t3 where t3.idx=st-(j-1)*skip),'')<>substr((select t from qq),j,1))
  ),
  els_only as materialized (
    select * from allh where skip>=2
  ),
  ordered as materialized (
    select * from els_only order by skip, st, dir desc limit v_maxhits
  )
  select
    (select count(*) from allh where skip=1 and dir=1),
    (select count(*) from els_only),
    (select min(skip) from els_only),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||skip::text||':'||dir::text||':'||(st-1)::text,
          'skip',skip,
          'dir',dir,
          'direction',case when dir=1 then 'fwd' else 'back' end,
          'start',st-1,
          'end',(st-1)+dir*skip*(v_len-1),
          'positions',(select jsonb_agg((st-1)+dir*skip*k order by k) from generate_series(0,v_len-1) k),
          'coordinate_convention','zero_based_character_index',
          'dependency_group',v_dependency_group
        ) order by skip,st,dir desc
      ) from ordered
    ),'[]'::jsonb)
  into v_plain,v_total,v_min_skip,v_hits;

  v_truncated := v_total > v_maxhits;
  v_coverage := case when v_maxskip >= v_full_max then 'full_skip_domain' else 'bounded_partial' end;
  v_status := case when v_total=0 then 'EXECUTED_EMPTY' else 'OK' end;

  return jsonb_build_object(
    'contract','els_search_result_v1',
    'status',v_status,
    'scope','torah',
    'corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len,'language','he','script','Hebrew'),
    'selection_protocol',p_selection_protocol,
    'engine',jsonb_build_object(
      'id','els-sql-core','version',1,'function','els_search_core_v1',
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
      'budget',jsonb_build_object('kind','bounded_skip_domain','max_skip',v_maxskip,'max_returned_hits',v_maxhits)
    ),
    'plain_count',v_plain,
    'els_count',v_total,
    'min_skip',v_min_skip,
    'hits',v_hits,
    'dependency_group',v_dependency_group,
    'completion',jsonb_build_object(
      'executed',true,'state',v_status,'coverage',v_coverage,'negative',v_total=0,
      'truncated',v_truncated,'total_hits',v_total,'returned_hits',jsonb_array_length(v_hits)
    ),
    'negative_result',case when v_total=0 then jsonb_build_object(
      'state','EXECUTED_EMPTY','scope','torah','corpus_id',v_corpus_id,
      'searched_expression',v_term,'skip_min',2,'skip_max',v_maxskip,'directions',jsonb_build_array('fwd','back')
    ) else null end,
    'provenance',jsonb_build_object(
      'source_relation','public.torah_stream','corpus_letters',v_hi,
      'corpus_identity_function','fn_els_corpus_id','engine_function','els_search_core_v1',
      'engine_version',1,'rule_version','els_research_layer_law:v3'
    )
  );
end
$function$;

comment on function public.els_search_core_v1(text,text,integer,integer,text) is
'Canonical callable ELS execution core v1. Service/internal boundary; no UI identity. Torah is live. Tanakh fails honestly until a canonical server corpus adapter exists.';

-- Public bounded projection. Product tier/credits do not change truth; this only limits compute.
create or replace function public.els_search_v1(
  p_term text,
  p_scope text default 'torah',
  p_maxskip integer default 40,
  p_maxhits integer default 16,
  p_selection_protocol text default null
) returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select public.els_search_core_v1(
    p_term,
    p_scope,
    least(greatest(coalesce(p_maxskip,40),2),500),
    least(greatest(coalesce(p_maxhits,16),1),100),
    p_selection_protocol
  )
$function$;

comment on function public.els_search_v1(text,text,integer,integer,text) is
'Public bounded ELS callable projection over els_search_core_v1; 2029 consumers must preserve returned Result/Replay semantics.';

-- Legacy compatibility function keeps its exact old signature/output family but owns NO search logic.
-- All legacy SQL/NameLab callers now traverse the same core function.
create or replace function public.fn_els_search(
  p_term text,
  p_maxskip integer default 40,
  p_maxhits integer default 16
) returns jsonb
language sql
stable
set search_path to 'public'
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
    'engine','els-sql-core',
    'profile','server-scan',
    'coverage',case when x->'completion'->>'coverage'='full_skip_domain' then 'full' else 'partial' end,
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

-- Core is not a browser/free-form API. The bounded projection is.
revoke all on function public.els_search_core_v1(text,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.els_search_core_v1(text,text,integer,integer,text) to service_role;

revoke all on function public.els_search_v1(text,text,integer,integer,text) from public;
grant execute on function public.els_search_v1(text,text,integer,integer,text) to anon, authenticated, service_role;

-- Preserve historical compatibility of fn_els_search (PUBLIC had EXECUTE before this migration).
grant execute on function public.fn_els_search(text,integer,integer) to public;
