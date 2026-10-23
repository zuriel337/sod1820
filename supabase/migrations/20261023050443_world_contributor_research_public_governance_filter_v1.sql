-- WORLD_CONTRIBUTOR_RESEARCH_PUBLIC_GOVERNANCE_FILTER_V1
--
-- privacy_scope and governance status are deliberately separate truth axes.
-- Public research candidates may remain readable by research surfaces that
-- intentionally consume research_objects, but they must not cross the public
-- World projection boundary. Authorized admins retain the review projection.

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
  ON split_part(coalesce(ro.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
WHERE
  current_user IN ('postgres', 'service_role')
  OR (SELECT public.rd_is_admin())
  OR (
    ro.privacy_scope = 'public'
    AND ro.status IN ('approved', 'canonical')
    AND coalesce(ro.meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
    AND (
      split_part(coalesce(ro.source_ref, ''), '#', 1) NOT LIKE 'channel_updates:%'
      OR cu.id IS NOT NULL
    )
  );

REVOKE ALL ON TABLE public.world_contributor_research_v1 FROM PUBLIC;
GRANT SELECT ON TABLE public.world_contributor_research_v1 TO anon, authenticated;

COMMENT ON VIEW public.world_contributor_research_v1 IS
  'RLS-invoker World projection. Public callers receive only public approved/canonical research whose channel source remains visible. Authorized admins retain candidate review. Research and source contributor identities remain separate provenance axes.';
