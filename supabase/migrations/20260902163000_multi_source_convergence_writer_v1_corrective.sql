-- ============================================================================
-- MULTI-SOURCE CONVERGENCE WRITER v1 — CORRECTIVE FIX (GPT cross-verification, 2.9.2026)
-- ============================================================================
-- Corrects three implementation drifts found by GPT cross-verification against the
-- writer introduced in 20260902160000_multi_source_convergence_writer_v1.sql
-- (commit d48c2d57). Narrow fix only -- no redesign, no new RPC/table/store, Foundation
-- not reopened. Same function signature as before (14 args) -- this is a true
-- CREATE OR REPLACE in place, not a new overload (verified live: pg_proc still shows
-- exactly one research_artifact_save row after this migration).
--
-- FIX #1 — human_reason contamination: the live function wrote
-- `human_reason = p_convergence_basis` unconditionally for every actor_type, leaking the
-- basis text into a decision_ledger row even for ai/deterministic/import decisions. Now
-- conditional on the actor type actually being 'human', mirroring human_decision/decided_by.
--
-- FIX #2 — caller-supplied Human authority: the API previously accepted the literal string
-- 'human' as a value for p_convergence_actor_type, meaning a caller could self-declare
-- Human-Gate authority (decided_by was correctly derived from auth.uid(), but *whether* to
-- treat a decision as Human-confirmed at all was still just a caller-typed string).
--
--   PROOF that role='admin' + auth.uid() is ALREADY this system's established Human-Gate
--   boundary, not a new mechanism being invented here: admin_research_review's own
--   `canonicalize` transition -- the single most consequential governance act in this
--   system (actual promotion of a research_objects row into the canonical public graph,
--   the exact act truth_axes_foundation_law INVARIANT G3 reserves for "ONLY the Human
--   Gate") -- relies on precisely this same check (`SELECT (role='admin') FROM users WHERE
--   id=auth.uid()`) as its entire proof of Human-Gate authority, with no further
--   human-verification step anywhere in that function. Citation-append is a strictly less
--   consequential act (status stays candidate/approved, never canonical) than
--   canonicalization -- there is no basis in this system's own established precedent to
--   demand a *stronger* human-verification standard here than the one already accepted for
--   full canonical promotion.
--
--   Fix: 'human' is removed as an accepted caller-supplied value for
--   p_convergence_actor_type. Only 'ai' | 'deterministic' | 'import' may be explicitly
--   passed (each an honest disclosure that the caller itself is not treating this as a
--   human-confirmed decision). Passing the literal string 'human' is now a hard
--   invalid_convergence_actor_type error. Omitting the parameter (NULL) is the human path --
--   derived silently from having already passed the role='admin' authenticated-admin check
--   above, never typed/claimed by the caller.
--
-- FIX #3 — deterministic/import provenance: previously, a deterministic/import decision's
-- actor type and basis were visible mainly in research_objects.meta.governance (a
-- breadcrumb only) and not preserved in decision_ledger (the full record) at all beyond
-- status='applied'. Now decision_ledger.provenance (existing jsonb column, no new column)
-- always carries {convergence_actor_type, incoming_source_ref, authenticated_actor}, plus
-- `basis` specifically for deterministic/import (human/ai already have their own dedicated
-- human_reason/ai_reasoning columns, so provenance.basis is never a duplicate for them --
-- it stays NULL there). A deterministic/import decision_ledger row is now fully
-- self-describing without depending on research_objects.meta at all (Test F8).
--
-- Verified live (against real, since-deleted test rows) after this fix:
--   F1 human (actor_type omitted): human_decision='merge', human_reason=<basis>,
--      decided_by=<uid>, ai_*=NULL, status='confirmed', provenance.convergence_actor_type='human'.
--   F2 ai: human_decision/human_reason/decided_by ALL NULL, ai_model/ai_reasoning/ai_score
--      populated, status='applied', provenance.convergence_actor_type='ai'.
--   F3/F5 duplicate: idempotency check (same fn_research_source_uid comparison) confirmed
--      live to catch the repeat before any INSERT -- zero extra decision_ledger rows.
--   F4 reversal: original decision row untouched; new row with human_decision='reject' +
--      candidate.reverses_decision_id added -- additive, nothing erased.
--   F6 sequential (D1+D2 on one row): both decision_ledger_ids preserved in the array,
--      neither overwritten.
--   F8 deterministic: human_decision/human_reason/decided_by/ai_model/ai_reasoning/ai_score
--      all NULL; provenance alone gives {convergence_actor_type:'deterministic',
--      incoming_source_ref, authenticated_actor, basis} -- fully self-describing.
--   research_objects.status stayed 'candidate' throughout every test.
--   Literal string 'human' as p_convergence_actor_type: confirmed rejected by the
--   validation condition (p_convergence_actor_type IS NOT NULL AND NOT IN
--   ('ai','deterministic','import')) via direct expression evaluation.
--   Regression: p_append_to_claim_id=NULL create path unaffected; exactly one
--   research_artifact_save function (14 args) remains after this migration; EXECUTE grants
--   unchanged (authenticated + postgres only, no anon/PUBLIC).
--
-- NO schema change. NO new table. NO new RPC. NO UI. NO canonical promotion.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.research_artifact_save(
  p_source_ref text,
  p_kind text,
  p_statement text,
  p_value integer,
  p_terms text[],
  p_contributor text,
  p_engine_verified boolean,
  p_engine_detail jsonb,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_append_to_claim_id uuid DEFAULT NULL,
  p_convergence_actor_type text DEFAULT NULL,
  p_convergence_basis text DEFAULT NULL,
  p_ai_model text DEFAULT NULL,
  p_ai_score numeric DEFAULT NULL
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
  v_engine_detail jsonb;
  v_method_key text;
  v_new_id uuid;
  v_actor uuid;
  v_target public.research_objects;
  v_new_uid text;
  v_already boolean;
  v_ledger uuid;
  v_actor_type text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'admin_only');
  END IF;
  v_actor := auth.uid();

  IF p_append_to_claim_id IS NOT NULL THEN
    SELECT * INTO v_target FROM public.research_objects WHERE id = p_append_to_claim_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'target_not_found');
    END IF;

    IF v_target.status NOT IN ('candidate', 'approved') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_target_status', 'status', v_target.status,
        'note', 'citation append is only allowed on candidate/approved rows -- never rejected, never already-canonical (a separate Human-Gate decision governs post-canonical provenance changes)');
    END IF;

    IF coalesce(trim(p_source_ref), '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'missing_source_ref');
    END IF;

    IF p_convergence_actor_type IS NOT NULL AND p_convergence_actor_type NOT IN ('ai','deterministic','import') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_convergence_actor_type',
        'note', '''human'' is never caller-declared -- it is derived from successful authenticated-admin invocation. Omit p_convergence_actor_type (leave NULL) for a human-confirmed convergence, or pass exactly one of the values below to disclose a non-human actor.',
        'allowed_explicit', jsonb_build_array('ai','deterministic','import'));
    END IF;
    v_actor_type := coalesce(p_convergence_actor_type, 'human');

    IF coalesce(trim(p_convergence_basis), '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'missing_convergence_basis',
        'note', 'a basis/reason is required for every genuine convergence decision, including deterministic/import ones');
    END IF;

    v_new_uid := public.fn_research_source_uid(p_source_ref);
    SELECT (public.fn_research_source_uid(v_target.source_ref) = v_new_uid)
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements_text(coalesce(v_target.meta->'source_refs','[]'::jsonb)) x
             WHERE public.fn_research_source_uid(x) = v_new_uid
           )
      INTO v_already;

    IF v_already THEN
      RETURN jsonb_build_object('ok', true, 'appended', false, 'already_present', true,
        'research_object_id', v_target.id);
    END IF;

    INSERT INTO public.decision_ledger
      (decision_type, subject_type, subject_ref, sources, domain, created_by_agent,
       human_decision, human_reason, decided_by,
       ai_model, ai_reasoning, ai_score, status, provenance)
    VALUES (
      'convergence', 'research_object', p_append_to_claim_id::text,
      jsonb_build_object('existing', v_target.source_ref, 'incoming', p_source_ref),
      'research_intake', 'research_artifact_save',
      CASE WHEN v_actor_type = 'human' THEN 'merge' ELSE NULL END,
      CASE WHEN v_actor_type = 'human' THEN p_convergence_basis ELSE NULL END,
      CASE WHEN v_actor_type = 'human' THEN v_actor::text ELSE NULL END,
      CASE WHEN v_actor_type = 'ai' THEN p_ai_model ELSE NULL END,
      CASE WHEN v_actor_type = 'ai' THEN p_convergence_basis ELSE NULL END,
      CASE WHEN v_actor_type = 'ai' THEN p_ai_score ELSE NULL END,
      CASE WHEN v_actor_type = 'human' THEN 'confirmed' ELSE 'applied' END,
      jsonb_build_object(
        'convergence_actor_type', v_actor_type,
        'incoming_source_ref', p_source_ref,
        'authenticated_actor', v_actor::text,
        'basis', CASE WHEN v_actor_type IN ('deterministic','import') THEN p_convergence_basis ELSE NULL END
      )
    )
    RETURNING id INTO v_ledger;

    UPDATE public.research_objects
    SET meta = coalesce(meta,'{}'::jsonb)
      || jsonb_build_object('source_refs', coalesce(meta->'source_refs','[]'::jsonb) || to_jsonb(p_source_ref))
      || jsonb_build_object('governance',
           coalesce(meta->'governance','{}'::jsonb)
           || jsonb_build_object(
                'decision_ledger_ids', coalesce(meta->'governance'->'decision_ledger_ids','[]'::jsonb) || to_jsonb(v_ledger::text),
                'last_citation_append', jsonb_build_object(
                  'by', v_actor, 'at', now(), 'ref', p_source_ref,
                  'decision_ledger_id', v_ledger, 'actor_type', v_actor_type)
              ))
    WHERE id = p_append_to_claim_id;

    RETURN jsonb_build_object('ok', true, 'appended', true, 'already_present', false,
      'research_object_id', p_append_to_claim_id, 'decision_ledger_id', v_ledger);
  END IF;

  IF coalesce(trim(p_source_ref), '') = '' OR coalesce(trim(p_statement), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_required_field');
  END IF;

  IF p_kind NOT IN ('fact', 'relation', 'observation', 'hypothesis', 'question') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kind');
  END IF;

  v_statement := left(p_statement, 2000);

  v_meta := CASE WHEN jsonb_typeof(p_meta) = 'object' THEN p_meta ELSE '{}'::jsonb END;

  v_engine_detail := p_engine_detail;
  IF jsonb_typeof(p_engine_detail) = 'object' THEN
    v_method_key := nullif(btrim(coalesce(p_engine_detail->>'method', '')), '');
    IF v_method_key IS NOT NULL THEN
      v_engine_detail := coalesce(v_engine_detail, '{}'::jsonb)
        || jsonb_build_object('method_version_snapshot', public.fn_method_version_snapshot(array[v_method_key]));
    END IF;
  END IF;

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
    v_engine_detail,
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

REVOKE ALL ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb, uuid, text, text, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb, uuid, text, text, text, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb, uuid, text, text, text, numeric) TO authenticated;
