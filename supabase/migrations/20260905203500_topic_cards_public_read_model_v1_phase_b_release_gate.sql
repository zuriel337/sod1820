-- ============================================================================
-- TOPIC_CARDS_PUBLIC_READ_MODEL_PRIVACY_FIX_V1 — PHASE B (RELEASE-GATED)
-- work_log: dispatch bf236317-72eb-4faf-bd16-053c856f5e6b · ACK 6fdb6744
--
-- ⚠ APPLY ONLY IN THE SAME RELEASE AS THE APP BUILD THAT READS public.topic_cards_public.
--   Until that build is deployed, production still issues select('*') against topic_cards from
--   anon; applying this first would break TopicPage / Home / Galaxy / Number surfaces.
--
-- Effect: anon and every authenticated role lose SELECT on topic_cards.findings (raw JSON) while
-- keeping the public metadata columns (needed by the SECURITY INVOKER helpers content_big_numbers,
-- convergence_meter, fn_relation_candidate, meaningful_numbers, number_neighbors, sitemap_numbers,
-- and by api/og.js + sitemap narrow reads). Row visibility is unchanged (policy
-- topic_cards_public_read = approved; admin FOR ALL policy). Admins read raw findings through
-- admin_topic_cards_full() (SECURITY DEFINER); UPDATE/INSERT/DELETE privileges are untouched.
--
-- rls_client_read_protocol §3: a table-level SELECT grant overrides a column revoke, so the grant
-- is rebuilt as an explicit column list (every column except findings).
-- ============================================================================
revoke select on public.topic_cards from anon, authenticated;
grant select (id, slug, title, subtitle, search_terms, image_ids, numbers, highlight_numbers,
              status, quality, created_by, created_at, approved_at, node_id, occurred_at, meter_score)
   on public.topic_cards to anon, authenticated;
