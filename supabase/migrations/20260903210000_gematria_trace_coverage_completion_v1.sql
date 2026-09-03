-- GEMATRIA TRACE COVERAGE COMPLETION v1 (2026-09-03)
--
-- Extends the existing public.gematria_method_trace(text,text) (from
-- 20260903150000_gematria_single_truth_and_method_trace_v1.sql) to cover all remaining active +
-- in_engine Gematria methods. No new engine, no new registry, no new store/table, no formula
-- change to any canonical calculation function, no bespoke per-method React-style trace.
--
-- BEFORE this migration: 32 active+in_engine methods, 15 with a real trace (7 LETTER_LEDGER +
-- 2 ADJACENT_DIFFERENCE + 5 COMPOSITE + 1 already covered via composite recursion), 17 honestly
-- "unavailable".
--
-- Crosswalk of the 17 (grounded in each method's live SQL body, not guessed):
--   LETTER_LEDGER (identity transform, 7 more): מיקום האות/מילוי גדול already had a companion
--     fn_*_letter function (fn_mikum_haot_letter/fn_miluy_gadol_letter) and needed nothing new.
--     אותיות אחרי/אותיות לפני/משולש גדול/מילוי דמילוי/מילוי דמילוי גדול embedded their per-letter
--     table directly inline (CASE or gem_sum(text,jsonb)) with no separate function -- this
--     migration adds ONE small `_letter` companion per method, each verified byte-for-byte
--     identical (including sofit/final-letter values) to the exact table already live inside the
--     canonical function's own source. The canonical functions themselves are NOT modified.
--   LETTER_LEDGER (square transform, 2 more): הכפלה/הכפלה גדולה already call reusable per-letter
--     helpers (_gem/_gem_sofit) that just weren't used by the tracer yet -- no new function
--     needed, only a "square" transform mode added to the existing LETTER_LEDGER branch.
--   SUBSTITUTION_LEDGER (2, new family): אטבח/איק בכר both compute as
--     fn_ragil(canonical_transform(text)). איק בכר already exposes its transform as a separate
--     function (aiq_bekar_transform); אטבח embedded translate() inline, so this migration adds
--     ONE new fn_atbach_transform mirroring that exact translate() call (verified byte-identical
--     to fn_atbach's own live output), following the same separate-transform-function convention
--     the registry already established for אטבח_רבנו_חנאל (fn_atbach_rabenu_hananel_transform).
--     translate() is a pure position/context-independent per-character substitution, so applying
--     the same transform one letter at a time reconstructs the whole-phrase result exactly.
--   CUMULATIVE_PREFIX (4, new family, generalizing the previously-deferred ריבוע): every one of
--     ריבוע/ריבוע גדול/משולש מילה/משולש הפוך computes "running prefix-sum snapshots; result = SUM
--     of every snapshot" -- confirmed directly from their SQL bodies (fn_ribua_word's explicit
--     loop; ribua_gadol_calc's structurally identical loop over fn_gadol_letter-equivalent
--     values; triangle_word_calc/triangle_reverse_calc's SQL window `sum(fn_ragil(ch)) OVER
--     (ORDER BY ord [DESC])`). They differ only in word-scoping (ריבוע/ריבוע גדול reset per word;
--     משולש מילה/משולש הפוך strip everything but Hebrew letters INCLUDING spaces and treat the
--     whole phrase as one continuous run, matching their own live whitespace_normalization) and
--     direction (משולש הפוך runs backward). NOTE: משולש הפוך is registered under
--     mathematical_family="position_weighted_sum", but its live SQL body is a reverse cumulative
--     prefix sum, not a value x position multiplication -- the trace follows the live
--     implementation, not the registry label (no registry metadata was changed).
--   POSITION_WEIGHTED (1, new family): משולש מדרגות is the one method that is genuinely a
--     per-word-reset value x position-in-word multiplication (stair_triangle_calc's own
--     `total := total + fn_ragil(ch) * i`).
--   CONTEXT_REQUIRED (1, honest disposition, not a computing family): אות רבתי's own
--     input_schema declares activation:"explicit_rabbati_context_only", but the live
--     (method_key, phrase) dispatch signature -- the same one fn_dispatch_method/fn_method_value
--     already use -- has no channel to carry that context. Rather than fabricate a trace for an
--     activation state that cannot be observed, gematria_method_trace now returns
--     trace_kind="context_required" with the canonical result still surfaced and the method's
--     own input_schema echoed back as context_contract, so a future context-aware caller does
--     not require a redesign. fn_rabbati's own behavior is completely unchanged.
--
-- CRITICAL PARITY LAW unchanged and re-verified: every newly-covered method fails closed
-- (status=error/TRACE_PARITY_MISMATCH) if its trace_value ever disagrees with
-- fn_method_value's own result. Verified live: 32/32 active+in_engine methods x 7 fixtures
-- (single word, multi-word, punctuation, one-letter, repeated-letter, empty, non-Hebrew) = 224
-- checks, 0 mismatches, plus the original 32-fixture regression set from the prior migration,
-- also 0 mismatches.
--
-- AFTER this migration: 31/32 methods return a real, parity-verified trace; 1 (אות רבתי) returns
-- an honest context_required disposition. 0 methods remain "unavailable" without justification.

create or replace function public.fn_otiot_after_letter(c text) returns integer language sql immutable as $f$
  select case c
    when 'א' then 2 when 'ב' then 3 when 'ג' then 4 when 'ד' then 5 when 'ה' then 6
    when 'ו' then 7 when 'ז' then 8 when 'ח' then 9 when 'ט' then 10 when 'י' then 20
    when 'כ' then 30 when 'ך' then 30 when 'ל' then 40 when 'מ' then 50 when 'ם' then 50
    when 'נ' then 60 when 'ן' then 60 when 'ס' then 70 when 'ע' then 80 when 'פ' then 90
    when 'ף' then 90 when 'צ' then 100 when 'ץ' then 100 when 'ק' then 200 when 'ר' then 300
    when 'ש' then 400 when 'ת' then 1 else 0 end;
$f$;

create or replace function public.fn_otiot_before_letter(c text) returns integer language sql immutable as $f$
  select case c
    when 'א' then 400 when 'ב' then 1 when 'ג' then 2 when 'ד' then 3 when 'ה' then 4
    when 'ו' then 5 when 'ז' then 6 when 'ח' then 7 when 'ט' then 8 when 'י' then 9
    when 'כ' then 10 when 'ך' then 10 when 'ל' then 20 when 'מ' then 30 when 'ם' then 30
    when 'נ' then 40 when 'ן' then 40 when 'ס' then 50 when 'ע' then 60 when 'פ' then 70
    when 'ף' then 70 when 'צ' then 80 when 'ץ' then 80 when 'ק' then 90 when 'ר' then 100
    when 'ש' then 200 when 'ת' then 300 else 0 end;
$f$;

create or replace function public.fn_kadmi_gadol_letter(c text) returns integer language sql immutable as $f$
  select case c
    when 'א' then 1 when 'ב' then 3 when 'ג' then 6 when 'ד' then 10 when 'ה' then 15
    when 'ו' then 21 when 'ז' then 28 when 'ח' then 36 when 'ט' then 45 when 'י' then 55
    when 'כ' then 75 when 'ך' then 1995 when 'ל' then 105 when 'מ' then 145 when 'ם' then 2595
    when 'נ' then 195 when 'ן' then 3295 when 'ס' then 255 when 'ע' then 325 when 'פ' then 405
    when 'ף' then 4095 when 'צ' then 495 when 'ץ' then 4995 when 'ק' then 595 when 'ר' then 795
    when 'ש' then 1095 when 'ת' then 1495 else 0 end;
$f$;

create or replace function public.fn_miluy_demiluy_letter(c text) returns integer language sql immutable as $f$
  select case c
    when 'א' then 266 when 'ב' then 848 when 'ג' then 257 when 'ד' then 924 when 'ה' then 35
    when 'ו' then 64 when 'ז' then 193 when 'ח' then 854 when 'ט' then 855 when 'י' then 476
    when 'כ' then 181 when 'ך' then 181 when 'ל' then 588 when 'מ' then 160 when 'ם' then 160
    when 'נ' then 234 when 'ן' then 234 when 'ס' then 300 when 'ע' then 256 when 'פ' then 192
    when 'ף' then 192 when 'צ' then 558 when 'ץ' then 558 when 'ק' then 289 when 'ר' then 890
    when 'ש' then 486 when 'ת' then 458 else 0 end;
$f$;

create or replace function public.fn_miluy_demiluy_gadol_letter(c text) returns integer language sql immutable as $f$
  select case c
    when 'א' then 986 when 'ב' then 848 when 'ג' then 817 when 'ד' then 924 when 'ה' then 35
    when 'ו' then 64 when 'ז' then 1493 when 'ח' then 854 when 'ט' then 855 when 'י' then 476
    when 'כ' then 901 when 'ך' then 901 when 'ל' then 1148 when 'מ' then 1280 when 'ם' then 1280
    when 'נ' then 1534 when 'ן' then 1534 when 'ס' then 2060 when 'ע' then 1556 when 'פ' then 912
    when 'ף' then 912 when 'צ' then 558 when 'ץ' then 558 when 'ק' then 1009 when 'ר' then 1540
    when 'ש' then 1786 when 'ת' then 458 else 0 end;
$f$;

create or replace function public.fn_atbach_transform(p text) returns text language sql immutable as $f$
  select translate(p, 'אבגדהוזחטיכלמנסעפצקרשתךםןףץ', 'טחזוהדגבאצפעסנמלכיץףןםךתשרק');
$f$;

comment on function public.fn_otiot_after_letter(text) is 'GEMATRIA_TRACE_COVERAGE_COMPLETION_V1: additive per-letter primitive extracted verbatim from fn_otiot_after''s own embedded table for use by gematria_method_trace. fn_otiot_after itself is unchanged.';
comment on function public.fn_otiot_before_letter(text) is 'GEMATRIA_TRACE_COVERAGE_COMPLETION_V1: additive per-letter primitive extracted verbatim from fn_otiot_before''s own embedded table for use by gematria_method_trace. fn_otiot_before itself is unchanged.';
comment on function public.fn_kadmi_gadol_letter(text) is 'GEMATRIA_TRACE_COVERAGE_COMPLETION_V1: additive per-letter primitive extracted verbatim from kadmi_gadol_calc''s own gem_sum map for use by gematria_method_trace. kadmi_gadol_calc itself is unchanged.';
comment on function public.fn_miluy_demiluy_letter(text) is 'GEMATRIA_TRACE_COVERAGE_COMPLETION_V1: additive per-letter primitive extracted verbatim from miluy_demiluy_calc''s own gem_sum map for use by gematria_method_trace. miluy_demiluy_calc itself is unchanged.';
comment on function public.fn_miluy_demiluy_gadol_letter(text) is 'GEMATRIA_TRACE_COVERAGE_COMPLETION_V1: additive per-letter primitive extracted verbatim from miluy_demiluy_gadol_calc''s own gem_sum map for use by gematria_method_trace. miluy_demiluy_gadol_calc itself is unchanged.';
comment on function public.fn_atbach_transform(text) is 'GEMATRIA_TRACE_COVERAGE_COMPLETION_V1: additive transform primitive extracted verbatim from fn_atbach''s own inline translate() call, mirroring the same separate-transform-function convention already used by aiq_bekar_transform and fn_atbach_rabenu_hananel_transform. fn_atbach itself is unchanged.';

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
  v_square_fn text;
  v_transform_fn text;
  v_value_fn text;
  v_scope text;
  v_direction text;
  ch text;
  pos int;
  base int;
  running bigint;
  contribution bigint;
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
  step_ch text;
  letters text[];
  n int;
  idx int;
  prefix bigint;
  pos_in_word int;
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

  -- CONTEXT_ACTIVATED: the live two-argument dispatch (method_key, phrase) -- the same signature
  -- fn_dispatch_method/fn_method_value already use -- has no channel to carry the explicit-
  -- activation context this method's own input_schema declares it needs
  -- (activation:"explicit_rabbati_context_only"). Rather than fabricate a trace for an
  -- activation state this function cannot observe, it is reported honestly as context_required,
  -- while still surfacing the canonical result and the declared context contract so a future
  -- context-aware caller does not require a redesign.
  if p_method_key = 'אות רבתי' then
    return jsonb_build_object(
      'method_key', p_method_key, 'method_version', m.version, 'mathematical_family', m.mathematical_family,
      'execution_kind', m.execution_kind, 'input', p_phrase, 'result', v_canonical,
      'trace_kind', 'context_required',
      'steps', null,
      'context_contract', m.input_schema,
      'semantics', jsonb_build_object(
        'order_sensitive', m.order_sensitive, 'word_boundary_sensitive', m.word_boundary_sensitive,
        'per_word_reset', m.per_word_reset, 'full_phrase_continuation', m.full_phrase_continuation,
        'final_letter_sensitive', m.final_letter_sensitive
      ),
      'dependencies', case when m.derived_from is not null then to_jsonb(m.derived_from) else null end,
      'verification', jsonb_build_object('canonical_value', v_canonical, 'trace_value', null, 'parity', null),
      'provenance', jsonb_build_object('engine', 'gematria', 'function', m.function, 'method_version', m.version)
    );
  end if;

  -- LETTER_LEDGER: identity or square transform via a verified per-letter companion function
  -- (same building block the canonical *_calc/fn_* function itself sums over).
  v_letter_fn := case p_method_key
    when 'רגיל' then 'fn_letter_val'
    when 'מילוי' then 'fn_miluy_letter'
    when 'קדמי' then 'fn_kadmi_letter'
    when 'גדול' then 'fn_gadol_letter'
    when 'סידורי' then 'fn_siduri_letter'
    when 'אתבש' then 'fn_atbash_letter'
    when 'אלבם' then 'fn_albam_letter'
    when 'מיקום האות' then 'fn_mikum_haot_letter'
    when 'מילוי גדול' then 'fn_miluy_gadol_letter'
    when 'אותיות אחרי' then 'fn_otiot_after_letter'
    when 'אותיות לפני' then 'fn_otiot_before_letter'
    when 'משולש גדול' then 'fn_kadmi_gadol_letter'
    when 'מילוי דמילוי' then 'fn_miluy_demiluy_letter'
    when 'מילוי דמילוי גדול' then 'fn_miluy_demiluy_gadol_letter'
    else null
  end;
  v_square_fn := case p_method_key
    when 'הכפלה' then '_gem'
    when 'הכפלה גדולה' then '_gem_sofit'
    else null
  end;

  if (v_letter_fn is not null or v_square_fn is not null) and m.execution_kind = 'sql_function' then
    steps_arr := '[]'::jsonb;
    running := 0;
    pos := 0;
    for ch in select regexp_split_to_table(coalesce(p_phrase,''), '') loop
      pos := pos + 1;
      if v_letter_fn is not null then
        execute format('select %I($1)', v_letter_fn) into base using ch;
        base := coalesce(base,0);
        contribution := base;
      else
        execute format('select %I($1)', v_square_fn) into base using ch;
        base := coalesce(base,0);
        contribution := base::bigint * base::bigint;
      end if;
      running := running + contribution;
      steps_arr := steps_arr || jsonb_build_object(
        'index', pos, 'scope', 'letter', 'token', ch, 'position', pos,
        'base_value', base, 'transform', case when v_letter_fn is not null then 'identity' else 'square' end,
        'contribution', contribution, 'running_subtotal', running
      );
    end loop;
    v_trace_value := running;
    v_steps := steps_arr;
    v_trace_kind := 'LETTER_LEDGER';

  -- SUBSTITUTION_LEDGER: canonical transform(single letter) -> fn_letter_val(transformed letter).
  -- translate()-based transforms are inherently position/context-independent, so applying the
  -- SAME canonical transform function one letter at a time reconstructs the whole-phrase result
  -- exactly (verified empirically, not assumed).
  elsif p_method_key in ('אטבח','איק בכר') and m.execution_kind = 'sql_function' then
    v_transform_fn := case p_method_key when 'אטבח' then 'fn_atbach_transform' else 'aiq_bekar_transform' end;
    steps_arr := '[]'::jsonb;
    running := 0;
    pos := 0;
    for ch in select regexp_split_to_table(coalesce(p_phrase,''), '') loop
      pos := pos + 1;
      execute format('select %I($1)', v_transform_fn) into step_ch using ch;
      base := public.fn_letter_val(step_ch);
      running := running + base;
      steps_arr := steps_arr || jsonb_build_object(
        'index', pos, 'scope', 'letter', 'token', ch, 'position', pos,
        'transformed_token', step_ch, 'base_value', base, 'transform', 'substituted',
        'contribution', base, 'running_subtotal', running
      );
    end loop;
    v_trace_value := running;
    v_steps := steps_arr;
    v_trace_kind := 'SUBSTITUTION_LEDGER';

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

  -- CUMULATIVE_PREFIX: running prefix-sum snapshots; result = SUM of every snapshot (not just the
  -- last). word_reset (ריבוע/ריבוע גדול) resets the prefix at every word; continuation
  -- (משולש מילה/משולש הפוך) strips everything but Hebrew letters (matching the canonical body's
  -- own regexp_replace('[^א-ת]','','g'), spaces included) and walks the whole phrase as one
  -- sequence, forward or backward.
  elsif p_method_key in ('ריבוע','ריבוע גדול','משולש מילה','משולש הפוך') and m.execution_kind = 'sql_function' then
    v_value_fn := case p_method_key when 'ריבוע גדול' then 'fn_gadol_letter' else 'fn_letter_val' end;
    v_scope := case when p_method_key in ('ריבוע','ריבוע גדול') then 'word_reset' else 'continuation' end;
    v_direction := case when p_method_key = 'משולש הפוך' then 'reverse' else 'forward' end;
    grand := 0;

    if v_scope = 'word_reset' then
      words_arr := '[]'::jsonb;
      for word in select regexp_split_to_table(trim(coalesce(p_phrase,'')), '\s+') loop
        word_steps := '[]'::jsonb;
        prefix := 0;
        word_subtotal := 0;
        li := 0;
        for ch in select regexp_split_to_table(word, '') loop
          execute format('select %I($1)', v_value_fn) into base using ch;
          base := coalesce(base, 0);
          if base > 0 then
            li := li + 1;
            prefix := prefix + base;
            word_subtotal := word_subtotal + prefix;
            word_steps := word_steps || jsonb_build_object(
              'index', li, 'token', ch, 'base_value', base, 'prefix_subtotal', prefix
            );
          end if;
        end loop;
        words_arr := words_arr || jsonb_build_object('word', word, 'steps', word_steps, 'word_subtotal', word_subtotal);
        grand := grand + word_subtotal;
      end loop;
      v_steps := words_arr;
    else
      letters := array(select regexp_split_to_table(regexp_replace(coalesce(p_phrase,''), '[^א-ת]', '', 'g'), ''));
      n := coalesce(array_length(letters,1), 0);
      steps_arr := '[]'::jsonb;
      prefix := 0;
      li := 0;
      for idx in 1..n loop
        pos := case when v_direction = 'reverse' then n - idx + 1 else idx end;
        step_ch := letters[pos];
        execute format('select %I($1)', v_value_fn) into base using step_ch;
        base := coalesce(base, 0);
        li := li + 1;
        prefix := prefix + base;
        grand := grand + prefix;
        steps_arr := steps_arr || jsonb_build_object(
          'index', li, 'token', step_ch, 'original_position', pos, 'base_value', base, 'prefix_subtotal', prefix
        );
      end loop;
      v_steps := steps_arr;
    end if;

    v_trace_value := grand;
    v_trace_kind := 'CUMULATIVE_PREFIX';

  -- POSITION_WEIGHTED: per-word position reset; contribution = ragil-value x position-in-word.
  elsif p_method_key = 'משולש מדרגות' and m.execution_kind = 'sql_function' then
    words_arr := '[]'::jsonb;
    grand := 0;
    for word in select regexp_split_to_table(trim(coalesce(p_phrase,'')), '\s+') loop
      word_steps := '[]'::jsonb;
      word_subtotal := 0;
      pos_in_word := 0;
      for ch in select regexp_split_to_table(regexp_replace(word, '[^א-ת]', '', 'g'), '') loop
        pos_in_word := pos_in_word + 1;
        base := public.fn_ragil(ch);
        contribution := base::bigint * pos_in_word;
        word_subtotal := word_subtotal + contribution;
        word_steps := word_steps || jsonb_build_object(
          'index', pos_in_word, 'token', ch, 'position', pos_in_word, 'base_value', base,
          'contribution', contribution
        );
      end loop;
      words_arr := words_arr || jsonb_build_object('word', word, 'steps', word_steps, 'word_subtotal', word_subtotal);
      grand := grand + word_subtotal;
    end loop;
    v_trace_value := grand;
    v_steps := words_arr;
    v_trace_kind := 'POSITION_WEIGHTED';

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
  'GEMATRIA_TRACE_COVERAGE_COMPLETION_V1 (2026-09-03), extending GEMATRIA_SINGLE_TRUTH_FOUNDATION_CLOSURE_V1. Read-only reconstruction of HOW a governed gematria_methods result was produced -- never a second calculation authority. result always equals fn_method_value(method_key,phrase); if a computed trace ever disagrees, this function fails closed (status=error/TRACE_PARITY_MISMATCH). trace_kind is one of LETTER_LEDGER, SUBSTITUTION_LEDGER, ADJACENT_DIFFERENCE, CUMULATIVE_PREFIX, POSITION_WEIGHTED, COMPOSITE (recursive), "context_required" (אות רבתי -- the live dispatch signature carries no activation context, so the canonical result is still returned honestly without a fabricated trace), or "unavailable" (no independent trace attempted; canonical result still correct). Trace != Finding, Trace != Claim, Trace != interpretation (truth_axes_foundation_law). Coverage as of this migration: 31/32 active+in_engine methods with a real parity-verified trace, 1/32 (אות רבתי) with an honest context_required disposition, 0 unavailable-without-justification.';
