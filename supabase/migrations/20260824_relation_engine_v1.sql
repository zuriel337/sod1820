-- ============================================================================
-- RELATION ENGINE v1 — read-only candidate layer over the closed Numeric Root.
-- No new tree, no parallel relation DB, no second gematria engine. Reuses
-- ONLY: bidim, gematria_methods (incl. dependency_rules from the prior pass),
-- fn_composite_calc/fn_composite_calc_all_ops, edges, topic_cards,
-- research_objects, gematria_words. Never writes an edge. Every function here
-- is STABLE (read-only). status='candidate' always — Human-Gate still
-- required for any canonical promotion (reality_graph_law).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 0 — small gap fix, found while testing Part A on real candidates: the
-- 4 composite gematria_methods rows never got order_sensitive/word_boundary
-- metadata in the prior pass (that pass only covered atomic methods) — showed
-- up as group_is_position_sensitive=null for composite evidence rows.
-- Composite inherits sensitivity from its components (sum of an
-- order-sensitive atom is itself order-sensitive).
-- ----------------------------------------------------------------------------
UPDATE gematria_methods SET order_sensitive=false, word_boundary_sensitive=false, mathematical_family='composite_sum'
WHERE method_key IN ('רגיל+מילוי','רגיל+משולש');
UPDATE gematria_methods SET order_sensitive=true, word_boundary_sensitive=true, mathematical_family='composite_sum'
WHERE method_key IN ('רגיל+מסתתר','משולש מילה+משולש הפוך');

-- ----------------------------------------------------------------------------
-- PART A — DEPENDENCY-COLLAPSE FOR THE ACTUAL INPUT PAIR (Universal Ranking v3
-- core rule: Method Count != Evidence Count). Evaluates word-boundary/
-- final-letter conditions for THIS pair, not a static table. 2-hop transitive
-- closure over gematria_methods.dependency_rules — sufficient for the
-- currently-populated dependency graph (max observed clique size = 3:
-- {ריבוע, משולש מילה, ריבוע גדול}); documented scoped simplification, not a
-- generic union-find, since no longer chain exists in the live registry.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_relation_dependency_groups(p_a text, p_b text)
RETURNS TABLE (
  method text, value bigint, group_repr text, group_is_position_sensitive boolean,
  raw_frequency bigint, method_population bigint, normalized_rarity numeric
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  wc_a int; wc_b int; fl_a boolean; fl_b boolean;
BEGIN
  wc_a := array_length(regexp_split_to_array(trim(p_a), '\s+'), 1);
  wc_b := array_length(regexp_split_to_array(trim(p_b), '\s+'), 1);
  fl_a := p_a ~ '[ךםןףץ]';
  fl_b := p_b ~ '[ךםןףץ]';

  -- Note: RETURNS TABLE names (method/value/...) become implicit plpgsql
  -- variables inside this function body, so every internal CTE column below
  -- is deliberately aliased away from those names (mth/val/c_method) to avoid
  -- "column reference is ambiguous" at runtime.
  RETURN QUERY
  WITH matched AS (
    SELECT b1.method AS mth, b1.value AS val
    FROM bidim b1
    JOIN bidim b2 ON b2.method = b1.method AND b2.value = b1.value AND b2.phrase = p_b
    WHERE b1.phrase = p_a
  ),
  dep_edges AS (
    SELECT m.mth AS m1, (r ->> 'to') AS m2
    FROM matched m
    JOIN gematria_methods gm ON gm.method_key = m.mth
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(gm.dependency_rules, '[]'::jsonb)) r
    WHERE (r ->> 'to') IN (SELECT matched.mth FROM matched)
      AND (
        ((r ->> 'condition') = 'no_final_letters' AND NOT fl_a AND NOT fl_b) OR
        ((r ->> 'condition') = 'single_word_input' AND wc_a = 1 AND wc_b = 1) OR
        ((r ->> 'condition') = 'single_word_and_no_final_letters' AND wc_a = 1 AND wc_b = 1 AND NOT fl_a AND NOT fl_b)
      )
  ),
  all_edges AS (SELECT m1, m2 FROM dep_edges UNION SELECT m2, m1 FROM dep_edges),
  closure AS (
    SELECT m.mth AS c_method,
      (SELECT min(x) FROM (
        SELECT m.mth AS x
        UNION SELECT e1.m2 FROM all_edges e1 WHERE e1.m1 = m.mth
        UNION SELECT e2.m2 FROM all_edges e1 JOIN all_edges e2 ON e2.m1 = e1.m2 WHERE e1.m1 = m.mth
      ) t) AS group_repr
    FROM matched m
  )
  SELECT m.mth, m.val, c.group_repr,
    bool_or(gm2.order_sensitive) OVER (PARTITION BY c.group_repr),
    (SELECT count(*) FROM bidim x WHERE x.method = m.mth AND x.value = m.val),
    (SELECT count(*) FROM bidim x WHERE x.method = m.mth),
    round((SELECT count(*) FROM bidim x WHERE x.method = m.mth AND x.value = m.val)::numeric
          / NULLIF((SELECT count(*) FROM bidim x WHERE x.method = m.mth), 0), 6)
  FROM matched m
  JOIN closure c ON c.c_method = m.mth
  JOIN gematria_methods gm2 ON gm2.method_key = m.mth;
END;
$$;

COMMENT ON FUNCTION public.fn_relation_dependency_groups(text, text) IS
  'Per-actual-input-pair dependency collapse (word-boundary + final-letter conditions evaluated live, not a static table). Method Count != Evidence Count — group_repr is the true independent-evidence unit, method is the raw match.';

-- ----------------------------------------------------------------------------
-- PART B — NOISE / RELATION CLASSIFICATION. Labels, never deletes (Rank,
-- Don't Hide). anagram compares letter multisets with final letters
-- normalized to base (distinct purpose from AIQ BEKAR's raw-final table).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_relation_noise_flags(p_a text, p_b text)
RETURNS text[]
LANGUAGE plpgsql STABLE AS $$
DECLARE
  flags text[] := ARRAY[]::text[];
  a_clean text; b_clean text; a_no_niqqud text; b_no_niqqud text;
  a_sorted text; b_sorted text;
  med_rarity numeric;
BEGIN
  IF p_a = p_b THEN flags := array_append(flags, 'exact_duplicate'); END IF;

  a_no_niqqud := regexp_replace(p_a, '[֑-ׇ]', '', 'g');
  b_no_niqqud := regexp_replace(p_b, '[֑-ׇ]', '', 'g');
  IF p_a <> p_b AND a_no_niqqud = b_no_niqqud THEN flags := array_append(flags, 'niqqud_only_duplicate'); END IF;

  a_clean := translate(regexp_replace(a_no_niqqud, '[^א-ת]', '', 'g'), 'ךםןףץ', 'כמנפצ');
  b_clean := translate(regexp_replace(b_no_niqqud, '[^א-ת]', '', 'g'), 'ךםןףץ', 'כמנפצ');
  SELECT string_agg(ch, '' ORDER BY ch) INTO a_sorted FROM unnest(regexp_split_to_array(a_clean, '')) ch;
  SELECT string_agg(ch, '' ORDER BY ch) INTO b_sorted FROM unnest(regexp_split_to_array(b_clean, '')) ch;
  IF a_clean <> b_clean AND a_sorted = b_sorted AND length(a_clean) > 0 THEN
    flags := array_append(flags, 'anagram_same_letter_multiset');
  END IF;

  -- Rough ktiv/morphological-family heuristic: same consonant skeleton after
  -- stripping matres lectionis (אהוי) too — flagged as a heuristic, not a
  -- linguistic certainty.
  IF p_a <> p_b AND
     regexp_replace(a_clean, '[אהוי]', '', 'g') = regexp_replace(b_clean, '[אהוי]', '', 'g') AND
     regexp_replace(a_clean, '[אהוי]', '', 'g') <> '' THEN
    flags := array_append(flags, 'possible_ktiv_or_morphological_variant');
  END IF;

  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY normalized_rarity)
  INTO med_rarity FROM public.fn_relation_dependency_groups(p_a, p_b);
  IF med_rarity IS NOT NULL AND med_rarity > 0.01 THEN
    flags := array_append(flags, 'common_value_coincidence_dominated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fn_relation_dependency_groups(p_a, p_b)) THEN
    flags := array_append(flags, 'no_atomic_evidence');
  END IF;

  RETURN flags;
END;
$$;

-- ----------------------------------------------------------------------------
-- PART C — INDEPENDENT EVIDENCE (existing data only — edges/topic_cards/
-- research_objects). No new ELS search performed here.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_relation_independent_evidence(p_a text, p_b text)
RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  na uuid; nb uuid;
  edge_rows jsonb; tc_rows jsonb; ro_rows jsonb;
BEGIN
  SELECT node_id INTO na FROM gematria_words WHERE phrase = p_a AND node_id IS NOT NULL LIMIT 1;
  SELECT node_id INTO nb FROM gematria_words WHERE phrase = p_b AND node_id IS NOT NULL LIMIT 1;

  SELECT coalesce(jsonb_agg(jsonb_build_object('relation_type', e.relation_type, 'weight', e.weight)), '[]'::jsonb)
  INTO edge_rows
  FROM edges e
  WHERE na IS NOT NULL AND nb IS NOT NULL
    AND ((e.from_node = na AND e.to_node = nb) OR (e.from_node = nb AND e.to_node = na));

  SELECT coalesce(jsonb_agg(jsonb_build_object('slug', tc.slug, 'title', tc.title, 'quality', tc.quality, 'status', tc.status)), '[]'::jsonb)
  INTO tc_rows
  FROM topic_cards tc
  WHERE (tc.title ILIKE '%' || p_a || '%' OR tc.subtitle ILIKE '%' || p_a || '%' OR p_a = ANY(tc.search_terms))
    AND (tc.title ILIKE '%' || p_b || '%' OR tc.subtitle ILIKE '%' || p_b || '%' OR p_b = ANY(tc.search_terms));

  SELECT coalesce(jsonb_agg(jsonb_build_object('kind', ro.kind, 'statement', ro.statement, 'status', ro.status, 'confidence', ro.confidence)), '[]'::jsonb)
  INTO ro_rows
  FROM research_objects ro
  WHERE (p_a = ANY(ro.terms) AND p_b = ANY(ro.terms))
     OR (ro.statement ILIKE '%' || p_a || '%' AND ro.statement ILIKE '%' || p_b || '%');

  RETURN jsonb_build_object('edges', edge_rows, 'topic_cards', tc_rows, 'research_objects', ro_rows);
END;
$$;

-- ----------------------------------------------------------------------------
-- PART D — COMPOSITE REINFORCEMENT (per-candidate only, never a brute-force
-- sweep — task section 5). Uses the 4 approved composites' sum/diff/equal.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_relation_composite_evidence(p_a text, p_b text)
RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  ckey text; ra record; rb record; out_rows jsonb := '[]'::jsonb;
  composites text[] := ARRAY['רגיל+מילוי','רגיל+מסתתר','רגיל+משולש','משולש מילה+משולש הפוך'];
BEGIN
  FOREACH ckey IN ARRAY composites LOOP
    SELECT * INTO ra FROM public.fn_composite_calc_all_ops(ckey, p_a);
    SELECT * INTO rb FROM public.fn_composite_calc_all_ops(ckey, p_b);
    IF ra IS NOT NULL AND rb IS NOT NULL THEN
      IF ra.op_sum = rb.op_sum THEN
        out_rows := out_rows || jsonb_build_object('composite_key', ckey, 'operator', 'sum',
          'component_methods', ra.component_methods, 'value_a', ra.component_values, 'value_b', rb.component_values, 'result', ra.op_sum,
          'atomic_components_also_matched', (ra.component_values = rb.component_values));
      END IF;
      IF ra.op_diff = rb.op_diff THEN
        out_rows := out_rows || jsonb_build_object('composite_key', ckey, 'operator', 'diff',
          'component_methods', ra.component_methods, 'value_a', ra.component_values, 'value_b', rb.component_values, 'result', ra.op_diff);
      END IF;
    END IF;
  END LOOP;
  RETURN out_rows;
END;
$$;

COMMENT ON FUNCTION public.fn_relation_composite_evidence(text, text) IS
  'Composite reinforcement — SECONDARY, per-candidate only (never automatic universal sweep, task section 5/14). SUM is the indexed default; DIFF checked here on-demand only, matching the Composite contract (SUM materialized, DIFF stays deep-research on-demand).';

-- ----------------------------------------------------------------------------
-- PART E — CANONICAL RELATION CANDIDATE PAYLOAD. Candidate != Edge — never
-- writes to edges/nodes. status is always 'candidate'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_relation_candidate(p_a text, p_b text)
RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  node_a uuid; node_b uuid;
  engine_evidence jsonb; composite_evidence jsonb; independent_evidence jsonb; noise_flags text[];
  independent_group_count int; position_sensitive_group_count int; min_rarity numeric; rarity_bonus numeric;
  engine_signal numeric; has_independent boolean; research_priority text; confidence text;
BEGIN
  SELECT node_id INTO node_a FROM gematria_words WHERE phrase = p_a LIMIT 1;
  SELECT node_id INTO node_b FROM gematria_words WHERE phrase = p_b LIMIT 1;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'method', method, 'value', value, 'group_repr', group_repr,
           'group_is_position_sensitive', group_is_position_sensitive,
           'raw_frequency', raw_frequency, 'method_population', method_population,
           'normalized_rarity', normalized_rarity)), '[]'::jsonb),
         count(DISTINCT group_repr),
         count(DISTINCT group_repr) FILTER (WHERE group_is_position_sensitive),
         min(normalized_rarity)
  INTO engine_evidence, independent_group_count, position_sensitive_group_count, min_rarity
  FROM public.fn_relation_dependency_groups(p_a, p_b);

  SELECT coalesce(sum(1 - g.min_rarity), 0) INTO rarity_bonus
  FROM (
    SELECT group_repr, min(normalized_rarity) AS min_rarity
    FROM public.fn_relation_dependency_groups(p_a, p_b)
    GROUP BY group_repr
  ) g;

  engine_signal := round(
    coalesce(independent_group_count, 0)::numeric
    + coalesce(position_sensitive_group_count, 0)::numeric
    + coalesce(rarity_bonus, 0), 3);

  composite_evidence := public.fn_relation_composite_evidence(p_a, p_b);
  independent_evidence := public.fn_relation_independent_evidence(p_a, p_b);
  noise_flags := public.fn_relation_noise_flags(p_a, p_b);

  has_independent := (jsonb_array_length(independent_evidence->'edges') > 0
                    OR jsonb_array_length(independent_evidence->'topic_cards') > 0
                    OR jsonb_array_length(independent_evidence->'research_objects') > 0);

  research_priority := CASE
    WHEN has_independent AND engine_signal >= 2 THEN 'HIGH_ENGINE_AND_EVIDENCE'
    WHEN has_independent THEN 'EVIDENCE_BACKED'
    WHEN engine_signal >= 3 THEN 'HIGH_ENGINE_NO_EVIDENCE_YET'
    WHEN 'exact_duplicate' = ANY(noise_flags) OR 'niqqud_only_duplicate' = ANY(noise_flags) THEN 'NOISE_TECHNICAL_DUPLICATE'
    WHEN 'anagram_same_letter_multiset' = ANY(noise_flags) AND independent_group_count <= 1 THEN 'LOW_LIKELY_NOISE'
    ELSE 'LOW_UNRANKED'
  END;

  confidence := CASE
    WHEN 'exact_duplicate' = ANY(noise_flags) OR 'niqqud_only_duplicate' = ANY(noise_flags) THEN 'noise'
    WHEN has_independent THEN 'evidence_backed_candidate'
    WHEN engine_signal >= 3 AND NOT ('anagram_same_letter_multiset' = ANY(noise_flags)) THEN 'engine_strong_candidate'
    ELSE 'weak_candidate'
  END;

  RETURN jsonb_build_object(
    'entity_a', p_a, 'entity_a_node_id', node_a,
    'entity_b', p_b, 'entity_b_node_id', node_b,
    'relation_kind', 'gematria_convergence',
    'engine_evidence', engine_evidence,
    'composite_evidence', composite_evidence,
    'independent_evidence', independent_evidence,
    'noise_flags', to_jsonb(noise_flags),
    'engine_signal', engine_signal,
    'engine_signal_components', jsonb_build_object(
      'independent_group_count', independent_group_count,
      'position_sensitive_group_count', position_sensitive_group_count,
      'rarity_bonus', round(rarity_bonus, 3), 'min_rarity', min_rarity),
    'research_priority', research_priority,
    'confidence', confidence,
    'provenance', format('fn_relation_candidate computed %s <-> %s via bidim+gematria_methods.dependency_rules+edges+topic_cards+research_objects, read-only', p_a, p_b),
    'status', 'candidate'
  );
END;
$$;

COMMENT ON FUNCTION public.fn_relation_candidate(text, text) IS
  'Canonical Relation Candidate payload (reality_graph_law). ENGINE_SIGNAL / INDEPENDENT_EVIDENCE / RESEARCH_PRIORITY always kept separate and visible, never collapsed into one opaque score. Candidate != Edge — this function NEVER writes to edges/nodes. status=candidate always; canonical promotion requires separate Human-Gate.';

-- ============================================================================
-- Self-check (read-only, run manually after apply):
--   select fn_relation_candidate('ירושלים','שומרים');
--   select fn_relation_candidate('סבל','פחד');
--   select fn_relation_candidate('יראה','רוגז');
-- ============================================================================
