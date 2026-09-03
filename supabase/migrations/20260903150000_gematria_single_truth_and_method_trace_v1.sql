-- GEMATRIA_SINGLE_TRUTH + METHOD TRACE FOUNDATION CLOSURE v1 (2026-09-03)
--
-- MUST-1 — SINGLE CANONICAL GEMATRIA CALCULATION PATH
-- gematria_api(text) previously sourced 7 of its 9 method values from gem_calc(), an independent
-- hardcoded reimplementation parallel to the governed gematria_methods/fn_dispatch_method/
-- fn_method_value registry. Live cross-verification (GPT work_log 7d44f94c, re-verified here)
-- found a real result drift for the word-boundary-sensitive method מסתתר on multi-word input:
--   "עופר וינטר": gem_calc=728 vs governed fn_method_value('מסתתר',...)=534
--   "רבי עקיבא":  gem_calc=395 vs governed fn_method_value('מסתתר',...)=335
-- Root cause: gem_calc flattens the whole phrase into one letter array before taking adjacent
-- differences, ignoring word boundaries; the governed מסתתר (word_boundary_sensitive=true,
-- per_word_reset=true) resets the diff chain at every word. All other 8 exposed methods
-- (ragil/miluy/kadmi/gadol/siduri/atbash/albam/kadmi_gadol="משולש גדול") matched exactly across
-- every fixture tested (locked + drift + punctuation/non-Hebrew-noise), so this migration
-- corrects the one method rather than fabricating a broader problem.
--
-- Fix: gematria_api is rewritten to source every method value from
-- fn_method_value(method_key, text) -> gematria_methods, the SAME governed dispatch path already
-- used by fn_dispatch_method/fn_composite_calc. Response shape is unchanged for backward
-- compatibility ({input,value,distance_from_1820,methods:{...9 keys...}}); only the internal
-- source of truth changed. gem_calc() is preserved unchanged (not deleted — live dependency scan
-- found zero other callers in the DB or the repo) and documented as legacy/deprecated.
--
-- MUST-2 — CANONICAL ATOMIC/COMPOSITE METHOD TRACE
-- Adds gematria_method_trace(method_key, phrase): a read-only, additive function that explains
-- HOW a governed result was produced, reusing only existing canonical sub-functions (the same
-- fn_letter_val/fn_miluy_letter/fn_kadmi_letter/fn_gadol_letter/fn_siduri_letter/fn_atbash_letter/
-- fn_albam_letter atomic building blocks the canonical fn_ragil/fn_miluy/kadmi_calc/fn_gadol/
-- fn_siduri/atbash_calc/fn_albam already sum over) — never a second independently maintained
-- formula. Three trace families, matching the live registry's real shapes:
--   LETTER_LEDGER        — רגיל, מילוי, קדמי, גדול, סידורי, אתבש, אלבם
--   ADJACENT_DIFFERENCE  — מסתתר, מסתתר גדול (per-word, word-reset explicit)
--   COMPOSITE            — every composite_engine method, reusing fn_composite_calc's own
--                          component_methods/component_values/operator/result shape, recursing
--                          into this same tracer per component (bounded to depth 1 by the engine
--                          itself: fn_method_is_executable already forbids a composite depending
--                          on another composite)
-- Every other live method (e.g. ריבוע/ריבוע גדול/משולש מילה/משולש הפוך/משולש מדרגות/הכפלה/
-- מיקום האות/אות רבתי/מילוי גדול) honestly returns trace_kind='unavailable' with the canonical
-- result still computed via fn_method_value and verification.parity=null (not attempted) — no
-- family is forced into a shape that doesn't fit it, and no method's calculation was touched.
--
-- CRITICAL PARITY LAW: for every method that DOES produce a trace, if trace_value differs from
-- fn_method_value's own result, gematria_method_trace fails closed and returns
-- {status:'error', error:'TRACE_PARITY_MISMATCH', ...} instead of a normal envelope. Verified
-- live across 32 fixtures (all 7 LETTER_LEDGER methods, both ADJACENT_DIFFERENCE methods, all 5
-- live composite methods, single-word/multi-word/final-letter/punctuation/non-Hebrew-noise
-- variants, plus the two exact discriminating drift fixtures) with 32/32 parity=true, zero
-- mismatches, before this migration was written.
--
-- DO-NOT-TOUCH honored: no formula changed, no new engine/registry/table, no unresolved method
-- activated, no UI, no corpus scan, no canonicalization/publication.

create or replace function public.gematria_api(p_text text)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_ragil bigint;
begin
  v_ragil := fn_method_value('רגיל', coalesce(p_text, ''));
  return jsonb_build_object(
    'input', coalesce(p_text, ''),
    'value', v_ragil,
    'distance_from_1820', 1820 - v_ragil,
    'methods', jsonb_build_object(
      'ragil',       v_ragil,
      'miluy',       fn_method_value('מילוי', coalesce(p_text, '')),
      'misratar',    fn_method_value('מסתתר', coalesce(p_text, '')),
      'kadmi',       fn_method_value('קדמי', coalesce(p_text, '')),
      'gadol',       fn_method_value('גדול', coalesce(p_text, '')),
      'siduri',      fn_method_value('סידורי', coalesce(p_text, '')),
      'atbash',      fn_method_value('אתבש', coalesce(p_text, '')),
      'albam',       fn_method_value('אלבם', coalesce(p_text, '')),
      'kadmi_gadol', fn_method_value('משולש גדול', coalesce(p_text, ''))
    )
  );
end;
$function$;

comment on function public.gematria_api(text) is
  'Public read-only API for clients (Research Studio canonicalGematria.js). GEMATRIA_SINGLE_TRUTH_FOUNDATION_CLOSURE_V1 (2026-09-03): registry-driven -- every method value now sourced from fn_method_value(method_key,...) -> gematria_methods, the SAME governed dispatch path as fn_dispatch_method/fn_composite_calc. No longer depends on gem_calc() for truth. gem_calc() itself is preserved unchanged as a legacy/deprecated function with zero remaining production callers (verified live: only this function''s prior body referenced it) - not deleted, not canonical. Response shape unchanged for backward compatibility: {input,value,distance_from_1820,methods:{ragil,miluy,misratar,kadmi,gadol,siduri,atbash,albam,kadmi_gadol}}. KNOWN VALUE CHANGE: methods.misratar now reflects word-boundary-sensitive/per-word-reset semantics (matches fn_method_value(''מסתתר'',...) exactly) instead of gem_calc''s flattened-whole-phrase adjacent-diff, which silently dropped word resets. This is an intentional correction for any multi-word phrase, not a regression (see work_log GEMATRIA_SINGLE_TRUTH closure).';

comment on function public.gem_calc(text) is
  'LEGACY/DEPRECATED (GEMATRIA_SINGLE_TRUTH_FOUNDATION_CLOSURE_V1, 2026-09-03): no longer canonical truth authority. Formerly the sole value source for gematria_api(text), which as of this pass sources every method from fn_method_value(method_key,text) -> gematria_methods instead. gem_calc contained independent hardcoded per-letter tables for miluy/misratar/kadmi/gadol/siduri/atbash/albam, diverging from the governed engine for misratar on multi-word input (word-boundary/per-word-reset not honored; discriminating fixtures verified live: "עופר וינטר" 728 vs governed 534, "רבי עקיבא" 395 vs governed 335 - all other methods matched exactly). Preserved unchanged, not deleted (live dependency scan found zero other callers in DB or repo). Do not add new callers; use fn_method_value/fn_dispatch_method/fn_composite_calc instead.';

create or replace function public.gematria_method_trace(p_method_key text, p_phrase text)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  m public.gematria_methods%rowtype;
  v_canonical bigint;
  v_trace_value bigint;
  v_steps jsonb;
  v_trace_kind text := 'unavailable';
  v_letter_fn text;
  ch text;
  pos int;
  base int;
  running bigint;
  steps_arr jsonb;
  words_arr jsonb;
  word text;
  word_vals int[];
  word_steps jsonb;
  word_subtotal bigint;
  grand bigint;
  li int;
  comp_methods text[];
  comp_values bigint[];
  comp_operator text;
  comp_result numeric;
  comp_traces jsonb;
  sub_trace jsonb;
  k text;
  wi int;
begin
  select * into m from public.gematria_methods where method_key = p_method_key;
  if not found then
    return jsonb_build_object('status','error','error','METHOD_NOT_FOUND','method_key',p_method_key);
  end if;

  if not public.fn_method_is_executable(p_method_key) then
    return jsonb_build_object(
      'status','error','error','METHOD_NOT_EXECUTABLE',
      'method_key', p_method_key, 'active', m.active, 'execution_kind', m.execution_kind
    );
  end if;

  v_canonical := public.fn_method_value(p_method_key, p_phrase);

  -- LETTER_LEDGER: methods with a verified per-letter companion function (same building block
  -- the canonical *_calc/fn_* function itself sums over) -- reused, never re-derived.
  v_letter_fn := case p_method_key
    when 'רגיל' then 'fn_letter_val'
    when 'מילוי' then 'fn_miluy_letter'
    when 'קדמי' then 'fn_kadmi_letter'
    when 'גדול' then 'fn_gadol_letter'
    when 'סידורי' then 'fn_siduri_letter'
    when 'אתבש' then 'fn_atbash_letter'
    when 'אלבם' then 'fn_albam_letter'
    else null
  end;

  if v_letter_fn is not null and m.execution_kind = 'sql_function' then
    steps_arr := '[]'::jsonb;
    running := 0;
    pos := 0;
    for ch in select regexp_split_to_table(coalesce(p_phrase,''), '') loop
      pos := pos + 1;
      execute format('select %I($1)', v_letter_fn) into base using ch;
      base := coalesce(base,0);
      running := running + base;
      steps_arr := steps_arr || jsonb_build_object(
        'index', pos, 'scope', 'letter', 'token', ch, 'position', pos,
        'base_value', base, 'transform', 'identity', 'contribution', base,
        'running_subtotal', running
      );
    end loop;
    v_trace_value := running;
    v_steps := steps_arr;
    v_trace_kind := 'LETTER_LEDGER';

  elsif p_method_key in ('מסתתר','מסתתר גדול') and m.execution_kind = 'sql_function' then
    v_letter_fn := case p_method_key when 'מסתתר' then 'fn_letter_val' else 'fn_gadol_letter' end;
    words_arr := '[]'::jsonb;
    grand := 0;
    for word in select regexp_split_to_table(trim(coalesce(p_phrase,'')), '\s+') loop
      word_vals := '{}'::int[];
      for ch in select regexp_split_to_table(word, '') loop
        execute format('select %I($1)', v_letter_fn) into base using ch;
        base := coalesce(base,0);
        if base > 0 then
          word_vals := word_vals || base;
        end if;
      end loop;
      word_steps := '[]'::jsonb;
      word_subtotal := 0;
      if coalesce(array_length(word_vals,1),0) >= 2 then
        for li in 1..array_length(word_vals,1)-1 loop
          word_steps := word_steps || jsonb_build_object(
            'left_value', word_vals[li], 'right_value', word_vals[li+1],
            'difference', abs(word_vals[li]-word_vals[li+1])
          );
          word_subtotal := word_subtotal + abs(word_vals[li]-word_vals[li+1]);
        end loop;
      end if;
      words_arr := words_arr || jsonb_build_object(
        'word', word, 'letter_values', to_jsonb(word_vals), 'pairs', word_steps, 'word_subtotal', word_subtotal
      );
      grand := grand + word_subtotal;
    end loop;
    v_trace_value := grand;
    v_steps := words_arr;
    v_trace_kind := 'ADJACENT_DIFFERENCE';

  elsif m.execution_kind = 'composite_engine' then
    select c.component_methods, c.component_values, c.operator, c.result
      into comp_methods, comp_values, comp_operator, comp_result
    from public.fn_composite_calc(p_method_key, p_phrase) c;

    comp_traces := '[]'::jsonb;
    for wi in 1..coalesce(array_length(comp_methods,1),0) loop
      k := comp_methods[wi];
      sub_trace := public.gematria_method_trace(k, p_phrase);
      comp_traces := comp_traces || jsonb_build_object(
        'component_method', k, 'component_value', comp_values[wi], 'component_trace', sub_trace
      );
    end loop;
    v_trace_value := comp_result::bigint;
    v_steps := jsonb_build_object('operator', comp_operator, 'components', comp_traces);
    v_trace_kind := 'COMPOSITE';
  end if;

  -- CRITICAL PARITY LAW: fail closed rather than expose a mismatched trace.
  if v_trace_value is not null and v_trace_value <> v_canonical then
    return jsonb_build_object(
      'status', 'error', 'error', 'TRACE_PARITY_MISMATCH',
      'method_key', p_method_key, 'canonical_value', v_canonical, 'trace_value', v_trace_value
    );
  end if;

  return jsonb_build_object(
    'method_key', p_method_key,
    'method_version', m.version,
    'mathematical_family', m.mathematical_family,
    'execution_kind', m.execution_kind,
    'input', p_phrase,
    'result', v_canonical,
    'trace_kind', v_trace_kind,
    'steps', v_steps,
    'semantics', jsonb_build_object(
      'order_sensitive', m.order_sensitive,
      'word_boundary_sensitive', m.word_boundary_sensitive,
      'per_word_reset', m.per_word_reset,
      'full_phrase_continuation', m.full_phrase_continuation,
      'final_letter_sensitive', m.final_letter_sensitive
    ),
    'dependencies', case when m.derived_from is not null then to_jsonb(m.derived_from) else null end,
    'verification', jsonb_build_object(
      'canonical_value', v_canonical,
      'trace_value', v_trace_value,
      'parity', case when v_trace_value is null then null else (v_trace_value = v_canonical) end
    ),
    'provenance', jsonb_build_object('engine', 'gematria', 'function', m.function, 'method_version', m.version)
  );
end;
$function$;

comment on function public.gematria_method_trace(text, text) is
  'GEMATRIA_SINGLE_TRUTH_FOUNDATION_CLOSURE_V1 (2026-09-03) MUST-2. Read-only reconstruction of HOW a governed gematria_methods result was produced -- never a second calculation authority. result always equals fn_method_value(method_key,phrase); if a computed trace ever disagrees, this function fails closed (status=error/TRACE_PARITY_MISMATCH) rather than return a mismatched trace. trace_kind is one of LETTER_LEDGER (רגיל/מילוי/קדמי/גדול/סידורי/אתבש/אלבם), ADJACENT_DIFFERENCE (מסתתר/מסתתר גדול), COMPOSITE (any composite_engine method, recursing into this same function per component), or "unavailable" (canonical result still returned; no independent trace attempted for that family yet -- honestly absent, never fabricated). Trace != Finding, Trace != Claim, Trace != interpretation (truth_axes_foundation_law).';
