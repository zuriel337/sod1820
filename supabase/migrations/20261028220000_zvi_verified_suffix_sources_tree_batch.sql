-- ZVI VERIFIED SUFFIX-SOURCE CALCULATIONS TREE BATCH
-- Bounded admission of verified public findings whose source locator has a precise
-- sub-occurrence suffix (#...).  The suffix is provenance, not a new source.

DO $batch$
DECLARE
  v_admin_id uuid; v_admin_count integer; v_count integer; v_digest text;
  v_processed integer := 0; v_target_count integer; v_result jsonb; v_row record;
  v_note constant text :=
    'ZURIEL explicit Human-Gate 2026-10-28: bulk-admit this approved public, engine-verified Zvi calculation under its exact existing number result; retain the precise source occurrence and all duplicate provenance.';
BEGIN
  SELECT count(*), min(id::text)::uuid INTO v_admin_count, v_admin_id
  FROM public.users WHERE role = 'admin';
  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  LOCK TABLE public.research_objects IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.channel_updates IN SHARE MODE;
  LOCK TABLE public.nodes IN SHARE MODE;

  CREATE TEMP TABLE _zvi_verified_suffix_sources_tree_batch ON COMMIT DROP AS
  WITH zvi_sources AS (
    SELECT cu.id
    FROM public.channel_updates cu
    JOIN public.contributors c ON c.id = cu.contributor_id
    WHERE c.slug = 'tzvi-opoc' AND cu.status = 'live' AND cu.page_only IS FALSE
  ), candidates AS (
    SELECT ro.id, ro.source_ref, ro.value, ro.statement, ro.terms, ro.relates,
      ro.engine_detail, ro.meta,
      row_number() OVER (
        PARTITION BY ro.source_ref, ro.value
        ORDER BY length(coalesce(ro.statement, '')) DESC,
          cardinality(coalesce(ro.terms, '{}'::text[])) DESC,
          cardinality(coalesce(ro.relates, '{}'::text[])) DESC, ro.id
      ) AS representative_rank
    FROM public.research_objects ro
    JOIN zvi_sources source_row
      ON split_part(replace(ro.source_ref, 'channel_updates:', ''), '#', 1) = source_row.id::text
    WHERE ro.privacy_scope = 'public'
      AND ro.status = 'approved'
      AND ro.promoted_node_id IS NULL
      AND ro.engine_verified IS TRUE
      AND coalesce(ro.engine_detail->>'verification_state', '') IN ('match', 'match_numeric_only')
      AND ro.kind NOT IN ('hypothesis', 'question')
      AND ro.value IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.research_objects already
        WHERE already.source_ref = ro.source_ref
          AND already.value IS NOT DISTINCT FROM ro.value
          AND already.status = 'canonical'
          AND already.promoted_node_id IS NOT NULL
      )
  ), representatives AS (
    SELECT c.*, count(node.id) AS target_count,
      (array_agg(node.id ORDER BY node.id::text))[1] AS target_node_id
    FROM candidates c
    LEFT JOIN public.nodes node ON node.type = 'number' AND node.is_active IS TRUE
      AND coalesce(node.metadata->>'space', 'core') = 'core'
      AND node.label = c.value::text
    WHERE c.representative_rank = 1
    GROUP BY c.id, c.source_ref, c.value, c.statement, c.terms, c.relates,
      c.engine_detail, c.meta, c.representative_rank
  ), eligible AS (
    SELECT * FROM representatives WHERE target_count = 1
    ORDER BY source_ref, value, id
    LIMIT 28
  )
  SELECT * FROM eligible;

  SELECT count(*), md5(string_agg(
    id::text || '|' || source_ref || '|' || value::text || '|' || coalesce(statement, '')
      || '|' || coalesce(engine_detail::text, '{}'), E'\n' ORDER BY source_ref, value, id
  )) INTO v_count, v_digest
  FROM _zvi_verified_suffix_sources_tree_batch;

  IF v_count <> 28 OR v_digest <> 'c8061f08fa6d9322f608410cd67b727b' THEN
    RAISE EXCEPTION 'audited suffix-source batch drift: count %, digest %', v_count, v_digest;
  END IF;
  IF EXISTS (SELECT 1 FROM _zvi_verified_suffix_sources_tree_batch WHERE target_count <> 1 OR target_node_id IS NULL) THEN
    RAISE EXCEPTION 'each finding requires exactly one active core number target';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  FOR v_row IN SELECT * FROM _zvi_verified_suffix_sources_tree_batch ORDER BY source_ref, value, id LOOP
    SELECT count(*) INTO v_target_count FROM public.nodes node
    WHERE node.id = v_row.target_node_id AND node.type = 'number' AND node.is_active IS TRUE
      AND coalesce(node.metadata->>'space', 'core') = 'core' AND node.label = v_row.value::text;
    IF v_target_count <> 1 THEN
      RAISE EXCEPTION 'finding % target % drifted', v_row.id, v_row.target_node_id;
    END IF;

    SELECT public.admin_research_review(v_row.id, 'canonicalize', 'match', false) INTO v_result;
    IF coalesce((v_result->>'ok')::boolean, false) IS NOT TRUE
      OR v_result->>'status' <> 'canonical'
      OR v_result->>'verification_state' <> 'match'
      OR coalesce((v_result->>'published')::boolean, false) IS TRUE THEN
      RAISE EXCEPTION 'canonicalization failed closed for %: %', v_row.id, v_result;
    END IF;

    SELECT public.admin_research_attach_existing_graph_node_v1(v_row.id, v_row.target_node_id, v_note) INTO v_result;
    IF coalesce((v_result->>'ok')::boolean, false) IS NOT TRUE
      OR coalesce((v_result->>'tree_attached')::boolean, false) IS NOT TRUE
      OR (v_result->>'target_node_id')::uuid IS DISTINCT FROM v_row.target_node_id THEN
      RAISE EXCEPTION 'tree attachment failed closed for %: %', v_row.id, v_result;
    END IF;

    UPDATE public.decision_ledger SET provenance = coalesce(provenance, '{}'::jsonb) || jsonb_build_object(
      'triage_snapshot_date', '2026-10-28',
      'selection', 'approved public Zvi calculation; source sub-occurrence retained; verified exact result; exact existing number target',
      'batch_digest', v_digest, 'duplicate_occurrences_preserved', true,
      'truth_score_created', false, 'privacy_changed', false, 'publication_changed', false
    ) WHERE id = (v_result->>'decision_ledger_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'expected decision ledger receipt for %', v_row.id; END IF;
    v_processed := v_processed + 1;
  END LOOP;
  IF v_processed <> 28 THEN RAISE EXCEPTION 'expected 28 findings, processed %', v_processed; END IF;
END;
$batch$;
