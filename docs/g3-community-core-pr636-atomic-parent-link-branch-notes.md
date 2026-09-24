# G3 Community Core — PR #636 atomic parent link (branch-only)

Assignment: `work_log.id=42f02073-d4a5-481d-99c3-df7c3ff4f780`,
`task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_PARENT_LINK_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`) as every prior pass on this PR, amended in
place; no new parallel branch/PR. No live DB write, no migration applied, no real import execution,
no merge/deploy/cutover.

## What this closes

The atomic-message-import fix (`task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_MESSAGE_IMPORT_V1`) made
the contributor/visitor_identity/research_contributions/contribution_links writes for one imported
message atomic, but still always inserted `research_contributions.parent_id = null` inside that
call and left the real linkage to `executor.mjs`'s separate, un-atomic two-phase `linkParent()`
`UPDATE`, issued after every row in a batch had been inserted. A crash/abort *after* the atomic
insert (and its provenance link) committed but *before* that phase-2 update ran left an imported
child permanently unlinked: a retry resolves the `message_id` as already-imported
(`skip_duplicate`, via the same provenance unique index the atomic insert already satisfied) and
never revisits the row — nothing was left to repair it.

## What changed in this pass

**New migration:**
`supabase/migrations/20260924130000_g3_community_core_pr636_atomic_parent_link_v1.sql` — adds one
new parameter, `p_parent_message_id text default null`, to `public.g3_openweb_import_message(...)`
(appended after `p_promote_contributor_email`; the prior 24-arg overload is dropped first, same
pattern every prior PR #636 signature change on this function used). Inside the same function
invocation, before the `research_contributions` insert:

- `p_parent_message_id` null/blank → `parent_id` is inserted `null` directly, no lookup — the
  genuinely-absent-parent case (the real archive's 39-message class), unchanged.
- `p_parent_message_id` present and resolves via
  `contribution_links(target_type=openweb_message, target_id=p_parent_message_id,
  relation_type=derived_from)` → the resolved id is inserted as `parent_id` in this same atomic
  call — never a separate post-insert step.
- `p_parent_message_id` present but does **not** resolve → `raise exception`, fails the whole call
  closed. The caller (`planner.mjs`) only ever supplies a non-null `p_parent_message_id` once it
  has already determined this parent is expected to be present (in-batch or already committed);
  reaching here with nothing found means the caller's own expectation disagrees with live
  provenance — an inconsistency, never the genuinely-missing class — so this never silently
  degrades to a null `parent_id` for a dependency believed present.

Global topological ordering (`orderMessagesForBoundedImport`, already in place from the
cross-batch-parent-order pass) guarantees any parent present in the corpus is imported strictly
before its child, so by the time this function runs for a reply, its real parent — if present in
imported provenance at all — is already committed and resolvable.

**Changed: `scripts/g3-community-foundation-runtime/planner.mjs`** — each `insert_contribution` op
now also carries a top-level `parent_message_id` field: the raw source `msg.parent_message_id`
when the existing `parent_id` placeholder logic (`planned:<id>` / `existing-via:<id>`) determined
the parent is expected resolvable, `null` otherwise (mirroring the same determination the
placeholder convention already encodes — no new logic, just the raw id needed for the RPC's
`contribution_links` lookup, previously only reachable indirectly via the provenance note's JSON).

**Changed: `scripts/g3-community-foundation-runtime/opsAdapter.mjs`** —
`createSupabaseOps().insertContribution` now passes `p_parent_message_id: op.parent_message_id ||
null` to the RPC call. Reads it from the top level of `op`, not `op.contribution.parent_id`:
`executor.mjs`'s phase 1 forces the latter to `null` on every insert (unchanged, see below) but
never touches this sibling field, so it survives untouched regardless of which phase is calling.

**`executor.mjs`: unchanged in logic**, comments only. Phase 1 still forces `contribution.parent_id
= null` on every insert and phase 2 still resolves/applies `pendingLinks` via `ops.linkParent` —
required for FK safety with any *other* ops implementation that doesn't resolve parents atomically
(tests, future adapters), per the assignment's own "generic executor two-phase path may remain for
tests/other adapters" boundary. For the real OpenWeb adapter, phase 2 is now redundant: it
re-applies the same real `parent_id` the atomic RPC call already set in phase 1, so if it still
runs it is idempotent (a same-value `UPDATE`), never load-bearing for correctness.

## Tests

**New: `scripts/test-g3-community-core-pr636-atomic-parent-link.mjs`**
(`npm run test:g3-community-core-pr636-atomic-parent-link`) — 6 tests, driven through the real
`planImport`/`resolveImportState`/`createSupabaseOps` (never a hand-built op literal, except the
one test that needs to inspect the planner's own output directly), against a dedicated fake client
whose `rpc()` mirrors the new resolve-or-fail-closed parent contract:

1. same-batch parent: child resolves its parent correctly from `insertContribution` alone.
2. cross-batch parent: a reply in batch 2 resolves its already-committed batch-1 parent, same way.
3. **crash-consistency (the assignment's required case):** parent and child are inserted via the
   atomic RPC only — `ops.linkParent` is never called at all, simulating a crash before executor
   phase 2 ever runs. The child's `parent_id` is already correct at that point. A simulated retry
   (both message_ids now resolve as already-imported) routes both through `skip_duplicate`; exactly
   one child row exists throughout, and its `parent_id` is unchanged and still correct — nothing
   needed repairing.
4. genuinely absent parent (the 39-genuinely-missing class): `parent_message_id` present on the
   source row but never part of imported provenance stays `null`, no RPC lookup attempted, no
   failure — unchanged behavior.
5. fail-closed: an expected-but-unresolvable parent (synthetic inconsistent state, mirroring the
   pre-existing "ghost parent" scenario) rejects `insertContribution` outright; nothing is ever
   committed with a silently null `parent_id`.
6. `runBoundedImport` end-to-end through the full two-phase executor (phase 2 `linkParent` still
   runs, now redundantly) — same correct cross-batch result.

**Updated (behavior change, expected): `scripts/test-g3-community-core-pr636-phase3-ops-adapter.mjs`**
— its fake `rpc()` now honors `p_parent_message_id` the same way (resolve via `contribution_links`,
fail closed if unresolvable), so `research_contributions.parent_id` is correct straight out of the
atomic insert rather than always `null` pending phase 2 (11 pre-existing tests: assertions and
outcomes unchanged, since the two-phase path still runs redundantly and produces the same final
state). One test, `'partial failure: an unresolvable cross-batch parent is reported in
linkFailures...'`, is renamed and rewritten to `'fail-closed: a present-but-unresolvable expected
parent aborts the run...'`: this exact synthetic scenario is precisely the case the assignment asks
to fail closed rather than report as a soft, non-fatal `linkFailures` entry, so the test now asserts
`runImport` rejects and the affected row is never committed, instead of asserting a `linkFailures`
entry with `completed: false`.

## Build/test evidence (this session, on this branch)

```
npm install
npm run test:g3-community-foundation-runtime                 # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                   # 39 pass, 0 fail
npm run test:g3-community-core-2029-phase2-1                 # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                 # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction    # 4 pass, 0 fail
npm run test:g3-community-core-pr636-two-phase-executor       # 6 pass, 0 fail
npm run test:g3-community-core-pr636-phase3-ops-adapter       # 12 pass, 0 fail
npm run test:g3-community-core-pr636-atomic-message-import    # 6 pass, 0 fail
npm run test:g3-community-core-pr636-dry-run-cli              # 3 pass, 0 fail
npm run test:g3-community-core-pr636-cross-batch-parent-order # 12 pass, 0 fail
npm run test:g3-community-core-pr636-source-verified-email-claim # 12 pass, 0 fail
npm run test:g3-community-core-pr636-atomic-parent-link       # 6 pass, 0 fail (new)
npm run build:2029                                            # built in 1.03s (same pre-existing
                                                                #   INEFFECTIVE_DYNAMIC_IMPORT
                                                                #   warning on src/lib/auth.js,
                                                                #   unrelated to this change, noted
                                                                #   in every prior pass's own notes)
```

Total focused Community suite: 132 pre-existing + 6 new = 138 tests, 0 failures. The real-corpus
39-genuinely-absent-parents invariant (`parent-reconstruction` suite) is unchanged.

Exact head at close of this pass: see the branch's latest commit on `claude/awesome-dirac-88xf74`.

`package-lock.json` was regenerated locally by `npm install` in this sandboxed session (only
`optionalDependencies[*].libc` metadata churn from the local npm/platform, unrelated to this task)
and was reverted before committing — not part of this change.

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply: the new migration is committed for review only — `mcp__Supabase__
  apply_migration` / `execute_sql` DDL was never run against the canonical project
  (`linswmnnkjxvweumprav`) in this task.
- No real 41,080-row import execution, no service_role credential wiring, no CLI entrypoint change.
- `executor.mjs`'s generic two-phase contract is preserved unchanged for non-OpenWeb/test ops
  implementations, per the assignment's own boundary — only the real OpenWeb adapter's reliance on
  it for correctness is removed.
