# G3 Community Core — PR #636 parent reconstruction fix (branch-only)

Assignment: `work_log.id=eac6ca70-fcb7-497d-aa70-4a8cc44a1efe`,
`task_key=G3_COMMUNITY_CORE_PR636_PARENT_RECONSTRUCTION_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`) as Phase 1/2/2.1/2.2, amended in place; no
new parallel branch/PR. No live DB write, no migration applied, no OpenWeb/current chat/forum
file touched, no merge/deploy, no import execution.

## What the real-archive dry-run found (GPT, prior to this assignment)

A real 41,080-row OpenWeb CSV dry-run (unique `message_id`=41,080; 32,155 reply rows) found:

- 39 parent refs are genuinely absent from the export (no row anywhere has that `message_id`).
- 32,116 parent refs are present in the export. Of those, 16,277 parent rows appear *earlier* in
  CSV order than their child, but **15,839 parent rows appear *later***.
- A timestamp cross-check confirms all 32,116 present parents have `written_at <= child
  written_at` — zero parent-after-child timestamp violations, i.e. the data itself is causally
  sound; only the *file's row order* is non-chronological.

`planImport` (`scripts/g3-community-foundation-runtime/planner.mjs`) resolved a reply's
`parent_id` from `messageIdToPlannedContributionId`, a map it only populated incrementally, in
a single forward pass over `messages`. A parent appearing later in the array therefore had no
entry yet at the moment its child was processed, so `parent_id` silently resolved to `null` —
not because the parent was actually missing, but purely because of source file order. Against
the real archive this would have dropped `parent_id` on ~15,839 valid replies.

## What changed in this pass

- **`scripts/g3-community-foundation-runtime/planner.mjs`** — `planImport` now runs two passes
  over `messages` instead of one:
  1. A first pass walks the whole batch and predeclares `messageIdToPlannedContributionId` (and
     which rows are duplicates — either already in `importedMessageIds` from a prior batch, or a
     repeat `message_id` within this same batch) for every non-duplicate message, with no parent
     resolution yet.
  2. A second pass emits the actual `ops`, resolving each reply's `parent_id` from that now
     *complete* batch-wide map (falling back to `existing-via:<message_id>` when the parent was
     already imported in a prior batch, else `null`).

  Parent resolution is now independent of `messages` array order. A message whose
  `parent_message_id` truly never appears anywhere (batch or prior import) still resolves to
  `parent_id: null`, with `parent_message_id` preserved in `provenance_link.note` — never
  guessed. Duplicate detection, the contributor/identity/reactions/moderation/blank-body logic,
  and every op shape are otherwise unchanged.
- **Fixtures**: new `test/fixtures/openweb-import/parent-reconstruction-order.json` — a
  child-before-parent pair (`ow-2002-child-first` referencing `ow-2001-parent-later`, which
  appears after it in the array), a genuinely-absent parent
  (`ow-2003-genuinely-missing-parent` → `ow-9999-never-in-export`), and a reply to a message
  already imported in a prior batch (`ow-2004-child-of-already-imported` →
  `ow-0999-already-imported`).
- **Tests**: new `scripts/test-g3-community-core-pr636-parent-reconstruction.mjs`
  (`npm run test:g3-community-core-pr636-parent-reconstruction`) — 4 tests: child-before-parent
  resolves correctly, a genuinely-missing parent stays `null` with provenance preserved, a reply
  to an already-imported (cross-batch) message resolves via `existing-via:`, and running the
  batch forward vs. fully reversed produces identical `parent_id` resolutions for every message.
  The existing Phase 1/2/2.1/2.2 fixture/tests were left as-is since their one reply pair
  (`ow-1001`→`ow-1002`) already appears parent-before-child and does not exercise this defect;
  no assertion in those files changed.

## Build/test evidence (this session, on this branch, exact head `50861e8c`)

```
npm ci
npm run test:g3-community-foundation-runtime               # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                 # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2-1                # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction   # 4 pass, 0 fail
npm run build:2029                                          # ✓ built in 841ms (pre-existing
                                                              #   INEFFECTIVE_DYNAMIC_IMPORT
                                                              #   warning on src/lib/auth.js,
                                                              #   unrelated to this change, same
                                                              #   as Phase 2.1/2.2's own notes)
```

Total focused Community suite: 53 pre-existing + 4 new = 57 tests, 0 failures.

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply, no migration change, no real 41,080-row import execution
  (`executor.mjs`'s triple gate is unchanged and still off by default).
- The 39 genuinely-absent parents remain unresolved by design; nothing in this pass invents or
  guesses a parent for them.
- No PR description change was made in this pass; GPT/ZURIEL may want to append a note to PR
  #636's description referencing this fix.
- Execution-order safety of a *live* import against a real DB (e.g. whether
  `research_contributions.parent_id` needs a deferred FK or a two-phase insert-then-link so a
  child row is never inserted before its planned parent row exists) is a separate concern for
  the actual Phase 3 import executor, not the pure planner this task's `assignment_scope`
  covers, and is not addressed here.
