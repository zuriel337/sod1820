-- DRAFT — NOT APPLIED to any database. Prepared for review in the branch only.
-- Applying to live requires: owner resolution (Owner Index), ZURIEL Human Gate, release authorization, and
-- CREATE INDEX CONCURRENTLY outside a transaction. Part 1 is measured on a synthetic x100 copy (see README in ../).
-- Part 2 is a CANDIDATE list derived from query shape + the live index list; each item must be measured (EXPLAIN at x100)
-- before it is promoted to Part 1.

-- ===== Part 1: measured (posts, x100 synthetic: seq scan 40-57 ms / 8,100 buffers -> index scan 0.1-1.8 ms / 40-350 buffers)
create index concurrently if not exists posts_public_cat_feed
  on public.posts (modified desc nulls last)
  where not (tags @> '{טיוטה}') and not (tags @> '{פורום}');
create index concurrently if not exists posts_public_modified_idx
  on public.posts (modified desc nulls last)
  where slug is not null and not (tags @> '{טיוטה}') and not (tags @> '{פורום}') and home_hidden = false;
create index concurrently if not exists posts_categories_gin on public.posts using gin (categories);

-- Category feed (O(limit) regardless of how many posts a category has): derived read-model, kept in sync by trigger.
-- Shape measured at x100: 0.67-0.71 ms, ~100 buffers, for both a rare and the most common category.
--   create table public.post_category_feed (post_id bigint not null, category text not null, modified timestamptz);
--   create index on public.post_category_feed (category, modified desc nulls last) include (post_id);
--   + AFTER INSERT/UPDATE OF categories,tags,modified/DELETE trigger on posts that rewrites that post's rows
--   + RLS: same public-read rule as posts (only published, non-draft, non-forum rows)

-- ===== Part 1b: measured at x100 (gematria_words 1.56M rows, research_contributions 4.15M rows; see gwrc_*.sql, results gwrc_x100_*.txt)
-- Home pulse queries on gematria_words: 373-574 ms each (Seq Scan) -> 0.04-10 ms. Total public count stays O(n) (208 ms index-only): needs a counter.
create index concurrently if not exists gw_public_created on public.gematria_words (created_at desc nulls last) include (visibility_changed_at)
  where is_verified and is_published and (is_encrypted is null or is_encrypted = false);
create index concurrently if not exists gw_public_visibility on public.gematria_words (visibility_changed_at desc nulls last) include (created_at)
  where is_verified and is_published and (is_encrypted is null or is_encrypted = false);
create index concurrently if not exists gw_tags_gin on public.gematria_words using gin (tags) where is_verified;      -- treasure tag: 373 ms -> 0.27 ms
-- research_contributions by author + convergence slug: 892 ms (Seq Scan) -> 0.12 ms
create index concurrently if not exists rc_author_contrib_idx on public.research_contributions (author_contributor_id, created_at desc)
  where status = 'approved' and convergence_slug is not null;
-- already served by existing indexes at x100 (measured): rc_status_idx (approved last 7d, 0.14 ms), rc_target_idx (0.03 ms), idx_gw_ragil (number lookup, 0.15 ms)

-- ===== Part 1c: SUPERSEDED where noted below by fixes after the independent review of d34a910c (see numlab_fixed.sql, posts_fix_v3.sql; NOT applied; the new names are additive, switching callers is a separate gated step)
--   fn_number_lookup_v2       -> numlab_fixed.sql        (identical result incl. total_count and cursor pages; 7,634 -> 234 ms at max x100)
--   dossier convergences      -> numlab_groups.sql       (identical JSON; 8,286 -> 98 ms)
--   get_category_videos_v2    -> posts_fix.sql           (identical rows; 7,120 -> 131 ms at x100)
--   post_numbers + posts_by_number_strict_v2 -> posts_fix.sql  *** NOT EQUIVALENT, DO NOT USE; replaced by posts_fix_v3.sql (id-keyed text tokens, trigger, equivalence-tested)

-- ===== Part 2: candidates (NOT measured yet)
-- topic_cards: `numbers && ARRAY[...]` and `highlight_numbers` have no GIN (only pkey + slug indexes today)
--   create index concurrently on public.topic_cards using gin (numbers);
-- nodes: `metadata->>'tier' = 'gold'` / `metadata->>'role'` filters (GIN jsonb_ops does not serve ->> equality)
--   create index concurrently on public.nodes ((metadata->>'tier')) where is_active;
-- channel_updates: filter channel + image_url not null, order by created_at, no matching index today
--   create index concurrently on public.channel_updates (channel, created_at desc) where image_url is not null;
