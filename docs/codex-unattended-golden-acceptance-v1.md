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
