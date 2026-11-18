-- SOD1820 — ELS ordered page: bounded work per call (ELS_SEARCH_PAGE_WORK_BUDGET_V1, 18.11.2026).
-- BRANCH-ONLY until ZURIEL approves the exact apply. EXTEND_EXISTING under els_research_layer_law v9 +
-- els_single_engine_law v2: the same ONE callable core, the same signature, the same contract
-- (els_search_page_v1), the same occurrences in the same order. One function body is replaced. No table,
-- index, grant, owner, comment, wrapper, Edge Function or caller changes.
-- Rollback: supabase/proposed/ROLLBACK_20261118090000_els_search_page_work_budget_v1.sql (exact previous body).
-- Gate: tests/sql/run-els-search-page-work-budget.sh (every occurrence, in order, against the unchanged
-- generator els_occurrences_internal_v1 on the canonical streams).
--
-- Why: the page core enumerated every (first letter, second letter) pair of the WHOLE requested skip range
-- on every call, then kept one page. Cost grew with freq(letter 1) x freq(letter 2) x skip range, so common
-- letters in the Tanakh stream crossed the 8 s statement timeout of the API role and els-search-bridge
-- answered 503 backend_error (live, 11-17.11.2026: 21 of 214 els:page calls failed, each after 9-11 s;
-- measured on the live database: יונה / tanakh / skips 2-50 = 7.7 s). A blank upper bound (the whole
-- physical range) could never finish.
--
-- What changes inside the function only:
--   1. The range is scanned in ascending skip slices and the scan STOPS as soon as the page is full.
--      A continuation call starts at the cursor's skip instead of recomputing from skip_min.
--   2. The anchor is the rarest adjacent letter pair of the term (not always letters 1+2), driven from its
--      rarer letter, and the next rarest letter is checked with one index probe before the rest are read.
--   3. The first slice is sized from the expected hits per skip (exact letter counts), so a frequent term
--      reads only the skips its page needs and a rare term reads as much of the range as the budget allows.
--   4. A deterministic work budget (index descents + letter pairs, from exact letter counts) ends the call
--      with a truthful partial page: has_more = true and a keyset continuation that resumes at the next
--      skip. A wall-clock guard covers a loaded database. A partial page never claims EXECUTED_EMPTY.
-- The continuation cursor keeps its existing shape (skip, start, dir), so deployed callers already resume it.
-- Budget calibration on the live database (read-only, 18.11.2026): one full-budget slice (1.5M work units,
-- ויהיאור / tanakh / skips 2-84) = 1.85 s inside a function call.

begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';

do $guard$
begin
  if md5(pg_get_functiondef('public.els_search_page_core_v1(text,text,integer,integer,integer,integer,integer,integer,text)'::regprocedure))
     <> '385d18edf84b4b7bc7f9c445aec981b4' then
    raise exception 'els_search_page_core_v1 is not the reviewed live definition; review before applying';
  end if;
  if to_regprocedure('public.els_occurrences_internal_v1(text,text,integer,integer,integer,integer)') is null
     or to_regprocedure('public.els_stream_relation_v1(text)') is null
     or to_regprocedure('public.els_stream_letters_v1(text)') is null then
    raise exception 'the canonical ELS stream helpers are missing; review before applying';
  end if;
end $guard$;

create or replace function public.els_search_page_core_v1(
  p_term text,
  p_scope text default 'torah'::text,
  p_skip_min integer default 2,
  p_skip_max integer default null::integer,
  p_page_size integer default 100,
  p_after_skip integer default null::integer,
  p_after_start integer default null::integer,
  p_after_dir integer default null::integer,
  p_selection_protocol text default null::text)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'public', 'extensions'
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
  -- Bounded scan. Work units: one letter pair examined = 1; one index descent from the driving letter = 2.
  c_work_budget constant numeric := 1500000;     -- work units per call before a truthful partial page
  c_descent_weight constant numeric := 2;
  c_page_safety constant numeric := 1.5;         -- first slice aims at this multiple of the rows the page needs
  c_time_guard constant interval := interval '3500 milliseconds';
  v_started constant timestamptz := clock_timestamp();
  v_rel text;
  v_sql text;
  v_counts bigint[];            -- stream count of each letter of the term, by position
  v_anchor integer := 0;        -- zero-based position of the anchor's first letter
  v_filter integer := -1;       -- zero-based position of the pre-check letter; -1 for a two-letter term
  v_drive_second boolean := false;  -- drive the join from the anchor's second letter when it is the rarer one
  v_best numeric;
  v_weight numeric;
  v_pairs_per_skip numeric := 0;    -- anchor pairs examined per skip, both directions
  v_hits_per_skip numeric := 0;     -- expected occurrences per skip, both directions
  v_slice_cost numeric := 0;        -- fixed work of one slice: descents from the driving letter, both directions
  v_span bigint;
  v_room bigint;
  v_cur bigint;
  v_end bigint;
  v_work numeric := 0;
  v_scanned_through integer;
  v_stop text := 'range_complete';
  v_skips integer[] := '{}';
  v_dirs integer[] := '{}';
  v_starts integer[] := '{}';
  v_cs integer[];
  v_cd integer[];
  v_ct integer[];
  i integer;
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
  v_rel := public.els_stream_relation_v1(v_scope);

  -- Exact letter counts of this term in the stream choose the anchor and size the slices (deterministic).
  execute replace($q$
    select array_agg((select count(*) from public.@REL@ s where s.ch = substr($1, k.pos, 1)) order by k.pos)
    from generate_series(1, $2) as k(pos)
  $q$, '@REL@', v_rel)
  into v_counts using v_term, v_len;

  -- Anchor = the adjacent pair with the fewest candidate pairs (first such pair on a tie).
  for i in 1 .. v_len - 1 loop
    v_weight := v_counts[i]::numeric * v_counts[i + 1]::numeric;
    if v_best is null or v_weight < v_best then
      v_best := v_weight;
      v_anchor := i - 1;
    end if;
  end loop;
  v_drive_second := v_counts[v_anchor + 2] < v_counts[v_anchor + 1];
  v_pairs_per_skip := 2 * v_best / v_hi;
  v_slice_cost := c_descent_weight * 2 * least(v_counts[v_anchor + 1], v_counts[v_anchor + 2]);
  -- Pre-check = the rarest remaining letter (first such letter on a tie).
  v_best := null;
  for i in 1 .. v_len loop
    if i - 1 not in (v_anchor, v_anchor + 1) and (v_best is null or v_counts[i] < v_best) then
      v_best := v_counts[i];
      v_filter := i - 1;
    end if;
  end loop;
  v_hits_per_skip := 2 * v_hi::numeric;
  for i in 1 .. v_len loop
    v_hits_per_skip := v_hits_per_skip * v_counts[i] / v_hi;
  end loop;

  -- One slice = every occurrence whose skip lies in [$3, $4], both directions, in canonical order.
  -- st is the one-based start; the anchor letters sit at st + dir*$7*skip and one skip further.
  v_sql := replace(replace($q$
    select array_agg(x.skip order by x.skip, x.st, x.dir desc),
           array_agg(x.dir order by x.skip, x.st, x.dir desc),
           array_agg(x.st - 1 order by x.skip, x.st, x.dir desc)
    from (
      select p.skip, p.dir, p.st
      from (
        @PAIRS@
      ) p
      where p.st between 1 and $6
        and p.st + p.dir * ($5 - 1) * p.skip between 1 and $6
        and ($8 < 0 or exists (
          select 1 from public.@REL@ c where c.idx = p.st + p.dir * $8 * p.skip and c.ch = $9))
        and ($5 <= 3 or not exists (
          select 1 from generate_series(0, $5 - 1) as j
          where j <> $7 and j <> $7 + 1 and j <> $8
            and coalesce((select t.ch from public.@REL@ t where t.idx = p.st + p.dir * j * p.skip), '') <> substr($10, j + 1, 1)))
        and ($11::integer is null
          or p.skip > $11
          or (p.skip = $11 and p.st - 1 > $12)
          or (p.skip = $11 and p.st - 1 = $12 and p.dir < $13))
      order by p.skip, p.st, p.dir desc
      limit $14
    ) x
  $q$, '@PAIRS@', case when v_drive_second then $q$
        select (b.idx - a.idx) as skip, 1 as dir, a.idx - $7 * (b.idx - a.idx) as st
        from public.@REL@ b
        join public.@REL@ a on a.ch = $1 and a.idx between b.idx - $4 and b.idx - $3
        where b.ch = $2
        union all
        select (a.idx - b.idx) as skip, -1 as dir, a.idx + $7 * (a.idx - b.idx) as st
        from public.@REL@ b
        join public.@REL@ a on a.ch = $1 and a.idx between b.idx + $3 and b.idx + $4
        where b.ch = $2
  $q$ else $q$
        select (b.idx - a.idx) as skip, 1 as dir, a.idx - $7 * (b.idx - a.idx) as st
        from public.@REL@ a
        join public.@REL@ b on b.ch = $2 and b.idx between a.idx + $3 and a.idx + $4
        where a.ch = $1
        union all
        select (a.idx - b.idx) as skip, -1 as dir, a.idx + $7 * (a.idx - b.idx) as st
        from public.@REL@ a
        join public.@REL@ b on b.ch = $2 and b.idx between a.idx - $4 and a.idx - $3
        where a.ch = $1
  $q$ end), '@REL@', v_rel);

  -- A continuation resumes at the cursor's skip; everything below it was already delivered.
  v_cur := case when p_after_skip is null then v_smin else greatest(v_smin::bigint, p_after_skip::bigint) end;
  v_scanned_through := (v_cur - 1)::integer;
  -- First slice: the skips this page is expected to need (the cursor's skip is already partly delivered).
  v_span := 1 + ceil(greatest(0, c_page_safety * (v_page + 1)
      - v_hits_per_skip * case when p_after_skip is not null and p_after_skip >= v_smin
          then greatest(0, 1 - coalesce(p_after_start, 0)::numeric / v_hi) else 1 end)
    / greatest(v_hits_per_skip, 0.000000001))::bigint;
  while v_cur <= v_smax loop
    -- Never more skips than the remaining budget pays for; always at least one, so every call advances.
    v_room := floor((c_work_budget - v_work - v_slice_cost) / greatest(v_pairs_per_skip, 0.000000001))::bigint;
    v_end := least(v_smax::bigint, v_cur - 1 + greatest(1, least(v_span, v_room)));
    execute v_sql into v_cs, v_cd, v_ct
      using substr(v_term, v_anchor + 1, 1), substr(v_term, v_anchor + 2, 1), v_cur::integer, v_end::integer,
            v_len, v_hi, v_anchor, v_filter, case when v_filter >= 0 then substr(v_term, v_filter + 1, 1) else null end,
            v_term, p_after_skip, coalesce(p_after_start, -1), coalesce(p_after_dir, 2),
            v_page + 1 - coalesce(cardinality(v_skips), 0);
    if v_cs is not null then
      v_skips := v_skips || v_cs;
      v_dirs := v_dirs || v_cd;
      v_starts := v_starts || v_ct;
    end if;
    if cardinality(v_skips) > v_page then
      v_stop := 'page_full';
      exit;
    end if;
    v_scanned_through := v_end::integer;
    v_work := v_work + v_slice_cost + v_pairs_per_skip * (v_end - v_cur + 1);
    v_cur := v_end + 1;
    exit when v_cur > v_smax;
    if v_work + v_slice_cost + v_pairs_per_skip > c_work_budget then
      v_stop := 'work_budget';
      exit;
    end if;
    if clock_timestamp() - v_started >= c_time_guard then
      v_stop := 'time_guard';
      exit;
    end if;
    v_span := least(v_span * 2, 4000000);
  end loop;

  v_has_more := v_stop <> 'range_complete';

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||u.skip::text||':'||u.dir::text||':'||u.start0::text,
      'skip',u.skip,'dir',u.dir,'direction',case when u.dir=1 then 'fwd' else 'back' end,
      'start',u.start0,'end',u.start0+u.dir*u.skip*(v_len-1),
      'positions',(select jsonb_agg(u.start0+u.dir*u.skip*k order by k) from generate_series(0,v_len-1) k),
      'coordinate_convention','zero_based_character_index','dependency_group',v_dependency_group
    ) order by u.ord),'[]'::jsonb),
    count(*)
  into v_rows,v_returned
  from unnest(v_skips[1:v_page], v_dirs[1:v_page], v_starts[1:v_page]) with ordinality as u(skip,dir,start0,ord);

  if v_returned > 0 then v_last := v_rows -> (v_returned-1); end if;

  return jsonb_build_object(
    'contract','els_search_page_v1',
    'status',case when v_returned=0 and p_after_skip is null and not v_has_more then 'EXECUTED_EMPTY' else 'OK' end,
    'scope',v_scope,'corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'selection_protocol',p_selection_protocol,
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_search_page_core_v1','owner','els_research_layer_law:v9','page_scan','sliced_work_budget_v1'),
    'search',jsonb_build_object(
      'skip_min',v_smin,'skip_max_executed',v_smax,'full_domain_max',v_full_max,
      'ordering','skip,start,forward-before-back-on-exact-tie','page_size',v_page,
      'exhaustive_with_continuation',true
    ),
    'hits',v_rows,'dependency_group',v_dependency_group,
    'completion',jsonb_build_object(
      'executed',true,'returned_hits',v_returned,'has_more',v_has_more,'truncated',v_has_more,
      'stop_reason',v_stop,
      -- Every skip up to and including this one is complete in the pages delivered so far.
      'scanned_through_skip',case when v_stop = 'page_full' then null else v_scanned_through end,
      'continuation',case
        when v_stop = 'page_full' and v_last is not null then jsonb_build_object(
          'kind','els_keyset_v1','after',jsonb_build_object(
            'skip',(v_last->>'skip')::int,'start',(v_last->>'start')::int,'dir',(v_last->>'dir')::int
          ))
        when v_stop in ('work_budget','time_guard') then jsonb_build_object(
          'kind','els_keyset_v1','after',jsonb_build_object('skip',v_scanned_through,'start',v_hi-1,'dir',-1))
        else null end
    ),
    'provenance',jsonb_build_object(
      'source_relation','public.'||public.els_stream_relation_v1(v_scope),'occurrence_generator',case when v_scope='torah' then 'els_torah_occurrences_internal_v1' else 'els_occurrences_internal_v1' end,
      'engine_version',2,'rule_version','els_research_layer_law:v9'
    )
  );
end
$function$;

commit;
