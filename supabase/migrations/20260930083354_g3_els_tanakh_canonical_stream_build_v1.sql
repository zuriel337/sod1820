-- SOD1820 — G3 ELS Tanakh canonical stream build (G3_ELS_TANAKH_CANONICAL_STREAM_BUILD_V1).
-- RELEASE STATE (2026-09-30): merged in PR #858; this filename matches the migration version already recorded in canonical Supabase.
-- Do not re-apply from repository history without an explicit Human Gate; this documentation reconciliation performs no live DB apply.
-- EXTEND_EXISTING under els_research_layer_law v9 + els_single_engine_law v2.
--
-- 1. public.tanakh_stream: ONE derived relation, torah_stream shape (idx 1-based, ch, book_idx),
--    PK(idx) + btree(ch,idx). Materialized only from existing canonical sources:
--    torah_stream idx 1..304805, then tanach_verses books >= 5 normalized with the exact ELS
--    normalization (strip non-Hebrew-letter, fold finals). No second witness is imported.
-- 2. Hard admission checks run BEFORE any canonical function is replaced; any mismatch aborts
--    the whole migration (fail closed) so MISSING_ADAPTER can never be removed for a non-admitted stream.
-- 3. The existing canonical core/page/replay/geometry functions are generalized to select the stream by
--    scope through ONE occurrence generator (els_occurrences_internal_v1). Search semantics are not
--    duplicated; els_torah_occurrences_internal_v1 stays as a thin torah-scope delegate.
-- fn_els_corpus_id() is NOT modified. Public coordinates stay zero-based (start0 = idx-1).

-- ── 1. derived relation ────────────────────────────────────────────────────────
create table public.tanakh_stream (
  idx integer primary key,
  ch text not null,
  book_idx smallint
);
create index tanakh_stream_ch on public.tanakh_stream (ch, idx);

insert into public.tanakh_stream (idx, ch, book_idx)
select t.idx, t.ch, t.book_idx
from public.torah_stream t
order by t.idx;

insert into public.tanakh_stream (idx, ch, book_idx)
select (select max(idx) from public.torah_stream) + row_number() over (order by v.book_idx, v.chapter, v.verse, c.ord),
       c.ch,
       v.book_idx
from public.tanach_verses v
cross join lateral unnest(
  string_to_array(translate(regexp_replace(v.text, '[^א-ת]', '', 'g'), 'ךםןףץ', 'כמנפצ'), null)
) with ordinality as c(ch, ord)
where v.book_idx >= 5;

alter table public.tanakh_stream enable row level security;
revoke all on table public.tanakh_stream from public, anon, authenticated;
grant select on table public.tanakh_stream to service_role;

comment on table public.tanakh_stream is
  'ELS canonical Tanakh letter stream (derived): torah_stream prefix + normalized tanach_verses books>=5. Service/internal only. Owner: els_research_layer_law v9.';

-- ── 2. hard admission checks (before canonical functions are replaced) ────────
do $admission$
declare
  v_rows bigint;
  v_min integer;
  v_max integer;
  v_all text;
  v_prefix text;
  v_suffix text;
  v_bad bigint;
begin
  select count(*), min(idx), max(idx) into v_rows, v_min, v_max from public.tanakh_stream;
  if v_rows <> 1204583 or v_min <> 1 or v_max <> 1204583 then
    raise exception 'TANAKH_STREAM_ADMISSION_FAILED: rows=% min=% max=% expected 1204583 contiguous', v_rows, v_min, v_max;
  end if;

  select count(*) into v_bad from public.tanakh_stream where ch !~ '^[א-ת]$' or ch in ('ך','ם','ן','ף','ץ');
  if v_bad <> 0 then
    raise exception 'TANAKH_STREAM_ADMISSION_FAILED: % non-normalized letters', v_bad;
  end if;

  select md5(string_agg(ch, '' order by idx)) into v_all from public.tanakh_stream;
  if v_all <> 'baf161858c0b4dc57b5b96990bea18db' then
    raise exception 'TANAKH_STREAM_ADMISSION_FAILED: combined md5=% expected baf161858c0b4dc57b5b96990bea18db', v_all;
  end if;

  select md5(string_agg(ch, '' order by idx)) into v_prefix from public.tanakh_stream where idx <= 304805;
  if v_prefix <> '0066c2431821863d258745e664d3883e' then
    raise exception 'TANAKH_STREAM_ADMISSION_FAILED: torah prefix md5=% expected 0066c2431821863d258745e664d3883e', v_prefix;
  end if;

  select md5(string_agg(ch, '' order by idx)) into v_suffix from public.tanakh_stream where idx > 304805;
  if v_suffix <> 'f62203f8a916b11ad68bfb195f5ed238' then
    raise exception 'TANAKH_STREAM_ADMISSION_FAILED: NW suffix md5=% expected f62203f8a916b11ad68bfb195f5ed238', v_suffix;
  end if;

  if public.fn_els_corpus_id('tanakh') <> '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
     or public.fn_els_corpus_id('torah') <> '0b022e8eef6f9c16' then
    raise exception 'TANAKH_STREAM_ADMISSION_FAILED: fn_els_corpus_id identity changed';
  end if;
end
$admission$;

-- ── 3. stream selection helpers (scope whitelist; no caller-supplied identifiers) ──
create or replace function public.els_stream_relation_v1(p_scope text)
 returns text
 language sql
 immutable
 set search_path to 'public'
as $$
  select case p_scope when 'torah' then 'torah_stream' when 'tanakh' then 'tanakh_stream' else null end
$$;

create or replace function public.els_stream_letters_v1(p_scope text)
 returns integer
 language plpgsql
 stable
 set search_path to 'public'
as $$
declare
  v_hi integer;
begin
  if p_scope = 'torah' then
    select max(idx) into v_hi from public.torah_stream;
  elsif p_scope = 'tanakh' then
    select max(idx) into v_hi from public.tanakh_stream;
  else
    raise exception 'unsupported ELS scope %', p_scope;
  end if;
  return v_hi;
end
$$;

-- ── 4. the single occurrence generator (torah body moved verbatim; relation selected by scope) ──
create or replace function public.els_occurrences_internal_v1(
  p_scope text,
  p_term text,
  p_skip_min integer default 1,
  p_skip_max integer default null,
  p_start_min integer default 0,
  p_start_max integer default null
)
 returns table(skip integer, dir integer, start0 integer)
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
  with q0 as (
    select translate(regexp_replace(coalesce($1,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ') t
  ),
  q as (
    select
      t,
      length(t) ln,
      (select max(idx) from public.@REL@) hi,
      substr(t,1,1) c1,
      substr(t,2,1) c2,
      greatest(1,coalesce($2,1)) smin,
      least(
        greatest(1,floor((((select max(idx) from public.@REL@)-1)::numeric) / greatest(1,length(t)-1))::integer),
        greatest(1,coalesce(
          $3,
          greatest(1,floor((((select max(idx) from public.@REL@)-1)::numeric) / greatest(1,length(t)-1))::integer)
        ))
      ) smax,
      greatest(0,coalesce($4,0)) start_min,
      least(
        (select max(idx)-1 from public.@REL@),
        greatest(0,coalesce($5,(select max(idx)-1 from public.@REL@)))
      ) start_max
    from q0
    where length(t) >= 2
  ),
  fpair as (
    select a.idx st, (b.idx-a.idx) skip
    from public.@REL@ a
    join public.@REL@ b
      on b.ch=(select c2 from q)
     and b.idx between a.idx+(select smin from q) and a.idx+(select smax from q)
    where a.ch=(select c1 from q)
      and (select smax from q) >= (select smin from q)
  ),
  bpair as (
    select a.idx st, (a.idx-b.idx) skip
    from public.@REL@ a
    join public.@REL@ b
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
        where coalesce((select ch from public.@REL@ t3 where t3.idx=st+(j-1)*skip),'')
              <> substr((select t from q),j,1)
      )
    union all
    select skip, -1 dir, st from bpair
    where st-((select ln from q)-1)*skip >= 1
      and not exists (
        select 1 from generate_series(3,(select ln from q)) j
        where coalesce((select ch from public.@REL@ t3 where t3.idx=st-(j-1)*skip),'')
              <> substr((select t from q),j,1)
      )
  )
  select h.skip, h.dir, h.st-1 start0
  from allh h
  cross join q
  where h.st-1 between q.start_min and q.start_max
  order by h.skip, h.st, h.dir desc
  $q$;
  return query execute replace(v_sql, '@REL@', v_rel)
    using p_term, p_skip_min, p_skip_max, p_start_min, p_start_max;
end
$function$;

-- Torah-scope delegate: same name/signature/output as before, no separate search semantics.
create or replace function public.els_torah_occurrences_internal_v1(
  p_term text,
  p_skip_min integer default 1,
  p_skip_max integer default null,
  p_start_min integer default 0,
  p_start_max integer default null
)
 returns table(skip integer, dir integer, start0 integer)
 language sql
 stable
 set search_path to 'public'
as $function$
  select * from public.els_occurrences_internal_v1('torah', p_term, p_skip_min, p_skip_max, p_start_min, p_start_max)
$function$;

-- ── 5. canonical core / page / replay / geometry: scope-selected stream ───────────
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


  v_hi := public.els_stream_letters_v1(v_scope);
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
      from public.els_occurrences_internal_v1(v_scope,v_term,1,1,0,v_hi-1)
      where skip=1 and dir=1;
    else
      v_plain := 0;
    end if;

    return jsonb_build_object(
      'contract','els_search_result_v1',
      'status','EXECUTED_EMPTY',
      'scope',v_scope,
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
        'state','EXECUTED_EMPTY','scope',v_scope,'corpus_id',v_corpus_id,
        'searched_expression',v_term,'skip_min',2,'skip_max',v_maxskip,
        'directions',jsonb_build_array('fwd','back')
      ),
      'provenance',jsonb_build_object(
        'source_relation','public.'||public.els_stream_relation_v1(v_scope),'corpus_letters',v_hi,
        'corpus_identity_function','fn_els_corpus_id','occurrence_generator',case when v_scope='torah' then 'els_torah_occurrences_internal_v1' else 'els_occurrences_internal_v1' end,
        'engine_function','els_search_core_v1','engine_version',2,'rule_version','els_research_layer_law:v9'
      )
    );
  end if;

  with allh as materialized (
    select * from public.els_occurrences_internal_v1(v_scope,v_term,1,v_maxskip,0,v_hi-1)
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
    'scope',v_scope,
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
      'state','EXECUTED_EMPTY','scope',v_scope,'corpus_id',v_corpus_id,
      'searched_expression',v_term,'skip_min',2,'skip_max',v_maxskip,'directions',jsonb_build_array('fwd','back')
    ) else null end,
    'provenance',jsonb_build_object(
      'source_relation','public.'||public.els_stream_relation_v1(v_scope),'corpus_letters',v_hi,
      'corpus_identity_function','fn_els_corpus_id','occurrence_generator',case when v_scope='torah' then 'els_torah_occurrences_internal_v1' else 'els_occurrences_internal_v1' end,
      'engine_function','els_search_core_v1','engine_version',2,'rule_version','els_research_layer_law:v9'
    )
  );
end
$function$;

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

CREATE OR REPLACE FUNCTION public.els_search_geometry_core_v1(p_term text, p_scope text, p_axis_width integer, p_r0 integer, p_r1 integer, p_c0 integer, p_cw integer, p_skips integer[], p_maxhits integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
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
  v_hi integer;
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CORPUS_UNKNOWN','hits','[]'::jsonb);
  end if;
  if v_len < 2 or coalesce(p_axis_width,0) < 1 or coalesce(p_r0,-1) < 0 or p_r1 < p_r0
     or coalesce(p_c0,-1) < 0 or coalesce(p_cw,0) < 1 or p_c0+p_cw > p_axis_width then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CONTEXT_REQUIRED','scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;

  v_hi := public.els_stream_letters_v1(v_scope);
  select coalesce(array_agg(distinct abs(s) order by abs(s)) filter (where abs(s)>=1),'{}'::integer[])
    into v_skips
  from unnest(coalesce(p_skips,'{}'::integer[])) s;
  if cardinality(v_skips)=0 then
    return jsonb_build_object('contract','els_geometry_search_v1','status','CONTEXT_REQUIRED','reason','explicit skip set required','scope',v_scope,'corpus_id',v_corpus_id,'hits','[]'::jsonb);
  end if;
  select min(x),max(x) into v_min,v_max from unnest(v_skips) x;
  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':geometry:'||p_axis_width::text||':'||p_r0::text||'-'||p_r1::text||':'||p_c0::text||'+'||p_cw::text;

  with candidates as materialized (
    select o.*
    from public.els_occurrences_internal_v1(v_scope,
      v_term,v_min,v_max,
      greatest(0,p_r0*p_axis_width),
      least((v_hi-1),(p_r1+1)*p_axis_width-1)
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
    'scope',v_scope,'corpus_id',v_corpus_id,
    'input',jsonb_build_object('normalized',v_term,'length',v_len),
    'geometry',jsonb_build_object('axis_width',p_axis_width,'r0',p_r0,'r1',p_r1,'c0',p_c0,'cw',p_cw),
    'search',jsonb_build_object('skips',to_jsonb(v_skips),'max_hits',v_cap,'ordering','skip,start,forward-before-back-on-exact-tie'),
    'hits',v_rows,'dependency_group',v_dependency_group,
    'completion',jsonb_build_object('executed',true,'negative',v_total=0,'total_hits',v_total,'returned_hits',jsonb_array_length(v_rows),'truncated',v_total>v_cap),
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_search_geometry_core_v1','owner','els_research_layer_law:v9'),
    'provenance',jsonb_build_object('source_relation','public.'||public.els_stream_relation_v1(v_scope),'occurrence_generator',case when v_scope='torah' then 'els_torah_occurrences_internal_v1' else 'els_occurrences_internal_v1' end,'rule_version','els_research_layer_law:v9')
  );
end
$function$;

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

  select exists(
    select 1 from public.els_occurrences_internal_v1(v_scope,v_term,p_skip,p_skip,p_start,p_start) o
    where o.skip=p_skip and o.dir=p_dir and o.start0=p_start
  ) into v_match;

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
    'provenance',jsonb_build_object('source_relation','public.'||public.els_stream_relation_v1(v_scope),'occurrence_generator',case when v_scope='torah' then 'els_torah_occurrences_internal_v1' else 'els_occurrences_internal_v1' end,'rule_version','els_research_layer_law:v9')
  );
end
$function$;

-- ── 6. grants: service/internal only ────────────────────────────────────────────
revoke all on function public.els_stream_relation_v1(text) from public, anon, authenticated;
grant execute on function public.els_stream_relation_v1(text) to service_role;
revoke all on function public.els_stream_letters_v1(text) from public, anon, authenticated;
grant execute on function public.els_stream_letters_v1(text) to service_role;
revoke all on function public.els_occurrences_internal_v1(text,text,integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.els_occurrences_internal_v1(text,text,integer,integer,integer,integer) to service_role;
