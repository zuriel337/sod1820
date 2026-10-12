-- SOD1820 World 2029 / Legacy Public Parity: read-only inventory, 2026-10-12
-- No RLS changes, no publication writes, no promotion or inferred entity relations.
-- Run against the canonical Supabase project as a privileged auditor, NOT as a public API.
-- Every count is SOURCE RECORDS, not user-visible routing/availability proof.

-- 1) Direct legacy owners and native admission flags
SELECT 'posts_total' AS metric, COUNT(*) AS n FROM public.posts
UNION ALL
SELECT 'posts_home_hidden', COUNT(*) FROM public.posts WHERE home_hidden IS TRUE
UNION ALL
SELECT 'gallery_public', COUNT(*) FROM public.gallery_images WHERE published=1 AND COALESCE(curator_hidden,false)=false AND min_tier=0
UNION ALL
SELECT 'topic_approved', COUNT(*) FROM public.topic_cards WHERE status='approved'
ORDER BY metric;

-- 2) Exact post origin identity: WordPress ID or stored slug, not fuzzy title matching
SELECT
 COUNT(*) AS posts_total,
 COUNT(*) FILTER (WHERE EXISTS(
   SELECT 1 FROM public.nodes n
   WHERE n.type='post' AND n.is_active IS TRUE
     AND ((n.metadata->>'post_wp_id') = p.wp_id::text
          OR (n.metadata->>'slug') = p.slug)
 )) AS posts_with_active_node
FROM public.posts p;

-- 3) Exact public gallery identity: gallery_images.id <- nodes.metadata.gallery_image_id
WITH public_gallery AS (
  SELECT id FROM public.gallery_images
  WHERE published=1 AND COALESCE(curator_hidden,false)=false AND min_tier=0
), image_nodes AS (
  SELECT id, (metadata->>'gallery_image_id')::uuid AS gallery_id
  FROM public.nodes
  WHERE type='image' AND is_active IS TRUE
    AND metadata->>'gallery_image_id' ~ '^[0-9a-f-]{36}$'
)
SELECT
 (SELECT COUNT(*) FROM public_gallery) AS published_public_images,
 (SELECT COUNT(DISTINCT p.id) FROM public_gallery p JOIN image_nodes n ON n.gallery_id=p.id) AS with_active_image_node,
 (SELECT COUNT(*) FROM public_gallery p WHERE NOT EXISTS (SELECT 1 FROM image_nodes n WHERE n.gallery_id=p.id)) AS without_active_image_node;

-- A post or image without an active node is not necessarily hidden: legacy owner routes
-- may still expose it. A node without an approved World entry is not proof of publication.
-- Next exact evidence required: anon HTTP route coverage for all legacy source IDs.
