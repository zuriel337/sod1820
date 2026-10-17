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
