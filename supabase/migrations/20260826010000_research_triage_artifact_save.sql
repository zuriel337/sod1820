-- SOD1820 — Research Triage Before Human Gate (Part B/8 of the triage brief)
-- Actor: CLAUDE
-- Date: 2026-08-26
-- Task: RESEARCH_TRIAGE_BEFORE_HUMAN_GATE (Zuriel explicit authorization)
--
-- The triage layer itself (src/lib/triage.js) is pure client-side orchestration over the existing
-- extractCandidates/analyzeFull (analysisFlow.js) and METHODS/DEPTH_METHODS (gematria.js) — no new
-- engine, no new extractor, ephemeral until Zuriel explicitly saves an artifact. This migration adds
-- the ONE new write path that ephemeral analysis needs: saving ONE specific extracted artifact
-- (not the whole raw source — that already exists via channel_update_save_to_research/
-- image_artifact_route_to_intake) as its own research_objects candidate.
--
-- Why a new RPC and not reuse of the existing two: those two always save the WHOLE source text as
-- one row. This task's own law ("Do NOT force one source = one research_object... one image/message
-- may contain multiple independent artifacts") requires saving an individual extracted claim
-- (its own statement/value/terms), addressed by its own stable source_ref suffix so multiple
-- artifacts from the same source can each be idempotently tracked. Same admin-only/candidate/
-- private/no-canonical discipline as both existing RPCs — this is the third instance of the exact
-- same shape, not a new pattern.
--
-- kind is constrained by the CALLER to research_objects' own existing CHECK
-- (fact/relation/observation/hypothesis/question) — this RPC does not decide kind, the client's
-- routing classification does (claim-shaped -> observation, relation-shaped/equation -> relation).
--
-- privacy_scope is hardcoded 'private' (not a parameter) — no way to accidentally pass public.

CREATE OR REPLACE FUNCTION public.research_artifact_save(
  p_source_ref text,
  p_kind text,
  p_statement text,
  p_value integer,
  p_terms text[],
  p_contributor text,
  p_engine_verified boolean,
  p_engine_detail jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_is_admin boolean;
  v_existing_id uuid;
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

  SELECT id INTO v_existing_id
  FROM public.research_objects
  WHERE source_ref = p_source_ref
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id);
  END IF;

  INSERT INTO public.research_objects
    (kind, statement, value, terms, source, source_ref, contributor,
     engine_verified, engine_detail, status, privacy_scope)
  VALUES (
    p_kind,
    left(p_statement, 2000),
    p_value,
    coalesce(p_terms, '{}'::text[]),
    'research_triage',
    p_source_ref,
    p_contributor,
    coalesce(p_engine_verified, false),
    p_engine_detail,
    'candidate',
    'private'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', false,
    'research_object_id', v_new_id);
END;
$fn$;

COMMENT ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb) IS
  'Saves ONE triage-extracted artifact (not a whole source) as a research_objects candidate. '
  'Admin-only (same users.role=''admin'' pattern as channel_update_save_to_research/'
  'image_artifact_route_to_intake). Idempotent via source_ref (caller supplies a per-artifact-unique '
  'ref, e.g. channel_updates:<id>#a<index>). Always status=''candidate'', privacy_scope=''private'' '
  '(hardcoded, not a parameter) — never canonical, never public. source=''research_triage'' marks '
  'provenance as coming through this triage layer specifically.';

REVOKE ALL ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb) TO authenticated;
