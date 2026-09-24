# G3 Community Core — PR #636 cross-batch parent ordering fix (branch-only)

Assignment: `work_log.id=8b6f0861-62ed-4efe-b215-8ed9a915bae2`,
`task_key=G3_COMMUNITY_CORE_PR636_CROSS_BATCH_PARENT_ORDER_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`) as Phase 1/2/2.1/2.2/parent-reconstruction/
two-phase-executor/Phase 3 ops adapter/Search Index Gate, amended in place; no new parallel
branch/PR. No live DB write, no migration applied, no OpenWeb/current chat/forum file touched, no
merge/deploy, no import execution.

## What the real-corpus import rehearsal found (GPT, prior to this assignment)

Against the real 41,080-row OpenWeb export (32,155 reply rows; 32,116 present parent refs, 39
genuinely absent), `runBoundedImport` (`scripts/g3-community-foundation-runtime/opsAdapter.mjs`)
slices `messages` into fixed-size batches **in raw input order** before handing each batch to
`planImport`/`runImport`. `planImport` itself already resolves a parent within one batch
order-independently (the earlier `PARENT_RECONSTRUCTION_V1` fix), but it can only see the rows in
the batch it is given. When a reply's parent lands in a *later* batch than the reply, the parent
has not been imported yet at the moment the reply's batch runs, so `parent_id` resolves to
`existing-via:`-lookup-miss → `null`. No later batch ever revisits an earlier batch's rows, so
that loss is permanent — indistinguishable, once committed, from a genuinely missing parent.

At the default `batchSize=500`, this would have dropped **9,583 of 32,116** present parent refs
(15,839 parents appear later in file order than their child; of those, 9,583 fall in a different
500-row batch). Only the 39 parents that truly never appear anywhere in the export should ever end
up `parent_id: null`.

## What changed in this pass

- **`scripts/g3-community-foundation-runtime/opsAdapter.mjs`** — added
  `orderMessagesForBoundedImport(messages)`, a pure function (no DB, no field rewriting — only
  output position changes, so each row's own `created_at`/provenance stays exactly as authored)
  that reorders `messages` with a stable topological sort (Kahn's algorithm, always expanding the
  smallest-original-index ready row next) so every parent present anywhere in `messages` is placed
  no later than its child. `runBoundedImport` now calls it before slicing into batches, so a
  parent can never be pushed into a batch after its child purely because of raw file order. A
  `parent_message_id` that does not appear anywhere in `messages` at all is left alone here — that
  is resolved (via already-committed `contribution_links`) or left genuinely `null` by
  `resolveImportState`/`planImport`, exactly as before. A cyclic or otherwise unsatisfiable
  dependency graph (including a row whose `parent_message_id` is its own `message_id`) throws —
  `orderMessagesForBoundedImport: invalid dependency graph — cyclic or unsatisfiable
  parent_message_id reference(s) among message_id(s): ...` — rather than silently dropping the
  link or guessing an order; `runBoundedImport` performs zero writes before this ordering step
  runs, so such a throw leaves nothing partially imported.
- **Fixture**: new `test/fixtures/openweb-import/cross-batch-parent-order.json` — a 3-level reply
  chain (root → child → grandchild) stored in fully reversed file order (root last), with each
  parent's `created_at` earlier than its child's, mirroring the real-corpus invariant
  (`parent_timestamp_always_before_child_for_present_refs: true`) while the file position is
  exactly the defect class GPT's rehearsal found.
- **Tests**: new `scripts/test-g3-community-core-pr636-cross-batch-parent-order.mjs`
  (`npm run test:g3-community-core-pr636-cross-batch-parent-order`) — 12 tests: `orderMessagesForBoundedImport`
  exercised directly (already-correct order left untouched, later-parent moved ahead of an earlier
  child, an absent-from-the-set parent is not an ordering concern, independent rows keep their
  original relative order, a fully-reversed 3-level chain resolves to root→child→grandchild, no
  row's own fields are rewritten, a self-referencing row fails closed, a two-node cycle fails
  closed and names both ids); `runBoundedImport` end-to-end through the real `createSupabaseOps`
  adapter against an in-memory fake Supabase client at `batchSize=1` (parent-later-in-input
  resolves across batches instead of staying permanently null, the fully-reversed 3-level chain
  resolves at every level across batch boundaries, the real-corpus-derived fixture resolves every
  level, a cyclic input rejects the whole bounded run before any write happens). The existing
  Phase 1/2/2.1/2.2/parent-reconstruction/two-phase-executor/Phase 3/dry-run-cli suites were left
  as-is; none of their fixtures cross a batch boundary with an out-of-order parent, so none
  exercised this defect and no existing assertion changed.

## Build/test evidence (this session, on this branch, exact head at start `d8d3b032`)

```
npm ci
npm run test:g3-community-foundation-runtime                    # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                      # 39 pass, 0 fail
npm run test:g3-community-core-2029-phase2-1                    # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                    # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction      # 4 pass, 0 fail
npm run test:g3-community-core-pr636-two-phase-executor         # 6 pass, 0 fail
npm run test:g3-community-core-pr636-phase3-ops-adapter         # 12 pass, 0 fail
npm run test:g3-community-core-pr636-dry-run-cli                # 3 pass, 0 fail
npm run test:g3-community-core-pr636-cross-batch-parent-order   # 12 pass, 0 fail  (new)
npm run build:2029                                               # ✓ built in 1.30s (pre-existing
                                                                   #   INEFFECTIVE_DYNAMIC_IMPORT
                                                                   #   warning on src/lib/auth.js,
                                                                   #   unrelated to this change,
                                                                   #   same as every prior pass's
                                                                   #   own notes)
```

Total focused Community suite: 114 pass, 0 failures (102 pre-existing + 12 new). Search Index
Gate's structured-evidence semantics (`classificationSeam.mjs`, covered inside
`test:g3-community-core-2029-phase2`) were not touched by this pass — same 39/39 pass count as
before this change.

## Expected remaining unresolved parents on the real corpus (analysis, not a live run)

The actual 41,080-row OpenWeb CSV is not committed to this repository and is not read, imported,
or otherwise touched by this pass (`NO_OPENWEB_TOUCH`), so this is a mechanism-based expectation
from GPT's own real-corpus evidence in the assignment, not a fresh live re-run:

- Before this fix: up to 9,583 replies could resolve `parent_id: null` purely from the
  batch/file-order interaction at `batchSize=500` (variously 8,254–15,367 at other batch sizes
  GPT measured), on top of the 39 genuinely absent parents.
- After this fix: `orderMessagesForBoundedImport` guarantees every parent present anywhere in the
  full `messages` array is processed in a batch no later than its child's, for any `batchSize`,
  so the only rows that can still resolve `parent_id: null` are ones whose `parent_message_id`
  does not appear in the export at all (or, if the import is itself resumed across multiple
  separate CLI invocations/process runs rather than one `runBoundedImport(client, allMessages,
  ...)` call, a parent already committed in a genuinely earlier prior run — unaffected either way).
  Expected remaining unresolved parents on the real corpus: **39** (the genuinely-missing class),
  not 9,583.

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply, no migration change, no real 41,080-row import execution
  (`executor.mjs`'s triple gate is unchanged and still off by default; `runBoundedImport`'s own
  `execute`/`confirm`/`ops` gating is untouched).
- The 39 genuinely-absent parents remain unresolved by design; nothing in this pass invents or
  guesses a parent for them.
- No re-run against the actual 41,080-row export was performed or is authorized by this pass — see
  "Expected remaining unresolved parents" above for why that number is an analysis, not a
  measurement.
- No PR description change was made in this pass; GPT/ZURIEL may want to append a note to PR
  #636's description referencing this fix.
- Search Index Gate (`classificationSeam.mjs`) and every other Phase/PR636 fix in this branch are
  unchanged by this pass.
