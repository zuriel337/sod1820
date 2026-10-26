-- ZVI SAFE AUTOMATIC TREE PROMOTION v2
--
-- Human Gate: ZURIEL explicitly approved automatic promotion without opening
-- every finding on 2026-10-26. This is a one-time, fail-closed execution of
-- that batch decision; it is not a standing rule for future research rows.
--
-- The audited cohort contains 153 approved/public occurrences but only 34
-- exact source+number-target clusters. We promote one stable, fullest
-- representative per cluster and preserve the other 119 rows unchanged as
-- provenance. No row/source is deleted, no access/publication field changes,
-- and no node or edge is created.
--
-- The existing Human-Gate writers remain authoritative:
--   admin_research_review(..., 'canonicalize', 'match', false)
--   admin_research_attach_existing_graph_node_v1(...)
--
-- This batch additionally corrects the returned ledger row's batch-specific
-- provenance inside the same transaction. The v1 attachment writer otherwise
-- records the earlier 2026-10-22 strong-finding batch in those JSON keys.

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_occurrence_count integer;
  v_representative_count integer;
  v_duplicate_count integer;
  v_preserved_duplicate_count integer;
  v_target_count integer;
  v_processed integer := 0;
  v_ledger_updated integer;
  v_target_node_id uuid;
  v_cohort_digest text;
  v_representative_digest text;
  v_result jsonb;
  v_row record;
  v_note constant text :=
    'ZURIEL explicit Human-Gate 2026-10-26: automatically promote the audited exact single-number-target Zvi clusters; keep duplicate occurrences as provenance.';
BEGIN
  SELECT count(*), min(id::text)::uuid
  INTO v_admin_count, v_admin_id
  FROM public.users
  WHERE role = 'admin';

  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  -- Freeze the three selection axes for the short batch transaction. The
  -- migration must never validate one cohort and then write against a newer
  -- source, finding or graph-target snapshot.
  LOCK TABLE public.research_objects IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.channel_updates IN SHARE MODE;
  LOCK TABLE public.nodes IN SHARE MODE;

  CREATE TEMP TABLE _zvi_safe_auto_promotion_v2
  ON COMMIT DROP
  AS
  WITH exploded AS (
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
      substring(ro.source_ref FROM 'channel_updates:([0-9a-f-]{36})')::uuid AS source_id,
      target.value AS target,
      count(*) OVER (PARTITION BY ro.id) AS target_count
    FROM public.research_objects ro
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(ro.meta #> '{ext,wa_channel_intake,tree_matches}') = 'array'
          THEN ro.meta #> '{ext,wa_channel_intake,tree_matches}'
        ELSE '[]'::jsonb
      END
    ) AS target(value)
    WHERE ro.status = 'approved'
      AND ro.privacy_scope = 'public'
      AND ro.promoted_node_id IS NULL
      AND ro.engine_verified IS TRUE
      AND ro.source_ref ~ '^channel_updates:[0-9a-f-]{36}$'
      AND NOT (coalesce(ro.engine_detail, '{}'::jsonb) ? 'verification_state')
      AND coalesce(ro.meta #>> '{ext,extraction_integrity,fidelity_status}', '') <> 'partial'
      AND ro.kind NOT IN ('hypothesis', 'question')
  ), eligible AS (
    SELECT e.*
    FROM exploded e
    JOIN public.channel_updates source_row
      ON source_row.id = e.source_id
    WHERE e.target_count = 1
      AND lower(e.target ->> 'type') = 'number'
      AND (e.target ->> 'key') ~ '^-?[0-9]+$'
      AND (e.target ->> 'key')::integer = e.value
      AND source_row.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
      AND source_row.status = 'live'
      AND source_row.page_only IS FALSE
      AND source_row.channel = 'torat-haremez'
  )
  SELECT
    e.*,
    row_number() OVER (
      PARTITION BY e.source_id, e.target ->> 'key'
      ORDER BY
        length(coalesce(e.statement, '')) DESC,
        cardinality(coalesce(e.terms, '{}'::text[])) DESC,
        cardinality(coalesce(e.relates, '{}'::text[])) DESC,
        e.id
    ) AS representative_rank
  FROM eligible e;

  SELECT
    count(*),
    count(*) FILTER (WHERE representative_rank = 1),
    count(*) FILTER (WHERE representative_rank > 1),
    md5(string_agg(
      id::text || '|' || source_ref || '|' || value::text || '|' ||
      target::text || '|' || coalesce(statement, '') || '|' ||
      coalesce(engine_detail::text, '{}') || '|' ||
      coalesce((meta #> '{ext,wa_channel_intake,tree_matches}')::text, '[]'),
      E'\n' ORDER BY id
    )),
    md5(string_agg(
      id::text || '|' || source_ref || '|' || value::text || '|' ||
      target::text || '|' || coalesce(statement, '') || '|' ||
      coalesce(engine_detail::text, '{}') || '|' ||
      coalesce((meta #> '{ext,wa_channel_intake,tree_matches}')::text, '[]'),
      E'\n' ORDER BY id
    ) FILTER (WHERE representative_rank = 1))
  INTO
    v_occurrence_count,
    v_representative_count,
    v_duplicate_count,
    v_cohort_digest,
    v_representative_digest
  FROM _zvi_safe_auto_promotion_v2;

  IF v_occurrence_count <> 153
     OR v_representative_count <> 34
     OR v_duplicate_count <> 119
     OR v_cohort_digest <> '8ec8eb914e399d9fb34f525dcdce0c9a'
     OR v_representative_digest <> 'b5002147d757bd97a00c5713f6f1f9e3' THEN
    RAISE EXCEPTION
      'audited cohort drift: occurrences %, representatives %, duplicates %, cohort digest %, representative digest %',
      v_occurrence_count, v_representative_count, v_duplicate_count,
      v_cohort_digest, v_representative_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN
    SELECT *
    FROM _zvi_safe_auto_promotion_v2
    WHERE representative_rank = 1
    ORDER BY id
  LOOP
    SELECT count(*), (array_agg(node.id ORDER BY node.id::text))[1]
    INTO v_target_count, v_target_node_id
    FROM public.nodes node
    WHERE node.type = 'number'
      AND node.is_active IS TRUE
      AND node.label = v_row.target ->> 'key'
      AND coalesce(node.metadata ->> 'space', 'core') = 'core';

    IF v_target_count <> 1 OR v_target_node_id IS NULL THEN
      RAISE EXCEPTION
        'finding % requires exactly one active public number target %, found %',
        v_row.id, v_row.target ->> 'key', v_target_count;
    END IF;

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
      v_target_node_id,
      v_note
    )
    INTO v_result;

    IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
       OR coalesce((v_result ->> 'tree_attached')::boolean, false) IS NOT TRUE
       OR (v_result ->> 'target_node_id')::uuid IS DISTINCT FROM v_target_node_id THEN
      RAISE EXCEPTION 'tree attachment failed closed for %: %', v_row.id, v_result;
    END IF;

    UPDATE public.decision_ledger
    SET provenance = coalesce(provenance, '{}'::jsonb) || jsonb_build_object(
      'triage_snapshot_date', '2026-10-26',
      'triage_base_commit', '3a7289f49e2ca47707ad8c2dec917b55e66457ee',
      'selection', 'approved public exact single-number target; deterministic legacy matrix replay matched; one fullest representative per exact source+target cluster',
      'cohort_digest', v_cohort_digest,
      'representative_digest', v_representative_digest,
      'representative_policy', 'longest statement, then terms, then relates, then stable id',
      'duplicate_occurrences_preserved', true,
      'cluster_occurrence_count', (
        SELECT count(*)
        FROM _zvi_safe_auto_promotion_v2 member
        WHERE member.source_id = v_row.source_id
          AND member.target ->> 'key' = v_row.target ->> 'key'
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

  IF v_processed <> 34 THEN
    RAISE EXCEPTION 'expected 34 promoted representatives, processed %', v_processed;
  END IF;

  SELECT count(*)
  INTO v_preserved_duplicate_count
  FROM _zvi_safe_auto_promotion_v2 selected
  JOIN public.research_objects ro ON ro.id = selected.id
  WHERE selected.representative_rank > 1
    AND ro.status = 'approved'
    AND ro.privacy_scope = 'public'
    AND ro.promoted_node_id IS NULL
    AND NOT (coalesce(ro.engine_detail, '{}'::jsonb) ? 'verification_state');

  IF v_preserved_duplicate_count <> 119 THEN
    RAISE EXCEPTION
      'duplicate provenance preservation failed: expected 119 unchanged rows, found %',
      v_preserved_duplicate_count;
  END IF;
END;
$batch$;
