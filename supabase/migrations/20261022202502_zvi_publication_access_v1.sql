-- ZVI_PUBLICATION_ACCESS_V1
--
-- Human-Gate decision (ZURIEL, 2026-10-22): the material attributed to the
-- canonical contributor tzvi-opoc is not private. This migration changes the
-- publication/access axis only. It does not change research status, engine
-- verification, canonicality, graph promotion, source provenance or Topic
-- admission, and it never treats a quality score as a truth score.

-- `public` is a publication scope, distinct from the historical
-- `public_candidate` research/governance scope.
ALTER TABLE public.research_objects
  DROP CONSTRAINT IF EXISTS research_objects_privacy_scope_check;

ALTER TABLE public.research_objects
  ADD CONSTRAINT research_objects_privacy_scope_check
  CHECK (
    privacy_scope = ANY (
      ARRAY['private', 'family_shared', 'public_candidate', 'public']::text[]
    )
  ) NOT VALID;

-- Public access is explicit and excludes personal-only research even if an
-- administrator attempts to assign the public scope manually.
DROP POLICY IF EXISTS ro_public_read ON public.research_objects;
CREATE POLICY ro_public_read
  ON public.research_objects
  FOR SELECT
  TO anon, authenticated
  USING (
    privacy_scope = 'public'
    AND coalesce(meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
  );

CREATE INDEX IF NOT EXISTS research_objects_public_contributor_created_idx
  ON public.research_objects (contributor, created_at DESC, id)
  WHERE privacy_scope = 'public'
    AND coalesce(meta #>> '{ext,personal_scope,scope}', '') <> 'person_only';

-- One governed publication action for World and the Golden Projector.
-- SECURITY DEFINER is required so an authorized administrator can alter the
-- access axis; authorization is checked again in the function body and the
-- function is never executable by anon/PUBLIC.
CREATE OR REPLACE FUNCTION public.admin_research_set_publication_v1(
  p_id uuid,
  p_publish boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_before text;
  v_after text;
  v_personal_scope text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_publish IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_publication_state');
  END IF;

  SELECT
    privacy_scope,
    meta #>> '{ext,personal_scope,scope}'
  INTO v_before, v_personal_scope
  FROM public.research_objects
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found', 'id', p_id);
  END IF;

  IF p_publish AND coalesce(v_personal_scope, '') = 'person_only' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'person_only', 'id', p_id);
  END IF;

  v_after := CASE WHEN p_publish THEN 'public' ELSE 'private' END;

  UPDATE public.research_objects
  SET privacy_scope = v_after
  WHERE id = p_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', p_id,
    'published', p_publish,
    'before', v_before,
    'after', v_after,
    'note', p_note
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_research_set_publication_v1(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_research_set_publication_v1(uuid, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_research_set_publication_v1(uuid, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.admin_research_set_publication_v1(uuid, boolean, text) IS
  'Human-Gated publication access only. Never changes governance, verification, canonicality, graph promotion, source or contributor identity.';

DO $migration$
DECLARE
  v_contributor_id uuid;
  v_aliases text[] := ARRAY[
    'OPOC1 OPOC1',
    'צבי',
    'צבי (OPOC)',
    'צבי (OPOC1)'
  ]::text[];
BEGIN
  SELECT id
  INTO STRICT v_contributor_id
  FROM public.contributors
  WHERE id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
    AND slug = 'tzvi-opoc';

  -- Bind only exact registered aliases that have no stable contributor yet.
  -- A stable identity already present on a row is never overridden.
  UPDATE public.channel_updates
  SET contributor_id = v_contributor_id
  WHERE contributor_id IS NULL
    AND (
      credit = ANY (v_aliases)
      OR speaker = ANY (v_aliases)
    );

  -- Existing public readers use status='live'. Preserve explicit `off` rows.
  UPDATE public.channel_updates
  SET status = 'live'
  WHERE contributor_id = v_contributor_id
    AND status IN ('private', 'published');

  -- Publish the exact contributor corpus. Source provenance is resolved from
  -- the now-bound canonical channel rows; exact legacy contributor labels are
  -- retained as a migration-only compatibility path. Personal-only rows fail
  -- closed even though none were present at the Human-Gate decision.
  UPDATE public.research_objects AS ro
  SET privacy_scope = 'public'
  WHERE coalesce(ro.meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
    AND (
      ro.contributor = ANY (v_aliases)
      OR split_part(coalesce(ro.source_ref, ''), '#', 1) IN (
        SELECT 'channel_updates:' || cu.id::text
        FROM public.channel_updates AS cu
        WHERE cu.contributor_id = v_contributor_id
      )
    );
END;
$migration$;

ALTER TABLE public.research_objects
  VALIDATE CONSTRAINT research_objects_privacy_scope_check;

