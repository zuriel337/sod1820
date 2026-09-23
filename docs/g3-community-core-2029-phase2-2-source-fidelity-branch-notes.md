# G3 Community Core 2029 — Phase 2.2 source-fidelity fixes (branch-only)

Assignment: `work_log.id=879e2d2e-b94d-4105-ae56-2f47b2c8bc6c`,
`task_key=G3_COMMUNITY_CORE_2029_PHASE2_2_SOURCE_FIDELITY_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`) as Phase 1/2/2.1, amended in place; no new
parallel branch. No live DB write, no migration applied, no OpenWeb/current chat/forum file
touched, no merge/deploy.

## What a real archive + live schema cross-check found (GPT, prior to this assignment)

1. `public.research_contributions.reactions` is `jsonb NOT NULL DEFAULT '{}'` live. Phase 2.1's
   `buildReactions` returned JS `null` for "no likes/dislikes captured at all" — correct in
   intent (never fabricate zero) but not DB-compatible: a plan built from that value would
   violate the column's `NOT NULL` constraint on direct execution.
2. The real 41,080-row OpenWeb export has 3,329 rows with blank/missing `text_content`; 2,912 of
   those are source `status=approved`, and 2,605 of *those* have nonzero reaction activity;
   `image_url` is absent throughout the export. That combination — approved, reacted-to, but no
   text — indicates missing representation/media in the export, not a genuine empty authored
   message, so the planner must never store or project that blank text as if it were one.

## What changed in this pass

- **`scripts/g3-community-foundation-runtime/planner.mjs`** — `buildReactions` now returns `{}`
  (no `likes`/`dislikes` keys) instead of `null` when neither count was captured; the DB-shape
  invariant becomes "no key present" rather than "value is null", and an explicit zero (e.g.
  `{likes:0,dislikes:0}`) remains distinct from unknown. A blank/whitespace-only source `body` is
  planned as `body: null` (never the literal whitespace, never invented placeholder text); every
  other field (identity, thread, reactions, moderation-carry-forward `status`) is left untouched
  — `approved` is never downgraded to `hidden` merely because the authored payload is absent. The
  reason is recorded as `representation_payload_missing: true|false` inside the existing
  `provenance_link.note` JSON carrier (no new column/table).
- **`scripts/g3-community-foundation-runtime/postConversationProjection.mjs`** — the pure-logic
  twin of `post_conversation_projection` now filters the `community` half the same way the SQL
  does (see below): a `research_contributions` row is only projected when it has a displayable
  authored payload (non-blank `body`/`title`, or a real `image_url`/non-empty `media` array). The
  `wordpress` half is unaffected — WordPress's own source never exhibited this defect.
- **`supabase/migrations/20260923200000_g3_community_core_2029_phase2_shadow.sql`** (still
  branch-only, NOT applied) — `community_stream_projection` and `post_conversation_projection`
  (community arm only) both add `(body <> '' or title <> '' or image_url is not null or
  jsonb_array_length(media) > 0)` to their `where` clause; `community_search_facts` adds `body <>
  ''`. In every case the underlying row stays stored (lineage/audit intact) — only the *display*
  projection omits it. A visible reply whose `parent_id` points at one of these now-invisible
  rows keeps that `parent_id` unchanged; a consumer may treat the parent as unavailable, never
  invent parent text.
- **`src/pages/CommunityShadowPreview2029Page.jsx`** — the reaction count no longer renders `0`
  when `reactions.likes` is absent (i.e. `reactions: {}`, the new unknown-reaction shape); it
  renders a count only when `reactions.likes` is actually a number.
- **Tests**: `scripts/test-g3-community-core-2029-phase2-1-integrity.mjs`'s one reactions
  assertion was updated in place to expect `{}` instead of `null` (the DB-compatibility fix
  changes that JS-level value; the "never a fabricated zero" invariant it protects is
  unchanged — a new Phase 2.2 test now protects that distinction explicitly). New file
  `scripts/test-g3-community-core-2029-phase2-2-source-fidelity.mjs`
  (`npm run test:g3-community-core-2029-phase2-2`) adds 10 tests covering: `{}` vs explicit-zero
  reactions, blank/null body → `body: null`, the `representation_payload_missing` provenance
  marker (true and false cases), status never downgraded on a blank body, and the post-conversation
  projection's blank/media/normal-row filtering. All Phase 1 (15), Phase 2 (15), Phase 2.1 (13),
  and new Phase 2.2 (10) tests pass — 53 total, 0 failures.
- **Fixtures** (`test/fixtures/openweb-import/synthetic-messages.json`) — added `ow-1010`
  (whitespace-only body, `status=approved`, nonzero reactions — mirrors the real-archive pattern)
  and `ow-1011` (`body: null`, `status=hidden`) to exercise the blank-body fix.

## Build/test evidence (this session, on this branch)

```
npm ci
npm run test:g3-community-foundation-runtime     # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2       # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2-1     # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2     # 10 pass, 0 fail
npm run build:2029                               # ✓ built in 935ms (pre-existing
                                                  #   INEFFECTIVE_DYNAMIC_IMPORT warning on
                                                  #   src/lib/auth.js, unrelated to this change,
                                                  #   same as Phase 2.1's own notes)
```

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply of the migration (branch-only per `release_authorization_state`).
- No real 41,080-row import execution (`executor.mjs`'s triple gate is unchanged and still off
  by default).
- `community_search_facts`'s existing `to_tsvector`-based filtering already excludes blank-body
  rows from matching in practice; the explicit `body <> ''` predicate added here is defense-in-
  depth/clarity, not a behavior change to search results.
- SQL-level guarantees (the new display-payload filter as it runs against live Postgres) are
  read/reasoned about, not executable-tested — no live DB write/migration is authorized in this
  branch, same limitation Phase 1/2/2.1's own notes carry.
- This session found a second, concurrently-claimed work_log assignment
  (`task_key=G3_COMMUNITY_CORE_PR636_CI_FIX_V1`, id `c15ca92e-00e8-4987-8c89-1a5cd7e08882`,
  lease `CLAUDE_CODE_SESSION_bb40f701`) actively targeting this same PR #636 branch for a CI-gate
  fix. Before pushing, this session re-fetched the branch, confirmed no file overlap with that
  session's already-pushed commit (`44b198a8`, `scripts/check-observability-seo-gate.mjs` only)
  and that the branch head had not advanced further, and pushed as a fast-forward — never a
  force-push. GPT/ZURIEL should be aware two Claude Code sessions were dispatched against the
  same branch concurrently.
- No PR update description change was made in this pass; GPT/ZURIEL may want to append a note to
  PR #636's description referencing this fix.
