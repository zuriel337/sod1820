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

-- ===== Part 2: candidates (NOT measured yet)
-- topic_cards: `numbers && ARRAY[...]` and `highlight_numbers` have no GIN (only pkey + slug indexes today)
--   create index concurrently on public.topic_cards using gin (numbers);
-- nodes: `metadata->>'tier' = 'gold'` / `metadata->>'role'` filters (GIN jsonb_ops does not serve ->> equality)
--   create index concurrently on public.nodes ((metadata->>'tier')) where is_active;
-- channel_updates: filter channel + image_url not null, order by created_at, no matching index today
--   create index concurrently on public.channel_updates (channel, created_at desc) where image_url is not null;
-- research_contributions: `author_contributor_id in (...)` has no index (rc_author_idx is author_user_id)
--   create index concurrently on public.research_contributions (author_contributor_id, created_at desc);
-- gematria_words: `is_verified and tags @> ...` and order by visibility_changed_at / created_at
--   (tags has no GIN; the ordering columns have no index) — measure the exact home query first
