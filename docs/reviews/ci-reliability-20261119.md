# Release handoff and ELS CI reliability — 19 November 2026

Actor: GPT (Codex). Recipient: ZURIEL. Task: `ci_reliability_20261119`.
Base: `d550d0fc3ad85265b140435df35d215ceeebc80e`. Branch: `gpt/ci-reliability-20261119`.
Scope: tests, their local prerequisites and GitHub Actions. Product source, production data, baselines and release approvals are unchanged.

## Decisions confirmed by ZURIEL in this session

- Claude finishes release package #1428; Codex manages subsequent packages.
- A new cipher defaults to a publication request: visible immediately in the personal research dossier, admitted to the site library after approval. The user can select private. An update of an owned private record stays private.
- These are different publication surfaces: a member's `pending/private/self_published=true` row is already publicly readable through the dossier policy. `pending` alone does not mean confidential. Existing RPC and RLS definitions were inspected read-only; no database change is needed for the confirmed behavior.

## Reproduced test debt

The initial run of 78 non-browser `test/els-*.test.mjs` files on the base produced **516 tests: 504 passed, 7 failed, 5 skipped**. The six failing files also failed identically against #1428 head `48492fe23b854c32220eabbb907663ee7b93d31f` (35 tests, 28 passed, 7 failed).

The outgoing session's exact 542-test command was unavailable, so these results do not identify its exact set of twelve failures.

| Test file | Obsolete expectation corrected |
| --- | --- |
| els-2029-research-bar | Discovery return was absent from the initial-seed guard |
| els-dock-opens-panel-in-view | Scrolling the wrapper instead of the requested inspector |
| els-explicit-lexicon | Launch handler did not admit the explicit resume branch |
| els-fullscreen-matrix | A retired separate research window instead of the shared discovery inspector |
| els-home-card-2029 | Home order from 8 November instead of the confirmed 17 November composition |
| els-saved-cipher-owner-actions | Private default and exact JSX without the workspace-mode prop (two failures) |

The repaired short contracts run in `live-contracts-2029` on every PR, so changes to Home, the saved library or transport outside the ELS path filter cannot leave them stale. Mounted tests exercise publication/private choice, private updates, copying, guests and blocked submissions. The five skipped tests ran successfully against throwaway local PostgreSQL, including private-save RLS and durable-job concurrency; no remote database is accepted by these fixtures. The two older SQL tests now accept `ELS_TEST_PG_BIN`, as the durable fixtures already accept `ELS_DURABLE_TEST_PG_BIN`. `psql` must be available on PATH.

## CI changes and evidence

- Nineteen additional PR workflows cancel a superseded run for the same workflow and PR. Push and manual runs have unique run IDs; media processing, backup and production canary cancellation policies are unchanged.
- ELS uses npm's download cache and a Chromium cache keyed to Ubuntu 24.04, architecture and the unchanged Playwright 1.64.1 pin. System dependency installation remains in place, including on cache hits. This does not promise to eliminate slow apt mirrors.
- The unchanged native browser file has 88 scenarios. Node's file sharding alone would leave that file serial. A parsed registration inventory now assigns its exact test names to three separate runners (30/29/29), using Node's native name filtering. Each runner also executes one of the three existing companion browser files.
- The required `els-core-compatibility` check retains its name and succeeds only if SQL/contracts, all three browser jobs and coverage reconciliation succeed. Reports must match the native source hash, contain every assigned passing test exactly once, and contain no missing, skipped, failed or duplicate coverage. Unknown dynamic/focused/aliased registrations fail closed for review. Negative tests cover the reconciliation failures.
- Original workflow path triggers and all original test files remain covered. New helper, test, lockfile and save-panel paths were added. PostgreSQL no longer precedes browser work on the critical path.
- Latest green #1428 run [44585502766](https://github.com/zuriel337/sod1820/actions/runs/44585502766): the same 88 scenario durations sum to 732.2 seconds. Applying this partition to those measured durations gives 258.5 / 205.3 / 268.4 seconds of native test work per runner. These are estimates from an existing run, excluding companion tests, queueing and setup. End-to-end improvement must be measured in this PR's CI.

## Validation and handoff

- Focused repaired and mounted tests: 39/39, no skips.
- Isolated PostgreSQL acceptance: 25/25, no skips (PostgreSQL 16.16, Node 24.21.0).
- Sharding coverage and adversarial tests: 3/3.
- All 26 workflow files parse; actionlint 1.7.7 and `git diff --check` pass.
- `npm run build` passes, including the shell budget. Product dependencies and lockfile unchanged.
- Full local non-browser acceptance: 531/531, no skips (79 files, including the previously skipped SQL subtests).
- Local native browser acceptance: 88/88 across three shards; exact coverage reconciliation passed, no skips. All three local runners share one machine, so their timing is not a GitHub speed benchmark.
- Exact-head PR CI is tracked in the delivery report/PR. Do not infer CI success while that run is pending.

Status: branch-only, no merge or deployment. #1428 remains Claude's active release. The read-only coordination connector cannot write the passive work log; this document and the user conversation are the actual handoff, not a claimed ledger update. Merge and deployment each require ZURIEL's approval of the exact action and revision under `CLAUDE.md` §0.4.
