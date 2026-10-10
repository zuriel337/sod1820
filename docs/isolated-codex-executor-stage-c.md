# SOD1820 isolated Codex executor: prototype stage C
Date: 2026-10-10. Branch-only, no live execution.

This prototype intentionally does **not** repurpose wa-video-enrich, supabase Vault, or any production service-role credential. It only accepts a task descriptor on standard input and defaults to DRY_RUN. It does not pull live work_log or dispatch automatically; coordination and owner flags must be established by a separately audited backend adapter. Never trust flags supplied by untrusted callers in production.

## Launch contract
Use isolated private checkout with no production credentials, clean GitHub branch and least-privilege repo access. The executor runs a bounded `codex exec` CLI process only with `--live`, explicit per-task approval in process environment and descriptor, verified provider balance, independently verified provider hard limit, authenticated isolated checkout and secure OPENAI_API_KEY. Default is zero model calls. The status NEVER implies a real cost cap: killing a process cannot prevent costs from requests already submitted.

Example offline:
```sh
echo '{"task_key":"SOD1820_README_CHECK","actor":"GPT","scope":"documentation only","prompt":"Read the README and summarize tests","coordination_verified":true,"owner_verified":true,"active_writer_conflict":false,"production_write_requested":false,"risk":"low"}' | node scripts/isolated-codex-executor-prototype.mjs
```

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
