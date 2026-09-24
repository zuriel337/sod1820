# G3 Community Core — PR #636 two-phase insert/link executor (branch-only)

Assignment: `work_log.id=d155d572-d62e-4378-9624-61ccc43087e4`,
`task_key=G3_COMMUNITY_CORE_PR636_TWO_PHASE_EXECUTOR_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`) as Phase 1/2/2.1/2.2/parent-reconstruction,
amended in place; no new parallel branch/PR. No live DB write, no migration applied, no
OpenWeb/current chat/forum file touched, no merge/deploy, no import execution.

## The live fact that motivated this pass

Live schema verification: `research_contributions_parent_id_fkey` is **NOT DEFERRABLE** and
**NOT INITIALLY DEFERRED**. The prior pass
(`docs/g3-community-core-pr636-parent-reconstruction-branch-notes.md`) made `planImport`'s
parent resolution independent of the source file's row order — a reply whose parent appears
later in the export still resolves the correct `parent_id`. But that plan still places each
reply's *resolved* `parent_id` directly on the same `insert_contribution` op that would create
the row. `executor.mjs`'s `runImport` executed those ops one DB write at a time, in plan order,
so a real Phase 3 import against the live table could still try to `INSERT` a child row whose
`parent_id` points at a parent row that batch has not written yet — and because the FK is
immediate, that insert would fail, independent of how correctly the planner resolved the
reference. That gap was explicitly called out as open in the parent-reconstruction pass's own
"Not done" section and is what this assignment closes.

## What changed in this pass

- **`scripts/g3-community-foundation-runtime/executor.mjs`** — `runImport`'s execute path is now
  two-phase instead of one-write-per-op:
  1. **Phase 1 (insert).** Every `insert_contribution` op is executed with `contribution.parent_id`
     forced to `null`, regardless of what the plan resolved. This makes every insert in the batch
     independent of every other insert's completion, so no DB-execution order can violate the
     immediate FK. The plan's real desired parent reference is kept per-row (`pendingLinks`),
     never discarded. `skip_duplicate` ops are unchanged — still routed to `ops.skipDuplicate`
     in the same relative order as before.
  2. **Phase 2 (link).** Only after every row phase 1 was going to create has been created does
     the executor resolve and apply each pending link:
     - an in-batch reference (planner's `planned:<message_id>`) resolves via the real id phase 1
       recorded for that same batch (`plannedIdToRealId`);
     - a cross-batch reference (planner's `existing-via:<message_id>`) resolves via the new
       `ops.resolveExistingParentId(parent_message_id)` callback, which looks up the real,
       already-committed id of a parent imported in a *prior* batch;
     - a genuinely absent parent (`desired parent_id === null`) is never added to `pendingLinks`
       at all — it stays `null` forever, exactly as the planner intended. Nothing in this pass
       invents or guesses one; the 39 genuinely-absent parents from the real archive remain
       unresolved by design, with `parent_message_id` preserved in the provenance note (planner
       behavior, unchanged).
  3. **Explicit failure semantics.** A link that cannot be resolved (no `ops.resolveExistingParentId`
     supplied, that lookup returns nothing, an in-batch id somehow missing, or `ops.linkParent`
     itself throwing) is recorded in `linkFailures` and the run keeps evaluating the rest of the
     batch — one unresolved row never masks every other row — but the returned `completed` flag
     is `false` whenever `linkFailures` is non-empty. A batch that has any pending link at all but
     was given no `ops.linkParent` implementation is refused outright
     (`ExecutorNotAuthorizedError`) rather than silently skipping the link. No half-linked state
     is ever reported as `completed: true`.
  4. **New `ops` contract surface** (only required when the batch actually needs it):
     `linkParent({contribution_id, parent_id, message_id})` and
     `resolveExistingParentId(parent_message_id)`. A caller whose batch has no replies at all
     (e.g. the pre-existing Phase 2 executor unit tests) never needs to implement either —
     `pendingLinks` stays empty and neither is invoked, so the prior two-function `ops` shape
     (`insertContribution`, `skipDuplicate`) keeps working unchanged.
  `planImport` itself (planner.mjs) is untouched by this pass — its two-pass, order-independent
  parent resolution is exactly what phase 2 now consumes safely.

- **Tests**: new `scripts/test-g3-community-core-pr636-two-phase-executor.mjs`
  (`npm run test:g3-community-core-pr636-two-phase-executor`) — 6 tests, using a small in-memory
  `ops` mock that itself enforces the live immediate-FK invariant (raises if asked to insert or
  link against a `parent_id` that has not already been inserted), so these tests actually
  exercise the guarantee rather than assume it:
  1. phase 1 always calls `insertContribution` with `parent_id: null`, regardless of the plan's
     desired parent.
  2. the real archive's child-before-parent file order never trips the FK-aware mock, and phase 2
     links the child to its parent's real id.
  3. three arbitrary shuffles of the same batch (including full reversal) all complete without
     tripping the FK-aware mock and produce the identical logical linkage.
  4. an unresolvable cross-batch parent is reported in `linkFailures` with `completed: false`,
     while the batch's other, resolvable rows still link correctly.
  5. a batch with a pending link but no `linkParent` ops implementation is refused
     (`ExecutorNotAuthorizedError`), never silently skipped.
  6. duplicate/idempotency semantics are unchanged — a message repeated within the same batch is
     still routed to `skipDuplicate` exactly once, never re-inserted.
  The existing Phase 1/2/2.1/2.2/parent-reconstruction fixtures/tests were left as-is; the
  pre-existing executor unit tests in `scripts/test-g3-community-core-2029-phase2.mjs` exercise a
  batch with no replies at all and pass unchanged against the new two-phase contract.

## Build/test evidence (this session, on this branch)

```
npm ci
npm run test:g3-community-foundation-runtime               # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                 # 15 pass, 0 fail  (executor ops
                                                             #   contract unchanged for this
                                                             #   no-reply fixture)
npm run test:g3-community-core-2029-phase2-1                # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction   # 4 pass, 0 fail
npm run test:g3-community-core-pr636-two-phase-executor      # 6 pass, 0 fail  (new)
npm run build:2029                                          # ✓ built in 858ms (pre-existing
                                                              #   INEFFECTIVE_DYNAMIC_IMPORT
                                                              #   warning on src/lib/auth.js,
                                                              #   unrelated to this change, same
                                                              #   as every prior pass's own notes)
```

Total focused Community suite: 57 pre-existing + 6 new = 63 tests, 0 failures.

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply, no migration change, no real 41,080-row import execution
  (`executor.mjs`'s triple gate — `execute:true` + exact confirmation phrase + a supplied `ops`
  implementation — is unchanged and still off by default).
- The 39 genuinely-absent parents remain unresolved by design; nothing in this pass invents or
  guesses a parent for them.
- No PR description change was made in this pass; GPT/ZURIEL may want to append a note to PR
  #636's description referencing this fix.
- A real production `ops` implementation (a Supabase client wrapper providing
  `insertContribution`/`skipDuplicate`/`linkParent`/`resolveExistingParentId` against the live
  `research_contributions` table) is not written here — this pass only changes the pure,
  in-memory-testable executor contract those real ops would need to satisfy. Wiring a real
  Supabase-backed `ops` implementation, and the actual Phase 3 import run, remain a separate,
  explicitly-gated, ZURIEL-authorized task.
