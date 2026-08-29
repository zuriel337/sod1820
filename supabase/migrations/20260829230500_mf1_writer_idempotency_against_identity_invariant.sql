-- ============================================================================
-- MF-1 MINIMUM CLOSURE — WRITER IDEMPOTENCY AGAINST THE IDENTITY INVARIANT
-- ============================================================================
-- Companion to 20260829230000_mf1_research_object_identity_invariant.sql.
-- Human-Gate approved minimum package only (work_log 372d7a5c / BEFORE 091b7274).
--
-- Each SQL writer that INSERTs into public.research_objects now absorbs a
-- conflict on the canonical identity instead of erroring, and returns the
-- pre-existing row — so a retry is a no-op rather than a duplicate.
--
-- Arbiter inference uses the full partial-index specification
--   ON CONFLICT (fn_research_source_uid(source_ref), fn_research_claim_uid(statement))
--   WHERE created_at >= timestamptz '2026-08-29 21:00:00+00'
-- which is satisfied by every new row (created_at defaults to now()).
--
-- EXTRACTION SEMANTICS ARE UNCHANGED. No writer's classification, gating,
-- privacy_scope, status, engine verification or Human-Gate behaviour is altered.
--
-- DELIBERATELY NOT TOUCHED — fn_upsert_self_profile / fn_upsert_family_member /
-- fn_upsert_family_relation (private Life Ledger, 6 live rows). They are already
-- idempotent by construction: a deterministic source_ref plus SELECT-then-
-- UPDATE-or-INSERT. Adding ON CONFLICT DO NOTHING to their
-- `INSERT ... RETURNING id INTO v_id` would return NULL on a concurrent race and
-- break their return contract — strictly worse than today. The new invariant
-- still protects them: a genuine race now raises instead of silently
-- duplicating.
--
-- Direct agent SQL (service-role/MCP, 70.8% of live rows) is intentionally NOT
-- given an absorber: it receives a hard unique violation, which is the correct
-- signal that the same source claim is being re-inserted.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- C1. channel_update_save_to_research — conflict-absorbing insert
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.channel_update_save_to_research(p_channel_update_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_row record;
  v_existing_id uuid;
  v_source_ref text;
  v_statement text;
  v_new_id uuid;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'admin_only');
  END IF;

  SELECT text, channel, credit, link_url, image_url
  INTO v_row
  FROM public.channel_updates
  WHERE id = p_channel_update_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF coalesce(trim(v_row.text), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_text',
      'reason', 'אין טקסט לשמור (רשומה ריקה/תמונה-בלבד ללא כיתוב) — שמור ידנית אחרי חילוץ/OCR אם רלוונטי');
  END IF;

  v_source_ref := 'channel_updates:' || p_channel_update_id::text;
  v_statement  := left(v_row.text, 2000);

  SELECT id INTO v_existing_id
  FROM public.research_objects
  WHERE source_ref = v_source_ref
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id);
  END IF;

  INSERT INTO public.research_objects
    (kind, statement, source, source_ref, contributor, engine_verified, engine_detail, status, privacy_scope)
  VALUES (
    'observation',
    v_statement,
    'channel_updates',
    v_source_ref,
    v_row.credit,
    false,
    jsonb_build_object('channel', v_row.channel, 'link_url', v_row.link_url, 'image_url', v_row.image_url,
                        'saved_from', 'pipeline_a_channel_updates'),
    'candidate',
    'private'
  )
  ON CONFLICT (public.fn_research_source_uid(source_ref), public.fn_research_claim_uid(statement))
    WHERE created_at >= timestamptz '2026-08-29 21:00:00+00'
    DO NOTHING
  RETURNING id INTO v_new_id;

  -- MF-1: absorbed by the identity invariant -> hand back the pre-existing row.
  IF v_new_id IS NULL THEN
    SELECT id INTO v_existing_id
    FROM public.research_objects
    WHERE public.fn_research_source_uid(source_ref) = public.fn_research_source_uid(v_source_ref)
      AND public.fn_research_claim_uid(statement)   = public.fn_research_claim_uid(v_statement)
    ORDER BY created_at
    LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id, 'absorbed_by', 'research_objects_identity_uidx');
  END IF;

  RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', false,
    'research_object_id', v_new_id);
END;
$function$;


-- ----------------------------------------------------------------------------
-- C2. image_artifact_route_to_intake — conflict-absorbing insert
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.image_artifact_route_to_intake(p_gallery_image_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_class jsonb;
  v_artifact_type text;
  v_row record;
  v_existing_id uuid;
  v_source_ref text;
  v_statement text;
  v_new_id uuid;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'admin_only');
  END IF;

  SELECT ocr_text, ocr_numbers, ocr_meta, source, retention
  INTO v_row
  FROM public.gallery_images
  WHERE id = p_gallery_image_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF coalesce(v_row.retention, 'image_and_text') = 'image_only' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'retention_image_only',
      'reason', 'retention=image_only — extracted text withheld from Research Intake by Zuriel''s own retention setting for this item; OCR text itself remains stored, just not routed');
  END IF;

  v_class := public.image_artifact_classify(p_gallery_image_id);
  v_artifact_type := v_class ->> 'artifact_type';

  IF v_artifact_type <> 'claim' THEN
    RETURN jsonb_build_object('ok', false, 'routed', false, 'artifact_type', v_artifact_type,
      'reason', v_class ->> 'reason',
      'note', 'not auto-routed — route manually via the existing Hint pipeline (research_gold_hints_law) or Chiddush pipeline (chiddush_submissions/ConvergenceWizard) as appropriate; this RPC only auto-routes claim-shaped content');
  END IF;

  v_source_ref := 'gallery_images:' || p_gallery_image_id::text;
  v_statement  := left(coalesce(v_row.ocr_text, ''), 2000);

  SELECT id INTO v_existing_id
  FROM public.research_objects
  WHERE source_ref = v_source_ref
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id, 'artifact_type', v_artifact_type);
  END IF;

  -- Root fix 2026-08-26 (actor=CLAUDE, ZURIEL/GPT authorized, GRAPH TRUTH BUG, second inconsistent
  -- heuristic found alongside feed_image_to_search): previously `value` was set to ocr_numbers[1] --
  -- the first number in Claude vision's transcription order -- treated as if it were the canonical
  -- claim value, with no verified-claim evidence behind that choice, and inconsistent with
  -- feed_image_to_search's own (also-wrong) smallest-number selection on the same image. No
  -- explicit-verified-claim bridge exists yet (named as a future Extension Point, not built in this
  -- pass) so `value` is now left NULL -- raw ocr_numbers/ocr_meta remain fully preserved and traceable
  -- via source_ref back to the gallery_images row; only the false single-value identity is removed.
  INSERT INTO public.research_objects
    (kind, statement, terms, value, source, source_ref, contributor,
     engine_verified, engine_detail, status, privacy_scope)
  VALUES (
    'observation',
    v_statement,
    CASE WHEN jsonb_typeof(v_row.ocr_meta -> 'entities') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(v_row.ocr_meta -> 'entities'))
      ELSE '{}'::text[] END,
    NULL,
    'gallery_images',
    v_source_ref,
    v_row.source,
    false,
    v_row.ocr_meta,
    'candidate',
    'private'
  )
  ON CONFLICT (public.fn_research_source_uid(source_ref), public.fn_research_claim_uid(statement))
    WHERE created_at >= timestamptz '2026-08-29 21:00:00+00'
    DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    SELECT id INTO v_existing_id
    FROM public.research_objects
    WHERE public.fn_research_source_uid(source_ref) = public.fn_research_source_uid(v_source_ref)
      AND public.fn_research_claim_uid(statement)   = public.fn_research_claim_uid(v_statement)
    ORDER BY created_at
    LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id, 'artifact_type', v_artifact_type,
      'absorbed_by', 'research_objects_identity_uidx');
  END IF;

  RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', false,
    'research_object_id', v_new_id, 'artifact_type', v_artifact_type);
END;
$function$;


-- ----------------------------------------------------------------------------
-- C3. research_artifact_save — canonical identity behaviour
-- ----------------------------------------------------------------------------
-- BUG CLOSED HERE (U1 / SF-1, work_log d91623ce): the pre-check used
-- `WHERE source_ref = p_source_ref` alone, so the SECOND DISTINCT CLAIM from one
-- source was silently DROPPED and the RPC returned already_existed=true pointing
-- at an UNRELATED row — data loss plus false provenance. The lookup is now the
-- canonical identity (source AND claim), so distinct claims from one source are
-- accepted, while a true repeat is still absorbed.
CREATE OR REPLACE FUNCTION public.research_artifact_save(p_source_ref text, p_kind text, p_statement text, p_value integer, p_terms text[], p_contributor text, p_engine_verified boolean, p_engine_detail jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_existing_id uuid;
  v_statement text;
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
     engine_verified, engine_detail, status, privacy_scope)
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
    'private'
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
    'research_object_id', v_new_id);
END;
$function$;


-- ----------------------------------------------------------------------------
-- C4. fn_persist_discovery — conflict-absorbing insert
-- ----------------------------------------------------------------------------
-- Its own (kind, value, sorted-distinct terms) dedup and pg_advisory_xact_lock
-- are PRESERVED unchanged; the identity invariant is an additional backstop.
CREATE OR REPLACE FUNCTION public.fn_persist_discovery(p_value integer, p_terms text[], p_statement text, p_confidence integer DEFAULT NULL::integer, p_engine_detail jsonb DEFAULT '{}'::jsonb, p_evidence text DEFAULT NULL::text, p_source text DEFAULT 'discovery-engine'::text, p_source_ref text DEFAULT NULL::text, p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_key text; v_id uuid; v_ph text; v_m text; v_calc int; v_lock bigint;
begin
  if p_value is null
     or coalesce(array_length(p_terms,1),0) < 2
     or btrim(coalesce(p_statement,'')) = ''
     or p_engine_detail is null or p_engine_detail = '{}'::jsonb then
    raise warning 'fn_persist_discovery: insufficient_discovery (value=%, terms=%)', p_value, p_terms;
    return jsonb_build_object('ok', false, 'error', 'insufficient_discovery');
  end if;

  for v_ph, v_m in
    select je.key, jsonb_array_elements_text(je.value) from jsonb_each(p_engine_detail) je
  loop
    v_calc := case v_m
      when 'רגיל'   then fn_ragil(v_ph)
      when 'מילוי'  then fn_miluy(v_ph)
      when 'מסתתר'  then fn_misratar(v_ph)
      when 'קדמי'   then kadmi_calc(v_ph)
      when 'גדול'   then fn_gadol(v_ph)
      when 'סידורי' then fn_siduri(v_ph)
      when 'אתבש'   then atbash_calc(v_ph)
      when 'אלבם'   then fn_albam(v_ph)
      when 'ריבוע'  then fn_ribua(v_ph)
      else null end;
    if v_calc is null or v_calc <> p_value then
      raise warning 'fn_persist_discovery: engine_verification_failed (%/% = % ≠ %)', v_ph, v_m, v_calc, p_value;
      return jsonb_build_object('ok', false, 'error', 'engine_verification_failed',
        'phrase', v_ph, 'method', v_m, 'got', v_calc, 'expected', p_value);
    end if;
  end loop;

  select string_agg(t, '|' order by t) into v_key
    from (select distinct btrim(x) t from unnest(p_terms) x) s;
  v_lock := hashtextextended('rd:' || p_value::text || ':' || v_key, 0);
  perform pg_advisory_xact_lock(v_lock);

  select ro.id into v_id from public.research_objects ro
   where ro.kind = 'relation' and ro.value = p_value and ro.status <> 'rejected'
     and (select string_agg(t, '|' order by t)
            from (select distinct btrim(x) t from unnest(ro.terms) x) z) = v_key
   limit 1;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'dedup', true, 'id', v_id, 'status', 'existing');
  end if;

  insert into public.research_objects
    (kind, status, value, terms, relates, statement, engine_verified, engine_detail,
     evidence, confidence, source, source_ref, contributor, meta, parent_id, promoted_node_id)
  values
    ('relation', 'candidate', p_value, p_terms, p_terms, p_statement, true, p_engine_detail,
     p_evidence, p_confidence,
     coalesce(nullif(btrim(p_source), ''), 'discovery-engine'), p_source_ref,
     'מערכת כי לה׳ המלוכה', coalesce(p_meta, '{}'::jsonb), null, null)
  on conflict (public.fn_research_source_uid(source_ref), public.fn_research_claim_uid(statement))
    where created_at >= timestamptz '2026-08-29 21:00:00+00'
    do nothing
  returning id into v_id;

  -- MF-1: absorbed by the identity invariant -> report the pre-existing row.
  if v_id is null then
    select ro.id into v_id from public.research_objects ro
     where public.fn_research_source_uid(ro.source_ref) = public.fn_research_source_uid(p_source_ref)
       and public.fn_research_claim_uid(ro.statement)   = public.fn_research_claim_uid(p_statement)
     order by ro.created_at
     limit 1;
    return jsonb_build_object('ok', true, 'dedup', true, 'id', v_id, 'status', 'existing',
      'absorbed_by', 'research_objects_identity_uidx');
  end if;

  return jsonb_build_object('ok', true, 'dedup', false, 'id', v_id, 'status', 'candidate');
end; $function$;


-- ----------------------------------------------------------------------------
-- C5. fn_corpus_admission_gate — conflict-absorbing insert
-- ----------------------------------------------------------------------------
-- Previously an UNCONDITIONAL insert with zero dedup on every MATCH carrying a
-- claimed value. Classification behaviour (MATCH / POSSIBLE_VARIANT / NEW) and
-- the returned payload are unchanged; only the write becomes idempotent.
CREATE OR REPLACE FUNCTION public.fn_corpus_admission_gate(p_phrase text, p_source text, p_source_ref text DEFAULT NULL::text, p_contributor text DEFAULT NULL::text, p_claimed_value integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_identity jsonb := fn_resolve_word_identity(p_phrase);
  v_class text := v_identity->>'classification';
  v_word_id uuid;
begin
  if v_class = 'MATCH' then
    v_word_id := (v_identity->>'word_id')::uuid;
    if p_source_ref is not null and p_claimed_value is not null then
      insert into research_objects (kind, statement, terms, value, source, source_ref, contributor, confidence, engine_verified, status, meta)
      values ('fact', coalesce(p_phrase,'') || ' — repeated discovery', array[btrim(p_phrase)], p_claimed_value,
        coalesce(p_source,'admission_gate'), p_source_ref, p_contributor, 90, true, 'candidate',
        jsonb_build_object('ext', jsonb_build_object('corpus_admission', jsonb_build_object(
          'matched_word_id', v_word_id, 'match_type', v_identity->>'match_type',
          'original_representation', p_phrase, 'gate', 'fn_corpus_admission_gate'))))
      on conflict (public.fn_research_source_uid(source_ref), public.fn_research_claim_uid(statement))
        where created_at >= timestamptz '2026-08-29 21:00:00+00'
        do nothing;
    end if;
    return jsonb_build_object('action','existing','word_id',v_word_id,'identity',v_identity);
  elsif v_class = 'POSSIBLE_VARIANT' then
    return jsonb_build_object('action','review','identity',v_identity);
  else
    return jsonb_build_object('action','new','identity',v_identity);
  end if;
end $function$;
