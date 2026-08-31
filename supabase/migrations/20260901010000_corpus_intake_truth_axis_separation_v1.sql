-- SOD1820 Foundation — Corpus Intake Truth-Axis Separation v1
-- Prepared on branch only. DO NOT APPLY / MERGE / DEPLOY without explicit ZURIEL release approval.
--
-- Goal:
--   Corpus approval != engine verification != publication.
--
-- Existing live defect before this migration:
--   resolve_word_review(approve) directly sets BOTH is_verified=true AND is_published=true.
--
-- This migration preserves current capability while separating authority:
--   1) machine verification is performed by a dedicated verifier against canonical engine outputs;
--   2) human review approval sets only corpus-approval provenance (visibility_reason + queue status);
--   3) publication remains untouched and therefore stays an independent action.

CREATE OR REPLACE FUNCTION public.fn_verify_gematria_word_engine(p_word_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v public.gematria_words%rowtype;
  v_ok boolean := false;
BEGIN
  SELECT * INTO v FROM public.gematria_words WHERE id = p_word_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Verification is only declared for the clean Hebrew corpus covered by the
  -- canonical engine-integrity contract. Unknown / dirty input remains unverified.
  IF v.phrase !~ '^[א-ת]+( [א-ת]+)*$' THEN
    UPDATE public.gematria_words SET is_verified = false WHERE id = p_word_id;
    RETURN false;
  END IF;

  -- Require the full canonical stored method set used by gematria_integrity;
  -- absence is not a match.
  IF v.ragil IS NULL OR v.misratar IS NULL OR v.miluy IS NULL OR v.kadmi IS NULL
     OR v.gadol IS NULL OR v.siduri IS NULL OR v.atbash IS NULL OR v.albam IS NULL
     OR v.miluy_demiluy IS NULL OR v.kadmi_gadol IS NULL OR v.ribua IS NULL
     OR v.ribua_gadol IS NULL OR v.hakpala IS NULL OR v.hakpala_gadol IS NULL THEN
    UPDATE public.gematria_words SET is_verified = false WHERE id = p_word_id;
    RETURN false;
  END IF;

  -- gematria_integrity contains mismatches only. Zero mismatches across the
  -- complete stored set means the canonical engine reproduced every stored value.
  v_ok := NOT EXISTS (
    SELECT 1 FROM public.gematria_integrity gi WHERE gi.id = p_word_id
  );

  UPDATE public.gematria_words
     SET is_verified = v_ok
   WHERE id = p_word_id;

  RETURN v_ok;
END;
$function$;

COMMENT ON FUNCTION public.fn_verify_gematria_word_engine(uuid) IS
  'Machine-only verification boundary for gematria_words. Compares the complete clean-Hebrew stored method set to canonical engine outputs through gematria_integrity. Never approves corpus governance and never publishes.';

CREATE OR REPLACE FUNCTION public.resolve_word_review(
  p_id uuid,
  p_action text,
  p_edit text DEFAULT NULL::text,
  p_by text DEFAULT 'admin'::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v record;
  v_phrase text;
  v_add_result text;
  v_word_id uuid;
  v_engine_verified boolean;
BEGIN
  SELECT * INTO v FROM public.word_review_queue WHERE id = p_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  v_phrase := btrim(coalesce(nullif(p_edit,''), v.extracted));

  IF p_action IN ('approve','edit') THEN
    v_add_result := public.wa_add_word(v_phrase, coalesce(v.source,'review'), null);

    IF v_add_result = 'possible_variant_queued' THEN
      UPDATE public.word_review_queue
         SET status='merged', extracted=v_phrase, decided_by=p_by,
             decided_at=now(), updated_at=now()
       WHERE id=p_id;
      RETURN 'possible_variant_redirected:' || v_phrase;
    END IF;

    SELECT (public.fn_resolve_word_identity(v_phrase)->>'word_id')::uuid INTO v_word_id;

    IF v_word_id IS NOT NULL THEN
      -- Axis 2 — VERIFICATION: machine-owned only.
      v_engine_verified := public.fn_verify_gematria_word_engine(v_word_id);

      -- Axis 3 / corpus-governance provenance: Human Gate approval.
      -- IMPORTANT: no is_verified assignment here and NO is_published assignment.
      UPDATE public.gematria_words
         SET visibility_reason = 'approved_by_admin',
             visibility_changed_at = now()
       WHERE id = v_word_id;
    END IF;

    UPDATE public.word_review_queue
       SET status='approved', extracted=v_phrase, decided_by=p_by,
           decided_at=now(), updated_at=now()
     WHERE id=p_id;

    RETURN 'approved:' || coalesce(v_add_result,'unknown') ||
           CASE WHEN v_word_id IS NOT NULL
                THEN ':engine_verified=' || coalesce(v_engine_verified,false)::text
                ELSE ':engine_verified=false' END;

  ELSIF p_action = 'reject' THEN
    UPDATE public.word_review_queue SET status='rejected', decided_by=p_by, decided_at=now() WHERE id=p_id;
    RETURN 'rejected';
  ELSIF p_action IN ('block','hide') THEN
    UPDATE public.word_review_queue SET status='blocked', decided_by=p_by, decided_at=now() WHERE id=p_id;
    RETURN 'blocked';
  ELSIF p_action = 'merge' THEN
    UPDATE public.word_review_queue SET status='merged', decided_by=p_by, decided_at=now() WHERE id=p_id;
    RETURN 'merged';
  ELSIF p_action = 'delete' THEN
    DELETE FROM public.word_review_queue WHERE id=p_id;
    RETURN 'deleted';
  END IF;

  RETURN 'noop';
END;
$function$;

COMMENT ON FUNCTION public.resolve_word_review(uuid,text,text,text) IS
  'Human corpus-review boundary. Approval records corpus governance only; engine verification is delegated to fn_verify_gematria_word_engine; publication is never changed by review approval.';
