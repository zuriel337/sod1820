-- SOD1820 — G3-C2 ELS compatibility truth/performance hardening v1
-- Owner: els_research_layer_law v3 + els_single_engine_law v2
-- EXTEND_EXISTING only. This refines the C2 contracts; no new engine/corpus/store/table.
--
-- Fixes found during exact-head self/challenge review:
--   A) invalid/null geometry must be CONTEXT_REQUIRED, never EXECUTED_EMPTY;
--   B) replay mismatch must not expose the requested coordinates as a verified occurrence;
--   C) sparse explicit geometry skips must not scan every unrequested skip in min..max;
--   D) legacy fn_els_search ties get the same explicit forward-before-back ordering as the core.

-- ---------------------------------------------------------------------------
-- EXACT REPLAY: separate requested coordinates from a verified occurrence.
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
  v_requested jsonb;
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
  v_requested := jsonb_build_object(
    'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||p_skip::text||':'||p_dir::text||':'||p_start::text,
    'skip',p_skip,'dir',p_dir,'direction',case when p_dir=1 then 'fwd' else 'back' end,
    'start',p_start,'end',p_start+p_dir*p_skip*(v_len-1),
    'positions',(select jsonb_agg(p_start+p_dir*p_skip*k order by k) from generate_series(0,v_len-1) k),
    'coordinate_convention','zero_based_character_index','dependency_group',v_dependency_group
  );

  return jsonb_build_object(
    'contract','els_occurrence_replay_v1',
    'status',case when v_match then 'OK' else 'REPLAY_MISMATCH' end,
    'verification_state',case when v_match then 'MATCH' else 'MISMATCH' end,
    'scope','torah','corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    -- Requested coordinates are provenance/input. They become an occurrence only after MATCH.
    'requested_occurrence',v_requested,
    'occurrence',case when v_match then v_requested else null end,
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_verify_occurrence_v1','owner','els_research_layer_law:v3'),
    'provenance',jsonb_build_object('source_relation','public.torah_stream','occurrence_generator','els_torah_occurrences_internal_v1','rule_version','els_research_layer_law:v3')
  );
end
$function$;

revoke all on function public.els_verify_occurrence_v1(text,text,integer,integer,integer) from public;
grant execute on function public.els_verify_occurrence_v1(text,text,integer,integer,integer)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- MATRIX GEOMETRY: validate truth context and execute only requested skips.
-- ---------------------------------------------------------------------------
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
  v_cap integer := greatest(1,least(coalesce(p_maxhits,500),4000));
  v_rows jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_dependency_group text;
  v_hi integer;
  v_start_min integer;
  v_start_max integer;
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CORPUS_UNKNOWN','hits','[]'::jsonb);
  end if;
  if v_scope='tanakh' then
    return jsonb_build_object('contract','els_geometry_search_v1','status','MISSING_ADAPTER','scope','tanakh','corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;

  select max(idx) into v_hi from public.torah_stream;
  if v_len < 2
     or coalesce(p_axis_width,0) < 1 or p_axis_width > v_hi
     or coalesce(p_r0,-1) < 0 or p_r1 is null or p_r1 < p_r0
     or coalesce(p_c0,-1) < 0 or coalesce(p_cw,0) < 1 or p_c0+p_cw > p_axis_width
     or (p_r0::bigint * p_axis_width::bigint) > (v_hi-1)::bigint then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CONTEXT_REQUIRED','scope','torah','corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;

  select coalesce(array_agg(distinct abs(s) order by abs(s)) filter (where s is not null and abs(s)>=1),'{}'::integer[])
    into v_skips
  from unnest(coalesce(p_skips,'{}'::integer[])) s;
  if cardinality(v_skips)=0 then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CONTEXT_REQUIRED','reason','explicit skip set required','scope','torah','corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;

  v_start_min := (p_r0::bigint * p_axis_width::bigint)::integer;
  v_start_max := least(
    v_hi-1,
    (((p_r1::bigint+1) * p_axis_width::bigint)-1)::bigint
  )::integer;
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':geometry:'||p_axis_width::text||':'||p_r0::text||'-'||p_r1::text||':'||p_c0::text||'+'||p_cw::text;

  -- Execute ONLY the explicit skip set. Each LATERAL call delegates to the same occurrence
  -- generator with skip_min=skip_max, so sparse [2,20000] never scans unrequested 3..19999.
  with candidates as materialized (
    select o.*
    from unnest(v_skips) requested(skip_value)
    cross join lateral public.els_torah_occurrences_internal_v1(
      v_term,requested.skip_value,requested.skip_value,v_start_min,v_start_max
    ) o
    where floor(o.start0::numeric/p_axis_width)::int between p_r0 and p_r1
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
    'search',jsonb_build_object(
      'skips',to_jsonb(v_skips),'max_hits',v_cap,'ordering','skip,start,forward-before-back-on-exact-tie',
      'execution_policy','explicit_skips_only_v1'
    ),
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
  if coalesce(p_axis_width,0) < 1 or coalesce(p_r0,-1) < 0 or p_r1 is null or p_r1 < p_r0
     or p_r1-p_r0+1 > 256 or coalesce(p_c0,-1) < 0 or coalesce(p_cw,0) < 1 or p_cw > 80
     or p_c0+p_cw > p_axis_width
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

-- ---------------------------------------------------------------------------
-- LEGACY SQL PROJECTION: make exact-direction ties deterministic while preserving old fields.
-- ---------------------------------------------------------------------------
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

grant execute on function public.fn_els_search(text,integer,integer) to public;
