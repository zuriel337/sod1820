# G3 — Personal Research Sync Completion v1

Date: 2026-09-16. Canonical Supabase: `linswmnnkjxvweumprav`.
Main baseline: `22b18c900ac616d5c021d335efd94b810b753918`.
Implementation revision: `59d0954fff1dd1512434ef9be2f01e75d90651a2`.
Branch / PR: `gpt/g3-personal-research-sync-hardening-v1` / #479.
State: **IMPLEMENTED + TESTED IN ISOLATED FIXTURES + BRANCH-ONLY. NOT DEPLOYED.**

This is implementation evidence under Research Workspace v3, Person Foundation v6 and Truth Axes v3. It is not a new contract, owner, store, engine, migration authority or permission to close G3. The early separation baseline remains in PR #478; the mandatory end-of-G3 compaction/retirement gate remains open.

## 1. What this replaces and what it preserves

The old `ResearchProvider` browser/cloud synchronization used an unscoped local snapshot, account hydration and deletion-by-absence. This slice replaces that implementation, not the Research OS identity or saved-research model.

Preserved: existing `research_items`, `user_research`, source-native entity identities, unrelated state keys, graph/truth/publication separation, saved items, collections, journey snapshots, active Research Context and existing semantic action APIs. No new table/schema/store or second workspace exists.

Changed: `ResearchProvider.jsx`, personal-sync functions in `auth.js`, internal reducer/runtime helpers and one branch-only migration. World/Number/Phrase/Books/ELS/Raziel presentation was not redesigned. Existing route/iframe handling remains an explicitly scoped legacy compatibility seam, not 2029 engine/navigation authority.

## 2. Runtime acceptance delivered

- Principal-keyed React mounting prevents a render with A's research under B's identity; stale callbacks belong to the stopped principal and are inert.
- Guest and authenticated state are distinct. Unscoped `sod_research_v1` has UNKNOWN ownership and is preserved, never silently adopted.
- User actions produce immutable, ordered batches. Partial collection edits and add/update/remove order survive; a later action cannot invalidate an earlier network acknowledgment.
- One in-flight request; the exact batch ID, payload and expected revision are persisted before transport. A storage failure cannot silently become a successfully sent, unjournaled request.
- The server derives authority from `auth.uid()`. The expected user ID is only a stale-JWT/account-switch guard.
- Explicit operations are atomic over the existing two tables. Absence from a browser snapshot never means deletion.
- Compare-and-swap revision plus the last 128 batch receipts are operational metadata inside existing `user_research.data._research_sync_v1`, not a new research/truth store. An expired stale receipt fails with conflict rather than replaying a destructive operation.
- Lost clear/delete acknowledgment followed by a later remote save does not erase that save on retry.
- Each tab has its own durable pending journal. Reload reuses exact uncertain request identity. A closed tab's journal remains explicitly discoverable/recoverable for the same principal after sessionStorage is lost.
- Conflict resolution requires explicit confirmation. Concurrent confirmations or newly accepted mutations cannot race an in-progress keep-remote decision.
- Failed reads are not empty cloud state. Errors, pending state and conflicts remain explicit. Clearing active Context is not undone by a later hydration response.

## 3. Evidence, not simulated production PASS

The current `Research Sync Acceptance` workflow executes:

1. `node --test src/lib/research/researchSyncRuntime.test.js src/lib/research/researchSyncRecovery.test.js` — 29 core + 4 recovery cases. Real implementation/reducer/lifecycle; network/storage are isolated fixtures.
2. `scripts/test-research-sync.sql` — executes the actual candidate migration in a disposable PostgreSQL database. Tests absent/spoofed principal denial, input validation, atomic rollback, duplicate batch payload mismatch, CAS, lost-clear-ACK replay, 128-receipt eviction, original owner-policy preservation, managed-bucket restrictions and disjoint hint writes. Completion marker: `RESEARCH_SYNC_SQL_ACCEPTANCE_PASS`.
3. `node --test scripts/test-research-sync-provider.mjs` — 4 mounted real React provider cases. Only external auth/router/network/telemetry are mocked. This is stronger than a source-pattern check, but is not production browser E2E.

Observed CI evidence:

- implementation `71185b3c`: Research Sync run `35113695656` PASS; job `104853619616` logs read, confirming 29 Node, 4 mounted React and actual PostgreSQL17 fixture PASS.
- implementation `59d0954f`: Research Sync run `35114369242` PASS; Observability/SEO run `35114369246` PASS. Exact final-head checks must be reread at release, including Release Visual Gate.
- independent Claude full review: assignment `e3fe9df8-095a-4822-a5f9-a3af082d4589`, AFTER `6db93053-30c9-48f8-96ca-3f046add1a1f`, PASS on `71185b3c`. Independently executed 29 Node, 4 mounted React, actual migration on disposable PostgreSQL16, and build; live Supabase metadata reads only.
- final four-change recovery delta: assignment `b41bc80e-68bf-44a5-919e-d0e0ad8c96f5`. Resolve its linked AFTER in work_log before claiming independent acceptance for `59d0954f`; the previous PASS is not automatically inherited.

Earlier six-test acceptance at `1d02fe29` remains history, not final coverage. Its test command now delegates to the current core suite. The recovery delta explicitly distinguishes reload (same sessionStorage) from closing a tab (fresh sessionStorage); these must not be conflated.

## 4. Release is a separate gate

No migration has been applied to canonical Supabase by this work. Read-only preflight at 2026-09-16 15:19 UTC found: both new RPCs absent; all three new restrictive policies absent; no `_research_sync_v1` metadata; no non-object user_research data; no malformed history/collections/journeys array fields. Reverify before release.

The migration leaves original ownership policies and read paths intact. It adds RESTRICTIVE policies only for direct client writes to `cart/library/pinned`; `hint/searched/handled` and other non-managed owner paths remain subject to their existing ownership policies. Direct user_research snapshot writes are revoked. Trusted service/admin paths remain separate and must not mutate sync metadata casually.

After explicit ZURIEL release authorization only:

1. Rescan writers and current main; reconcile exact branch/base and all required checks.
2. Verify production schema/constraints/policies/function absence and current direct writer dependencies. Preserve current grants/policies for bounded rollback evidence.
3. Apply the reviewed migration before exposing the matching client. The new client fails closed without its RPCs; never add a fallback to old snapshot writes. Fence old cached-client managed writes during cutover.
4. Release the matching client; verify real authenticated ownership isolation, explicit save/delete/retry, refresh/return continuity, legacy-data preservation and disjoint hint/handled flows with controlled authorized fixtures.
5. Record MERGED, DB APPLIED, DEPLOYED, LIVE and VERIFIED separately. Do not restore unsafe direct writes merely to make an old cached page appear functional. Rollback requires a coordinated decision; never delete user data or receipt metadata to roll back code.

## 5. Deliberate limits / downstream integration

This is the personal-sync runtime slice, not a final Workspace screen. The existing provider exposes `syncStatus`, `syncPending`, `recoveryJournals`, retry, confirmed conflict resolution, pending export, same-principal journal recovery and confirmed UNKNOWN-owner legacy export. The final Workspace/System Frame must present these states/actions accessibly before broad user rollout; buttons/visual acceptance have not been claimed here.

Legacy unscoped data is exportable after explicit local-access confirmation, not automatically re-attributed or imported. Corrupt local data remains preserved and fails closed. The scope does not claim encryption, recovery after browser storage deletion, all private-data surfaces hardened, source/ELS verification, or unlimited conflict-free offline collaboration. Concurrent stale edits produce an explicit conflict, not a silent merge.

The stored `journeys` here remain the pre-existing personal snapshots. This does not establish a fully populated `research_paths`/`research_plans` runtime or complete the universal resolver/intake, callable ELS boundary, continuous Raziel runtime, final World design or global cutover.

## 6. Coordination and next owner-qualified step

Primary writer: GPT. Coordination v12. Completion/reconciliation BEFORE: `c2ccb2ed-4949-4b87-a23f-dc9372c372e6`.

A non-fast-forward update was rejected when the branch advanced during preparation; no force push was used. Prior fixes were inspected and retained in Git lineage before the new completion was stacked normally. Independent reviews are READ_ONLY, never release authorization.

Next foundation work follows the existing G3 Roadmap: prove one callable ELS execution boundary and owner-qualified adapters; consume canonical server/Registry calculation results; only then extend the shared System Frame and World over verified capabilities. No new architecture or parallel system is authorized by this evidence file.
