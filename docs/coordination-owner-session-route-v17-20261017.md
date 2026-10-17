# SOD1820 — existing owner-session routing guard (v17 DRAFT)

**Date:** 2026-10-17. **State:** BRANCH-ONLY / ISOLATED / NOT WIRED / NOT MERGED / NOT DEPLOYED. This is a small candidate against the existing work_log / PR #1098 protocol, NOT a new dispatcher or a new coordination system.

## Exact scope and provenance

- Baseline: PR #1098 head `e07667027d96f68e01e2af88836bbfa674f56fec`.
- Work branch: `gpt/owner-session-route-v17-20261017`. Do not rebase, cherry-pick or apply its draft SQL to Production automatically.
- Files: `scripts/coordination-owned-session-route.mjs` (adapter-based async plan, re-verified send, nonce ACK), `test/coordination-owned-session-route.test.mjs` (46 cases, all positives SYNTHETIC), and this documentation.
- Test locally: `node --test test/coordination-owned-session-route.test.mjs` — 46/46 PASS in isolated Node v22.16.0. No network, Supabase, real Claude send, browser or CI is used by this suite.
- The branch deliberately does **not** modify production functions, Supabase migrations, v17 rules, CI workflows, GitHub Actions, UI, Legacy, or the unified 2029 preview.

## Real-provider finding

One explicitly authorized READ_ONLY test was dispatched to the hosted Claude Routine:
`OWNER_TARGETED_CLAUDE_CLOUD_CLI_20261017`, assignment `9fee430f-badd-44c1-8b1a-2a9f2ef3c62d`. Sender session `cse_019B66gHY3TiZWJvBbMPhNM4`; target *previous* owner conversation `session_01922vZne1Jbs9ZGGuWZvpRV`.

The sender's Claude CLI 2.1.302 was present and reported OAuth logged in. It attempted exactly one `claude -p ... --cloud <existing session id> --output-format json`. The hosted runtime permission classifier denied the send as **Interfere With Workloads** BEFORE execution. No message was sent, no owner ACK arrived, and no alternative Routine FIRE was issued. The previous owner had **released** its WRITE scope; an open conversation is not an active WRITE claim. Live owner-to-owner delivery remains **BLOCKED / NOT PROVEN**, and no code/test here can override that provider denial.

## Owner-first contract for an authorized future rollout

The pure guard returns HOLD unless a trusted adapter supplies all of the following:

1. Fresh active `inter_agent_coordination_law` v17 and a *scoped, recent, explicit* ZURIEL approval matching exactly the owner claim ID, cloud session ID, task, and read-only send.
2. Fresh exhaustive, bounded canonical work_log owner inspection. Resolve old passive `BEFORE_CLAIMED_WRITE` records and conflicting owners; missing/unparseable file paths are **ambiguous** and block dispatch. RELEASED claims do not confer ongoing ownership.
3. Verified exact owned file paths, expected Git head equal to current remote head, and unique unexpired lease or independently attested heartbeat.
4. Same authenticated Claude account and **exact** existing session ID. `cse_...` and `session_...` MAY NOT be assumed aliases by suffix; a provider-authenticated mapping would need a separate contract and evidence.
5. A single provider-permitted direct send only to that existing session, no other session startup or alternate route, no auto-retry after denied or unknown delivery.
6. A separate correlated passive owner receipt in work_log with source assignment, test ID, owner claim, exact session, and head. An HTTP/CLI send receipt or any untrusted actor text is **not proof of owner acceptance**. The future connector needs authenticated actor provenance, replay protection and least-privilege access.

**v17 is unchanged:** no GPT-directed RESULT_WAKE or GPT ACK waits. Human Gate for product changes, merge, deploy, DB writes, permissions, and aliases remains separate.

## Rollout HOLD / acceptance gates

- PR #1098 is an older v16 Draft; its rollout preflight still identifies legacy WRITE claims without paths, does not fully cover manually recorded passive owner claims, and must be reconciled with v17 before live enforcement.
- Provider must supply a sanctioned permission path for message delivery; **do not bypass/disable runtime safeguards**. If denied, STOP with reason.
- Must prove one real owner-session receipt from a verified active owner, without spawning a replacement, then a distinct, authenticated and idempotent ACK. Run READ_ONLY before an isolated fixture WRITE challenge; never start WRITE on Production.
- Current code is an **unwired reference guard**, not an authority to edit data or a working automatic session inbox.
- This branch has **no pull request**: intentionally avoids triggering broad PR workflows while CI isolation work is incomplete. Merge to #1098 is a future separately reviewed step.

Owner release and current state should be verified again from the canonical live system before any next write.

## v2 hardening (assignment 21ce1910, after review AFTER 52b5d376) — still NOT_WIRED

Three fail-open gaps were closed in the reference guard:

- **(A) No caller-supplied proof.** `normalizeTrustedOwnerClaim` and the boolean/JSON inputs (`userAuthorization`, `alreadyDispatched`, `providerEvidence`, `gitEvidence`, `candidateClaims`, `lawVersion`) are removed. `planOwnedSessionRoute({adapters, request})` reads law version, user approval, owner scan, provider session state, sender account and remote Git head itself through a wired adapter set. Extra proof-looking fields in `request` are ignored. Plans are module-branded: a copied/plain-object plan is refused by `sendToExistingOwner` and the ACK verifier.
- **(B) Ledger lease != live session.** Liveness requires fresh provider `sessionState` matching exact session id, owner claim id and account with `is_active=true`; a lease or heartbeat in work_log is only a ledger fact. Raw claim rows are never accepted: the module parses work_log rows itself (structured registration required; legacy rows => HOLD). `sendToExistingOwner` re-verifies identity/scope/session/head and then calls `idempotency.take(key)` (key = claim, session, task, approval id, head) before the single send; no take => no send. Real adapters must report `durable && atomic`.
- **(C) ACK.** `verifyOwnerSessionAck` is async and needs: field match including the plan's unique `ack_nonce`, `ack.authenticate()` (actor CLAUDE, exact session, receipt id), receipt time inside [plan.createdAt, plan.expiresAt], and `ack.consume(nonce, receiptId)` succeeding exactly once (replay => `ACK_REPLAY_REJECTED`; no store => `ACK_CONSUME_STORE_NOT_WIRED`).

**`wireTrustedAdapters()` always returns HOLD `NOT_WIRED_NO_AUTHENTICATED_PROVIDER_ADAPTER`.** Only `wireSyntheticAdaptersForTests()` exists; results carry `synthetic:true, providerProven:false`. Synthetic passes are NOT provider acceptance. The in-memory idempotency/consume stubs in the tests are test-only.

### Security limitations
- Trust is placed in whoever wires the adapters (module-private brand prevents accidental/forged objects, not a malicious in-process caller).
- No authenticated provider session-state API, GitHub-head adapter or user-approval adapter is implemented or verified.
- The "Interfere With Workloads" provider block is not bypassed; real delivery stays **NOT_PROVEN**.
- Message text carries the nonce, so anyone who can read the owner session or the message could see it; the ACK still needs adapter-authenticated provenance.

### Required DB rollout (HOLD — NOT applied, live DB untouched)
Needs a reviewed migration (separate Human-Gate step): a persisted table or work_log-backed record with `UNIQUE(route_idempotency_key)` and `UNIQUE(ack_nonce)`, columns `status (TAKEN|SENT|CONSUMED)`, `expires_at`, `receipt_id`; SECURITY DEFINER functions `owner_route_take(key)` (INSERT ... ON CONFLICT DO NOTHING, returns whether inserted) and `owner_ack_consume(nonce, receipt_id)` (single `UPDATE ... WHERE status<>'CONSUMED' AND now()<expires_at RETURNING`), EXECUTE granted only to the coordination service role, and RLS denying direct writes by anon/authenticated. Until then the interface must fail closed.

## v3 — atomic owner-route ledger DESIGN DRAFT (assignment 799794f9, BRANCH-ONLY, NOT applied)

Replaces the "Required DB rollout" sketch above with a tested draft that uses the **existing `public.work_log`**; no new table, dispatcher or queue.

- Draft SQL: `docs/coordination-drafts/owner-route-atomic-ledger-v17.sql` (deliberately outside `supabase/migrations`; refuses to run unless `owner_route.draft_apply_ack = 'SCRATCH_ONLY_NOT_PRODUCTION'`).
- Tests: `node scripts/test-agent-owner-route-atomic-ledger-v17.mjs` — real SQL on a throwaway local PostgreSQL 16 (initdb in a temp dir, unix socket, no network, no Supabase). PGlite is not installed in this repo, and package manifests are untouched, so the system `postgres`/`psql` binaries are used; without them the suite exits 2 `BLOCKED` and claims nothing. Result on this branch: **24 passed / 0 failed / 0 skipped** (two consecutive runs); baseline `node --test test/coordination-owned-session-route.test.mjs`: **46/46 pass, unchanged**.

### Model
Route record = one `work_log` row, `task_key = 'OWNER_ROUTE:' || <64-hex route idempotency key>`, `to_actor='ZURIEL'`, `dispatch_kind/state=NULL`, `status ∈ OWNER_ROUTE_{RESERVED,SENT,CONSUMED,DENIED,SEND_UNKNOWN}` (RESERVED = TAKEN; none matches the `trg_work_log_dispatch_prepare` claimable/mode regexes). Partial unique indexes (route rows only): route key, `sha256(ack_nonce)`, external `receipt_id`. The plaintext nonce (two `gen_random_uuid()` = 64 hex) is returned once by `owner_route_take` and never stored.

| Function (SECURITY DEFINER, `search_path = pg_catalog, pg_temp`) | Effect |
|---|---|
| `owner_route_take(key, claim, session, task, approval, head, ttl 30..3600)` | `INSERT … ON CONFLICT DO NOTHING`; loser gets `ROUTE_ALREADY_TAKEN` (blocks on the unique index until the winner commits); nonce-hash clash → `ACK_NONCE_COLLISION` |
| `owner_route_record_send(key, ACCEPTED\|DENIED\|UNKNOWN, provider_ref)` | `RESERVED→SENT` only after provider accepted (ref required, not expired); DENIED/UNKNOWN terminal, never retried |
| `owner_ack_consume(key, nonce, claim, session, receipt_id, receipt_at)` | one conditional `UPDATE … WHERE status='SENT' AND nonce/claim/session match AND not expired AND receipt_at in [reserved, expires]`; replay / second consumer → `ACK_REPLAY_REJECTED`; reused receipt id → `RECEIPT_REPLAY` |

EXECUTE is revoked from PUBLIC/anon/authenticated and granted only to the pre-existing `service_role` (the same role the v16 transport functions use). A BEFORE trigger `trg_work_log_zy_owner_route_guard` (sorts after `…dispatch_prepare`, before `…zz_gpt_delivery_stop_v17`) rejects any INSERT/UPDATE of route rows unless `current_user` is the owner of `owner_route_take` (i.e. inside these functions), rejects all route-row DELETEs, and enforces the passive invariants for everyone. So `dispatch_context` JSON cannot be forged by `service_role` or an admin-policy writer (both tested). Ordinary rows, including the legacy passive WRITE claims, are untouched.

### Exact limits (not claimed)
- The DB does **not** verify that a caller is the Claude owner session or that a receipt is provider-signed; `owner_ack_consume` trusts the already-authenticated adapter inputs and gives atomicity, uniqueness, expiry and replay rejection only. `service_role` = backend key, not an authenticated session.
- The role that owns the functions (Supabase `postgres`) can still write route rows directly. `TRUNCATE work_log` is not intercepted.
- v17 unchanged: route rows never queue a dispatch; GPT-directed rows are still rerouted to ZURIEL (verified, `emit_probe` stays empty; a CLAUDE control row proves the probe fires).
- Scratch fixture replicates the live `work_log` columns, the 4 triggers' function bodies and grants as read on 2026-10-17; re-diff against live before any migration.

### Code diff / wiring plan (later, separate assignments, Human Gate)
1. This change adds only the 3 files above; no JS adapter, workflow, manifest or migration is changed.
2. Later: implement the real `idempotency.take` → `owner_route_take`, send-outcome → `owner_route_record_send`, and `ack.consume` → `owner_ack_consume` adapters behind `wireTrustedAdapters()`, fed by provider-verified session state, scoped ZURIEL approval and remote Git head reads. Until those exist the guard stays HOLD / `NOT_WIRED`.
3. Production migration: convert the draft into a reviewed migration (replace the scratch-only guard), re-verify live triggers/grants/RLS, then apply only after explicit ZURIEL authorization.


## 17 Oct 2026 — clean slate and routing decision (ZURIEL, verified live)

**The active coordination queue is now clear.** This section is an operational handoff, NOT a product completion statement and NOT permission to deploy. The work_log cleanup was explicitly authorized by ZURIEL after deciding to stop historical task accumulation. The audit retained original records; it did not delete Git refs or product data.

| Closure batch | Type | Count | Audit snapshot row |
|---|---|---:|---|
| First | historical dispatched ASSIGNMENT rows, including DEFERRED; administratively CANCELLED + archived | 38 | `fdc2e847-990c-4e78-a0d8-260028911ce0` |
| First | legacy passive BEFORE_CLAIMED_WRITE owner reservations; administratively CLOSED + archived | 66 | same snapshot |
| Second | legacy manual CLAIMED / BEFORE_CLAIMED records with task key; administratively CLOSED + archived | 401 | `0adaa157-ce06-4fe6-9dae-2f536eae8aee` |
| Second | old manually WAITING / IN_PROGRESS work records with task key; administratively CLOSED + archived | 12 | same snapshot |
| **TOTAL** | **closed historical records, evidence preserved** | **517** | **104 + 413 original-state snapshots** |

**Verified after both batches:** actionable ASSIGNMENT dispatch = 0; actionable RESULT_WAKE = 0; active session leases = 0; unclosed manual CLAIMED or BEFORE_CLAIMED records with task key = 0; unclosed manual WAITING / IN_PROGRESS records with task key = 0. The current security/quality hold log still includes **21 non-executable BLOCKED result/decision records**, including provider denial for an existing Claude session. They are blockers/evidence, not permission to restart tasks. Do not treat admin closure as proof that corresponding code was integrated or that a production release gate passed.

**Refs preserved at cleanup checkpoint:** main `6ef3ec2d6c139cd06af628b20ac2d5c3fb776a70`; unified preview candidate `8c8e9df9b2b012b70479e398e75f16e7008b8619`; Claude perf followup `e189df34abb4e5dc72e02141709e0e54d229248e`; PR #1098 draft `e07667027d96f68e01e2af88836bbfa674f56fec`; isolated atomic-ledger candidate `0945e5f11f8405e4539607131acf2edf86bd0e2b`. These are SHA pins, not an exhaustive offline Git backup; never delete branches solely because the task ledger was closed.

### Default command chain until existing-session delivery is supported

1. This conversation (ZURIEL Human Gate) issues ONE uniquely identified and explicitly approved, bounded task with path/branch ownership. Reconfirm the canonical main and owner ledger before writing.
2. Existing `work_log` / `agent_dispatch_emit` may launch **one new Claude Code Routine session** (this route was tested repeatedly). That does **NOT** deliver into an already-running/earlier Claude owner conversation.
3. The receiver performs its assigned branch-only action, reports one passive AFTER to ZURIEL, and releases its lease. GPT/Work may read the passive AFTER independently when asked; **v17 prohibits automatic GPT-directed messages, GPT ACK requirements and GPT wake**.
4. Never requeue/unarchive old records to "continue." Any necessary work must be a NEW user-authorized envelope after checking preserved branch SHA, changed paths, and unresolved security holds. Exactly one writer per file; no silent owner handoff.
5. If provider-sanctioned existing-session delivery later becomes available, require exact provider account/session verification, live owner evidence, durable atomic one-time send reservation and authenticated non-replayable ACK before substituting it for the normal route. A previous live send was denied `Interfere With Workloads`; this cannot be bypassed. The reference JS remains `NOT_WIRED`, and the atomic SQL remains under `docs/coordination-drafts/` (draft only, not applied).

**Rollback of cleanup:** original status, dispatch-state, lease fields and IDs are in the two audit rows' `dispatch_context.original_states`. Restoration requires explicit user review because reactivating old dispatch or owner claims could spawn conflicting writers. Prefer creating a fresh scoped task rather than reviving an old task.

**Product hierarchy unchanged:** Master Roadmap + Master Owner Index + full Product Map govern the project; Reality Stream V3 is subordinate. No changes to Legacy, 2029 unified preview, aliases, production database schema, CI workflows, RLS or site flags were made by the cleanup.


## Final cleanup reconciliation — 17 Oct 2026

The initial administrative clean-slate closed 517 records in two audit snapshots. A subsequent independent normal GPT→Claude Routine **really started, claimed, finished and returned one passive AFTER**, but the automated review gave a cautious BLOCKED verdict because it also counted historical status *labels* as live tasks. It did **not** claim the provider's direct existing-session messaging is fixed. The actual canonical queue was verified separately with narrower live SQL predicates.

A third cleanup snapshot `0c6febc9-40bf-4481-ab11-aaf02faf1982` preserves and archives **11 more stale, non-runnable dispatch-state anomalies** (old RESULT_WAKE DEFERRED/FAILED rows and NULL-kind CLAIMED/DEFERRED rows without leases or scheduled attempts). No launch was retried. Final administrative closure total: **528** (104 + 413 + 11). The actual work_log audit records preserve each original ID/status/state, and the original text remains in the archived source rows.

**Exact read-only postcondition (verified on canonical Supabase after third batch):**
- 0 unarchived/unsuperseded actionable ASSIGNMENT rows in QUEUED / RETRY_WAIT / FIRE_REQUESTED / SESSION_STARTED / CLAIMED / DEFERRED.
- 0 corresponding RESULT_WAKE rows; 0 NULL-kind rows in an actionable dispatch state.
- 0 unexpired CLAIMED dispatch leases.
- 0 unarchived, unsuperseded task-keyed manual statuses that START with CLAIMED, BEFORE_CLAIMED, WAITING, AWAITING, PENDING, ASSIGNED, IN_PROGRESS, WORKING or CONSUMER_REQUEST_AWAITING.
- **22 BLOCKED task-keyed result/hold rows retained as non-executable evidence.** Some concern real unresolved security/release issues; one records the provider-denied owner-session send and another records the conservative smoke-test review. Do not call these PASS or suppress their release constraints.

For future acceptance checks, **never count a task as executable merely because the status TEXT contains** `CLAIMED`, `WAITING`, `ACK`, `IN_PROGRESS`, or `FAILED` anywhere. Examples are passive `ACK_CLAIMED_...` history, `AFTER_...AWAITING_ACK` reports and terminal `FAILED` results. Check `archived`, `superseded_by_id`, `dispatch_kind`, `dispatch_state`, `dispatch_next_attempt_at`, the lease, and the authoritative active ownership records together. Do not mistake administrative closure for successful feature delivery.

Normal-path verification: task `86bf9b05-fef0-4310-aaf1-a88982fcd051`, Claude session `cse_01M7TTCHPnRCpMfxHGKa6EsZ`, transport accepted and real CLAIM / COMPLETED recorded; result `c8c54650-738f-4942-ab42-303ca7bfaa61` was passive TO=ZURIEL under v17. Its broader readiness judgement was BLOCKED, and has not been rewritten as PASS.

Until the provider-sanctioned existing-owner-session route is proven end-to-end, the **default is the regular user-authorized single-assignment Routine**. No autonomous retry of old work and no GPT-directed wake. The new atomic-ledger SQL draft (24 isolated SQL tests passed) has not been applied, authenticated provider adapters remain NOT_WIRED, PR #1098 remains a DRAFT. A provider runtime refusal (`Interfere With Workloads`) must not be bypassed.
