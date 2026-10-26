-- ZVI EXPLICIT-MATCH AUTO TREE PROMOTION v5
--
-- Human Gate: ZURIEL explicitly approved automatic promotion of the reviewed
-- Zvi corpus without opening every finding on 2026-10-26. This bounded batch
-- covers only rows whose stored verification envelope already says `match`.
-- It is not a standing rule for future intake.
--
-- The source locator may carry a research fragment after the exact
-- channel_updates UUID. The referenced source row must still be Zvi's live,
-- public World source. The destination is the already-structured row.value and
-- must resolve to one existing active public number node. No node, edge, source,
-- privacy or publication state is created or changed.
--
-- Live preflight at branch base b7999ba1:
--   34 approved/public unconnected explicit-match occurrences
--   28 occurrences resolve to an existing public number node
--   27 exact source+value representatives
--   1 duplicate occurrence preserved unchanged
--   4 rows blocked without one structured value
--   2 rows blocked because number node 1563 does not exist

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_reviewed_count integer;
  v_ready_count integer;
  v_representative_count integer;
  v_duplicate_count integer;
  v_missing_value_count integer;
  v_blocked_node_count integer;
  v_blocked_values integer[];
  v_preserved_duplicate_count integer;
  v_preserved_blocked_count integer;
  v_processed integer := 0;
  v_ledger_updated integer;
  v_cohort_digest text;
  v_representative_digest text;
  v_result jsonb;
  v_row record;
  v_note constant text :=
    'ZURIEL explicit Human-Gate 2026-10-26: attach the audited explicit-match finding to the existing public number node identical to its structured row.value; preserve duplicate and blocked occurrences as provenance.';
BEGIN
  SELECT count(*), min(id::text)::uuid
  INTO v_admin_count, v_admin_id
  FROM public.users
  WHERE role = 'admin';

  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  -- Freeze the source, finding and graph-target inputs for the atomic batch.
  LOCK TABLE public.research_objects IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.channel_updates IN SHARE MODE;
  LOCK TABLE public.nodes IN SHARE MODE;

  CREATE TEMP TABLE _zvi_explicit_match_reviewed_v5
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
      substring(
        ro.source_ref FROM '^channel_updates:([0-9a-f-]{36})(#.*)?$'
      )::uuid AS source_id
    FROM public.research_objects ro
    JOIN public.channel_updates source_row
      ON source_row.id = substring(
        ro.source_ref FROM '^channel_updates:([0-9a-f-]{36})(#.*)?$'
      )::uuid
    WHERE ro.status = 'approved'
      AND ro.privacy_scope = 'public'
      AND ro.promoted_node_id IS NULL
      AND ro.engine_verified IS TRUE
      AND ro.engine_detail ->> 'verification_state' = 'match'
      AND ro.source_ref ~ '^channel_updates:[0-9a-f-]{36}(#.*)?$'
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
    WHERE reviewed.value IS NOT NULL
      AND node.type = 'number'
      AND node.is_active IS TRUE
      AND node.label = reviewed.value::text
      AND coalesce(node.metadata ->> 'space', 'core') = 'core'
  ) AS target_resolution;

  CREATE TEMP TABLE _zvi_explicit_match_ready_v5
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
  FROM _zvi_explicit_match_reviewed_v5 reviewed
  WHERE reviewed.value IS NOT NULL
    AND reviewed.target_node_count = 1
    AND reviewed.target_node_id IS NOT NULL;

  SELECT
    (SELECT count(*) FROM _zvi_explicit_match_reviewed_v5),
    count(*),
    count(*) FILTER (WHERE representative_rank = 1),
    count(*) FILTER (WHERE representative_rank > 1),
    md5(string_agg(
      id::text || '|' || source_ref || '|' || value::text || '|' ||
      coalesce(statement, '') || '|' || coalesce(engine_detail::text, '{}') || '|' ||
      coalesce(meta::text, '{}'),
      E'\n' ORDER BY id
    )),
    md5(string_agg(
      id::text || '|' || source_ref || '|' || value::text || '|' ||
      coalesce(statement, '') || '|' || coalesce(engine_detail::text, '{}') || '|' ||
      coalesce(meta::text, '{}'),
      E'\n' ORDER BY id
    ) FILTER (WHERE representative_rank = 1))
  INTO
    v_reviewed_count,
    v_ready_count,
    v_representative_count,
    v_duplicate_count,
    v_cohort_digest,
    v_representative_digest
  FROM _zvi_explicit_match_ready_v5;

  SELECT count(*)
  INTO v_missing_value_count
  FROM _zvi_explicit_match_reviewed_v5
  WHERE value IS NULL;

  SELECT
    count(*),
    array_agg(DISTINCT value ORDER BY value)
  INTO v_blocked_node_count, v_blocked_values
  FROM _zvi_explicit_match_reviewed_v5
  WHERE value IS NOT NULL
    AND (target_node_count <> 1 OR target_node_id IS NULL);

  IF v_reviewed_count <> 34
     OR v_ready_count <> 28
     OR v_representative_count <> 27
     OR v_duplicate_count <> 1
     OR v_missing_value_count <> 4
     OR v_blocked_node_count <> 2
     OR v_blocked_values IS DISTINCT FROM ARRAY[1563]::integer[]
     OR v_cohort_digest <> 'eab6becba4568c31a2a8dc1612d31b47'
     OR v_representative_digest <> '97398834700a78094b9af3ef54ab3e99' THEN
    RAISE EXCEPTION
      'audited cohort drift: reviewed %, ready %, representatives %, duplicates %, missing-value %, blocked-node % values %, digests %/%',
      v_reviewed_count, v_ready_count, v_representative_count,
      v_duplicate_count, v_missing_value_count, v_blocked_node_count,
      v_blocked_values, v_cohort_digest, v_representative_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN
    SELECT *
    FROM _zvi_explicit_match_ready_v5
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
       OR (v_result ->> 'target_node_id')::uuid IS DISTINCT FROM v_row.target_node_id
       OR coalesce((v_result ->> 'created_node')::boolean, false) IS TRUE
       OR coalesce((v_result ->> 'created_edge')::boolean, false) IS TRUE THEN
      RAISE EXCEPTION 'tree attachment failed closed for %: %', v_row.id, v_result;
    END IF;

    UPDATE public.decision_ledger
    SET provenance = coalesce(provenance, '{}'::jsonb) || jsonb_build_object(
      'triage_snapshot_date', '2026-10-26',
      'triage_base_commit', 'b7999ba1dd79dc5d2cd8c5a8448a985fc9d427d9',
      'selection', 'approved public Zvi finding with explicit verification_state=match, one structured row.value and one identical active public number node',
      'attached_target_role', 'human_gate_authorized_structured_row_value',
      'source_locator_mode', 'exact_channel_uuid_with_optional_research_fragment',
      'stored_tree_match_present', false,
      'explicit_verification_state_preserved', true,
      'cohort_digest', v_cohort_digest,
      'representative_digest', v_representative_digest,
      'representative_policy', 'longest statement, then terms, then relates, then stable id',
      'duplicate_occurrences_preserved', true,
      'cluster_occurrence_count', (
        SELECT count(*)
        FROM _zvi_explicit_match_ready_v5 member
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

  IF v_processed <> 27 THEN
    RAISE EXCEPTION 'expected 27 promoted representatives, processed %', v_processed;
  END IF;

  SELECT count(*)
  INTO v_preserved_duplicate_count
  FROM _zvi_explicit_match_ready_v5 selected
  JOIN public.research_objects ro ON ro.id = selected.id
  WHERE selected.representative_rank > 1
    AND ro.status = 'approved'
    AND ro.privacy_scope = 'public'
    AND ro.promoted_node_id IS NULL
    AND ro.engine_verified IS TRUE
    AND ro.engine_detail ->> 'verification_state' = 'match';

  IF v_preserved_duplicate_count <> 1 THEN
    RAISE EXCEPTION
      'duplicate provenance preservation failed: expected 1 unchanged row, found %',
      v_preserved_duplicate_count;
  END IF;

  SELECT count(*)
  INTO v_preserved_blocked_count
  FROM _zvi_explicit_match_reviewed_v5 selected
  JOIN public.research_objects ro ON ro.id = selected.id
  WHERE (selected.value IS NULL
      OR selected.target_node_count <> 1
      OR selected.target_node_id IS NULL)
    AND ro.status = 'approved'
    AND ro.privacy_scope = 'public'
    AND ro.promoted_node_id IS NULL
    AND ro.engine_verified IS TRUE
    AND ro.engine_detail ->> 'verification_state' = 'match';

  IF v_preserved_blocked_count <> 6 THEN
    RAISE EXCEPTION
      'blocked-row preservation failed: expected 6 unchanged rows, found %',
      v_preserved_blocked_count;
  END IF;
END;
$batch$;
