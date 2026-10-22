# SOD1820 — Codex auto-wake Stage C acceptance (PR #1024)
Date: 2026-10-10. Scope: branch-only contract + offline red-team fixture. **NOT** remote runner authorization.

## Canonical ownership: no second orchestration system
- inter_agent_coordination_law v13 and public.work_log / work_log_current remain the only task/owner/writer ledger. Codex is a runner for the EXISTING GPT actor, **not** a third actor or second task queue.
- Existing functions: work_log_assign_agent (task-key idempotency, active writer check), agent_dispatch_claim (lease, at most 3 attempts), agent_dispatch_finish (AFTER + queued RESULT_WAKE), agent_dispatch_requeue / agent_dispatch_recover (retry/recovery).
- CURRENT REAL BLOCKER: agent_dispatch_emit dispatches to Claude routine only; the GPT/Codex path is DEFERRED. A RESULT_WAKE row is not proof GPT has resumed. Do not modify or repurpose the active Claude dispatcher without its owner and independent review.
- Stages: #1022 = API connectivity probe only; #1023 = offline operator preflight only; #1024 = isolated runner prototype + credential-bridge smoke + **offline** auto-wake acceptance. They overlap functionally but not as independent engines.

## What is now testable OFFLINE
Commands:
  node --test scripts/test-codex-auto-wake-contract.mjs
  node scripts/test-isolated-codex-executor-prototype.mjs

- An Ed25519 operator-signed, ONE-SHOT-*intended* (not yet replay-enforced) grant is bound to canonical assignment UUID, task key, exact scope, project, issued-at and expiry (<=15 minutes), isolated codex/golden-* branch, a single README.md path and max-run cents.
- Tampered signature, wrong recipient, stale/claimed work, retry exhausted, active lease, backoff, out-of-scope file, branch=main, absent provider evidence, unbounded agent steps are rejected.
- The pure evaluator ALWAYS returns OFFLINE_POLICY_ELIGIBLE_NOT_EXECUTABLE (or BLOCKED) and never starts model/API/network calls or writes DB.
- Backend **MUST NOT** trust self-attested fields from a job / work_log JSON (provider_hard_cap_verified, owner_verified, etc.). It must independently verify live provider spending controls, real actor/authorization, scoped issuer public key, nonce replay protection and receipt accounting, and acquire the canonical lease atomically. These pieces are *not* implemented here.
- The existing agent_dispatch_finish code creates a RESULT_WAKE row, but the real external GPT wake handler remains missing.

## Unattended activation conditions (ALL must be verifiably GREEN)
1. Trusted development operator identity with **runtime-secret injection** to an isolated Vercel Sandbox. Project Development OPENAI_API_KEY exists as Sensitive, but Vercel Sandbox does not inherit it. Sandbox has NO built-in authenticated Vercel CLI or VERCEL_TOKEN, tested in nonsecret probe. Never pass the key through chat, DB, work_log, GitHub, logs or command arguments.
2. Authenticate and strictly authorize incoming task by canonical DB read, isolated branch allowlist and signed one-shot permit issued by independent trusted operator. Verify permit nonce hasn't run (atomic durable claim under existing work_log task lease or a bounded existing idempotency guard). Verify repository permissions are least-privilege; never allow main push, merge or production DB access.
3. Provider/account-side cost settings independently inspected; strict service-side per-job spend reservation + usage reconciliation, model ID and CLI flags checked; guaranteed cap **not** inferred from max_output_tokens or timeouts. If a genuine hard cap cannot be established, unattended paid Codex must remain OFF. One separately approved supervised paid test can be scoped later.
4. work_log -> trusted dedicated Codex transport / worker -> agent_dispatch_claim exactly once -> isolated source checkout -> README-only fixture -> tests/commit in branch -> agent_dispatch_finish -> queued RESULT_WAKE -> authenticated GPT wake callback and actual session acknowledgement (not just a log row). CLAUDE route unchanged.
5. Test races, expired lease, retry-after-failure, payment error, untrusted actor, signer compromise, duplicate callback, provider budget depleted, stale PR/main before using a real task. Run independent Claude security review of exact commit before deployment.

## Acceptance truth table
| Stage | Current evidence | Verdict |
|---|---|---|
| Canonical assignment/claim/lease/finish RPCs | Live DB routine definitions inspected | EXISTS |
| Isolated PR #1024 runner dry-run | Exact branch tests passed previously | PASS offline |
| Signed offline acceptance fixture | Exact-head GitHub CI, with bounded signed-mode permit checks | PASS offline |
| Vercel Sandbox nonsecret env handoff | Real canary passed | PASS nonsecret |
| OPENAI_API_KEY in Vercel Development | Metadata-only, Sensitive Development | PASS metadata |
| Real trusted Development->Sandbox secret handoff | No authorized operator runtime available here | FAIL |
| Codex paid remote execution without manual session | Not deployed | FAIL |
| Hard per-task provider-dollar enforcement | Not verified/implemented | FAIL |
| Codex->AFTER->GPT real auto-wake | RESULT_WAKE exists, GPT endpoint deferred | FAIL |

## First supervised Golden request (AFTER secure runtime and scoped budget policy)
An intentionally boring README.md one-line test-fixture change on codex/golden-readme-smoke, no schema/SQL/production. Required proof: a single assignment UUID, signed permit + nonce, single active canonical claim with lease, exact checkout SHA, one bounded Codex run, a **recorded** provider usage receipt and actual charge, one commit, one test, one AFTER with same assignment id, one authentic GPT wake ACK, duplicate delivery 0. Stop if any step is not evidenced.

Current state MUST NOT be described as READY_FOR_FIRST_UNATTENDED_GOLDEN. More accurate: OFFLINE_ACCEPTANCE_READY_PROVIDER_AND_WAKE_BLOCKED.


## Two-mode implementation evidence (2026-10-10)
- Explicit codex_workflow_mode is mandatory in the existing work_log.dispatch_context when future Codex assignments are created by a trusted service (not currently populated by work_log_assign_agent). The existing assignment_mode remains READ_ONLY for RECON_READ_ONLY and WRITE for EXECUTE_BOUNDED.
- scripts/codex-workflow-modes.mjs validates owner/main evidence, read-only recon, bounded allowlists, GPT/owner challenged prior RECON for cross-system/cleanup/cutover work, unexpected-blast stop and strict deletion gates. scripts/isolated-codex-executor-prototype.mjs uses this contract, but --live remains unconditionally blocked.
- scripts/codex-implementation-recon-readonly.mjs collects ACTUAL current-checkout candidate Git file references without file writes, network, DB calls or model use. It cannot prove current origin/main, consumers, runtime, provenance, live costs or active writers; these remain UNKNOWN and require authenticated/live operator evidence.
- Existing /2029/control now projects a limited and admin-gated subset from get_work_log_current through the existing ControlPlane2029Page, strictly as COORDINATION_REPORTED, with all unverified implementation/live/health/cost/DRIFT fields UNKNOWN. This is PR-branch implementation only; PR #1007 backend timeout and control branch reconciliation remain blockers.
- scripts/test-codex-workflow-modes.mjs, scripts/test-codex-implementation-recon-readonly.mjs, scripts/test-codex-control-implementation-projection.mjs and signed auto-wake tests run through the lightweight .github/workflows/codex-executor-contract.yml. PASS here means OFFLINE CONTRACT ACCEPTANCE, never provider/authenticated Codex E2E readiness.
- First unattended Golden must also prove authenticated READ_ONLY recon handoff and a separate bounded execution assignment with provider spending enforcement and controller wake. One broad RECON never grants broad WRITE.

## Independent Claude review and hard-spend evidence (2026-10-10)
- Exact PR head `8de87f4` independent Claude READ_ONLY verdict: **PASS_WITH_CONDITIONS for offline code only**, reviewed without rerunning tests. Required before live: atomic one-use approval consumption through the canonical `work_log` owner; verified provider/owner proof server-side; actual trusted secret handoff; Codex transport; real GPT callback/receipt. A signed grant **is not one-shot until an authoritative atomic replay guard exists**.
- Offline signature implementation after this review now verifies the EXACT `payload_b64` bytes under Ed25519 (`signature_b64`) instead of reserializing a JSON object; an explicit server-provided `now` is mandatory, future-issued grants are rejected, and issuance-to-expiry is bounded to 15 minutes. This is a format change for Stage C offline fixtures, not a deployed API.
- OpenAI's current API documentation supports **project or organization hard monthly spend limits** if explicitly enforced, distinct from ordinary spend alerts: https://developers.openai.com/api/docs/guides/spend-limits . Verify the actual project setting under authorized account before execution; enforcement is not instantaneous, and spending may slightly overshoot. Monthly hard limits do not replace per-job reservation, model/token constraints, usage receipts or idempotent execution.
- No Development key was read/transferred to Sandbox and no paid Codex run was started. Preserve the unconditional `PAID_TRANSPORT_NOT_DEPLOYED` hard stop until a trusted server operator and real Golden are in place.
