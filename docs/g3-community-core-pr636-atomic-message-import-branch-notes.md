# G3 Community Core — PR #636 atomic per-message OpenWeb import (branch-only)

Assignment: `work_log.id=18de5532-80fd-44ee-9985-37f79c46de25`,
`task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_MESSAGE_IMPORT_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`) as every prior Phase 1/2/2.1/2.2/
parent-reconstruction/two-phase-executor/phase3-ops-adapter/final-blockers/search-index-gate/
cross-batch-parent-order pass, amended in place; no new parallel branch/PR. No live DB write, no
migration applied, no real import execution, no merge/deploy/cutover.

## What this closes

`createSupabaseOps().insertContribution` (Phase 3 ops adapter) performed up to five separate
client round-trips per message: `contributors` insert, `visitor_identity` upsert,
`research_contributions` insert, then two `contribution_links` inserts (provenance + identity).
Only the last of those five was protected against a concurrent-writer race, by the
`cl_openweb_message_derived_from_uniq` partial unique index (final-blockers pass) — and even that
protection only covered the *duplicate* case, by deleting the one row (`research_contributions`)
it knew how to delete after the fact. An arbitrary crash, timeout, or unexpected error between any
*other* two of those five calls (e.g. after creating a soft `contributors` row but before the
`research_contributions` insert, or after the provenance link but before the identity link) left an
untracked orphan — a private contributor never attached to any contribution, or an authored,
provenance-linked item with no source-identity link — that a naive retry could then duplicate.

## What changed in this pass

**New migration:** `supabase/migrations/20260924103000_g3_community_core_pr636_atomic_message_
import_v1.sql` — `public.g3_openweb_import_message(...)`, a single `plpgsql` function that performs
all five writes (conditionally: only creates a contributor / upserts visitor_identity / inserts an
identity link when the caller says to) inside one function invocation. Nothing in the function body
catches an exception — a single function call is Postgres's own transaction unit, so an unhandled
error at *any* point (including the expected `cl_openweb_message_derived_from_uniq` unique_violation
on the provenance insert, when a concurrent writer wins the same source message) aborts the whole
call and rolls back every write it made, atomically, with no manual cleanup/rollback statements
needed in SQL. `SECURITY INVOKER` (not `DEFINER`), per the assignment: the real caller is
`service_role`, which already has full table access and bypasses RLS, so the function does not need
elevated owner privileges. `EXECUTE` is revoked from `PUBLIC`/`anon`/`authenticated` and granted only
to `service_role` + `postgres` — this is explicitly not a public-reachable mutation endpoint.

**Changed: `scripts/g3-community-foundation-runtime/opsAdapter.mjs`** — `createSupabaseOps().
insertContribution` now makes exactly one call, `client.rpc('g3_openweb_import_message', {...})`,
instead of five separate `.from(table)` calls. The `isNewContributor`/slug-derivation logic (which
placeholder-id convention distinguishes "create a new contributor" from "reuse an already-resolved
one") is unchanged and still lives in JS — only the actual writes moved into the RPC. On success,
returns `{id: data.id}` exactly as before. On a `23505` error whose message names
`cl_openweb_message_derived_from_uniq` specifically (`isProvenanceRaceError`), resolves and returns
the winning contribution via the existing `contribution_links` read, exactly as `insertContribution`
did before this pass — except there is no longer a manual `.delete()` of an orphaned
`research_contributions` row first, because the RPC's own invocation already rolled that row back.
Any *other* error (a genuine failure, or even a different `23505` such as a `contributors.slug`
collision) still propagates unchanged, per `assertNoError`.

`planner.mjs` and `executor.mjs` are both unchanged by this pass — the two-phase insert/link
contract (`parent_id` always forced `null` on insert, applied afterward via a separate
`linkParent` update) is untouched; this pass only changes how `insertContribution` performs its own
five writes underneath that contract.

### Why `SECURITY INVOKER` here needed no additional grants

`service_role` already has default, broad privileges on every table in `public` (it is the role
every other write path in this codebase assumes), so no explicit `GRANT INSERT/UPDATE` on
`contributors`/`visitor_identity`/`research_contributions`/`contribution_links` was added alongside
the function's own `EXECUTE` grant — consistent with EXTEND_EXISTING (no schema/privilege surface
invented beyond the one new function).

## Tests

**New: `scripts/test-g3-community-core-pr636-atomic-message-import.mjs`**
(`npm run test:g3-community-core-pr636-atomic-message-import`) — 6 tests against a dedicated
in-memory fake client whose `rpc()` stages every write and only commits them together, at the very
end, after every failure checkpoint has passed — modeling the same all-or-nothing commit a real
aborted Postgres function invocation gives for free, so what's actually under test is the
*adapter's* handling of that contract (never assume partial state survived, never manually patch up
an orphan):

1. failure after `contributors` insert → zero rows in every table; a clean retry then produces
   exactly one contributor, one contribution, one provenance link.
2. failure after `visitor_identity` upsert → same all-clear-then-clean-retry shape.
3. failure after `research_contributions` insert (before provenance) → no half-authored orphan
   contribution survives; retry produces exactly one contribution + one provenance link.
4. failure after the identity link (following a successful provenance insert) → the contribution
   and its provenance link also roll back, not just the identity link; retry leaves exactly one
   contribution, one provenance link, and at most one soft contributor for the source user.
5. replay: re-running `insertContribution` for an already-imported `message_id` (via a real prior
   RPC round-trip, not a hand-built `state`) still resolves through `contribution_links`, never
   re-inserts.
6. concurrent duplicate: two independently-planned ops for the same `message_id` (simulating two
   workers that both passed the pre-write `resolveImportState`/`skipDuplicate` check before either
   committed) are both submitted through the atomic RPC — the loser's call rolls back completely
   (zero extra rows in any table) and resolves to the winner's real contribution id, never leaving
   a second `research_contributions` row.

**Updated (no behavior change, wiring only):**
`scripts/test-g3-community-core-pr636-phase3-ops-adapter.mjs` and
`scripts/test-g3-community-core-pr636-cross-batch-parent-order.mjs` each keep their own local
in-memory fake Supabase client (pre-existing convention, one per test file — never shared mutable
test infrastructure). Both fakes gained an `rpc('g3_openweb_import_message', ...)` implementation
that commits the same staged writes as a single unit, so every pre-existing test in both files
(12 + 12) keeps exercising the real, now-RPC-based adapter unchanged and all still pass.

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
npm run test:g3-community-core-pr636-dry-run-cli              # 3 pass, 0 fail
npm run test:g3-community-core-pr636-cross-batch-parent-order # 12 pass, 0 fail
npm run test:g3-community-core-pr636-atomic-message-import    # 6 pass, 0 fail (new)
npm run build:2029                                            # ✓ built in 1.63s (same pre-existing
                                                                #   INEFFECTIVE_DYNAMIC_IMPORT warning
                                                                #   on src/lib/auth.js, unrelated to
                                                                #   this change, noted in every prior
                                                                #   pass's own notes)
```

Total focused Community suite: 114 pre-existing + 6 new = 120 tests, 0 failures. The real-corpus
39-genuinely-absent-parents invariant (`parent-reconstruction` suite) is unchanged — this pass never
touches `planner.mjs`.

`package-lock.json` was regenerated locally by `npm install` in this sandboxed session (only
`optionalDependencies[*].libc` metadata churn from the local npm/platform, unrelated to this task)
and was reverted before committing — not part of this change.

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply: the new migration is committed for review only, exactly like every prior
  PR #636 migration on this branch — `mcp__Supabase__apply_migration` / `execute_sql` DDL was never
  run against the canonical project (`linswmnnkjxvweumprav`) in this task.
- No real 41,080-row import execution, no service_role credential wiring, no CLI entrypoint change.
- The atomicity contract is verified at the JS/adapter boundary against a fake client modeling
  Postgres's own transaction semantics (per this repo's existing test convention — no real Supabase
  project is ever touched by these tests); it is not verified by actually running the migration
  against a live or branch Postgres in this task, per the assignment's `BRANCH_ONLY_NO_LIVE_DB`
  boundary.
- `contributors.slug` already carries a live unique index (`contributors_slug_key`); a genuine
  concurrent-create race for the *same* `openweb_user_id`'s contributor row (two workers both
  deciding, from a stale pre-write read, that no contributor exists yet) is not separately
  ON-CONFLICT-resolved by this pass — that was already true of the five-call implementation this
  pass replaces and is unchanged/out of scope here; only the previously-*unprotected* multi-step
  partial-commit gap this task named is closed.
