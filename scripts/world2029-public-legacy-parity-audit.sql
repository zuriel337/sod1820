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

-- 4) 2029 activity only, over the EXISTING Traffic events owner. No raw search terms.
-- Historical shared URLs cannot prove runtime identity. The forward runtime_target
-- marker closes that gap; do not retrospectively label /world or /post as 2029.
WITH runtime_events AS (
 SELECT * FROM public.events
 WHERE ts >= now() - interval '7 days'
   AND (props->>'runtime_target'='2029' OR path='/2029' OR path LIKE '/2029/%')
)
SELECT path, count(*) AS page_views
FROM runtime_events WHERE surface='page' AND event_type='view'
GROUP BY path ORDER BY page_views DESC;

-- Exact number opens: page/view once, never summed with number/view or site_visits.
WITH runtime_events AS (
 SELECT * FROM public.events WHERE ts>=now()-interval '7 days'
   AND surface='page' AND event_type='view' AND path ~ '^/2029/number/[0-9]+$'
)
SELECT path,count(*) AS opens FROM runtime_events GROUP BY path ORDER BY opens DESC;

-- New canonical_compute events are forward-only. first_compute is a funnel marker,
-- result_selected is a selection (including method changes), neither is total computes.
SELECT event_type,count(*) AS n FROM public.events
WHERE ts>=now()-interval '7 days' AND surface='calculator_2029'
  AND event_type IN ('canonical_compute','first_compute','result_selected')
GROUP BY event_type;

-- 5) ADMIN-ONLY intake pipeline inventory. No message text, identities or addresses.
-- These stages overlap. NEVER sum processed/published rows into unique received messages.
SELECT 'mail_received' AS metric,count(*) AS n FROM public.inbound_emails WHERE received_at>=now()-interval '7 days'
UNION ALL SELECT 'whatsapp_records_ingested',count(*) FROM public.wa_msg_ext WHERE created_at>=now()-interval '7 days'
UNION ALL SELECT 'whatsapp_new_message_timestamps',count(*) FROM public.wa_msg_ext WHERE created_at>=now()-interval '7 days' AND ts>=now()-interval '7 days'
UNION ALL SELECT 'whatsapp_older_backfill',count(*) FROM public.wa_msg_ext WHERE created_at>=now()-interval '7 days' AND ts<now()-interval '7 days'
UNION ALL SELECT 'whatsapp_bot_processed_ids',count(DISTINCT msg_id) FROM public.wa_bot_log WHERE created_at>=now()-interval '7 days';

SELECT origin,status,count(*) AS n FROM public.research_contributions
WHERE created_at>=now()-interval '7 days' GROUP BY origin,status;
