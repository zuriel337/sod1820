-- ============================================================================
-- RESEARCH INTAKE BUILD v1 — PART 1: INTAKE METADATA CHANNEL
-- ============================================================================
-- Human-Gate authorized (ZURIEL, 2026-08-30). work_log BEFORE 2d9b45b1-3e82-4d09-a936-53bf318288d2.
--
-- WHY: research_intake_foundation_contract v6 §7 declares three MUST-FOUNDATION-NOW laws and states
-- that complex ingestion "must not be treated as extraction-complete until §7.1-§7.3 are implemented
-- and the 3060 golden specimens pass end-to-end".
--   §7.1 Semantic Operand / Quantity Provenance — preserve WHY a literal quantity is present.
--   §7.2 Source Media Reference Preservation   — an unresolved [Image NNNN.jpg] marker is evidence
--                                                 of a missing attachment, never permission to drop it.
--   §7.3 Extraction Fidelity Gate              — ENGINE_VERIFIED arithmetic is NOT proof that
--                                                 extraction succeeded.
-- Verified live before this migration (CONTRACT != IMPLEMENTATION): src/lib/triage.js ALREADY computes
-- all three (deriveQuantityProvenance / extractSourceMediaRefs / computeExtractionIntegrity, surfaced
-- by buildResearchCase which WarRoomTab actually calls, 22/22 tests green incl. both 3060 golden
-- specimens) -- but the result was DISCARDED at the Intake boundary: 0 of 579 research_objects rows
-- carried derivation or media provenance, and research_artifact_save had NO meta parameter at all and
-- never wrote `meta`, so the provenance could not be persisted even in principle.
--
-- WHAT THIS DOES: adds the missing metadata channel to the single canonical Intake writer.
--   * NO new table, NO new column, NO new store/engine/graph/router.
--     The contract itself says "no schema change" / "no new table required" -- provenance lives in the
--     EXISTING research_objects.meta jsonb, under the EXISTING meta.ext extension namespace (§1).
--   * Exactly ONE signature is kept. The prior 8-argument signature is dropped in the same transaction
--     and replaced by the same 9 arguments with p_meta defaulted, so no overload ambiguity can reach
--     PostgREST and any caller still passing 8 named arguments keeps resolving unchanged.
--     Caller surface verified live beforehand: exactly one caller (src/components/WarRoomTab.jsx:1370)
--     and no SQL function references it.
--   * Everything else is byte-for-byte the MF-1 version: the canonical-identity pre-check that closed
--     the silent data-loss bug, ON CONFLICT DO NOTHING against research_objects_identity_uidx, the
--     absorbed-row fallback, admin gating, kind validation, status='candidate', privacy_scope='private'.
--
-- WHAT THIS DOES NOT DO: no backfill of the 579 historical rows, no canonical promotion, no
-- publication, no mass ingestion, no change to engine_verified/status/privacy_scope semantics.
-- ============================================================================

DROP FUNCTION IF EXISTS public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb);

CREATE OR REPLACE FUNCTION public.research_artifact_save(
  p_source_ref text,
  p_kind text,
  p_statement text,
  p_value integer,
  p_terms text[],
  p_contributor text,
  p_engine_verified boolean,
  p_engine_detail jsonb,
  p_meta jsonb DEFAULT '{}'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_existing_id uuid;
  v_statement text;
  v_meta jsonb;
  v_new_id uuid;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'admin_only');
  END IF;

  IF coalesce(trim(p_source_ref), '') = '' OR coalesce(trim(p_statement), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_required_field');
  END IF;

  IF p_kind NOT IN ('fact', 'relation', 'observation', 'hypothesis', 'question') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kind');
  END IF;

  v_statement := left(p_statement, 2000);

  -- V6 §7.1/§7.2/§7.3 provenance arrives already shaped by triage.js buildIntakeMeta(); only an
  -- OBJECT is accepted, so a malformed payload can never corrupt meta.
  v_meta := CASE WHEN jsonb_typeof(p_meta) = 'object' THEN p_meta ELSE '{}'::jsonb END;

  -- Canonical identity pre-check (MF-1). NOT source_ref alone: that was the silent data-loss bug.
  SELECT id INTO v_existing_id
  FROM public.research_objects
  WHERE public.fn_research_source_uid(source_ref) = public.fn_research_source_uid(p_source_ref)
    AND public.fn_research_claim_uid(statement)   = public.fn_research_claim_uid(v_statement)
  ORDER BY created_at
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id);
  END IF;

  INSERT INTO public.research_objects
    (kind, statement, value, terms, source, source_ref, contributor,
     engine_verified, engine_detail, status, privacy_scope, meta)
  VALUES (
    p_kind,
    v_statement,
    p_value,
    coalesce(p_terms, '{}'::text[]),
    'research_triage',
    p_source_ref,
    p_contributor,
    coalesce(p_engine_verified, false),
    p_engine_detail,
    'candidate',
    'private',
    v_meta
  )
  ON CONFLICT (public.fn_research_source_uid(source_ref), public.fn_research_claim_uid(statement))
    WHERE created_at >= timestamptz '2026-08-29 21:00:00+00'
    DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    SELECT id INTO v_existing_id
    FROM public.research_objects
    WHERE public.fn_research_source_uid(source_ref) = public.fn_research_source_uid(p_source_ref)
      AND public.fn_research_claim_uid(statement)   = public.fn_research_claim_uid(v_statement)
    ORDER BY created_at
    LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id, 'absorbed_by', 'research_objects_identity_uidx');
  END IF;

  RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', false,
    'research_object_id', v_new_id,
    'extraction_fidelity', v_meta -> 'ext' -> 'extraction_integrity' ->> 'fidelity_status');
END;
$function$;

COMMENT ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb) IS
  'Research Intake Build v1: the single canonical Intake writer. p_meta carries research_intake_foundation_contract v6 §7.1/§7.2/§7.3 provenance (derivation.inputs, media_refs, extraction_integrity) into the existing research_objects.meta.ext space -- no new table, no new column. Identity/idempotency remain MF-1 (fn_research_source_uid + fn_research_claim_uid + research_objects_identity_uidx).';

-- ACL RESTORE (applied as migration research_intake_v1_meta_channel_acl_restore).
-- DROP+CREATE resets a function ACL to the default (PUBLIC EXECUTE). The prior ACL for
-- research_artifact_save was anon=false, authenticated=true, service_role=false. Restore it exactly;
-- same discipline as 20260823_security_fix_anon_execute_revoke_and_null_bypass.sql.
REVOKE ALL ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb) TO authenticated;
