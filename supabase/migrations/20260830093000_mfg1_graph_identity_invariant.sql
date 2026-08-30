-- ============================================================================
-- MF-G1 — GRAPH IDENTITY INVARIANT (One Tree / Reality Graph)
-- ============================================================================
-- Human-Gate authorized design+minimum-closure pass. work_log BEFORE ef0fb264-da4e-408f-b63c-0eaa0a8566b0.
-- Scope: additive indexes ONLY. No new table/column/Store/Engine/Graph/Resolver, no function body
-- change, no data mutation, NO duplicate cleanup, no historical entity migration. MF-G3 not started.
--
-- ROOT CAUSE: `nodes` and `edges` carry ZERO uniqueness constraints. Identity was enforced only by
-- convention inside advisory resolvers (get_or_create_entity_node, upsert_edge) that SELECT-then-
-- INSERT with no lock, so any writer bypassing them can duplicate — and one already did.
--
-- ── WHY THIS IS *NOT* `UNIQUE(type,label)` ──────────────────────────────────────────────────────
-- The instruction not to assume UNIQUE(type,label) was correct; it would have been ACTIVELY WRONG.
-- The 215 `image` label collisions are duplicate REPRESENTATION, not duplicate IDENTITY:
--   * all 2029 image nodes carry metadata->>'gallery_image_id'
--   * there are 2029 DISTINCT gallery_image_id values and ZERO collisions on it
--   * worst case `mlk-hmshych-ybnh.jpg` x21 has distinct_metadata = 21 of 21 — same file url and
--     same gallery_id, but a DIFFERENT gallery_image_id per row: 21 legitimately distinct
--     source-native gallery_images records that happen to share one underlying file.
-- Enforcing UNIQUE(type,label) would have destroyed 215 legitimate records. For `image`, canonical
-- identity is the SOURCE-NATIVE id; `label` (the filename) is a representation attribute.
--
-- Likewise `rule` label collisions (10) are VERSIONS, not duplicates: all 9 groups have distinct
-- rule_version and there are 0 duplicate ACTIVE rules (everything_additive_law / rule_versioning).
--
-- ── CANONICAL NODE IDENTITY CONTRACT (type-aware) ───────────────────────────────────────────────
--   image                -> metadata->>'gallery_image_id'   (source-native id)      0 violations
--   rule                 -> (rule_id, rule_version)         (versioned entity)      0 violations
--   every other type     -> (type, label)                   (canonical entity)      0 violations
-- Because every key already has ZERO violations, all three node invariants are enforced
-- IMMEDIATELY over the full table — no cutoff, no migration, no cleanup, and the 215 image rows
-- and 10 rule versions all remain valid exactly as they are.
--
-- ── CANONICAL EDGE IDENTITY CONTRACT ────────────────────────────────────────────────────────────
-- DIRECTIONAL, plus the qualifier that already discriminates a relation in live data:
--   (from_node, to_node, relation_type, coalesce(metadata->>'period',''))
--
-- The `period` component is NOT cosmetic — omitting it would BREAK A LIVE CRON. `demand_signal`
-- has 9 edges over only 7 distinct (from_node,to_node) pairs because the same node pair is measured
-- over two windows ('7d' and '30d'), the discriminator living in metadata->>'period'. A blanket
-- UNIQUE(from_node,to_node,relation_type) — even forward-only — would make cron.job 48
-- `ti-demand-daily` -> fn_ti_daily -> fn_ti_project_demand fail nightly on re-insert.
-- Measured: naive key = 6 violations AND breaks cron 48; corrected key = 4 violations,
-- demand_signal violations 0, related violations 0.
--
-- DIRECTIONAL (not symmetric) is deliberate: `related` is the one relation type used symmetrically
-- (296 reciprocal A->B / B->A pairs); a directional key preserves those legitimately, a symmetric
-- key would wrongly collapse them. 0 self-loops exist.
--
-- The edge index is FORWARD-ONLY with a FIXED literal cutoff (never now(), which is both
-- non-immutable in an index predicate and non-reproducible) because 4 historical rows violate it:
-- all relation_type='converges_on', all inserted in one batch at 2026-08-07 17:29:03.791522+00 with
-- null source. Those 4 rows are PRESERVED untouched — historical cleanup is a separate topic and is
-- explicitly out of scope here (everything_additive_law / RANK-DON'T-HIDE).
-- Cutoff chosen as 2026-08-30 09:00:00+00: max(edges.created_at) was 2026-08-30 03:40:00.147892+00
-- and `select count(*) from edges where created_at >= '2026-08-30 09:00:00+00'` returned 0, so every
-- historical row is outside and every future row is inside.
--
-- ── ACTIVE-PRODUCER SAFETY (verified live before writing) ───────────────────────────────────────
--   cron 43 graph-wire-daily -> graph_wire_number : NOT EXISTS-guarded            -> safe
--   cron 48 ti-demand-daily  -> fn_ti_project_demand : ti_demand_signals has 0
--                              duplicate (period,node_id) rows, and the key carries period -> safe
--   cron 27 metatron-nightly : INACTIVE                                            -> not a risk
--
-- Recorded but deliberately NOT changed (would alter graph semantics, out of scope): the two
-- resolvers disagree on edge directionality — upsert_edge tests directional (from,to,rel) while
-- graph_wire_number tests SYMMETRIC ((from,to) OR (to,from)).
-- ============================================================================

-- A. image -> source-native identity. Enforced over the whole table (0 current violations).
CREATE UNIQUE INDEX IF NOT EXISTS nodes_identity_image_uidx
  ON public.nodes ((metadata->>'gallery_image_id'))
  WHERE type = 'image' AND (metadata->>'gallery_image_id') IS NOT NULL;

-- B. rule -> versioned identity. Enforced over the whole table (0 current violations).
CREATE UNIQUE INDEX IF NOT EXISTS nodes_identity_rule_uidx
  ON public.nodes (rule_id, rule_version)
  WHERE type = 'rule' AND rule_id IS NOT NULL;

-- C. every other type -> canonical entity identity. Enforced over the whole table (0 violations).
--    image and rule are excluded because their identity is defined by A and B above.
CREATE UNIQUE INDEX IF NOT EXISTS nodes_identity_canonical_uidx
  ON public.nodes (type, label)
  WHERE type NOT IN ('image', 'rule');

-- D. edges -> directional identity incl. the live period discriminator. FORWARD-ONLY.
CREATE UNIQUE INDEX IF NOT EXISTS edges_identity_uidx
  ON public.edges (from_node, to_node, relation_type, (coalesce(metadata->>'period','')))
  WHERE created_at >= timestamptz '2026-08-30 09:00:00+00';

COMMENT ON INDEX public.nodes_identity_image_uidx IS
  'MF-G1: image node identity is the SOURCE-NATIVE gallery_image_id, not the filename label. The 215 label collisions are duplicate representation of one file across distinct gallery_images records, not duplicate entities.';
COMMENT ON INDEX public.nodes_identity_rule_uidx IS
  'MF-G1: rule node identity is (rule_id, rule_version). Label collisions among rules are legitimate versions (rule_versioning / everything_additive_law), not duplicates.';
COMMENT ON INDEX public.nodes_identity_canonical_uidx IS
  'MF-G1: canonical entity identity (type,label) for all node types whose identity is not source-native (image) or versioned (rule). 0 violations at creation.';
COMMENT ON INDEX public.edges_identity_uidx IS
  'MF-G1: directional edge identity (from,to,relation_type,metadata.period). period is required — without it cron 48 fn_ti_project_demand breaks, since demand_signal measures one node pair over 7d and 30d. Directional not symmetric, so the 296 reciprocal `related` pairs are preserved. Forward-only from a fixed cutoff so the 4 historical converges_on duplicates stay untouched.';
