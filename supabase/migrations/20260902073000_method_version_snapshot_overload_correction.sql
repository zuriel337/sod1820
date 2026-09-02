-- Method Version Snapshot — Overload Correction
-- Live cross-verification (2.9.2026) found that the prior migration
-- (20260902070000_method_version_snapshot_provenance_closure.sql) used
-- CREATE OR REPLACE FUNCTION research_artifact_save(...) with a NEW trailing
-- parameter (p_method_keys text[]). In PostgreSQL, function identity is the
-- (name, argument-type-list) pair -- adding a parameter changes the identity,
-- so CREATE OR REPLACE did not replace the historical 9-argument function; it
-- created a SECOND, separate 10-argument overload alongside it. The one live
-- caller (src/components/WarRoomTab.jsx, supabase.rpc with 9 named args) kept
-- resolving to the OLD 9-arg implementation, which never gained the snapshot.
-- The new 10-arg overload was also left with no EXECUTE grant (proacl null),
-- unreachable by any authenticated caller regardless.
--
-- CORRECTION (smallest signature-stable fix, per live caller inspection):
-- research_artifact_save's own engine_detail payload, for every candidate
-- shape that actually reaches it (src/lib/triage.js:verifyCandidate --
-- explicit-claim and equation candidates), already carries the verified
-- method under the key "method": {phrase, method: key, claimed, computed}
-- or {method: "רגיל", a:{...}, b:{...}}. No new parameter is needed --
-- the method identity is derived from the EXISTING p_engine_detail argument
-- (research_intake_foundation_contract's own "no invented parallel
-- terminology" principle: reuse the structured argument that already
-- carries this fact, don't add a transport channel for it).
--
-- 1) Drop the orphaned 10-argument overload -- it was never reachable by any
--    real caller (no grant) and must not remain as a second, competing,
--    differently-behaved public signature.
-- 2) CREATE OR REPLACE the true, original 9-argument research_artifact_save
--    (identical signature to the pre-2.9.2026 function -- same OID, same
--    ACL/grants preserved by Postgres because the signature is unchanged),
--    deriving method_key from p_engine_detail->>'method' when present.
--
-- fn_persist_discovery and fn_method_version_snapshot were NOT affected by
-- this bug (their signatures were never changed -- fn_persist_discovery kept
-- its exact original argument list; fn_method_version_snapshot is new and
-- has exactly one signature) and are unchanged by this migration.
--
-- No new table/column/store. No Foundation redesign. No historical row
-- touched. No merge/deploy beyond this branch.

drop function if exists public.research_artifact_save(text, text, text, integer, text[], text, boolean, jsonb, jsonb, text[]);

create or replace function public.research_artifact_save(p_source_ref text, p_kind text, p_statement text, p_value integer, p_terms text[], p_contributor text, p_engine_verified boolean, p_engine_detail jsonb, p_meta jsonb DEFAULT '{}'::jsonb)
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

  -- Method Version Snapshot Provenance Closure (2.9.2026, corrected): derive method_key from
  -- the EXISTING p_engine_detail argument (verifyCandidate's own "method" sibling key) --
  -- no new parameter. Honestly absent (no snapshot) when p_engine_detail carries no method
  -- (e.g. arithmetic-only or not_applicable candidates) -- never fabricated.
  v_engine_detail := p_engine_detail;
  IF jsonb_typeof(p_engine_detail) = 'object' THEN
    v_method_key := nullif(btrim(coalesce(p_engine_detail->>'method', '')), '');
    IF v_method_key IS NOT NULL THEN
      v_engine_detail := coalesce(v_engine_detail, '{}'::jsonb)
        || jsonb_build_object('method_version_snapshot', public.fn_method_version_snapshot(array[v_method_key]));
    END IF;
  END IF;

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
