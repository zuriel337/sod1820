-- ZVI_CONTRIBUTOR_RESEARCH_PROJECTION_V1
--
-- Preserve the explicit source-off boundary and expose one RLS-governed read
-- model that can find research either by research attribution or by the stable
-- contributor identity of its source message. The latter must not rewrite the
-- research object's own contributor attribution.

-- An off source must not become readable indirectly through extracted text.
UPDATE public.research_objects AS ro
SET privacy_scope = 'private'
WHERE ro.privacy_scope = 'public'
  AND EXISTS (
    SELECT 1
    FROM public.channel_updates AS cu
    WHERE cu.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
      AND cu.status = 'off'
      AND split_part(coalesce(ro.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
  );

CREATE INDEX IF NOT EXISTS research_objects_source_ref_base_idx
  ON public.research_objects ((split_part(coalesce(source_ref, ''), '#', 1)));

CREATE OR REPLACE VIEW public.world_contributor_research_v1
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  ro.id,
  ro.created_at,
  ro.kind,
  ro.statement,
  ro.terms,
  ro.value,
  ro.relates,
  ro.source,
  ro.source_ref,
  ro.contributor,
  ro.confidence,
  ro.engine_verified,
  ro.engine_detail,
  ro.evidence,
  ro.status,
  ro.promoted_node_id,
  ro.parent_id,
  ro.meta,
  ro.privacy_scope,
  cu.contributor_id AS source_contributor_id
FROM public.research_objects AS ro
LEFT JOIN public.channel_updates AS cu
  ON split_part(coalesce(ro.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text;

REVOKE ALL ON TABLE public.world_contributor_research_v1 FROM PUBLIC;
GRANT SELECT ON TABLE public.world_contributor_research_v1 TO anon, authenticated;

COMMENT ON VIEW public.world_contributor_research_v1 IS
  'RLS-invoker World projection. Research contributor and stable source contributor remain separate provenance axes.';

