-- ZVI STRUCTURED VALUE AUTO TREE PROMOTION v4
--
-- Human Gate: ZURIEL explicitly approved using the already-structured numeric
-- row.value as the tree destination for reviewed Zvi findings whose historical
-- intake did not store tree_matches. This is a one-time batch decision, not a
-- standing inference rule for future research.
--
-- Every destination must already be one unique active public number node whose
-- label exactly equals row.value. No node/edge is created, no source is deleted,
-- and privacy/publication remain unchanged.

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_reviewed_count integer;
  v_ready_count integer;
  v_representative_count integer;
  v_duplicate_count integer;
  v_blocked_count integer;
  v_preserved_duplicate_count integer;
  v_processed integer := 0;
  v_ledger_updated integer;
  v_cohort_digest text;
  v_representative_digest text;
  v_result jsonb;
  v_row record;
  v_note constant text :=
    'ZURIEL explicit Human-Gate 2026-10-26: attach the audited structured row.value to the identical existing public number node where historical intake stored no tree_match; preserve duplicates as provenance.';
BEGIN
  -- UNAPPLIED DRAFT held by exact-source review c427e237. Historical cohort
  -- remains readable; see docs/reviews/world-pending-batch-safety-20261026.md.
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'WORLD_BATCH_REVIEW_REQUIRED_V4',
    DETAIL = 'Unapplied draft held: source-number grouping can omit distinct claims; canonical per-claim replay required.';

  SELECT count(*), min(id::text)::uuid
  INTO v_admin_count, v_admin_id
  FROM public.users
  WHERE role = 'admin';

  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  LOCK TABLE public.research_objects IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.channel_updates IN SHARE MODE;
  LOCK TABLE public.nodes IN SHARE MODE;

  CREATE TEMP TABLE _zvi_structured_value_reviewed_v4
  ON COMMIT DROP
  AS
  WITH reviewed AS (
    SELECT
      ro.id,
      ro.kind,
      ro.statement,
      ro.terms,
      ro.relates,
      ro.value,
      ro.source_ref,
      ro.engine_detail,
      ro.meta,
      substring(ro.source_ref FROM 'channel_updates:([0-9a-f-]{36})')::uuid AS source_id
    FROM public.research_objects ro
    JOIN public.channel_updates source_row
      ON source_row.id = substring(ro.source_ref FROM 'channel_updates:([0-9a-f-]{36})')::uuid
    WHERE ro.status = 'approved'
      AND ro.privacy_scope = 'public'
      AND ro.promoted_node_id IS NULL
      AND ro.engine_verified IS TRUE
      AND ro.value IS NOT NULL
      AND ro.source_ref ~ '^channel_updates:[0-9a-f-]{36}$'
      AND NOT (coalesce(ro.engine_detail, '{}'::jsonb) ? 'verification_state')
      AND coalesce(ro.meta #>> '{ext,extraction_integrity,fidelity_status}', '') <> 'partial'
      AND ro.kind NOT IN ('hypothesis', 'question')
      AND source_row.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
      AND source_row.status = 'live'
      AND source_row.page_only IS FALSE
      AND source_row.channel = 'torat-haremez'
      AND jsonb_array_length(
        CASE
          WHEN jsonb_typeof(ro.meta #> '{ext,wa_channel_intake,tree_matches}') = 'array'
            THEN ro.meta #> '{ext,wa_channel_intake,tree_matches}'
          ELSE '[]'::jsonb
        END
      ) = 0
  )
  SELECT
    reviewed.*,
    target_resolution.target_node_id,
    target_resolution.target_node_count
  FROM reviewed
  CROSS JOIN LATERAL (
    SELECT
      (array_agg(node.id ORDER BY node.id::text))[1] AS target_node_id,
      count(*)::integer AS target_node_count
    FROM public.nodes node
    WHERE node.type = 'number'
      AND node.is_active IS TRUE
      AND node.label = reviewed.value::text
      AND coalesce(node.metadata ->> 'space', 'core') = 'core'
  ) AS target_resolution;

  CREATE TEMP TABLE _zvi_structured_value_ready_v4
  ON COMMIT DROP
  AS
  SELECT
    reviewed.*,
    row_number() OVER (
      PARTITION BY reviewed.source_id, reviewed.value
      ORDER BY
        length(coalesce(reviewed.statement, '')) DESC,
        cardinality(coalesce(reviewed.terms, '{}'::text[])) DESC,
        cardinality(coalesce(reviewed.relates, '{}'::text[])) DESC,
        reviewed.id
    ) AS representative_rank
  FROM _zvi_structured_value_reviewed_v4 reviewed
  WHERE reviewed.target_node_count = 1
    AND reviewed.target_node_id IS NOT NULL;

  SELECT
    (SELECT count(*) FROM _zvi_structured_value_reviewed_v4),
    count(*),
    count(*) FILTER (WHERE representative_rank = 1),
    count(*) FILTER (WHERE representative_rank > 1),
    md5(string_agg(
      id::text || '|' || source_ref || '|' || value::text || '|' ||
      coalesce(statement, '') || '|' || coalesce(engine_detail::text, '{}') || '|' ||
      coalesce((meta #> '{ext,wa_channel_intake,tree_matches}')::text, '[]'),
      E'\n' ORDER BY id
    )),
    md5(string_agg(
      id::text || '|' || source_ref || '|' || value::text || '|' ||
      coalesce(statement, '') || '|' || coalesce(engine_detail::text, '{}') || '|' ||
      coalesce((meta #> '{ext,wa_channel_intake,tree_matches}')::text, '[]'),
      E'\n' ORDER BY id
    ) FILTER (WHERE representative_rank = 1))
  INTO
    v_reviewed_count,
    v_ready_count,
    v_representative_count,
    v_duplicate_count,
    v_cohort_digest,
    v_representative_digest
  FROM _zvi_structured_value_ready_v4;

  SELECT count(*)
  INTO v_blocked_count
  FROM _zvi_structured_value_reviewed_v4
  WHERE target_node_count <> 1 OR target_node_id IS NULL;

  IF v_reviewed_count <> 170
     OR v_ready_count <> 170
     OR v_representative_count <> 83
     OR v_duplicate_count <> 87
     OR v_blocked_count <> 0
     OR v_cohort_digest <> '24ea35e0f6984c020e7a35999fdd90cc'
     OR v_representative_digest <> '6d2be53356e4cf79c6973a7332ba1fd9' THEN
    RAISE EXCEPTION
      'audited cohort drift: reviewed %, ready %, representatives %, duplicates %, blocked %, digests %/%',
      v_reviewed_count, v_ready_count, v_representative_count,
      v_duplicate_count, v_blocked_count, v_cohort_digest, v_representative_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN
    SELECT *
    FROM _zvi_structured_value_ready_v4
    WHERE representative_rank = 1
    ORDER BY id
  LOOP
    SELECT public.admin_research_review(
      v_row.id,
      'canonicalize',
      'match',
      false
    )
    INTO v_result;

    IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
       OR v_result ->> 'status' <> 'canonical'
       OR v_result ->> 'verification_state' <> 'match'
       OR coalesce((v_result ->> 'published')::boolean, false) IS TRUE THEN
      RAISE EXCEPTION 'canonicalization failed closed for %: %', v_row.id, v_result;
    END IF;

    SELECT public.admin_research_attach_existing_graph_node_v1(
      v_row.id,
      v_row.target_node_id,
      v_note
    )
    INTO v_result;

    IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
       OR coalesce((v_result ->> 'tree_attached')::boolean, false) IS NOT TRUE
       OR (v_result ->> 'target_node_id')::uuid IS DISTINCT FROM v_row.target_node_id THEN
      RAISE EXCEPTION 'tree attachment failed closed for %: %', v_row.id, v_result;
    END IF;

    UPDATE public.decision_ledger
    SET provenance = coalesce(provenance, '{}'::jsonb) || jsonb_build_object(
      'triage_snapshot_date', '2026-10-26',
      'triage_base_commit', '59e2c994',
      'selection', 'approved public verified research with structured numeric row.value, no stored tree_match and one identical active public number node',
      'attached_target_role', 'human_gate_authorized_structured_row_value',
      'stored_tree_match_present', false,
      'cohort_digest', v_cohort_digest,
      'representative_digest', v_representative_digest,
      'representative_policy', 'longest statement, then terms, then relates, then stable id',
      'duplicate_occurrences_preserved', true,
      'cluster_occurrence_count', (
        SELECT count(*)
        FROM _zvi_structured_value_ready_v4 member
        WHERE member.source_id = v_row.source_id
          AND member.value = v_row.value
      ),
      'truth_score_created', false,
      'privacy_changed', false,
      'publication_changed', false
    )
    WHERE id = (v_result ->> 'decision_ledger_id')::uuid;

    GET DIAGNOSTICS v_ledger_updated = ROW_COUNT;
    IF v_ledger_updated <> 1 THEN
      RAISE EXCEPTION 'expected one decision ledger row for %, updated %', v_row.id, v_ledger_updated;
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  IF v_processed <> 83 THEN
    RAISE EXCEPTION 'expected 83 promoted representatives, processed %', v_processed;
  END IF;

  SELECT count(*)
  INTO v_preserved_duplicate_count
  FROM _zvi_structured_value_ready_v4 selected
  JOIN public.research_objects ro ON ro.id = selected.id
  WHERE selected.representative_rank > 1
    AND ro.status = 'approved'
    AND ro.privacy_scope = 'public'
    AND ro.promoted_node_id IS NULL
    AND NOT (coalesce(ro.engine_detail, '{}'::jsonb) ? 'verification_state');

  IF v_preserved_duplicate_count <> 87 THEN
    RAISE EXCEPTION
      'duplicate provenance preservation failed: expected 87 unchanged rows, found %',
      v_preserved_duplicate_count;
  END IF;
END;
$batch$;
