-- ============================================================================
-- MULTI-SOURCE CONVERGENCE WRITER v1 (ZURIEL Human-Gate, 2.9.2026)
-- ============================================================================
-- Extends the existing public.research_artifact_save (NOT a new RPC) so an additional
-- source citation can be appended to an EXISTING candidate/approved research_objects row
-- when upstream logic (Research/Review/Human-Gate) has already determined the incoming
-- source expresses the SAME semantic Claim/Finding as the target row.
--
-- Architecture (per the resolved §1<->§2 drift in project_codex.research_intake_foundation_contract):
--   research_objects.source_ref        = single/first technical citation anchor (no truth priority)
--   research_objects.meta.source_refs[] = additional citations supporting the SAME semantic Claim
--   decision_ledger                     = WHY/WHO judged the citations to express the same Claim
--   research_objects.meta.governance    = lightweight breadcrumb only (never the sole record)
--
-- CRITICAL LAW enforced here: this function NEVER infers semantic convergence. The append
-- branch only runs when the caller supplies an explicit p_append_to_claim_id (already chosen
-- upstream) -- there is no similarity/scoring logic anywhere in this function against value,
-- topic, image, image_url, Gallery, Post, OCR text, or phrase fragments.
--
-- SECURITY: Human identity is NEVER caller-supplied. decided_by is derived only from
-- auth.uid() of the already-verified admin session. An 'ai'/'deterministic'/'import'
-- p_convergence_actor_type leaves human_decision/decided_by NULL and can never be recorded
-- as a Human-Gate decision. Same SECURITY DEFINER / admin-only boundary as before -- no new
-- public surface.
--
-- IDEMPOTENCY: checked via the existing fn_research_source_uid normalization against both
-- the primary source_ref and every existing meta.source_refs[] entry, BEFORE any
-- decision_ledger write -- a duplicate/already-present citation is a pure no-op and never
-- fabricates a convergence decision.
--
-- GOVERNANCE BREADCRUMB SAFETY FIX (found and corrected during this pass, before write):
-- meta.governance.decision_ledger_id as a SCALAR would silently overwrite an earlier
-- citation-append's decision pointer when a later citation is appended (D1 lost when D2
-- arrives). Fixed by using meta.governance.decision_ledger_ids as an ARRAY (the same
-- append-only jsonb pattern meta.source_refs[] itself already uses) -- every decision
-- remains reconstructable on the row, and independently via
-- `select * from decision_ledger where subject_type='research_object' and subject_ref=<id>`
-- regardless of what the breadcrumb holds.
--
-- STATUS CORRECTION (found during live testing, before this migration was finalized):
-- decision_ledger.status is NOT NULL (an earlier draft of this function incorrectly assumed
-- it was nullable for AI-only proposals and failed a live test with a not-null violation).
-- Fixed: 'confirmed' for a human decision, 'applied' for ai/deterministic/import (the append
-- action did execute at candidate-governance level, honestly distinct from a human ruling --
-- never NULL, never 'confirmed' unless human_decision is actually populated).
--
-- decision_ledger.human_decision is CHECK-constrained to ('approve','reject','merge','modify')
-- -- 'merge' is used for a human-confirmed convergence (two citations merged into one Claim's
-- citation list); this value was verified live against the constraint before use.
--
-- GOVERNANCE STATE: citation append never changes research_objects.status (stays
-- 'candidate'/'approved') and is refused on 'rejected'/'canonical' targets. Per
-- truth_axes_foundation_law INVARIANT G3, this is not a governance transition, so AI/
-- deterministic append is permitted at candidate level with explicit, honestly-tagged
-- provenance; Human Gate remains required only for the separate, already-existing
-- canonicalization path (admin_research_review).
--
-- DO NOT infer disagreement handling here either: if two sources assert different claims,
-- the caller simply never invokes this append path for them -- they go through the existing,
-- unmodified create path below as separate rows, related via the existing
-- relates/parent_id/derived_from mechanisms.
--
-- NO schema change. NO new table. NO new RPC (same function, name unchanged). NO UI.
--
-- IMPORTANT (found and fixed live during this migration's own authoring): a first attempt at
-- this change used CREATE OR REPLACE while only adding trailing DEFAULT-valued parameters,
-- expecting Postgres to treat it as a true in-place replace. It did not -- Postgres created a
-- SECOND, separate 14-arg function alongside the original untouched 9-arg one (two live
-- overloads of the same name), which would have made any 9-positional-argument call site
-- ambiguous. Fixed by explicitly DROP FUNCTION-ing the old 9-arg signature before this
-- migration's CREATE OR REPLACE, leaving exactly one live function. This migration performs
-- the DROP first for exactly that reason -- do not remove it on a future re-run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb);

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

    IF p_convergence_actor_type IS NULL OR p_convergence_actor_type NOT IN ('human','ai','deterministic','import') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_convergence_actor_type',
        'allowed', jsonb_build_array('human','ai','deterministic','import'));
    END IF;

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
       ai_model, ai_reasoning, ai_score, status)
    VALUES (
      'convergence', 'research_object', p_append_to_claim_id::text,
      jsonb_build_object('existing', v_target.source_ref, 'incoming', p_source_ref),
      'research_intake', 'research_artifact_save',
      CASE WHEN p_convergence_actor_type = 'human' THEN 'merge' ELSE NULL END,
      p_convergence_basis,
      CASE WHEN p_convergence_actor_type = 'human' THEN v_actor::text ELSE NULL END,
      CASE WHEN p_convergence_actor_type = 'ai' THEN p_ai_model ELSE NULL END,
      CASE WHEN p_convergence_actor_type = 'ai' THEN p_convergence_basis ELSE NULL END,
      CASE WHEN p_convergence_actor_type = 'ai' THEN p_ai_score ELSE NULL END,
      CASE WHEN p_convergence_actor_type = 'human' THEN 'confirmed' ELSE 'applied' END
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
                  'decision_ledger_id', v_ledger, 'actor_type', p_convergence_actor_type)
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
