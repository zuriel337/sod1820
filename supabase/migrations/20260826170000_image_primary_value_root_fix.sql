-- SOD1820 — Image primary_value Root Fix (GRAPH TRUTH BUG)
-- Actor: CLAUDE
-- Date: 2026-08-26
-- Task: IMAGE_PROJECTION_ROOT_FIX (ZURIEL/GPT explicit authorization — forward-only fix, no
--       historical repair, no relation-vocabulary change, no new heuristic)
--
-- DB↔Git reproducibility note: feed_image_to_search(), wire_image_meaningful(),
-- wire_number_to_images() were found LIVE on Supabase with NO CREATE FUNCTION in any prior
-- migration (confirmed via repo-wide grep before this change). This migration commits the
-- CURRENT, POST-FIX definition of feed_image_to_search() and image_artifact_route_to_intake()
-- so this specific fix stops being DB-only drift. wire_image_meaningful()/wire_number_to_images()
-- are UNCHANGED by this fix (their existing "return early if primary_value IS NULL" gate was
-- already correct) and are intentionally NOT included here — recommend a separate reproducibility
-- pass to commit their pre-existing definitions verbatim, out of scope for this fix.
--
-- ROOT CAUSE (audited live, reproduced on 8/9 real multi-candidate Zvi corpus images and on live
-- Reality Stream rows predating this fix by ~2.5 months): feed_image_to_search() built its
-- "meaningful" numbers via `array_agg(distinct n ORDER BY n)` (ascending sort) and then set
-- `primary_value = coalesce(gi.primary_value, meaningful[1])` — i.e. the ARITHMETICALLY SMALLEST
-- qualifying number won, with no relation to which number was the image's actual subject.
-- wire_image_meaningful() then used this wrong value to wire a live nodes(type='image') <->
-- nodes(type='number') edge (relation_type='contains') into the canonical knowledge graph, and
-- ~14 other live consumers (convergence_meter's truth-score, sitemap_numbers' SEO signal,
-- top_primary_values' public ranking widget, notify_on_stream_image's real-time notifications,
-- RealityWorld.jsx's public-facing badge on every /archive hint card, etc.) all read
-- gallery_images.primary_value as if it were verified ground truth.
--
-- Separately, image_artifact_route_to_intake() (added 2026-08-25) used a second, INCONSISTENT
-- heuristic for the same concept: research_objects.value = ocr_numbers[1] (first element in
-- Claude vision's transcription order) — different from feed_image_to_search's answer for the
-- same image in general, and equally ungrounded in verified evidence.
--
-- LIVE FACT (GPT cross-verified before this fix was authorized): gallery_images.all_values is
-- multi-valued for 2,420 of 2,553 rows (single-value: 129, none: 4) — MULTI-VALUE IS THE NORM,
-- NOT THE EXCEPTION. Forcing a single "primary" number was therefore the wrong cardinality
-- assumption, not merely a wrong selection algorithm.
--
-- THE FIX (both functions, minimal and surgical — no new heuristic substituted):
--   - A single unambiguous candidate is NOT a guess (no competing candidate exists to choose
--     between) — it may still auto-set primary_value when previously NULL.
--   - Two or more candidates now leave primary_value untouched (stays NULL, unless a human/manual
--     value already exists) rather than picking one arbitrarily. NULL > false graph truth.
--   - Existing non-null primary_value (manual curation via ImageEditModal.jsx, or any prior
--     value) is always preserved via COALESCE, exactly as before this fix — this change only
--     affects rows where primary_value was NULL at the time of (re-)OCR.
--   - image_artifact_route_to_intake() no longer fabricates research_objects.value from
--     ocr_numbers[1] — value is left NULL; raw ocr_numbers/ocr_meta remain fully preserved and
--     traceable via source_ref back to the gallery_images row. A future verified-claim bridge
--     (explicit phrase=value claim, engine-confirmed) is named as an EXTENSION POINT, not built
--     here.
--
-- NOT done in this migration (explicitly out of scope, per instruction):
--   - No historical repair: the ~2,027 existing image->number edges and ~1,871 existing
--     primary_value values are UNTOUCHED. Re-verified live immediately after this fix: all 14
--     Zvi pilot images' primary_value/all_values are byte-identical to their pre-fix snapshot.
--   - No relation_type vocabulary change ('contains' vs 'mentions' — HOLD, needs a separate
--     relation-semantics crosswalk).
--   - No mass OCR, no new engine, no new table.
--
-- TESTED (live, on 3 synthetic gallery_images fixtures created, verified, then fully deleted —
-- zero residue; real Zvi/Reality Stream data never touched by the test):
--   Case A (single verified number, e.g. ocr_numbers=[786]): all_values=[786], primary_value
--     auto-set to 786 (no competition) -- PASS.
--   Case B (multi-number, e.g. ocr_numbers=[6,209,1254] -- the exact real Zvi-pilot-9 shape that
--     was previously mis-set to 6): all_values=[6,209,1254], primary_value stayed NULL, zero
--     image->number edge created -- PASS.
--   Case D (manual primary_value=999999 set before OCR arrives, then multi-number OCR lands):
--     primary_value remained 999999 untouched, all_values correctly updated -- PASS.
--   Case E (idempotent re-OCR of case A's row): primary_value remained 786, unchanged -- PASS.

CREATE OR REPLACE FUNCTION public.feed_image_to_search(p_id uuid, p_overwrite boolean DEFAULT false)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare meaningful int[];
begin
  select array_agg(distinct n order by n) into meaningful
  from gallery_images gi, lateral unnest(gi.ocr_numbers) n
  where gi.id = p_id
    and n between 2 and 9999 and not (n between 1990 and 2099)
    and exists (select 1 from gematria_words gw where gw.ragil = n or gw.all_values @> array[n]::bigint[]);
  update gallery_images gi
  set all_values = case
        when p_overwrite or gi.all_values is null or array_length(gi.all_values,1)=0
          then coalesce(meaningful,'{}')
        else (select array_agg(distinct x) from unnest(gi.all_values || coalesce(meaningful,'{}')) x)
      end,
      -- Root fix 2026-08-26: never auto-select "the primary" among competing candidates. See
      -- migration header comment for full rationale.
      primary_value = coalesce(gi.primary_value,
        case when array_length(meaningful,1) = 1 then meaningful[1] else null end)
  where gi.id = p_id;
  return meaningful;
end $function$;

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

  -- Root fix 2026-08-26: no explicit-verified-claim bridge exists yet (named as a future
  -- Extension Point, not built in this pass), so `value` is left NULL instead of the previous
  -- ocr_numbers[1] guess. Raw ocr_numbers/ocr_meta remain fully preserved and traceable via
  -- source_ref back to the gallery_images row.
  INSERT INTO public.research_objects
    (kind, statement, terms, value, source, source_ref, contributor,
     engine_verified, engine_detail, status, privacy_scope)
  VALUES (
    'observation',
    left(coalesce(v_row.ocr_text, ''), 2000),
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
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', false,
    'research_object_id', v_new_id, 'artifact_type', v_artifact_type);
END;
$fn$;
