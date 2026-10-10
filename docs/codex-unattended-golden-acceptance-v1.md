# REMOTE_CODEX_EXECUTOR_BRIDGE_V1 — Unattended Golden Acceptance V1
Date: 2026-10-10 | **BRANCH ONLY** | No live Codex / no model calls / no merge or production edits.

## Single owner and no duplicate queue
Canonical task/owner: public.work_log / work_log_current; inter_agent_coordination_law v13.
Canonical actor: GPT for current ChatGPT/Codex coordinator; Claude/Gemini review ownership unchanged.
The existing public.work_log columns dispatch_state, dispatch_lease_owner,
dispatch_lease_expires_at, dispatch_attempts, dispatch_session_id, dispatch_response_at
and existing SQL functions agent_dispatch_claim/finish, agent_dispatch_emit_gpt,
agent_dispatch_reconcile_gpt_wake provide coordination plumbing. They are NOT by
themselves a remote Codex executor or authorization for a paid task.
DO NOT create another dispatch queue, agent registry, billing engine or independent actor.

## Reconcile #1022, #1023, #1024 (one execution path)
- #1022: one-response API probe (default offline). Estimated dollars are NOT a hard cap.
- #1023: existing offline preflight, input flags are self-attested and NOT security evidence.
- #1024: isolated Codex CLI prototype + Vercel Development secret handoff script.
- The added scripts/codex-unattended-golden-contract.mjs is the **pure acceptance
  checker** for a future authenticated adapter, not a parallel controller service.
  Its test uses a mocked adapter to simulate claim, commit/test receipt, AFTER and GPT wake.
  The offline-only `claimOfflineGoldenOnce` port now consumes the existing RPC's
  receipt; it cannot authorize paid mode and requires the branch-only consumption patch.
Merge/reconcile only after dependency review, and never deploy the three prototypes
as independent autonomous runners.

## First unattended golden contract — required real evidence
1. Trusted gateway uses a server-held Ed25519 signing key (private key never in work_log),
   and the runner verifies with pinned public key. Signed payload binds canonical
   assignment UUID, idempotency key, existing GPT actor, task, one harmless task scope,
   expiry <=15 min, attempt <=2 and timeout <=90 s.
2. Gateway securely reads live canonical assignment, checks owner and no concurrent
   writer, and atomically acquires a bounded lease with existing DB functions.
   After claim, independently re-read from authoritative DB; never trust flags from job.
3. No paid execution until real isolated server-side credentials and an authenticated
   provider spending guard enforce a verified bound. Provider estimates, env boolean,
   timeout or user blanket consent do NOT establish provider-level hard-stop.
4. Codex runner checks out an isolated GitHub branch and edits a README/test fixture,
   runs tests, emits sanitized commit/test and resource receipts. No production write.
5. Existing agent_dispatch_finish writes exactly one AFTER; the existing GPT wake
   mechanism receives exactly one authenticated callback. Retry/duplicate must
   not execute or charge a second time; failures/timeouts must release/expire lease.
6. Audit one end-to-end event WITHOUT a manual relay between assignment and GPT receipt.

## Verified today
- Vercel isolated git head 956797f: `node --test scripts/test-codex-unattended-golden-contract.mjs` PASS.
- Existing stage-C offline assertions PASS; secret handoff preflight confirms
  development key NOT injected into Sandbox; git checkout + command syntax PASS.
- Vercel ephemeral testing sandboxes stopped. No paid OpenAI API calls.
- Vercel project has OPENAI_API_KEY sensitive in Development. Existing sandbox does
  not inherit it. A trusted Development-to-Sandbox secret-bearing operator is NOT
  authenticated/available. Do not request, print or transmit the key through a tool.
- Runtime sandbox has no linked Vercel CLI; `vercel env run` therefore not available there.
- Canonical SQL has GPT wake, claim/finish functions; a paid Codex consumer/transport
  has NOT been verified. A synthetic fake callback is NOT real GPT awakening.
- User explicitly asked to allow paid Codex (2026-10-10), but did not name a per-run
  dollar maximum. This is intent to enable a bounded trial, not permission for
  recurring unattended spending or automatic credit purchases.

## Remaining true blockers to READY_FOR_FIRST_UNATTENDED_GOLDEN
- Trusted server environment obtains Development secret directly, with no chat/DB/log exposure.
- Authenticated work_log-to-remote-executor listener and callback receiver, hard
  server-side lease/idempotency; independent security review on exact SHA.
- Verified API provider balance and vendor-enforced spending bound, else keep paid
  mode fail-closed. Test supported model IDs and Codex CLI flags in real runner.
- Replace simulated adapter with real least-privilege existing coordination APIs.
- One fully observed end-to-end receipt across assignment -> Codex wake -> CLAIM ->
  isolated commit/test -> AFTER -> GPT wake, with no human message between.

**Current verdict:** OFFLINE_CONTRACT_SIMULATED_PASS; LIVE_AUTO_WAKE_NOT_READY;
PAID_CODEX_NOT_STARTED. No greenwash. No new coordination system.

## 2026-10-10 continuation: focused RECON → bounded branch fix

Source handoff: `bd331b90-f43f-4557-87ec-26006d77c5d7` (passive, not a wake).
Verified remote main: `4b62216d89b3fada1701ef21f8753f5fffaa9e0b`.
Starting PR #1024 head: `c4e0443b1e34d43c4391502b8794b2cf107b4b3e`, draft/unmerged;
same branch `codex/isolated-executor-prototype-20261010`.
GitHub identity `zuriel337` has admin permission. Dependencies remain separate/open:
#1022 `13b9a5bd58309d1e2ec9d15d384851daaecd54e3`,
#1023 `39230b9cbbff9d0459845ce667cf104b218ec718`.
Live active owners resolved from `nodes` (not `rules_active`): Coordination v13,
Foundation v7, work-log authority v2, AI analysis/cost v2 plus the existing cost V1.1 contract.
Bounded `work_log_current` reads found no active overlapping executor writer;
World/Home, shared Frame, palette, crown and other G4 claims remain outside this patch.
General Supabase connector was used for SELECT only. No live claim, ACK, AFTER,
assignment, requeue, migration, deployment, secret read/copy or model call occurred.

| Seam | Current evidence | State |
|---|---|---|
| Development → Sandbox | Project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`, team `team_vtfWHZfKvdbob8gvynQb5N89`: `OPENAI_API_KEY` is Sensitive, Development only. Metadata fetched with decrypt=false and values omitted. Current executor has no OpenAI key or Vercel token/identity. Existing CLI bridge is not an authenticated server. | BLOCKED |
| One-shot claim | Live claim is atomic UPDATE/RETURNING, service-role-only, default lease 900s. Live requeue resets attempts to zero. Counter-only replay protection is therefore insufficient. | Branch fix tested; NOT LIVE |
| Spend enforcement | No authenticated provider project/balance/limit receipt or independently enforced per-run cap is available. [OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits) support hard project monthly limits but explicitly allow propagation overshoot. Alerts, timeouts and estimates are not per-run dollar caps. | UNKNOWN / BLOCKED |
| AFTER → GPT | Claude assignment `ac0e5df4-c5af-4409-9f7e-d9bf20692a8d` completed; AFTER `f3255c0e-3e4e-4e3b-82ae-7b127d2c5a0b` remains DEFERRED with `no_completed_assistant_text_in_session_items`. | No authentic wake ACK |

### Exact bounded change and limits

Migration `20261010172910_codex_work_log_one_shot_claim.sql` extends only existing
`agent_dispatch_claim`, specifically this task's GPT ASSIGNMENT rows. It atomically
records `dispatch_context.codex_consumption` with the signed idempotency key,
unique lease owner and consumption time in the same UPDATE that claims the row.
The existing requeue preserves this marker, so resetting attempts cannot consume
the same assignment again. An unknown/lost response burns the approval; automatic
retry must never erase the marker. New attempts need owner reconciliation and a
new signed assignment, not reusing the old permit. Privileged mutation of canonical
context is outside this guarantee; signer/issuer authorization remains a blocker.

The narrow gate requires `codex_execution_mode=offline_golden`, EXECUTE_BOUNDED,
canonical assignment origin, first attempt, no lease/backoff, and an explicit 120s
lease. It rejects paid mode. Generic GPT, Claude and RESULT_WAKE semantics and
service-role-only grants are preserved. No new table, actor, RPC, queue or service.
The migration baseline is the inspected LIVE function, which differs from main's
older migration (extra claimable states/status and backoff behavior). Reconcile
live function drift again before any eventual application; do not replay an old
definition over a newer owner's changes.

The existing Golden module verifies the atomic marker, attempt, lease token,
idempotency key and fresh clock after the RPC, and binds its evidence reread to
that exact lease. Unpatched RPC receipts fail closed. Missing/non-finite clocks
are also rejected by the older signature/evidence gates. The injected RPC port
is not an authenticated server and is not wired to production. Existing string
claim callbacks remain legacy mocked fixtures only. `--live` is still an
unconditional `PAID_TRANSPORT_NOT_DEPLOYED` stop.

### Verification and Claude conditions

- 51/51 Node tests: original two-mode/signed auto-wake/recon/admin projection plus
  12 new claim, clock, retry, error-redaction and mocked Golden integration cases.
- Disposable PostgreSQL 17.6: six cases plus parent test (7/7). Reproduces the
  original requeue replay, tests two concurrent DB connections, durable consumption
  after actual requeue, negative authorization/lease cases, legacy behavior and ACLs.
  No network/ports on the local container; container removed after verification.
- Existing unattended mocked Golden, paid CLI hard-stop, agent-dispatch contract,
  no-key credential preflight, full legacy+2029 build and `git diff --check`: PASS.
- Existing #1024 CI at starting head: Contract, Observability/SEO and 2029 Isolation
  SUCCESS; Release Visual FAILURE. No release gate was removed or bypassed.
- Claude's exact `8de87f40...` review remains PASS_WITH_CONDITIONS, offline only.
  B1 replay and B6 lease: branch implementation/tests improved, live FAIL.
  B2 raw signatures/clock: prior fix preserved; missing-clock legacy path hardened.
  B3 authoritative evidence/issuer, B4 authenticated executor/actor transport,
  B5 trusted secret and spending enforcement: still FAIL/UNKNOWN before live.
  **No claim of Claude approval for this delta. Exact-new-head review is required.**

### Next safe activation and AFTER handoff

Actor GPT · task REMOTE_CODEX_EXECUTOR_BRIDGE_V1 · owner Coordination v13 ·
scope existing Golden module/claim RPC/tests/CI/doc only · release_advice BLOCKED_BY.
IMPLEMENTED and TESTED locally; branch commit/PR receipt accompanies the handoff.
MERGED=false, APPLIED=false, DEPLOYED=false, LIVE=false, paid OpenAI calls=0,
measured OpenAI API cost for this continuation=$0; no billed cost estimate invented.
This document is a reviewable AFTER payload, not a persisted `work_log` AFTER or GPT ACK.

Next, the existing authorized operator must (1) pass Claude delta review and approve
isolated application of the RPC extension, (2) authenticate a Development-secret
server with pinned issuer keys and least-privilege canonical access, (3) verify the
specific OpenAI project hard limit, permissions and remaining spend, and enforce
an approved per-run request budget outside the Sandbox, (4) prove the existing
finish/wake path returns an authenticated GPT ACK. Never hand service-role access
to Codex. Start with a deny-all, nonpersistent, presence-only secret probe; no model.
For paid activation reconcile the older $1 permit ceiling with the stricter $0.10
fixture ceiling: neither is user approval or enforcement. A proposed first trial
is one README.md-only run capped at at most $0.10, subject to explicit verified
scope, real server enforcement and usage receipts. Do not raise provider limits,
purchase credits, switch providers or enable retries automatically.

Stop on owner/branch/function drift, any overlapping writer, missing issuer or
budget evidence, duplicate/uncertain consumption, or missing GPT ACK. Only a real
assignment → Codex → tests/commit → AFTER → GPT ACK with provider usage closes Golden.
