-- ZVI CONTEXTUAL NUMBER AUTO TREE PROMOTION v3
--
-- Human Gate: ZURIEL explicitly approved automatic promotion of the reviewed
-- Zvi corpus without opening every finding on 2026-10-26. This is a bounded,
-- one-time batch decision, not a standing rule for future intake.
--
-- A research row enters this batch only when its stored row.value has exactly
-- one identical structured number target among its tree_matches. Other stored
-- Topic/number targets remain context only and are not attached. The number
-- node must already exist, be active, public and unique; this migration creates
-- no node or edge.
--
-- Live preflight at branch base eb50c21f:
--   1,813 reviewed multi-target occurrences
--   1,804 occurrences resolve to an existing public number node
--   700 exact source+value representatives
--   1,104 duplicate occurrences preserved unchanged
--   9 blocked occurrences / 4 clusters: no active node for 1563 or 2314

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_reviewed_count integer;
  v_ready_count integer;
  v_primary_context_count integer;
  v_multi_number_count integer;
  v_representative_count integer;
  v_duplicate_count integer;
  v_blocked_count integer;
  v_blocked_cluster_count integer;
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
    'ZURIEL explicit Human-Gate 2026-10-26: automatically attach the audited primary row.value number target; preserve every additional target as context and every duplicate occurrence as provenance.';
BEGIN
  SELECT count(*), min(id::text)::uuid
  INTO v_admin_count, v_admin_id
  FROM public.users
  WHERE role = 'admin';

  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  -- Keep selection, source and target identities stable for the atomic batch.
  LOCK TABLE public.research_objects IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.channel_updates IN SHARE MODE;
  LOCK TABLE public.nodes IN SHARE MODE;

  CREATE TEMP TABLE _zvi_context_reviewed_v3
  ON COMMIT DROP
  AS
  WITH base AS (
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
      AND ro.source_ref ~ '^channel_updates:[0-9a-f-]{36}$'
      AND NOT (coalesce(ro.engine_detail, '{}'::jsonb) ? 'verification_state')
      AND coalesce(ro.meta #>> '{ext,extraction_integrity,fidelity_status}', '') <> 'partial'
      AND ro.kind NOT IN ('hypothesis', 'question')
      AND source_row.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
      AND source_row.status = 'live'
      AND source_row.page_only IS FALSE
      AND source_row.channel = 'torat-haremez'
  ), unique_targets AS (
    SELECT DISTINCT
      base.id,
      lower(target.value ->> 'type') AS target_type,
      target.value ->> 'key' AS target_key
    FROM base
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(base.meta #> '{ext,wa_channel_intake,tree_matches}') = 'array'
          THEN base.meta #> '{ext,wa_channel_intake,tree_matches}'
        ELSE '[]'::jsonb
      END
    ) AS target(value)
    WHERE target.value ? 'type'
      AND target.value ? 'key'
  ), classified AS (
    SELECT
      base.*,
      count(unique_targets.target_key) AS target_count,
      count(*) FILTER (
        WHERE unique_targets.target_type = 'number'
      ) AS number_target_count,
      count(*) FILTER (
        WHERE unique_targets.target_type = 'number'
          AND unique_targets.target_key ~ '^-?[0-9]+([.][0-9]+)?$'
          AND unique_targets.target_key::numeric = base.value::numeric
      ) AS exact_value_number_count
    FROM base
    LEFT JOIN unique_targets ON unique_targets.id = base.id
    GROUP BY
      base.id, base.kind, base.statement, base.terms, base.relates,
      base.value, base.source_ref, base.engine_detail, base.meta, base.source_id
  ), reviewed AS (
    SELECT *
    FROM classified
    WHERE target_count > 1
      AND exact_value_number_count = 1
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

  CREATE TEMP TABLE _zvi_context_ready_v3
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
  FROM _zvi_context_reviewed_v3 reviewed
  WHERE reviewed.target_node_count = 1
    AND reviewed.target_node_id IS NOT NULL;

  SELECT
    (SELECT count(*) FROM _zvi_context_reviewed_v3),
    count(*),
    count(*) FILTER (WHERE number_target_count = 1),
    count(*) FILTER (WHERE number_target_count > 1),
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
    v_primary_context_count,
    v_multi_number_count,
    v_representative_count,
    v_duplicate_count,
    v_cohort_digest,
    v_representative_digest
  FROM _zvi_context_ready_v3;

  SELECT
    count(*),
    count(DISTINCT (source_id, value)),
    array_agg(DISTINCT value ORDER BY value)
  INTO v_blocked_count, v_blocked_cluster_count, v_blocked_values
  FROM _zvi_context_reviewed_v3
  WHERE target_node_count <> 1 OR target_node_id IS NULL;

  IF v_reviewed_count <> 1813
     OR v_ready_count <> 1804
     OR v_primary_context_count <> 520
     OR v_multi_number_count <> 1284
     OR v_representative_count <> 700
     OR v_duplicate_count <> 1104
     OR v_blocked_count <> 9
     OR v_blocked_cluster_count <> 4
     OR v_blocked_values IS DISTINCT FROM ARRAY[1563, 2314]::integer[]
     OR v_cohort_digest <> 'be4f4f25ffd3003ad040b152d284d756'
     OR v_representative_digest <> '8c46a7931b1fbfb0156ff5a579d3b5d4' THEN
    RAISE EXCEPTION
      'audited cohort drift: reviewed %, ready %, primary-context %, multi-number %, representatives %, duplicates %, blocked %/% values %, digests %/%',
      v_reviewed_count, v_ready_count, v_primary_context_count, v_multi_number_count,
      v_representative_count, v_duplicate_count, v_blocked_count,
      v_blocked_cluster_count, v_blocked_values, v_cohort_digest, v_representative_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN
    SELECT *
    FROM _zvi_context_ready_v3
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
      'triage_base_commit', 'eb50c21f0c9ce852e5f86361ef9a0d052af357cd',
      'selection', 'approved public multi-target research with exactly one structured number target equal to row.value; existing unique active public number node required',
      'attached_target_role', 'primary_row_value_number',
      'additional_targets_role', 'preserved_context_only',
      'cohort_digest', v_cohort_digest,
      'representative_digest', v_representative_digest,
      'representative_policy', 'longest statement, then terms, then relates, then stable id',
      'duplicate_occurrences_preserved', true,
      'cluster_occurrence_count', (
        SELECT count(*)
        FROM _zvi_context_ready_v3 member
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

  IF v_processed <> 700 THEN
    RAISE EXCEPTION 'expected 700 promoted representatives, processed %', v_processed;
  END IF;

  SELECT count(*)
  INTO v_preserved_duplicate_count
  FROM _zvi_context_ready_v3 selected
  JOIN public.research_objects ro ON ro.id = selected.id
  WHERE selected.representative_rank > 1
    AND ro.status = 'approved'
    AND ro.privacy_scope = 'public'
    AND ro.promoted_node_id IS NULL
    AND NOT (coalesce(ro.engine_detail, '{}'::jsonb) ? 'verification_state');

  IF v_preserved_duplicate_count <> 1104 THEN
    RAISE EXCEPTION
      'duplicate provenance preservation failed: expected 1104 unchanged rows, found %',
      v_preserved_duplicate_count;
  END IF;

  SELECT count(*)
  INTO v_preserved_blocked_count
  FROM _zvi_context_reviewed_v3 blocked
  JOIN public.research_objects ro ON ro.id = blocked.id
  WHERE (blocked.target_node_count <> 1 OR blocked.target_node_id IS NULL)
    AND ro.status = 'approved'
    AND ro.privacy_scope = 'public'
    AND ro.promoted_node_id IS NULL;

  IF v_preserved_blocked_count <> 9 THEN
    RAISE EXCEPTION
      'missing-target preservation failed: expected 9 unchanged rows, found %',
      v_preserved_blocked_count;
  END IF;
END;
$batch$;
