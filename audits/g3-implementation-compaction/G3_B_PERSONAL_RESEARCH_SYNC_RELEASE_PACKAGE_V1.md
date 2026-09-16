# G3-B · PERSONAL RESEARCH SYNC RELEASE PACKAGE V1

Status: BRANCH-ONLY. NOT MERGED. DB MIGRATION NOT APPLIED. NOT DEPLOYED. NOT LIVE. Human Gate release authorization is absent.

## Scope and live authority

This package composes the existing Personal/Research Sync implementation from PR #479 onto the isolated 2029 runtime boundary from G3-A PR #481. It does not create a Research Store, Workspace, Context, identity system, truth system, or presentation system.

Reverified live inputs:

- origin/main: `22b18c900ac616d5c021d335efd94b810b753918`
- canonical Supabase: `linswmnnkjxvweumprav`
- PR #479 source head: `576a9e081404fc5a907b6f78a31017bd660ccc61`
- G3-A PR #481 source head: `91ed9cbfe0dd69a5523723467c38202e3156f5ea`
- `research_workspace_law v3`
- `person_foundation_contract_law v6`
- `truth_axes_foundation_law v3`
- `graph_privacy_foundation_law v1`
- `foundation_closure_protocol_law v5`
- `experience_governance_foundation_v1_law v2`
- `inter_agent_coordination_law v12`

Owner result: `EXTEND_EXISTING`.

## Integration shape

`App2029` mounts the shared capability directly:

`AuthProvider -> ResearchProvider -> Sod2029Shell`

The 2029 tree does not mount `UserCenterProvider`, Legacy `Layout`, Legacy Workspace presentation, or Legacy chrome in order to obtain research sync. `ResearchProvider` therefore remains shared Foundation capability, not a presentation owner.

The PR #479 executable payload is composed unchanged onto PR #481. The bounded G3-B delta is:

1. include the existing Personal/Research Sync implementation and migration on top of the G3-A isolated runtime;
2. extend the existing 2029 Isolation Gate path trigger so changes to shared Research/Auth Foundation dependencies rerun source + production-build dependency-graph isolation proof;
3. record exact release choreography and downstream Experience interface requirements.

## Principal/account isolation

The implementation uses a principal-keyed runtime boundary. Account identity changes remount the principal ResearchProvider before children render; same-account token refresh does not create another principal. Guest and authenticated account state use distinct principal keys.

Required invariants already implemented/tested in PR #479:

- account A state cannot hydrate into account B;
- guest state does not silently become authenticated cloud state;
- legacy unscoped local research is explicit recovery/export material, not implicit account adoption;
- per-principal local state and per-tab durable journals are separated;
- cloud calls carry the expected principal and the server verifies it against `auth.uid()`;
- stale async completion from an old principal cannot publish into a new principal runtime.

## Replay / retry / lost-ack / conflict / recovery

The existing runtime uses ordered immutable operation batches, one in-flight cloud batch per principal, durable journal recovery, CAS revision checks, and bounded operation receipts.

Release invariants:

- lost acknowledgements can be retried with the same operation id without double application;
- reload/closed-tab pending work remains recoverable from durable journals;
- repeated delivery uses receipt fingerprint matching and fails closed on mismatched payload;
- stale CAS revisions report conflict rather than silently overwriting remote state;
- explicit conflict resolution/retry/export/recovery actions remain at the ResearchProvider interface;
- cloud hydration must not reactivate a cleared active Research Context.

## Canonical DB pre-release state

Verified live before packaging:

- `public.research_state_snapshot_v1(uuid)` does not exist;
- `public.research_state_apply_ops_v1(uuid,jsonb,bigint,uuid)` does not exist;
- no `user_research.data` row contains `_research_sync_v1`;
- no malformed managed `history` / `collections` / `journeys` arrays were found;
- current `research_items` / `user_research` owner policies are still the pre-migration permissive policies;
- the restrictive managed-bucket direct-write fences from PR #479 do not yet exist.

Migration state: `CODED_IN_BRANCH / NOT_APPLIED_TO_CANONICAL_DB`.

## Migration security contract

Migration `20260916141000_g3_personal_research_sync_hardening_v1.sql` must be applied before the new client is released.

It provides authenticated RPCs with fixed search path and server-side `auth.uid()` principal checks:

- `research_state_snapshot_v1`
- `research_state_apply_ops_v1`

The migration revokes broad execution then grants RPC execution only to `authenticated` and `service_role`. It revokes authenticated direct writes to `user_research`, and adds restrictive authenticated policies blocking direct writes to the managed `research_items` buckets (`cart`, `library`, `pinned`) while preserving existing owner-scoped non-managed paths.

The apply RPC owns CAS revision, advisory serialization, bounded receipt/idempotency behavior, validation, and preservation of unmanaged `user_research.data` keys.

## Old-client transition behavior

DB-before-client is intentional for integrity. After the migration and before the new client is deployed, old/cached clients can still read owner-visible state but managed direct writes fail closed at the database boundary. The old helper historically does not surface every Supabase direct-write error, so this interval is not a transparent compatibility mode.

Consequences:

- keep the DB-upgraded / old-client interval short;
- do not restore unsafe managed direct writes merely to preserve Legacy behavior;
- do not treat an old-client application rollback as a complete write-compatible rollback after the DB migration.

## 2029 isolation proof and CI wiring

G3-A proves source-root and built dependency-graph isolation. G3-B extends the existing 2029 Isolation Gate trigger to run when these shared dependencies change:

- `src/lib/AuthContext.jsx`
- `src/lib/auth.js`
- `src/lib/tracking.js`
- `src/lib/supabase.js`
- `src/lib/research/**`
- `package-lock.json`

This closes the release-wiring gap where a ResearchProvider/Auth change could previously alter the 2029 module graph without rerunning the G3-A graph gate.

## Experience capability requirement — no Workspace design here

The Foundation interface already exposes enough state/actions for a future 2029 System Frame / Workspace projection. That Experience stage must provide an accessible, non-Legacy presentation for at least:

- sync state: auth-loading / loading / local-only / pending / syncing / synced / conflict / error / recovery-required;
- pending work and current sync revision;
- retry;
- conflict resolution;
- pending-work export;
- recovery-journal discovery/recovery;
- explicit legacy-recovery/export action when legacy unscoped material exists.

This MUST NOT be implemented by remounting Legacy UserCenter, Legacy Workspace, Legacy chrome, or another Legacy presentation owner in `App2029`.

This is a capability/interface handoff to the System Frame / Workspace Experience stage, not a new Foundation primitive. It remains a broad-rollout Experience requirement before users are expected to self-recover from conflict/error states without operator assistance.

## Exact release choreography

No step below is authorized by this package. Execution requires explicit Human Gate authorization (`תעלה`) and a fresh live preflight.

1. **Fresh preflight** — reverify `origin/main`, canonical Supabase project/state, active owners, work_log overlap, PR heads, and required checks. Stop on material drift or another active writer.
2. **One combined application artifact** — release the G3-B combined head containing both G3-A isolation and PR #479 sync. If PR #481 has not already landed, do not deploy PR #481 alone as an intermediate production app. Retarget/rebase the G3-B review to the authorized main lineage as needed so application cutover is atomic at the repository/release level.
3. **DB first** — apply only `20260916141000_g3_personal_research_sync_hardening_v1.sql` from the exact authorized G3-B commit to canonical Supabase `linswmnnkjxvweumprav` before client release.
4. **DB post-migration verification before app deploy** — verify both RPC signatures; fixed search path/security-definer contract; `PUBLIC`/`anon` cannot execute RPCs; `authenticated`/`service_role` can execute as intended; managed authenticated direct writes are fenced; unmanaged owner-scoped paths remain usable; restrictive policies exist; principal mismatch and CAS conflict fail closed; no existing research state was malformed/destructively rewritten.
5. **Keep compatibility window short** — while DB is upgraded and the old application is still served, managed old-client writes are expected to fail closed. Do not weaken DB fencing to hide it.
6. **Application cutover** — only after DB verification passes, merge/deploy the single authorized combined G3-B application head.
7. **Production verification** — verify account A/B isolation, guest/auth separation, initial hydration, repeat-delivery/lost-ack retry, conflict/recovery, and 2029 built/runtime isolation without Legacy presentation reachability. Record DEPLOYED/LIVE/VERIFIED separately.
8. **Experience rollout gate** — before broad self-service rollout, the 2029 System Frame/Workspace projection must expose the non-Legacy sync/conflict/retry/recovery interface above.

## Rollback safety

If application cutover fails after DB migration, leave managed-write fences in place by default. Preferred recovery is reviewed roll-forward to a compatible client. Re-enabling Legacy direct managed writes is a separate security-sensitive Human Gate decision and must not be automated as generic rollback.

## Package-time blockers

- Human Gate release authorization: absent by design.
- Canonical DB migration: not applied by design.
- G3-B combined-head CI and independent Claude read-only challenge must pass before this package is VERIFIED release-ready.

The missing final Workspace/System Frame presentation is not implemented here. It is a downstream Experience requirement and must not pull Legacy presentation back into the 2029 runtime.
