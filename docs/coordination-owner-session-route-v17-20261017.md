# SOD1820 — existing owner-session routing guard (v17 DRAFT)

**Date:** 2026-10-17. **State:** BRANCH-ONLY / ISOLATED / NOT WIRED / NOT MERGED / NOT DEPLOYED. This is a small candidate against the existing work_log / PR #1098 protocol, NOT a new dispatcher or a new coordination system.

## Exact scope and provenance

- Baseline: PR #1098 head `e07667027d96f68e01e2af88836bbfa674f56fec`.
- Work branch: `gpt/owner-session-route-v17-20261017`. Do not rebase, cherry-pick or apply its draft SQL to Production automatically.
- Files: `scripts/coordination-owned-session-route.mjs` (pure plan, optional caller-supplied executor, receipt correlation), `test/coordination-owned-session-route.test.mjs` (29 synthetic cases), and this documentation.
- Test locally: `node --test test/coordination-owned-session-route.test.mjs` — 29/29 PASS in isolated Node v22.16.0. No network, Supabase, real Claude send, browser or CI is used by this suite.
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
