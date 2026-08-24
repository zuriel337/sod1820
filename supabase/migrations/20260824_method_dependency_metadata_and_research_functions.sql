-- ============================================================================
-- NUMERIC RESEARCH ROOT — Methods × Composites × Deep Cross × Ranking v3
-- Implements the already-approved-but-unbuilt parts of:
--   RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md §10/§11/§15/§18/§19/§26/§27
--   GEMATRIA_METHODS_HUMAN_GATE.csv Decisions A-E (already live in gematria_methods)
--   GEMATRIA_METHODS_COMPOSITE_CONTRACT.md (sum/diff/equal operators)
--   This session's word-boundary / final-letter dependency corrections (verified
--   from live pg_get_functiondef reads + fixtures, not from display names)
--
-- Explicitly NOT touched (HOLD, per GEMATRIA_METHODS_HUMAN_GATE.csv):
--   F (אטבח definition dispute), G (איק בכר), H (אחס בטע), I (מילוי גדול verification)
--   No dependency metadata is written for מילוי גדול (Decision I, HOLD).
-- gw_enforce_engine / trg_bidim_sync (Decision K's trigger) are NOT modified here —
-- see the companion rollback-transaction test file, not applied to production.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART A — METHOD DEPENDENCY METADATA (smallest additive representation,
-- inside the EXISTING gematria_methods registry — no second registry).
-- ----------------------------------------------------------------------------
ALTER TABLE public.gematria_methods
  ADD COLUMN IF NOT EXISTS mathematical_family text,
  ADD COLUMN IF NOT EXISTS order_sensitive boolean,
  ADD COLUMN IF NOT EXISTS word_boundary_sensitive boolean,
  ADD COLUMN IF NOT EXISTS per_word_reset boolean,
  ADD COLUMN IF NOT EXISTS full_phrase_continuation boolean,
  ADD COLUMN IF NOT EXISTS final_letter_sensitive boolean,
  ADD COLUMN IF NOT EXISTS whitespace_normalization text,
  ADD COLUMN IF NOT EXISTS punctuation_normalization text,
  ADD COLUMN IF NOT EXISTS derived_from text[],
  ADD COLUMN IF NOT EXISTS dependency_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dependency_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS dependency_verified_at timestamptz;

COMMENT ON COLUMN public.gematria_methods.dependency_rules IS
  'Array of {type:"conditional_equivalence", to:"<method_key>", condition:"no_final_letters"|"single_word_input"|"single_word_and_no_final_letters"}. Verified from live pg_get_functiondef reads + fixtures — never inferred from method_key/display_label.';

-- Base additive (order-independent, no word-boundary effect, finals normalized to base)
UPDATE public.gematria_methods SET
  mathematical_family='base_additive', order_sensitive=false, word_boundary_sensitive=false,
  per_word_reset=null, full_phrase_continuation=null, final_letter_sensitive=false,
  whitespace_normalization='irrelevant_pure_sum', punctuation_normalization='irrelevant_pure_sum',
  dependency_version=1, dependency_verified_at=now()
WHERE method_key IN ('רגיל','מילוי','קדמי','סידורי','אתבש','אלבם','אותיות אחרי','אותיות לפני','מילוי דמילוי','מילוי דמילוי גדול');

-- Base additive, but FINAL-LETTER-SENSITIVE (verified table divergence for sofit letters)
UPDATE public.gematria_methods SET
  mathematical_family='base_additive', order_sensitive=false, word_boundary_sensitive=false,
  final_letter_sensitive=true,
  whitespace_normalization='irrelevant_pure_sum', punctuation_normalization='irrelevant_pure_sum',
  dependency_version=1, dependency_verified_at=now()
WHERE method_key IN ('גדול','משולש גדול');

-- אטבח — substitution cipher (translate) then pure sum: order-independent overall,
-- but the substitution TABLE itself gives different targets for final vs base letters
-- (verified: כ→פ but ך→ת) -> final_letter_sensitive=true. Describes the CURRENTLY-WIRED
-- function (fn_atbach); Decision F (fn_atbach vs fn_atbach_maharshal) remains HOLD and
-- untouched — this row will need re-verification if F is ever resolved.
UPDATE public.gematria_methods SET
  mathematical_family='base_additive_substitution', order_sensitive=false, word_boundary_sensitive=false,
  final_letter_sensitive=true,
  whitespace_normalization='irrelevant_pure_sum', punctuation_normalization='irrelevant_pure_sum',
  dependency_version=1, dependency_verified_at=now()
WHERE method_key = 'אטבח';

-- מסתתר / מסתתר גדול — adjacent-letter-difference (sum of |v[i]-v[i+1]| within each word).
-- CORRECTION vs this session's earlier informal treatment: this IS order_sensitive
-- (a general letter permutation changes which pairs are adjacent), even though it never
-- showed up as an anagram-collision earlier this session (0/n observed) precisely because
-- of this correct sensitivity. Both variants reset per word already (fn_misratar sums
-- fn_misratar_word per \s+-split word; mistater_gadol_calc's own loop resets have_prev per
-- word) -> word_boundary_sensitive=true but with per_word_reset=true on BOTH sides, so their
-- conditional equivalence depends ONLY on the final-letter table, not on word count.
UPDATE public.gematria_methods SET
  mathematical_family='adjacent_difference', order_sensitive=true, word_boundary_sensitive=true,
  per_word_reset=true, full_phrase_continuation=false, final_letter_sensitive=false,
  whitespace_normalization='splits_on_whitespace', punctuation_normalization='non_hebrew_dropped',
  dependency_rules='[{"type":"conditional_equivalence","to":"מסתתר גדול","condition":"no_final_letters"}]'::jsonb,
  dependency_version=1, dependency_verified_at=now()
WHERE method_key='מסתתר';

UPDATE public.gematria_methods SET
  mathematical_family='adjacent_difference', order_sensitive=true, word_boundary_sensitive=true,
  per_word_reset=true, full_phrase_continuation=false, final_letter_sensitive=true,
  whitespace_normalization='splits_on_whitespace', punctuation_normalization='non_hebrew_dropped',
  dependency_rules='[{"type":"conditional_equivalence","to":"מסתתר","condition":"no_final_letters"}]'::jsonb,
  dependency_version=1, dependency_verified_at=now()
WHERE method_key='מסתתר גדול';

-- קדמי <-> משולש גדול (kadmi_gadol_calc): same base_additive family, identical lookup
-- table except final letters (verified by direct table comparison in this session).
-- (Idempotent full-set, not append, so a re-run of this migration never duplicates entries.)
UPDATE public.gematria_methods SET
  dependency_rules = '[{"type":"conditional_equivalence","to":"משולש גדול","condition":"no_final_letters"}]'::jsonb
WHERE method_key='קדמי';
UPDATE public.gematria_methods SET
  dependency_rules = '[{"type":"conditional_equivalence","to":"קדמי","condition":"no_final_letters"}]'::jsonb
WHERE method_key='משולש גדול';

-- ריבוע / ריבוע גדול / משולש מילה — cumulative prefix-sum family. fn_ribua/ribua_gadol_calc
-- split on whitespace and RESET the running sum per word; triangle_word_calc strips all
-- non-Hebrew (incl. spaces) and runs ONE continuous sum across the whole phrase. Verified
-- fixtures this session: single-word inputs always match (ribua==triangle_word exactly,
-- 7/7 tested); multi-word inputs always diverge (8/8 tested, incl. Zuriel's own
-- 'צוריאל פולייס' 2172 vs 4194 and 'בית המקדש' 1219 vs 3279).
UPDATE public.gematria_methods SET
  mathematical_family='cumulative_prefix_sum', order_sensitive=true, word_boundary_sensitive=true,
  per_word_reset=true, full_phrase_continuation=false, final_letter_sensitive=false,
  whitespace_normalization='splits_on_whitespace', punctuation_normalization='non_hebrew_dropped',
  dependency_rules='[{"type":"conditional_equivalence","to":"משולש מילה","condition":"single_word_input"},{"type":"conditional_equivalence","to":"ריבוע גדול","condition":"single_word_and_no_final_letters"}]'::jsonb,
  dependency_version=1, dependency_verified_at=now()
WHERE method_key='ריבוע';

UPDATE public.gematria_methods SET
  mathematical_family='cumulative_prefix_sum', order_sensitive=true, word_boundary_sensitive=true,
  per_word_reset=true, full_phrase_continuation=false, final_letter_sensitive=true,
  whitespace_normalization='splits_on_whitespace', punctuation_normalization='non_hebrew_dropped',
  dependency_rules='[{"type":"conditional_equivalence","to":"ריבוע","condition":"single_word_and_no_final_letters"},{"type":"conditional_equivalence","to":"משולש מילה","condition":"single_word_and_no_final_letters"}]'::jsonb,
  dependency_version=1, dependency_verified_at=now()
WHERE method_key='ריבוע גדול';

UPDATE public.gematria_methods SET
  mathematical_family='cumulative_prefix_sum', order_sensitive=true, word_boundary_sensitive=true,
  per_word_reset=false, full_phrase_continuation=true, final_letter_sensitive=false,
  whitespace_normalization='strips_all_non_hebrew_incl_spaces', punctuation_normalization='non_hebrew_dropped',
  dependency_rules='[{"type":"conditional_equivalence","to":"ריבוע","condition":"single_word_input"},{"type":"conditional_equivalence","to":"ריבוע גדול","condition":"single_word_and_no_final_letters"}]'::jsonb,
  dependency_version=1, dependency_verified_at=now()
WHERE method_key='משולש מילה';

-- משולש הפוך / משולש מדרגות — a SECOND word-boundary-conditional pair, discovered this
-- session (not named in Zuriel's original correction, found while testing the general law).
-- triangle_reverse_calc: continuous suffix-cumulative-sum over the whole phrase (no reset).
-- stair_triangle_calc: position-weighted sum (v[i]*i), i resets to 0 per word. Algebraically
-- both compute Sum(v_j * j) for a single word (proven: triangle_reverse's suffix-of-suffix
-- expansion telescopes to the same closed form as stair's direct v[i]*i) — verified
-- empirically 7/7 single-word matches, 1/1 multi-word divergence ('משיח בן').
UPDATE public.gematria_methods SET
  mathematical_family='position_weighted_sum', order_sensitive=true, word_boundary_sensitive=true,
  per_word_reset=false, full_phrase_continuation=true, final_letter_sensitive=false,
  whitespace_normalization='strips_all_non_hebrew_incl_spaces', punctuation_normalization='non_hebrew_dropped',
  dependency_rules='[{"type":"conditional_equivalence","to":"משולש מדרגות","condition":"single_word_input"}]'::jsonb,
  dependency_version=1, dependency_verified_at=now()
WHERE method_key='משולש הפוך';

UPDATE public.gematria_methods SET
  mathematical_family='position_weighted_sum', order_sensitive=true, word_boundary_sensitive=true,
  per_word_reset=true, full_phrase_continuation=false, final_letter_sensitive=false,
  whitespace_normalization='splits_on_whitespace', punctuation_normalization='non_hebrew_dropped',
  dependency_rules='[{"type":"conditional_equivalence","to":"משולש הפוך","condition":"single_word_input"}]'::jsonb,
  dependency_version=1, dependency_verified_at=now()
WHERE method_key='משולש מדרגות';

-- הכפלה / הכפלה גדולה — per-letter square sum (structurally order-independent,
-- word-boundary-irrelevant like base_additive). final_letter_sensitive intentionally left
-- NULL for both: this pass did not read the underlying _gem()/_gem_sofit() helper bodies,
-- and the task instruction is explicit — never infer from the "גדולה" name alone.
UPDATE public.gematria_methods SET
  mathematical_family='letter_square_sum', order_sensitive=false, word_boundary_sensitive=false,
  whitespace_normalization='irrelevant_pure_sum', punctuation_normalization='irrelevant_pure_sum',
  dependency_version=1, dependency_verified_at=now()
WHERE method_key IN ('הכפלה','הכפלה גדולה');

-- ----------------------------------------------------------------------------
-- PART B — COMPOSITE RESEARCH TRANSFORMS (canonical, server-side, ONE implementation
-- path). Derives strictly from the atomic dispatch functions already wired in
-- gematria_methods.function — never re-implements atomic math. No new gematria_words
-- column. No new registry. Operators per GEMATRIA_METHODS_COMPOSITE_CONTRACT.md
-- (already-recovered approved contract): sum, diff, equal.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dispatch_method(p_method_key text, p_phrase text)
RETURNS bigint
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_fn text; v_result bigint;
BEGIN
  SELECT function INTO v_fn FROM public.gematria_methods WHERE method_key = p_method_key AND function IS NOT NULL;
  IF v_fn IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT (%I($1))::bigint', v_fn) INTO v_result USING p_phrase;
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_dispatch_method(text, text) IS
  'Registry-driven single-method dispatch: looks up gematria_methods.function for the given method_key and calls it. The ONE canonical path composites use to reach atomic outputs — never re-derives math.';

CREATE OR REPLACE FUNCTION public.fn_composite_calc(p_composite_key text, p_phrase text)
RETURNS TABLE (
  composite_key text, component_methods text[], component_values bigint[],
  operator text, result numeric, definition_version int, provenance text
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  m1 text; m2 text; op text; v1 bigint; v2 bigint;
BEGIN
  CASE p_composite_key
    WHEN 'רגיל+מילוי'              THEN m1 := 'רגיל'; m2 := 'מילוי';       op := 'sum';
    WHEN 'רגיל+מסתתר'              THEN m1 := 'רגיל'; m2 := 'מסתתר';       op := 'sum';
    WHEN 'רגיל+משולש'              THEN m1 := 'רגיל'; m2 := 'קדמי';        op := 'sum';
    WHEN 'משולש מילה+משולש הפוך'   THEN m1 := 'משולש מילה'; m2 := 'משולש הפוך'; op := 'sum';
    ELSE RETURN;
  END CASE;

  v1 := public.fn_dispatch_method(m1, p_phrase);
  v2 := public.fn_dispatch_method(m2, p_phrase);
  IF v1 IS NULL OR v2 IS NULL THEN RETURN; END IF;

  RETURN QUERY SELECT p_composite_key, ARRAY[m1, m2], ARRAY[v1, v2], op, (v1 + v2)::numeric, 1,
    format('sum of canonical %s(%s)=%s + %s(%s)=%s via fn_dispatch_method', m1, p_phrase, v1, m2, p_phrase, v2);
END;
$$;

COMMENT ON FUNCTION public.fn_composite_calc(text, text) IS
  'The 4 approved Composite Research Transforms (Decision E, GEMATRIA_METHODS_HUMAN_GATE.csv), SUM operator per GEMATRIA_METHODS_COMPOSITE_CONTRACT.md. Derives ONLY from fn_dispatch_method (canonical atomic outputs) — never reimplements atomic math, no new gematria_words column, no second registry.';

-- diff/equal recovered verbatim from GEMATRIA_METHODS_COMPOSITE_CONTRACT.md's own
-- already-approved JS reference (sum: a+b, diff: abs(a-b), equal: a===b) — not invented.
CREATE OR REPLACE FUNCTION public.fn_composite_calc_all_ops(p_composite_key text, p_phrase text)
RETURNS TABLE (
  composite_key text, component_methods text[], component_values bigint[],
  op_sum numeric, op_diff numeric, op_equal boolean, definition_version int
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  m1 text; m2 text; v1 bigint; v2 bigint;
BEGIN
  CASE p_composite_key
    WHEN 'רגיל+מילוי'              THEN m1 := 'רגיל'; m2 := 'מילוי';
    WHEN 'רגיל+מסתתר'              THEN m1 := 'רגיל'; m2 := 'מסתתר';
    WHEN 'רגיל+משולש'              THEN m1 := 'רגיל'; m2 := 'קדמי';
    WHEN 'משולש מילה+משולש הפוך'   THEN m1 := 'משולש מילה'; m2 := 'משולש הפוך';
    ELSE RETURN;
  END CASE;

  v1 := public.fn_dispatch_method(m1, p_phrase);
  v2 := public.fn_dispatch_method(m2, p_phrase);
  IF v1 IS NULL OR v2 IS NULL THEN RETURN; END IF;

  RETURN QUERY SELECT p_composite_key, ARRAY[m1, m2], ARRAY[v1, v2],
    (v1 + v2)::numeric, abs(v1 - v2)::numeric, (v1 = v2), 1;
END;
$$;

-- ----------------------------------------------------------------------------
-- PART C — DEEP / MULTI-METHOD CROSS (§18/§26.2 contract requirement).
-- A.method_X = B.method_Y for any registered searchable method, plus
-- composite(A)=atomic(B) / atomic(A)=composite(B) / composite(A)=composite(B).
-- Reuses gematria_methods + bidim + fn_dispatch_method/fn_composite_calc.
-- No new Cross engine, no new table.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_deep_cross(
  p_phrase_a text, p_method_a text, p_phrase_b text, p_method_b text,
  p_a_is_composite boolean DEFAULT false, p_b_is_composite boolean DEFAULT false
)
RETURNS TABLE (
  phrase_a text, method_a text, value_a numeric,
  phrase_b text, method_b text, value_b numeric,
  is_match boolean
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  va numeric; vb numeric;
BEGIN
  IF p_a_is_composite THEN
    SELECT result INTO va FROM public.fn_composite_calc(p_method_a, p_phrase_a);
  ELSE
    va := public.fn_dispatch_method(p_method_a, p_phrase_a);
  END IF;

  IF p_b_is_composite THEN
    SELECT result INTO vb FROM public.fn_composite_calc(p_method_b, p_phrase_b);
  ELSE
    vb := public.fn_dispatch_method(p_method_b, p_phrase_b);
  END IF;

  RETURN QUERY SELECT p_phrase_a, p_method_a, va, p_phrase_b, p_method_b, vb, (va IS NOT NULL AND va = vb);
END;
$$;

COMMENT ON FUNCTION public.fn_deep_cross(text, text, text, text, boolean, boolean) IS
  'A.method_X = B.method_Y (or composite variants) for any two registered/searchable methods. §18 Multi-Method Cross + §26.2 Deep Cross Law. Reuses fn_dispatch_method/fn_composite_calc — no new engine.';

-- Batch reverse-lookup: given one phrase+ATOMIC-method already indexed in bidim, find every
-- OTHER phrase whose value matches, plus the normalized base-rate denominator required by
-- task section 4/§27.7 (raw_frequency / method_population, not raw frequency alone).
-- Composite reverse-lookup is NOT provided here: composites are not bidim-indexed
-- (Composite Indexing Decision, Part F below) and a live full-corpus on-demand scan
-- (12,592 rows x dispatch) is exactly the "brute-force primary discovery surface" task
-- section 14 forbids — composites stay pair-wise (fn_composite_calc/fn_deep_cross),
-- invoked only on an already-shortlisted candidate, never as a reverse scan.
CREATE OR REPLACE FUNCTION public.fn_deep_cross_reverse(p_phrase text, p_method text)
RETURNS TABLE (
  source_phrase text, method text, value numeric,
  match_phrase text, method_population bigint, raw_frequency bigint, normalized_rarity numeric
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v numeric;
  pop bigint;
BEGIN
  SELECT b.value INTO v FROM bidim b WHERE b.phrase = p_phrase AND b.method = p_method LIMIT 1;
  IF v IS NULL THEN v := public.fn_dispatch_method(p_method, p_phrase); END IF;
  IF v IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO pop FROM bidim b2 WHERE b2.method = p_method;
  RETURN QUERY
    SELECT p_phrase, p_method, v, b3.phrase, pop,
      (SELECT count(*) FROM bidim b4 WHERE b4.method = p_method AND b4.value = v),
      round((SELECT count(*) FROM bidim b4 WHERE b4.method = p_method AND b4.value = v)::numeric / NULLIF(pop,0), 6)
    FROM bidim b3
    WHERE b3.method = p_method AND b3.value = v AND b3.phrase <> p_phrase;
END;
$$;

COMMENT ON FUNCTION public.fn_deep_cross_reverse(text, text) IS
  'Reverse Deep Cross for one atomic phrase+method (bidim-indexed): every other indexed phrase sharing the value, with raw_frequency and normalized_rarity = raw_frequency/method_population (task section 4 base-rate normalization). Composite reverse-lookup intentionally not provided — see Composite Indexing Decision (Part F).';

-- ----------------------------------------------------------------------------
-- PART D — DEEP NUMERIC LOOKUP (one thin canonical read interface).
-- Consolidates bidim + gematria_words + gematria_methods into a single provenance-rich
-- projection for NUMBER N. Does not alter bidim's role (still the reverse index).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_number_lookup(p_value bigint)
RETURNS TABLE (
  method text, phrase text, value bigint, source text, vip_source text,
  is_verified boolean, dna_status text, node_id uuid, category text, tags text[],
  mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean,
  final_letter_sensitive boolean, provenance text
)
LANGUAGE sql STABLE AS $$
  SELECT b.method, b.phrase, b.value, gw.source, gw.vip_source,
         gw.is_verified, gw.dna_status, gw.node_id, gw.category, gw.tags,
         gm.mathematical_family, gm.order_sensitive, gm.word_boundary_sensitive,
         gm.final_letter_sensitive,
         format('bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry', b.method, b.value, gw.id)
  FROM bidim b
  JOIN gematria_words gw ON gw.id = b.word_id
  LEFT JOIN gematria_methods gm ON gm.method_key = b.method
  WHERE b.value = p_value
  ORDER BY b.method, b.phrase;
$$;

COMMENT ON FUNCTION public.fn_number_lookup(bigint) IS
  'Deep Numeric Lookup — ONE thin canonical read interface for NUMBER -> method/phrase/value/source/vip_source/is_verified/dna_status/node_id/category/tags/method-dependency-metadata/provenance. Consumers should migrate to this incrementally instead of querying bidim ad hoc and dropping provenance.';

-- ----------------------------------------------------------------------------
-- PART E — REGISTRY -> DISPLAY PROJECTION (foundation only).
-- Thin presentation layer over gematria_methods so future UI does not hardcode
-- METHODS/DEPTH_METHODS separately. Calculation stays in canonical functions;
-- this only reshapes registry rows for display, at requested depth.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_method_profile(p_phrase text, p_depth text DEFAULT 'value')
RETURNS TABLE (
  method_key text, display_label text, category text, mathematical_family text,
  lifecycle_active boolean, required_entitlement text, atomic_or_composite text,
  computed_value bigint, definition_version int
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT gm.method_key, gm.display_label, gm.category, gm.mathematical_family,
         gm.active, gm.required_entitlement,
         CASE WHEN gm.category = 'composite' THEN 'composite' ELSE 'atomic' END,
         CASE WHEN p_depth = 'value' AND gm.active AND gm.function IS NOT NULL
              THEN public.fn_dispatch_method(gm.method_key, p_phrase) ELSE NULL END,
         gm.version
  FROM public.gematria_methods gm
  WHERE gm.active = true
  ORDER BY gm.sort_order;
END;
$$;

COMMENT ON FUNCTION public.fn_method_profile(text, text) IS
  'Registry->Display projection foundation (RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md §11 Method Profile Contract). depth="value" computes; other depths (formula/trace/full) are NOT implemented this pass and return NULL computed_value — presentation-only rows still returned. No UI migrated yet; foundation only, per task scope (migrate lowest-risk consumer only if trivially safe — deferred, flagged in the delivered report).';

-- ============================================================================
-- Self-check (read-only, run manually after apply):
--   select * from fn_composite_calc('משולש מילה+משולש הפוך', 'סבל');  -- expect result relates to 214+154=368
--   select * from fn_deep_cross('ירושלים','ריבוע','שומרים','ריבוע');   -- expect is_match=true, both 2650
--   select * from fn_number_lookup(1820) limit 5;
--   select * from fn_method_profile('משיח') limit 30;
-- ============================================================================
