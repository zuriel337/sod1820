-- Public paginated reader over existing contribution identities; no new store.
CREATE OR REPLACE FUNCTION public.writer_public_contributions_page_v1(
 p_contributor_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0
) RETURNS TABLE (
 id uuid, created_at timestamptz, author_contributor_id uuid, author_name text,
 intent text, origin text, research_state text, status text, target_type text, target_id text,
 title text, body text, image_url text, media jsonb, projected_insight_id uuid,
 graph_node_id uuid, convergence_slug text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $function$
 WITH writer AS (
  SELECT c.id,c.user_id,c.display_name,c.wa_names FROM public.contributors c
  WHERE c.id=p_contributor_id AND c.active
    AND NOT coalesce(c.locked,false) AND NOT coalesce(c.building,false)
    AND coalesce(c.dossier_settings->>'visibility','public')='public'
 )
 SELECT r.id,r.created_at,r.author_contributor_id,r.author_name,r.intent,r.origin,
   r.research_state,r.status,r.target_type,r.target_id,r.title,r.body,r.image_url,r.media,
   r.projected_insight_id,r.graph_node_id,r.convergence_slug
 FROM public.research_contributions r JOIN writer c ON
   r.author_contributor_id=c.id
   OR (r.author_contributor_id IS NULL AND r.author_user_id=c.user_id)
   OR (r.author_contributor_id IS NULL AND r.author_user_id IS NULL
     AND (r.author_name=c.display_name OR r.author_name=ANY(c.wa_names))
     AND NOT EXISTS (SELECT 1 FROM public.contributors other WHERE other.id<>c.id
       AND (other.display_name=r.author_name OR r.author_name=ANY(other.wa_names))))
 WHERE r.status IN ('approved','published') AND r.parent_id IS NULL
 ORDER BY r.created_at DESC,r.id DESC
 LIMIT greatest(1,least(coalesce(p_limit,100),200))
 OFFSET greatest(0,coalesce(p_offset,0));
$function$;
REVOKE ALL ON FUNCTION public.writer_public_contributions_page_v1(uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.writer_public_contributions_page_v1(uuid,integer,integer) TO anon,authenticated;
COMMENT ON FUNCTION public.writer_public_contributions_page_v1(uuid,integer,integer)
IS 'Public author catalogue, exact existing contributor/account/unique source-name lineage. Hidden/draft excluded. Source records are not independent verified findings.';
