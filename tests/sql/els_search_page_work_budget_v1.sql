-- ELS ordered page, bounded work per call (supabase/migrations/20261118090000_els_search_page_work_budget_v1.sql).
-- Runs on a throwaway database only (tests/sql/run-els-search-page-work-budget.sh): the canonical letter streams, the unchanged
-- generator els_occurrences_internal_v1 (the oracle) and, as public.els_search_page_core_reviewed, the page core as it was before the
-- migration. Every assertion raises on failure; the last line prints PASS.
\set ON_ERROR_STOP on
set jit = off;

-- Reads a whole range through the page core, following its own continuation, and checks every page on the way.
create function pg_temp.read_all(p_term text, p_scope text, p_min integer, p_max integer, p_page integer, p_max_calls integer default 400)
returns jsonb language plpgsql as $$
declare
  r jsonb; h jsonb; v_after jsonb; v_prev jsonb;
  v_keys text[] := '{}';
  v_calls integer := 0; v_budget_stops integer := 0; v_page_full integer := 0;
  v_last_scanned integer := 0;
  v_term text := translate(regexp_replace(p_term,'[^א-ת]','','g'),'ךםןףץ','כמנפצ');
  v_len integer; v_hi integer := public.els_stream_letters_v1(p_scope);
  k integer; v_prev_key integer[]; v_key integer[];
begin
  v_len := length(v_term);
  loop
    v_calls := v_calls + 1;
    if v_calls > p_max_calls then raise exception '% %: more than % calls', p_term, p_scope, p_max_calls; end if;
    r := public.els_search_page_core_v1(p_term, p_scope, p_min, p_max, p_page,
      (v_after->>'skip')::int, (v_after->>'start')::int, (v_after->>'dir')::int, 'POST_HOC_EXPLORATORY');
    if r->>'contract' <> 'els_search_page_v1' or (r->'completion'->>'executed')::boolean is not true then
      raise exception '% %: not an executed page: %', p_term, p_scope, r; end if;
    if jsonb_array_length(r->'hits') <> (r->'completion'->>'returned_hits')::int or jsonb_array_length(r->'hits') > p_page then
      raise exception '% %: returned_hits does not describe the page', p_term, p_scope; end if;
    if (r->'completion'->>'has_more')::boolean <> (r->'completion'->>'truncated')::boolean
       or (r->'completion'->>'has_more')::boolean <> (r->'completion'->'continuation' <> 'null'::jsonb) then
      raise exception '% %: has_more, truncated and the continuation disagree: %', p_term, p_scope, r->'completion'; end if;
    if r->'completion'->>'stop_reason' not in ('page_full','work_budget','time_guard','range_complete')
       or ((r->'completion'->>'stop_reason') = 'range_complete') = (r->'completion'->>'has_more')::boolean then
      raise exception '% %: stop_reason does not match has_more: %', p_term, p_scope, r->'completion'; end if;
    -- A partial or continued page is never a negative result.
    if r->>'status' = 'EXECUTED_EMPTY' and (v_calls > 1 or jsonb_array_length(r->'hits') > 0 or (r->'completion'->>'has_more')::boolean) then
      raise exception '% %: EXECUTED_EMPTY on a page that is not a complete empty range', p_term, p_scope; end if;
    if r->>'status' not in ('OK','EXECUTED_EMPTY') then raise exception '% %: status %', p_term, p_scope, r->>'status'; end if;
    for h in select value from jsonb_array_elements(r->'hits') loop
      v_key := array[(h->>'skip')::int, (h->>'start')::int, -(h->>'dir')::int];
      if v_prev_key is not null and not (v_key > v_prev_key) then
        raise exception '% %: hits are not in strictly ascending (skip, start, forward-first) order at %', p_term, p_scope, h; end if;
      v_prev_key := v_key;
      if (h->>'skip')::int < greatest(2, p_min) or (p_max is not null and (h->>'skip')::int > p_max) then
        raise exception '% %: hit outside the requested skips: %', p_term, p_scope, h; end if;
      if (h->>'end')::int <> (h->>'start')::int + (h->>'dir')::int * (h->>'skip')::int * (v_len - 1)
         or jsonb_array_length(h->'positions') <> v_len
         or h->>'occurrence_id' <> 'els:'||(r->>'corpus_id')||':'||v_term||':'||(h->>'skip')||':'||(h->>'dir')||':'||(h->>'start')
         or h->>'direction' <> (case when (h->>'dir')::int = 1 then 'fwd' else 'back' end) then
        raise exception '% %: malformed hit %', p_term, p_scope, h; end if;
      for k in 0 .. v_len - 1 loop
        if (h->'positions'->>k)::int <> (h->>'start')::int + (h->>'dir')::int * (h->>'skip')::int * k
           or (h->'positions'->>k)::int not between 0 and v_hi - 1 then
          raise exception '% %: bad position % in %', p_term, p_scope, k, h; end if;
      end loop;
      v_keys := v_keys || ((h->>'skip')||':'||(h->>'dir')||':'||(h->>'start'));
    end loop;
    if r->'completion'->>'stop_reason' = 'page_full' then
      v_page_full := v_page_full + 1;
      if jsonb_array_length(r->'hits') <> p_page then raise exception '% %: page_full with a short page', p_term, p_scope; end if;
      -- The cursor of a full page is its last hit.
      if r->'completion'->'continuation'->'after' <> jsonb_build_object('skip',(h->>'skip')::int,'start',(h->>'start')::int,'dir',(h->>'dir')::int) then
        raise exception '% %: the continuation of a full page is not its last hit', p_term, p_scope; end if;
    else
      if (r->'completion'->>'scanned_through_skip')::int < v_last_scanned then
        raise exception '% %: scanned_through_skip went backwards', p_term, p_scope; end if;
      v_last_scanned := (r->'completion'->>'scanned_through_skip')::int;
    end if;
    if r->'completion'->>'stop_reason' in ('work_budget','time_guard') then
      v_budget_stops := v_budget_stops + 1;
      if (r->'completion'->'continuation'->'after'->>'skip')::int <> v_last_scanned
         or (r->'completion'->'continuation'->'after'->>'start')::int <> v_hi - 1
         or (r->'completion'->'continuation'->'after'->>'dir')::int <> -1 then
        raise exception '% %: a budget stop must resume after its last complete skip: %', p_term, p_scope, r->'completion'; end if;
    end if;
    exit when not (r->'completion'->>'has_more')::boolean;
    v_prev := v_after;
    v_after := r->'completion'->'continuation'->'after';
    if v_prev is not null and not (array[(v_after->>'skip')::int, (v_after->>'start')::int, -(v_after->>'dir')::int]
        > array[(v_prev->>'skip')::int, (v_prev->>'start')::int, -(v_prev->>'dir')::int]) then
      raise exception '% %: the continuation did not advance (% -> %)', p_term, p_scope, v_prev, v_after; end if;
  end loop;
  if (r->'completion'->>'scanned_through_skip')::int <> (r->'search'->>'skip_max_executed')::int then
    raise exception '% %: a completed range must report its upper skip as scanned', p_term, p_scope; end if;
  return jsonb_build_object('keys', to_jsonb(v_keys), 'calls', v_calls, 'budget_stops', v_budget_stops, 'page_full', v_page_full,
    'skip_max_executed', (r->'search'->>'skip_max_executed')::int);
end $$;

-- Every occurrence of the range from the unchanged generator, in the canonical order.
create function pg_temp.oracle(p_term text, p_scope text, p_min integer, p_max integer) returns text[] language sql as $$
  select coalesce(array_agg(o.skip||':'||o.dir||':'||o.start0 order by o.skip, o.start0, o.dir desc), '{}')
  from public.els_occurrences_internal_v1(p_scope, p_term, greatest(2, p_min), p_max, 0, public.els_stream_letters_v1(p_scope) - 1) o
$$;

create temp table els_page_cases (id text primary key, term text, scope text, smin integer, smax integer, page integer,
  min_hits integer default 0, min_budget_stops integer default 0, min_page_full integer default 0);
insert into els_page_cases values
  -- frequent short terms: the page fills inside the first skips; many continuations inside one skip
  ('two-letter-frequent',     'יו',        'torah',  2,     2,      500, 5000, 0, 10),
  ('two-letter-rare',         'טס',        'tanakh', 2,     400,    500, 1,    0, 0),
  ('three-letter-frequent',   'משה',       'torah',  2,     5,      500, 500,  0, 1),
  ('three-letter-tanakh',     'גזע',       'tanakh', 2,     50,     100, 200,  0, 2),
  ('palindrome',              'אבא',       'torah',  2,     3,      7,   10,   0, 1),
  ('same-letter-pair',        'ממ',        'torah',  3,     3,      500, 500,  0, 1),
  ('repeated-letter',         'ששש',       'torah',  2,     60,     50,  1,    0, 0),
  -- the classic windows of the Bible code screen
  ('classic-window-1',        'תורה',      'torah',  2,     50,     500, 100,  0, 0),
  ('classic-window-2',        'תורה',      'torah',  51,    100,    500, 100,  0, 0),
  ('classic-window-top',      'ישראל',     'tanakh', 451,   500,    500, 1,    0, 0),
  ('the-live-timeout-case',   'יונה',      'tanakh', 2,     50,     500, 500,  0, 1),
  ('final-letters-and-marks', 'אֱלֹהִים',   'torah',  2,     200,    100, 1,    0, 0),
  ('long-term-tanakh',        'ירושלים',   'tanakh', 2,     120,    500, 1,    0, 0),
  ('page-size-one',           'אדמ',       'torah',  2,     2,      1,   3,    0, 3),
  -- high skips and the very top of the physical range (bounds and integer arithmetic)
  ('high-skips',              'משיח',      'torah',  1000,  1300,   500, 1,    0, 0),
  ('top-of-range-two-letter', 'טס',        'torah',  304000, null,  500, 0,    0, 0),
  ('top-of-range-long',       'בראשיתברא', 'torah',  38000, null,   500, 0,    0, 0),
  -- sparse terms over long ranges: the work budget must stop the call and the continuation must finish the range
  ('budget-stops-with-hits',  'גזעצק',     'tanakh', 2,     25000,  500, 1,    2, 0),
  ('budget-stops-empty',      'טסגזטס',    'tanakh', 2,     50000,  500, 0,    2, 0);

do $$
declare c record; got jsonb; want text[]; have text[]; t0 timestamptz;
begin
  for c in select * from els_page_cases order by id loop
    t0 := clock_timestamp();
    got := pg_temp.read_all(c.term, c.scope, c.smin, c.smax, c.page);
    select coalesce(array_agg(v order by o), '{}') into have from jsonb_array_elements_text(got->'keys') with ordinality as e(v, o);
    want := pg_temp.oracle(c.term, c.scope, c.smin, coalesce(c.smax, (got->>'skip_max_executed')::int));
    if have <> want then
      raise exception 'case %: the pages (% occurrences) are not the generator''s occurrences (%) in the same order', c.id, cardinality(have), cardinality(want);
    end if;
    if cardinality(have) < c.min_hits or (got->>'budget_stops')::int < c.min_budget_stops or (got->>'page_full')::int < c.min_page_full then
      raise exception 'case % does not exercise what it is for: hits=% budget_stops=% full_pages=%', c.id, cardinality(have), got->>'budget_stops', got->>'page_full';
    end if;
    raise notice 'case %: % occurrences equal to the generator, % calls, % budget stops, % full pages, % ms', c.id, cardinality(have),
      got->>'calls', got->>'budget_stops', got->>'page_full', round(extract(epoch from clock_timestamp() - t0) * 1000);
  end loop;
end $$;

-- A call that finishes its range or fills its page in one go answers exactly as the reviewed body did, apart from the added fields.
do $$
declare c record; a jsonb; b jsonb;
begin
  for c in select * from (values
    ('תורה','torah',2,50,500,null::int,null::int,null::int,'POST_HOC_EXPLORATORY'),
    ('תורה','torah',2,50,100,null,null,null,null),
    ('משה','torah',2,10,500,null,null,null,'SOURCE_CLAIM_REPLAY'),
    ('משה','torah',2,10,500,3,150000,1,'HYPOTHESIS_DRIVEN_FOLLOWUP'),      -- a cursor in the middle of a skip
    ('משה','torah',2,10,500,3,150000,-1,null),
    ('אבא','torah',2,12,3,2,104,1,null),                                    -- forward delivered, the backward twin is next
    ('משה','torah',5,10,500,2,0,1,null),                                    -- a cursor below skip_min changes nothing
    ('משה','torah',2,10,500,11,0,1,null),                                   -- a cursor above skip_max leaves nothing
    ('משה','torah',2,10,500,10,304804,-1,null),                             -- the cursor of a budget stop at the last skip
    ('גזע','tanakh',2,50,500,null,null,null,'PRE_REGISTERED_TARGET'),
    ('ירושלים','tanakh',2,50,500,null,null,null,null),
    ('זזזזזזזז','torah',2,20,500,null,null,null,null),                      -- nothing found: EXECUTED_EMPTY
    ('זזזזזזזז','torah',2,20,500,5,10,1,null),                              -- nothing found after a cursor: OK and empty
    ('אב','torah',2,2,1,null,null,null,null),
    ('משה','torah',null,7,null,null,null,null,null),                        -- defaults: skip_min 2, page 100
    ('משה','torah',-5,7,100000,null,null,null,null),                        -- clamps
    ('שלום','TORAH ',2,30,50,null,null,null,null),                          -- scope is trimmed and lower-cased
    ('a','torah',2,10,10,null,null,null,null),                              -- fewer than two Hebrew letters
    ('משה','psalms',2,10,10,null,null,null,null),                           -- unknown scope
    ('משה','torah',2,10,10,null,null,null,'MADE_UP'),                       -- unknown protocol
    ('משה','torah',2,10,10,3,null,null,null),                               -- incomplete cursor
    ('משה','torah',2,10,10,3,5,0,null)                                      -- invalid cursor direction
  ) v(term,scope,smin,smax,page,a_skip,a_start,a_dir,protocol) loop
    a := public.els_search_page_core_v1(c.term,c.scope,c.smin,c.smax,c.page,c.a_skip,c.a_start,c.a_dir,c.protocol);
    b := public.els_search_page_core_reviewed(c.term,c.scope,c.smin,c.smax,c.page,c.a_skip,c.a_start,c.a_dir,c.protocol);
    if a->'completion'->>'stop_reason' in ('work_budget','time_guard') then
      raise exception 'equality case % % %-% is expected to finish in one call', c.term, c.scope, c.smin, c.smax; end if;
    if (a #- '{completion,stop_reason}' #- '{completion,scanned_through_skip}' #- '{engine,page_scan}') is distinct from b then
      raise exception 'the answer differs from the reviewed body for % % %-% page % cursor (%,%,%): % vs %', c.term, c.scope, c.smin, c.smax, c.page,
        c.a_skip, c.a_start, c.a_dir, a - 'hits', b - 'hits'; end if;
  end loop;
  raise notice 'one-call answers are identical to the reviewed body, apart from the added fields';
end $$;

-- A blank upper bound (the whole physical range) now answers; before, it could not finish. The call advances and says how far it read.
do $$
declare r jsonb;
begin
  r := public.els_search_page_core_v1('ויהיאור','tanakh',2,null,500,null,null,null,null);
  if r->'completion'->>'stop_reason' <> 'work_budget' or (r->'completion'->>'has_more')::boolean is not true
     or (r->'completion'->>'scanned_through_skip')::int < 2 or r->>'status' <> 'OK'
     or (r->'search'->>'skip_max_executed')::int <> (r->'search'->>'full_domain_max')::int then
    raise exception 'the whole-range request did not return a truthful partial page: %', r - 'hits'; end if;
  -- A range with no occurrence that needs more than one call is not a negative result until the last call.
  r := public.els_search_page_core_v1('טסגזטס','tanakh',2,30000,500,null,null,null,null);
  if r->>'status' <> 'OK' or jsonb_array_length(r->'hits') <> 0 or (r->'completion'->>'has_more')::boolean is not true then
    raise exception 'an unfinished empty range must stay OK with a continuation: %', r; end if;
  raise notice 'whole-range and unfinished empty requests return truthful partial pages';
end $$;

-- Deterministic: the same request returns the same page and the same cursor (the budget is counted work, not elapsed time).
do $$
declare a jsonb; b jsonb;
begin
  a := public.els_search_page_core_v1('גזעצק','tanakh',2,25000,500,null,null,null,null);
  b := public.els_search_page_core_v1('גזעצק','tanakh',2,25000,500,null,null,null,null);
  if a is distinct from b or a->'completion'->>'stop_reason' <> 'work_budget' then
    raise exception 'a budget stop is not deterministic: % vs %', a->'completion', b->'completion'; end if;
end $$;

-- Nothing around the body moved: owner, privileges, volatility, signature, the public wrapper and the generator.
do $$
declare p record;
begin
  select * into p from pg_proc where oid = 'public.els_search_page_core_v1(text,text,integer,integer,integer,integer,integer,integer,text)'::regprocedure;
  if p.provolatile <> 's' or p.prosecdef or p.proconfig <> array['search_path=public, extensions'] then
    raise exception 'the function attributes changed: % % %', p.provolatile, p.prosecdef, p.proconfig; end if;
  if has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')
     or not has_function_privilege('service_role', p.oid, 'execute') then
    raise exception 'the privileges of the page core changed'; end if;
  if (select count(*) from pg_proc where proname = 'els_search_page_core_v1') <> 1 then raise exception 'an overload was created'; end if;
end $$;

select 'els_search_page_work_budget_v1: PASS' as result;
