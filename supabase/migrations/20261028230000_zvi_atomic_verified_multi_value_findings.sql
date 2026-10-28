-- ZVI ATOMIC VERIFIED MULTI-VALUE FINDINGS
-- One source occurrence may contain several independently verified calculations.
-- This migration keeps the original occurrence intact and admits one atomic finding
-- per verified expression/value so each can point to its exact existing number node.

DO $batch$
DECLARE
  v_admin_id uuid; v_admin_count integer; v_count integer; v_digest text;
  v_inserted integer; v_processed integer := 0; v_result jsonb; v_row record; v_status text;
  v_note constant text :=
    'ZURIEL explicit Human-Gate 2026-10-29: atomic verified calculation extracted from a retained multi-value Zvi source occurrence and attached to its exact existing number target.';
BEGIN
  SELECT count(*), min(id::text)::uuid INTO v_admin_count, v_admin_id
  FROM public.users WHERE role = 'admin';
  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  LOCK TABLE public.research_objects IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.nodes IN SHARE MODE;

  CREATE TEMP TABLE _zvi_atomic_multi_claims ON COMMIT DROP AS
  WITH parents AS (
    SELECT id, source_ref, engine_detail, meta, contributor
    FROM public.research_objects
    WHERE id IN (
      'e9b915dd-4f08-4021-82e8-09fa7054a7a6'::uuid,
      '38ac8d16-9bee-4292-97c6-b02b0eee8cf6'::uuid,
      '67350db7-c72c-4e60-9a22-9b98f7aace6c'::uuid,
      '6487bd9b-6b3a-49d2-b1d8-ac8e4457658d'::uuid
    )
      AND contributor = 'צבי (OPOC)'
      AND status = 'approved'
      AND privacy_scope = 'public'
      AND engine_verified IS TRUE
      AND coalesce(engine_detail->>'verification_state', '') = 'match'
      AND promoted_node_id IS NULL
  ), claims AS (
    SELECT p.id AS parent_id, p.source_ref, p.meta, p.contributor,
      c->>'expression' AS expression, (c->>'claimed_value')::integer AS value,
      c->>'state' AS claim_state
    FROM parents p
    CROSS JOIN LATERAL jsonb_array_elements(p.engine_detail->'claims') c
    WHERE c->>'state' = 'match'
  )
  SELECT c.*, n.id AS target_node_id
  FROM claims c
  JOIN public.nodes n ON n.type = 'number' AND n.is_active IS TRUE
    AND coalesce(n.metadata->>'space', 'core') = 'core' AND n.label = c.value::text;

  SELECT count(*), md5(string_agg(
    parent_id::text || '|' || source_ref || '|' || expression || '|' || value::text,
    E'\n' ORDER BY parent_id, expression, value
  )) INTO v_count, v_digest FROM _zvi_atomic_multi_claims;
  IF v_count <> 10 OR v_digest <> '40e07aee7251f201d98c4a04b22d2e1b' THEN
    RAISE EXCEPTION 'audited atomic multi-value batch drift: count %, digest %', v_count, v_digest;
  END IF;
  CREATE TEMP TABLE _zvi_atomic_inserted (id uuid PRIMARY KEY, target_node_id uuid NOT NULL) ON COMMIT DROP;
  WITH inserted AS (
    INSERT INTO public.research_objects (
    kind, statement, terms, value, relates, source, source_ref, contributor,
    confidence, engine_verified, engine_detail, status, privacy_scope, meta, parent_id
    )
    SELECT
      'fact', '«' || expression || '» = ' || value::text || ' בגימטריה רגילה',
      ARRAY[expression], value, ARRAY[value::text], 'research_atomic_projection',
      source_ref, contributor, null, true,
      jsonb_build_object('verification_state', 'match', 'method', 'ragil',
        'verified_via', 'gematria_api', 'atomic_from_multi_value_source', true),
      'candidate', 'public',
      jsonb_build_object('atomic_projection', jsonb_build_object(
        'parent_research_object_id', parent_id, 'source_occurrence_retained', true,
        'claim_expression', expression, 'claim_value', value, 'contract', 'WORLD_UNIFIED_PUBLIC_CONTENT_PROJECTION_V1'
      )), parent_id
    FROM _zvi_atomic_multi_claims c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.research_objects prior
      WHERE prior.source_ref = c.source_ref
        AND prior.statement = '«' || c.expression || '» = ' || c.value::text || ' בגימטריה רגילה'
    )
    RETURNING id, source_ref, statement
  )
  INSERT INTO _zvi_atomic_inserted (id, target_node_id)
  SELECT i.id, c.target_node_id
  FROM inserted i
  JOIN _zvi_atomic_multi_claims c ON c.source_ref = i.source_ref
    AND '«' || c.expression || '» = ' || c.value::text || ' בגימטריה רגילה' = i.statement;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted <> 10 THEN RAISE EXCEPTION 'expected 10 fresh atomic findings, inserted %', v_inserted; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  FOR v_row IN SELECT * FROM _zvi_atomic_inserted ORDER BY id LOOP
    SELECT status INTO v_status FROM public.research_objects WHERE id = v_row.id FOR UPDATE;
    IF v_status = 'candidate' THEN
      SELECT public.admin_research_review(v_row.id, 'approve', 'match', false) INTO v_result;
      IF coalesce((v_result->>'ok')::boolean, false) IS NOT TRUE OR v_result->>'status' <> 'approved' THEN
        RAISE EXCEPTION 'approval failed closed for %: %', v_row.id, v_result;
      END IF;
    ELSIF v_status <> 'approved' THEN
      RAISE EXCEPTION 'unexpected atomic finding state for %: %', v_row.id, v_status;
    END IF;
    SELECT public.admin_research_review(v_row.id, 'canonicalize', 'match', false) INTO v_result;
    IF coalesce((v_result->>'ok')::boolean, false) IS NOT TRUE OR v_result->>'status' <> 'canonical' THEN
      RAISE EXCEPTION 'canonicalization failed closed for %: %', v_row.id, v_result;
    END IF;
    SELECT public.admin_research_attach_existing_graph_node_v1(v_row.id, v_row.target_node_id, v_note) INTO v_result;
    IF coalesce((v_result->>'ok')::boolean, false) IS NOT TRUE
      OR (v_result->>'target_node_id')::uuid IS DISTINCT FROM v_row.target_node_id THEN
      RAISE EXCEPTION 'tree attachment failed closed for %: %', v_row.id, v_result;
    END IF;
    UPDATE public.decision_ledger SET provenance = coalesce(provenance, '{}'::jsonb) || jsonb_build_object(
      'triage_snapshot_date', '2026-10-29', 'selection', 'atomic projection of approved public multi-value Zvi source; verified exact number target',
      'parent_source_occurrence_retained', true, 'truth_score_created', false, 'privacy_changed', false, 'publication_changed', false
    ) WHERE id = (v_result->>'decision_ledger_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'expected decision ledger receipt for %', v_row.id; END IF;
    v_processed := v_processed + 1;
  END LOOP;
  IF v_processed <> 10 THEN RAISE EXCEPTION 'expected 10 atomic findings, processed %', v_processed; END IF;
END;
$batch$;
