# SOD1820 — OpenAI API / Codex bridge, stage A
2026-10-10 • BRANCH ONLY • NO PURCHASE • NO KEY CREATED • NO MODEL CALL
## Goal
Probe whether a cheaper OpenAI API route is functional for isolated new tasks, without interrupting ongoing G4 Codex Cloud sessions and without touching Claude or Gemini.
## What is implemented
`scripts/codex-api-budget-probe.mjs` is a **single Responses API call smoke test**, not a full Codex coding agent or remote Cloud session takeover. Default run only outputs a dry-run estimate and no network call:
```sh
node scripts/codex-api-budget-probe.mjs
```
Live is gated behind `--live`, `SOD_API_PROBE_LIVE_APPROVED=YES` and a securely mounted `OPENAI_API_KEY`. All three conditions necessary. No secret is read or printed during dry run. It submits a tiny fixed prompt to `gpt-6.1-sol` with `max_output_tokens: 120`, `store:false`, 30-second timeout; at most one request per invocation. Do not enable without **new explicit user approval for charged API calls**.
```sh
SOD_API_PROBE_LIVE_APPROVED=YES node scripts/codex-api-budget-probe.mjs --live
```
This command is allowed **only** after the user has separately approved that exact live trial and the trusted runner has installed a project-scoped API credential server-side. Never place keys in messages, repository, PR text or unprotected browser state.
## Estimated trial budget
Standard short-context published pricing when written: input $1 / million, output $5 / million for gpt-6.1-sol. Preflight uses 500 assumed input tokens and 120 max generated tokens = $0.0011. This is a **pricing estimate**, NOT a hard dollar cap; invisible overhead, future pricing or API failures can affect actual charges. $0.02 is a conservative per-trial planning allowance. No more than one invocation until measured usage reconciled to platform billing. API project usage and remaining prepaid balance not verified.
## Next stage: actual Codex CLI remote development
Do not claim trial is Codex agent. Only after API smoke test, build an isolated CLI runner on Vercel with an approved credential installation, bounded task scope, one active writer/coordination evidence, explicit max runtime/retries/task intent, safe git branch, no service_role DB tokens, no production DB writes, and no automatic merge/deploy. CLI tokens/tools may exceed planned cost, so require real external budget controls before autonomous work. A killed container is not a retroactive token spend cap.
## Cost separation
User's ChatGPT Pro and Codex Cloud purchased credits are a separate billing pool from OpenAI API prepaid usage. No transfer of prior cloud conversations/credits. Keep all development cost in canonical 2029 cost contract, but do not double count top-up cash and consumption.
## Guardrails
Prior user-approved $50 extra monthly *purchase policy* is not authorization to spend via API; any paid API trial needs separate user confirmation. Preserve Claude, Gemini, original AI routing and active G4. No automatic relaunch or auto-reload. PR draft; no production release.
