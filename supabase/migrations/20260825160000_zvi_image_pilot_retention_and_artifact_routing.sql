-- SOD1820 — Zvi Image × OCR × Visual Extraction Pilot
-- Actor: CLAUDE
-- Date: 2026-08-25
-- Task: ZVI_IMAGE_OCR_VISUAL_EXTRACTION_PILOT (Zuriel explicit authorization — images only;
--       Anchor Numbers/number_anchors freeze untouched per explicit instruction)
--
-- Reuse, not reinvention: gallery-ocr (supabase/functions/gallery-ocr/index.ts, v5, already live)
-- already performs OCR text + scene description + entity tags + image_type classification +
-- structured gematria readout in a single Anthropic vision call, written into
-- gallery_images.ocr_text/ocr_numbers/ocr_meta/image_type. The graph-wiring functions
-- (feed_image_to_search, wire_image_meaningful, wire_number_to_images, image_connections) already
-- exist and already fire automatically via the trg_feed_after_ocr trigger. None of that is touched,
-- duplicated, or reimplemented here.
--
-- The two things that did NOT already exist, verified live before writing this migration:
--   1. Any independent retention control (image vs. extracted-text vs. both) — gallery_images had
--      no such column (confirmed via information_schema.columns).
--   2. Any artifact-classification/routing layer connecting an OCR'd image's extracted content to
--      the existing Research Intake gate (research_objects/admin_research_review). gallery-ocr only
--      writes OCR output; nothing previously read that output and proposed where it belongs.
--
-- Core semantic law enforced here (per task brief §3-§6):
--   IMAGE = SOURCE/REPRESENTATION, never itself an artifact. Classification runs on the EXTRACTED
--   content (ocr_text/ocr_numbers/ocr_meta), never on "this is an image" alone. Only claim-shaped
--   content (gematria-calculator screenshots, or images carrying gematria-meaningful numbers, or
--   text-bearing document/news screenshots) is auto-routed as a research_objects candidate — always
--   status='candidate', privacy_scope='private' (Privacy Promotion Law: never assume public).
--   Hint-shaped and unclear material is NEVER auto-inserted anywhere — it is flagged for a human to
--   route manually through the existing Hint pipeline (research_gold_hints_law) or Chiddush pipeline
--   (chiddush_submissions), exactly as instructed ("Hint classification remains candidate/Human-Gate
--   controlled"). No physical merge of research_objects/hint-store/chiddush_submissions (Gate #18).
--
-- Anchor Numbers explicitly NOT touched: no reference to number_anchors/metatron_anchors/
-- anchor_families/ANCHOR_SET in this migration or its RPCs.

-- ============================================================================
-- 1. RETENTION COLUMN — additive, non-destructive, independent of privacy/curation/OCR.
--    Default preserves exactly today's behavior (image + its already-extracted text both shown).
--    Never deletes Storage objects or DB rows — a display/routing-gate marker only.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gallery_images' AND column_name = 'retention'
  ) THEN
    ALTER TABLE public.gallery_images
      ADD COLUMN retention text NOT NULL DEFAULT 'image_and_text';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.gallery_images'::regclass AND conname = 'gallery_images_retention_check'
  ) THEN
    ALTER TABLE public.gallery_images
      ADD CONSTRAINT gallery_images_retention_check
      CHECK (retention IN ('image_and_text', 'text_only', 'image_only'));
  END IF;
END $$;

COMMENT ON COLUMN public.gallery_images.retention IS
  'Zuriel-controlled display/routing marker, independent of privacy_scope/curation_status. '
  'image_and_text (default) = show both. text_only = image hidden in UI, extracted text still usable. '
  'image_only = extracted text withheld from the Research Intake routing RPC (image kept, text not '
  'promoted). Never deletes image_url or ocr_text — no destructive action performed by this column.';

-- Retention toggle needs no new RPC: gallery_images already has an admin-only UPDATE policy
-- (gi_admin_update, requires users.role=''admin'') plus an existing GRANT UPDATE to authenticated —
-- verified live before writing this migration. A plain client .update({retention}) already works.

-- ============================================================================
-- 2. image_artifact_classify — pure, read-only, deterministic classification of an OCR'd image's
--    EXTRACTED content (never the image itself). Safe to call on every render (no writes).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.image_artifact_classify(p_gallery_image_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  r record;
  v_has_meaningful_numbers boolean := false;
  v_gem_phrase text;
BEGIN
  SELECT ocr_status, ocr_text, ocr_numbers, ocr_meta, image_type
  INTO r
  FROM public.gallery_images
  WHERE id = p_gallery_image_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('artifact_type', 'not_found', 'reason', 'no such gallery_images row');
  END IF;

  IF coalesce(r.ocr_status, '') <> 'done' THEN
    RETURN jsonb_build_object('artifact_type', 'pending_ocr', 'reason',
      'OCR not yet complete (ocr_status=' || coalesce(r.ocr_status, 'null') || ') — nothing to classify yet');
  END IF;

  v_gem_phrase := r.ocr_meta -> 'gematria' ->> 'phrase';

  -- explicit gematria-calculator screenshot, already structured by gallery-ocr's own prompt
  IF (r.ocr_meta -> 'gematria') IS NOT NULL AND v_gem_phrase IS NOT NULL AND v_gem_phrase <> '' THEN
    RETURN jsonb_build_object('artifact_type', 'claim', 'reason',
      'gematria-calculator screenshot detected by gallery-ocr (ocr_meta.gematria.phrase present)');
  END IF;

  -- meaningful numeric claim: reuses the exact same "meaningful" definition feed_image_to_search
  -- already uses (2-9999, excluding bare year-looking 1990-2099, matched against gematria_words) —
  -- no new numeric-meaningfulness rule invented here.
  IF r.ocr_numbers IS NOT NULL AND array_length(r.ocr_numbers, 1) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM unnest(r.ocr_numbers) n
      WHERE n BETWEEN 2 AND 9999 AND NOT (n BETWEEN 1990 AND 2099)
        AND EXISTS (SELECT 1 FROM public.gematria_words gw WHERE gw.ragil = n OR gw.all_values @> ARRAY[n]::bigint[])
    ) INTO v_has_meaningful_numbers;
  END IF;

  IF v_has_meaningful_numbers THEN
    RETURN jsonb_build_object('artifact_type', 'claim', 'reason',
      'image carries gematria-meaningful numbers (matched against gematria_words)');
  END IF;

  -- text-bearing document/news screenshot with no numeric claim yet — still claim-shaped
  -- (an extractable textual assertion), routed as an observation candidate for human review.
  IF r.image_type IN ('document', 'news') AND length(coalesce(r.ocr_text, '')) > 20 THEN
    RETURN jsonb_build_object('artifact_type', 'claim', 'reason',
      'document/news-type image with substantial extracted text');
  END IF;

  -- a real-world photo with visual entities but no numeric/textual claim — this is exactly the
  -- IMAGE != HINT boundary case: it MAY be a reality-observation Hint, but the engine never
  -- declares that itself. Flagged for a human to route through the existing Hint pipeline.
  IF r.image_type = 'photo' AND jsonb_array_length(coalesce(r.ocr_meta -> 'entities', '[]'::jsonb)) > 0 THEN
    RETURN jsonb_build_object('artifact_type', 'hint_candidate', 'reason',
      'reality-photo with visual entities and no numeric/textual claim — possible Hint, needs human classification, never auto-declared true');
  END IF;

  RETURN jsonb_build_object('artifact_type', 'unclear', 'reason',
    'no numeric claim, no substantial text, no clear visual-hint signal — needs manual human review');
END;
$fn$;

COMMENT ON FUNCTION public.image_artifact_classify(uuid) IS
  'Read-only classifier over an already-OCRd gallery_images row''s EXTRACTED content '
  '(ocr_text/ocr_numbers/ocr_meta) — never over "is this an image". Returns artifact_type in '
  '(pending_ocr, claim, hint_candidate, unclear, not_found) + a human-readable reason. Never writes '
  'anything. Chiddush-shaped (two-phrase comparison) detection is intentionally NOT attempted here — '
  'a single image''s gematria field captures one phrase, not a cross-phrase comparison; chiddush '
  'routing stays a manual admin action via the existing ConvergenceWizard, per Gate #18 (no new '
  'automatic Chiddush classifier invented in this pass).';

GRANT EXECUTE ON FUNCTION public.image_artifact_classify(uuid) TO authenticated;

-- ============================================================================
-- 3. image_artifact_route_to_intake — the one write path this pilot adds. Admin-only (mirrors
--    admin_research_review's own auth check). Idempotent (checks for an existing research_objects
--    row via source_ref before inserting — safe to click twice). Only ever writes status='candidate',
--    privacy_scope='private' — never canonical, never public. Only routes 'claim'-classified content;
--    hint_candidate/unclear are explicitly refused with a message pointing at the existing gates.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.image_artifact_route_to_intake(p_gallery_image_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_is_admin boolean;
  v_class jsonb;
  v_artifact_type text;
  v_row record;
  v_existing_id uuid;
  v_source_ref text;
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

  SELECT id INTO v_existing_id
  FROM public.research_objects
  WHERE source_ref = v_source_ref
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id, 'artifact_type', v_artifact_type);
  END IF;

  INSERT INTO public.research_objects
    (kind, statement, terms, value, source, source_ref, contributor,
     engine_verified, engine_detail, status, privacy_scope)
  VALUES (
    'observation',
    left(coalesce(v_row.ocr_text, ''), 2000),
    CASE WHEN jsonb_typeof(v_row.ocr_meta -> 'entities') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(v_row.ocr_meta -> 'entities'))
      ELSE '{}'::text[] END,
    CASE WHEN v_row.ocr_numbers IS NOT NULL AND array_length(v_row.ocr_numbers, 1) > 0
      THEN v_row.ocr_numbers[1] ELSE NULL END,
    'gallery_images',
    v_source_ref,
    v_row.source,
    false,
    v_row.ocr_meta,
    'candidate',
    'private'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', false,
    'research_object_id', v_new_id, 'artifact_type', v_artifact_type);
END;
$fn$;

COMMENT ON FUNCTION public.image_artifact_route_to_intake(uuid) IS
  'The one write path this pilot adds. Admin-only (same users.role=''admin'' check as '
  'admin_research_review). Idempotent via source_ref=''gallery_images:<id>'' lookup. Only routes '
  'artifact_type=''claim'' content, always as research_objects(kind=''observation'', '
  'status=''candidate'', privacy_scope=''private'', engine_verified=false) — never canonical, never '
  'public, human (admin_research_review) still required to advance it further. Refuses to route when '
  'retention=''image_only''. hint_candidate/unclear/pending_ocr are never inserted anywhere by this '
  'function — routing those is a manual admin action through the existing gates.';

GRANT EXECUTE ON FUNCTION public.image_artifact_route_to_intake(uuid) TO authenticated;
