# G3 Community Core — PR #636 final-blockers fix (branch-only)

Assignment: `work_log.id=a5b4b457-d6ec-420a-97a4-30b49e0720bf`,
`task_key=G3_COMMUNITY_CORE_PR636_FINAL_BLOCKERS_FIX_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`), amended in place on top of the Phase 3 ops
adapter (`5cb40914`); no new parallel branch/PR. No live DB write, no migration applied, no
OpenWeb/current chat/forum file touched, no merge/deploy, no import execution.

## What this closes

The two exact-head final-challenge blockers on PR #636:

1. **DB-level OpenWeb message provenance idempotency.** `resolveImportState`/`skipDuplicate` in
   `opsAdapter.mjs` are a read-before-write replay guard: they cannot see a concurrent writer's
   `contribution_links` row that commits after that read but before this call's own insert, so two
   racing batches could both insert a duplicate `research_contributions` row for the same source
   message. New migration
   `supabase/migrations/20260924100200_g3_community_core_pr636_openweb_message_provenance_uniq_v1.sql`
   adds a partial unique index, `cl_openweb_message_derived_from_uniq`, on
   `contribution_links(target_type, target_id, relation_type)` scoped to exactly
   `target_type='openweb_message' AND relation_type='derived_from'` — the one (target_type,
   relation_type) pair PR #636's import uses — so it never constrains any other relation
   (`openweb_user`/`authored_by_external` identity links, or unrelated graph-privacy links). **Not
   applied live**; committed for review/Phase-3 human gate only, per the same convention as the
   Phase 2 shadow migration.
   `opsAdapter.mjs`'s `createSupabaseOps().insertContribution` is now unique-violation-safe: if the
   provenance-link insert hits that index (Postgres `23505`), it rolls back the
   `research_contributions` row this call itself just inserted (never leaving an orphaned
   duplicate authored item behind) and resolves/returns whichever contribution actually won the
   race, exactly like `skipDuplicate`. `skipDuplicate` and `resolveExistingParentId` were
   refactored onto one shared `resolveContributionIdByOpenwebMessage` helper (same query, no
   behavior change) rather than duplicating the lookup a third time.

2. **`dry-run-import.mjs` state contract.** Its `loadState()` was still building the legacy
   `usersByVerifiedEmail`/`contributorsByEmail` shape; `planImport`'s actual contract (unchanged
   since Phase 1) is `importedMessageIds` / `linkedOpenwebUserIds` / `contributorsByOpenwebUserId`.
   Because `planImport` merely does `state.linkedOpenwebUserIds || new Map()` / `new Map(state.…
   || [])`, the old field names never threw — they silently produced two empty `Map`s, so every
   message fell through to "plan a new contributor" even when `prior-state.json` had already
   linked that OpenWeb identity to a real `author_user_id`. Fixed `loadState()` to read the correct
   field names (`test/fixtures/openweb-import/prior-state.json` already used the correct shape —
   only the loader was wrong).

## New end-to-end CLI test

`scripts/test-g3-community-core-pr636-dry-run-cli.mjs`
(`npm run test:g3-community-core-pr636-dry-run-cli`) — spawns the actual
`dry-run-import.mjs` CLI as a real child process (never imports `loadState`/`planImport`
directly), so a state-contract mismatch between the CLI and the planner is caught the way it would
actually surface in operation:

1. `ow-1002` (authored by `ow-user-dana`, already linked in `prior-state.json`) stays
   `author_user_id`-linked with no `contributor_op` planned.
2. `ow-0999-already-imported` (in `prior-state.json`'s `importedMessageIds`) is `skip_duplicate`,
   never re-inserted.
3. The CLI's summary carries both `insert_contribution` and `skip_duplicate` counts (a second,
   independent signal against a silent empty-state regression).

## New race-condition test

`scripts/test-g3-community-core-pr636-phase3-ops-adapter.mjs` gained one test plus fake-client
support for `.delete()` and for simulating the new partial unique index's `23505` on a conflicting
insert: `insertContribution: a DB-level provenance conflict resolves to the winner and leaves no
orphan row`. Seeds a pre-existing winning `contribution_links`/`research_contributions` pair for
`ow-race-1`, then calls `insertContribution` with an op the (unaware) caller still planned for that
same message, and asserts the result resolves to the winner's id, `skipped:true`, and that no
orphaned duplicate `research_contributions` row is left behind.

## Branch reconciliation

Merged current `origin/main` into this branch (see `git log` on this branch for the merge commit)
to resolve PR #636's pre-existing `mergeable_state=dirty` against main's ongoing advance, while
preserving every Community Core change from Phase 1 through this pass unchanged. No unrelated
semantic rewrite.

## Build/test evidence (this session, on this branch)

```
npm run test:g3-community-foundation-runtime                # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                  # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2-1                # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction  # 4 pass, 0 fail
npm run test:g3-community-core-pr636-two-phase-executor     # 6 pass, 0 fail
npm run test:g3-community-core-pr636-phase3-ops-adapter     # 12 pass, 0 fail (1 new)
npm run test:g3-community-core-pr636-dry-run-cli            # 3 pass, 0 fail (new)
npm run build:2029                                          # ✓ built in 1.14s (same pre-existing
                                                              #   INEFFECTIVE_DYNAMIC_IMPORT warning
                                                              #   on src/lib/auth.js, unrelated to
                                                              #   this change, noted in every prior
                                                              #   pass's own notes)
```

Total focused Community suite: 70 pre-existing (across the 6 pre-existing suites above) + 12 in
the ops-adapter suite (1 new) + 3 new CLI tests = 78 tests, 0 failures. Evidence above is from a
full re-run after merging current `origin/main` into this branch (see "Branch reconciliation").

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply — the new migration is committed but never run against the canonical
  project (`linswmnnkjxvweumprav`) from this task.
- No real service_role client wiring/import execution; unchanged from the Phase 3 ops adapter
  pass's own boundary — still gated behind `G3_COMMUNITY_CORE_PR636_PHASE3_FINAL_CHALLENGE_V1` PASS
  and a separate ZURIEL human-confirmation phrase.
- Contributor-row (not message-row) duplication under the exact same concurrent-race window is not
  separately guarded by a DB constraint in this pass — out of this assignment's stated scope (the
  two named blockers), and lower-severity (a soft, private, non-PII-merging duplicate contributor
  row rather than a duplicate authored item); flagged here for a future pass, not silently
  widened into this one.
