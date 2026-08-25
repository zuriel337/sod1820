-- SOD1820 — Zvi Pilot · First Human-Gate Workflow (Part B)
-- Actor: CLAUDE
-- Date: 2026-08-25
-- Task: ZVI_PILOT_FIRST_HUMAN_GATE_WORKFLOW (Zuriel explicit authorization)
--
-- Adds exactly one write path: a "➕ שמור למחקר" (save-to-research) action for a raw
-- channel_updates item (Pipeline A / "📡 קליטה חיה" in WarRoomTab.jsx), mirroring the shape and
-- conventions of image_artifact_route_to_intake (20260825160000 migration) exactly — same
-- admin-only gate, same idempotency pattern via source_ref, same status='candidate'/
-- privacy_scope='private' defaults, same "never write more than a candidate" discipline.
--
-- Root cause investigated live before writing this (not assumed): the specific item Zuriel
-- pointed at ("וימאן"/107, צבי/תורת הרמז) is 3 duplicate channel_updates rows, all with
-- image_url=null — it never had a source image. Separately and independently, WarRoomTab.jsx's
-- Pipeline A renderer (normChannel()) already captures channel_updates.image_url into the
-- normalized item (`img`) but never renders it as an <img> anywhere — only as a boolean filter
-- predicate (hasImg). That second, general bug is fixed in this same commit at the frontend level
-- (WarRoomTab.jsx) — no DB change needed for it, image_url was always a real, working column
-- (confirmed already rendered correctly by LiveChannelFeed.jsx/BroadcastsPage.jsx elsewhere).
--
-- Scope discipline (explicit, not accidental): this RPC always treats channel_updates material as
-- claim-shaped (kind='observation') — it does NOT attempt hint/chiddush classification for this
-- source type (out of scope per this task's own DO-NOT-TOUCH list: hint semantics, chiddush
-- pipeline). channel_updates items in this channel are Zuriel/Zvi's own written interpretive
-- gematria-analysis text, not raw reality-photos, so uniform claim-routing is the correct minimal
-- behavior for a first Human-Gate workflow — not a place-holder for a future classifier.
--
-- Truth separation (Part C): this RPC stores the SOURCE material as an unverified candidate only.
-- engine_verified is always false, engine_detail carries only provenance (channel/link_url/
-- image_url), never the FullAnalysis component's computed layers (hub-counts/convergences/
-- recommendations) — deliberately, to avoid conflating "recommendation" with "stored claim" inside
-- one jsonb blob. Nothing here runs or asserts canonical/verified truth.

CREATE OR REPLACE FUNCTION public.channel_update_save_to_research(p_channel_update_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_is_admin boolean;
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
    left(v_row.text, 2000),
    'channel_updates',
    v_source_ref,
    v_row.credit,
    false,
    jsonb_build_object('channel', v_row.channel, 'link_url', v_row.link_url, 'image_url', v_row.image_url,
                        'saved_from', 'pipeline_a_channel_updates'),
    'candidate',
    'private'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', false,
    'research_object_id', v_new_id);
END;
$fn$;

COMMENT ON FUNCTION public.channel_update_save_to_research(uuid) IS
  'The "➕ שמור למחקר" write path for a raw channel_updates (Pipeline A) item. Admin-only '
  '(same users.role=''admin'' check as admin_research_review/image_artifact_route_to_intake). '
  'Idempotent via source_ref=''channel_updates:<id>''. Always inserts kind=''observation'', '
  'status=''candidate'', privacy_scope=''private'', engine_verified=false — never canonical, never '
  'public. Deliberately does not attempt hint/chiddush classification for this source type (see '
  'migration header comment) — that stays a manual admin decision through the existing gates, '
  'unchanged.';

GRANT EXECUTE ON FUNCTION public.channel_update_save_to_research(uuid) TO authenticated;
