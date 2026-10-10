# SOD1820 isolated Codex executor: prototype stage C
Date: 2026-10-10. Branch-only, no live execution.

This prototype intentionally does **not** repurpose wa-video-enrich, supabase Vault, or any production service-role credential. It only accepts a task descriptor on standard input and defaults to DRY_RUN. It does not pull live work_log or dispatch automatically; coordination and owner flags must be established by a separately audited backend adapter. Never trust flags supplied by untrusted callers in production.

## Stage C launch contract — mode-aware offline only
The real paid Codex transport is NOT deployed; this script unconditionally rejects --live, including fabricated tokens/flags. Neither passing a dry-run nor signing an offline fixture claims provider spending enforcement or runner authentication.

Every future Codex job MUST declare one of:
- RECON_READ_ONLY = canonical assignment_mode READ_ONLY. Read current main, relevant live dependencies/consumers/writers/migrations/PRs, report Implementation Reality Map with explicit UNKNOWN. No write permissions, no delete/publish authority.
- EXECUTE_BOUNDED = distinct canonical assignment_mode WRITE, scoped branch-only allowlist, owner decision, dependencies, stop conditions and verification. Architecture/cross-system/cutover work must have a GPT-challenged/owner-accepted prior RECON exact-SHA receipt. New unexpected consumer/DRIFT triggers STOP_AND_RECON.

The existing work_log.dispatch_context carries codex_workflow_mode; there is no third actor, registry, ledger or duplicate coordinator. The current work_log_assign_agent function does not yet populate this optional Codex marker; a separately reviewed and authenticated dispatch adapter must supply it before automatic invocation. Do not modify the live DB solely to simulate a worker.

For offline verification run:
`node --test scripts/test-codex-workflow-modes.mjs scripts/test-codex-auto-wake-contract.mjs`
`node scripts/test-isolated-codex-executor-prototype.mjs`
`node --test scripts/test-codex-implementation-recon-readonly.mjs scripts/test-codex-control-implementation-projection.mjs`

The deterministic git evidence probe is read-only and deliberately incomplete: no GitHub-current-main or live Supabase truth can be inferred from a local checkout. Exact source provenance, coverage gaps and separate GPT/owner decision remain mandatory.

## No source of truth duplication
Attach to existing work_log_current via bounded privileged read adapter, existing GPT actor and one-active-writer law; two callers ChatGPT and Codex lead are not independent queue actors. Existing dispatch is not assumed to create Codex Cloud sessions. Stage A is PR #1022; offline preflight #1023. This isolated CLI runner does not continue an existing Codex Cloud session; it works only from written checkpoint + fresh main context.

## Remaining gates before live
1. Audit and test the script with offline fixtures, including malformed JSON, unauthorized paid run, active writer, unknown billing, timeout.
2. Verify supported CLI model IDs and exact flags in current CLI; do not rely on placeholder default model.
3. Add trusted coordinator-issued signed job envelope, never caller-controlled self-attested checks.
4. Install new scoped API key server-side into isolated runner using official secret manager. The key previously posted in chat is compromised, do not reuse.
5. Set actual enforceable provider spending limit or strong bounded request gateway; if unavailable, paid unattended runs stay disabled.
6. Implement secured status/receipts and safe sandbox lifetime/cost accounting; ensure read-only live DB access before claiming coordination.
7. User approves a single priced trial separately. Do not merge or deploy automatically.

Preserve Claude and Gemini and all existing AI routing. G4 continues in Codex Cloud until the user authorizes handoff.

## 2026-10-10 hard-stop safety update
Live mode is now **unconditionally blocked** with `PAID_TRANSPORT_NOT_DEPLOYED`, including if a caller forges user approval, budget verification, runner gateway flags and environment variables. The original CLI spawn sketch has been removed. No runner can start with this branch until a separately audited authenticated gateway replaces the hard-stop. Use `scripts/codex-auto-wake-contract.mjs` + `scripts/test-codex-auto-wake-contract.mjs` for signed, OFFLINE-only acceptance and `docs/codex-auto-wake-acceptance-stage-c.md` for verified scope/remaining dependencies. A successful local gate is NOT provider cost enforcement, real Codex auto-wake or a spent API test.
