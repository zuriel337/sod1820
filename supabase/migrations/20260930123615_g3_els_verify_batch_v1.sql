-- G3 ELS adaptive batch verify (One-Engine): ONE set-wise canonical occurrence verifier under the
-- existing ELS owner (els_research_layer_law v9 / els_single_engine_law v2).
--   * els_verify_batch_core_v1  : internal set-wise letter check against the canonical stream relation
--   * els_verify_batch_v1       : service-role-only contract (corpus_id binding, dedupe, caps, provenance)
--   * els_verify_occurrence_v1  : public contract UNCHANGED; valid verification delegates to the core
-- Coordinates stay zero-based (start0 = idx-1). No new corpus registry/store: identity from fn_els_corpus_id.

create or replace function public.els_verify_batch_core_v1(
  p_scope text,
  p_term text,
  p_skip integer[],
  p_dir integer[],
  p_start integer[]
)
 returns table(ord integer, ok boolean)
 language plpgsql
 stable
 set search_path to 'public'
as $function$
declare
  v_rel text := public.els_stream_relation_v1(p_scope);
  v_sql text;
begin
  if v_rel is null then
    raise exception 'unsupported ELS scope %', p_scope;
  end if;
  v_sql := $q$
  with q as (
    select translate(regexp_replace(coalesce($1,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ') t
  ), qn as (
    select t, length(t) ln, (select max(idx) from public.@REL@) hi from q
  ), cand as (
    select u.ord::integer ord, u.skip, u.dir, u.st
    from unnest($2,$3,$4) with ordinality as u(skip,dir,st,ord)
  ), letters as (
    select c.ord, k.k, substr(qn.t,k.k+1,1) want,
           (select s.ch from public.@REL@ s where s.idx = c.st+1+c.dir*c.skip*k.k) got
    from cand c
    cross join qn
    cross join lateral generate_series(0,qn.ln-1) k(k)
    where qn.ln >= 2
      and c.skip >= 2 and c.dir in (-1,1) and c.st >= 0
      and c.st+1 between 1 and qn.hi
      and c.st+1+c.dir*c.skip*(qn.ln-1) between 1 and qn.hi
  )
  select c.ord,
         coalesce((select bool_and(l.got = l.want) from letters l where l.ord = c.ord), false)
  from cand c
  order by c.ord
  $q$;
  return query execute replace(v_sql, '@REL@', v_rel) using p_term, p_skip, p_dir, p_start;
end
$function$;

create or replace function public.els_verify_batch_v1(
  p_term text,
  p_scope text,
  p_corpus_id text,
  p_candidates jsonb,
  p_strategy jsonb default null
)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  c_max_candidates constant integer := 4000;
  c_max_letter_checks constant integer := 64000;
  v_raw text := coalesce(p_term,'');
  v_term text := translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ');
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_len integer := length(v_term);
  v_corpus_id text;
  v_n integer;
  v_skips integer[];
  v_dirs integer[];
  v_starts integer[];
  v_ords integer[];
  v_dep text;
  v_hits jsonb;
  v_rejected integer;
  v_invalid integer;
  v_unique integer;
  v_engine jsonb := jsonb_build_object('id','els-sql-core','version',2,'function','els_verify_batch_v1','owner','els_research_layer_law:v9');
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object('contract','els_verify_batch_v1','status','CORPUS_UNKNOWN','verification_state','NOT_TESTED');
  end if;
  v_corpus_id := public.fn_els_corpus_id(v_scope);
  -- corpus binding is checked BEFORE any coordinate verification (fail closed)
  if p_corpus_id is distinct from v_corpus_id then
    return jsonb_build_object('contract','els_verify_batch_v1','status','CORPUS_MISMATCH','verification_state','NOT_TESTED',
      'scope',v_scope,'corpus_id',v_corpus_id,'requested_corpus_id',p_corpus_id,'engine',v_engine);
  end if;
  if v_len < 2 or p_candidates is null or jsonb_typeof(p_candidates) <> 'array' then
    return jsonb_build_object('contract','els_verify_batch_v1','status','CONTEXT_REQUIRED','verification_state','NOT_TESTED','scope',v_scope,'corpus_id',v_corpus_id,'engine',v_engine);
  end if;
  v_n := jsonb_array_length(p_candidates);
  if v_n > c_max_candidates then
    return jsonb_build_object('contract','els_verify_batch_v1','status','BUDGET_EXCEEDED','reason','max_candidates','limit',c_max_candidates,'verification_state','NOT_TESTED','scope',v_scope,'corpus_id',v_corpus_id,'engine',v_engine);
  end if;

  -- dedupe exact (skip,dir,start) preserving first order; non-integer/absent members are counted invalid
  with raw as (
    select e.ord,
           case when jsonb_typeof(e.v->'skip')='number' and (e.v->>'skip') ~ '^-?[0-9]{1,9}$' then (e.v->>'skip')::integer end skip,
           case when jsonb_typeof(e.v->'dir')='number' and (e.v->>'dir') ~ '^-?[0-9]{1,2}$' then (e.v->>'dir')::integer end dir,
           case when jsonb_typeof(e.v->'start')='number' and (e.v->>'start') ~ '^-?[0-9]{1,9}$' then (e.v->>'start')::integer end st
    from jsonb_array_elements(p_candidates) with ordinality e(v,ord)
  ), valid as (
    select * from raw where skip >= 2 and dir in (-1,1) and st >= 0
  ), firsts as (
    select distinct on (skip,dir,st) ord, skip, dir, st from valid order by skip,dir,st,ord
  )
  select (select count(*) from raw where not (skip >= 2 and dir in (-1,1) and st >= 0) or skip is null or dir is null or st is null),
         count(*),
         array_agg(skip order by ord), array_agg(dir order by ord), array_agg(st order by ord), array_agg(ord order by ord)
    into v_invalid, v_unique, v_skips, v_dirs, v_starts, v_ords
  from firsts;

  v_unique := coalesce(v_unique,0);
  if v_unique * v_len > c_max_letter_checks then
    return jsonb_build_object('contract','els_verify_batch_v1','status','BUDGET_EXCEEDED','reason','max_letter_checks','limit',c_max_letter_checks,'verification_state','NOT_TESTED','scope',v_scope,'corpus_id',v_corpus_id,'engine',v_engine);
  end if;

  v_dep := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':batch';

  with res as (
    select f.ord, f.skip, f.dir, f.st, r.ok
    from unnest(v_ords, v_skips, v_dirs, v_starts) with ordinality f(ord,skip,dir,st,o)
    join public.els_verify_batch_core_v1(v_scope, v_term, v_skips, v_dirs, v_starts) r on r.ord = f.o::integer
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||skip::text||':'||dir::text||':'||st::text,
           'skip',skip,'dir',dir,'direction',case when dir=1 then 'fwd' else 'back' end,
           'start',st,'end',st+dir*skip*(v_len-1),
           'positions',(select jsonb_agg(st+dir*skip*k order by k) from generate_series(0,v_len-1) k),
           'coordinate_convention','zero_based_character_index','dependency_group',v_dep||':skip'||skip::text,
           'verification_state','MATCH','input_ordinal',ord-1
         ) order by ord) filter (where ok),'[]'::jsonb),
         count(*) filter (where not ok)
    into v_hits, v_rejected
  from res;

  return jsonb_build_object(
    'contract','els_verify_batch_v1','status','OK',
    'scope',v_scope,'corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'verified',v_hits,
    'counts',jsonb_build_object('received',v_n,'unique',v_unique,'duplicates',v_n-v_invalid-v_unique,'invalid',v_invalid,'verified',jsonb_array_length(v_hits),'mismatch',v_rejected,'letter_checks',v_unique*v_len),
    'limits',jsonb_build_object('max_candidates',c_max_candidates,'max_letter_checks',c_max_letter_checks),
    'strategy',p_strategy,
    'completion',jsonb_build_object('executed',true,'exhaustive',false,'negative_authority',false,
      'note','batch verifies supplied candidates only; an empty verified set is never NOT_FOUND / EXECUTED_EMPTY'),
    'engine',v_engine,
    'provenance',jsonb_build_object('source_relation','public.'||public.els_stream_relation_v1(v_scope),'verifier','els_verify_batch_core_v1','rule_version','els_research_layer_law:v9')
  );
end
$function$;

-- public single-occurrence contract preserved; valid verification delegates to the batch core
CREATE OR REPLACE FUNCTION public.els_verify_occurrence_v1(p_term text, p_scope text, p_skip integer, p_dir integer, p_start integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

  select coalesce(bool_or(r.ok),false) into v_match
  from public.els_verify_batch_core_v1(v_scope, v_term, array[p_skip], array[p_dir], array[p_start]) r;

  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':skip'||p_skip::text;

  return jsonb_build_object(
    'contract','els_occurrence_replay_v1',
    'status',case when v_match then 'OK' else 'REPLAY_MISMATCH' end,
    'verification_state',case when v_match then 'MATCH' else 'MISMATCH' end,
    'scope',v_scope,'corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'occurrence',jsonb_build_object(
      'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||p_skip::text||':'||p_dir::text||':'||p_start::text,
      'skip',p_skip,'dir',p_dir,'direction',case when p_dir=1 then 'fwd' else 'back' end,
      'start',p_start,'end',p_start+p_dir*p_skip*(v_len-1),
      'positions',(select jsonb_agg(p_start+p_dir*p_skip*k order by k) from generate_series(0,v_len-1) k),
      'coordinate_convention','zero_based_character_index','dependency_group',v_dependency_group
    ),
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_verify_occurrence_v1','owner','els_research_layer_law:v9'),
    'provenance',jsonb_build_object('source_relation','public.'||public.els_stream_relation_v1(v_scope),'occurrence_generator',case when v_scope='torah' then 'els_torah_occurrences_internal_v1' else 'els_occurrences_internal_v1' end,'verifier','els_verify_batch_core_v1','rule_version','els_research_layer_law:v9')
  );
end
$function$;

revoke all on function public.els_verify_batch_core_v1(text,text,integer[],integer[],integer[]) from public, anon, authenticated;
grant execute on function public.els_verify_batch_core_v1(text,text,integer[],integer[],integer[]) to service_role;
revoke all on function public.els_verify_batch_v1(text,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.els_verify_batch_v1(text,text,text,jsonb,jsonb) to service_role;
-- els_verify_occurrence_v1 grants unchanged from prior migrations (create or replace preserves ACL)
