-- NUMBER 1563 — CANONICAL TARGET FOR TWO VERIFIED ZVI FINDINGS
-- Explicitly authorized by ZURIEL on 2026-10-29.  This creates only the missing
-- number identity; it creates no inferred graph edges.

DO $batch$
DECLARE
  v_admin_id uuid; v_admin_count integer; v_target_id uuid; v_result jsonb; v_row record;
  v_count integer; v_digest text; v_processed integer := 0;
  v_note constant text :=
    'ZURIEL explicit Human-Gate 2026-10-29: attach this public engine-verified Zvi calculation to the newly created canonical number identity 1563. The arithmetic is verified; source interpretation remains separate.';
BEGIN
  SELECT count(*), min(id::text)::uuid INTO v_admin_count, v_admin_id
  FROM public.users WHERE role = 'admin';
  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  LOCK TABLE public.nodes IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.research_objects IN SHARE ROW EXCLUSIVE MODE;

  IF EXISTS (SELECT 1 FROM public.nodes WHERE type = 'number' AND is_active IS TRUE AND label = '1563') THEN
    RAISE EXCEPTION 'number target 1563 already exists; do not create a duplicate';
  END IF;

  INSERT INTO public.nodes (type, label, is_active, metadata)
  VALUES ('number', '1563', true, jsonb_build_object(
    'value', 1563,
    'source', 'verified_zvi_calculation_target',
    'created_reason', 'exact_result_target',
    'inferred_edges_created', false
  ))
  RETURNING id INTO v_target_id;

  CREATE TEMP TABLE _number_1563_verified_zvi_findings ON COMMIT DROP AS
  SELECT ro.id, ro.source_ref, ro.value, ro.statement, ro.engine_detail
  FROM public.research_objects ro
  WHERE ro.id IN (
    'cf2bd8e8-b922-4dc0-8a71-505e0c464630'::uuid,
    '06c22b3f-9988-460b-9888-516015e20e68'::uuid
  )
    AND ro.contributor = 'צבי (OPOC)'
    AND ro.privacy_scope = 'public'
    AND ro.status = 'approved'
    AND ro.promoted_node_id IS NULL
    AND ro.engine_verified IS TRUE
    AND ro.value = 1563
    AND ro.source_ref LIKE 'channel_updates:%#%'
    AND coalesce(ro.engine_detail->>'verification_state', '') = 'match';

  SELECT count(*), md5(string_agg(
    id::text || '|' || source_ref || '|' || value::text || '|' || coalesce(statement, '')
      || '|' || coalesce(engine_detail::text, '{}'), E'\n' ORDER BY id
  )) INTO v_count, v_digest
  FROM _number_1563_verified_zvi_findings;
  IF v_count <> 2 OR v_digest <> 'e110a02b86fbc8621aed8677dc52ff83' THEN
    RAISE EXCEPTION 'audited 1563 batch drift: count %, digest %', v_count, v_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  FOR v_row IN SELECT * FROM _number_1563_verified_zvi_findings ORDER BY id LOOP
    SELECT public.admin_research_review(v_row.id, 'canonicalize', 'match', false) INTO v_result;
    IF coalesce((v_result->>'ok')::boolean, false) IS NOT TRUE
      OR v_result->>'status' <> 'canonical'
      OR v_result->>'verification_state' <> 'match'
      OR coalesce((v_result->>'published')::boolean, false) IS TRUE THEN
      RAISE EXCEPTION 'canonicalization failed closed for %: %', v_row.id, v_result;
    END IF;
    SELECT public.admin_research_attach_existing_graph_node_v1(v_row.id, v_target_id, v_note) INTO v_result;
    IF coalesce((v_result->>'ok')::boolean, false) IS NOT TRUE
      OR (v_result->>'target_node_id')::uuid IS DISTINCT FROM v_target_id THEN
      RAISE EXCEPTION 'tree attachment failed closed for %: %', v_row.id, v_result;
    END IF;
    UPDATE public.decision_ledger SET provenance = coalesce(provenance, '{}'::jsonb) || jsonb_build_object(
      'triage_snapshot_date', '2026-10-29', 'selection', 'approved public Zvi calculation; newly created exact number identity 1563',
      'inferred_edges_created', false, 'truth_score_created', false, 'privacy_changed', false, 'publication_changed', false
    ) WHERE id = (v_result->>'decision_ledger_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'expected decision ledger receipt for %', v_row.id; END IF;
    v_processed := v_processed + 1;
  END LOOP;
  IF v_processed <> 2 THEN RAISE EXCEPTION 'expected 2 findings, processed %', v_processed; END IF;
END;
$batch$;
