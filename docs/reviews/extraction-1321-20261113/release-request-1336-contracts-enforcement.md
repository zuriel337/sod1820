# Release request · #1336 — contracts and enforcement (13.11.2026)

> **This is a request, not an approval.** Nothing in it is applied, merged or deployed. Each of the two requests below (A: merge of the code; B: the CL-16 database step) needs ZURIEL's explicit approval for the exact commit and, for B, the exact file hashes (CLAUDE.md rule 7 and 0.4). **They are independent**: A does not need B, B does not need A, and an approval of one is not an approval of the other. **The ruleset (required checks) is a third, separate approval and is not requested here.** Not read by this request: the Codex addendum on the journal record (the journal could not be reached when this was written); the request is built from the pull request and its documents and must be reconciled with that addendum.

| | |
|---|---|
| Pull request | [#1336](https://github.com/zuriel337/sod1820/pull/1336) (draft) |
| Branch / exact head | `claude/extract-contracts-enforcement-20261113` · [`7d85bf70f190919ed5588033bfea56e4a982981f`](https://github.com/zuriel337/sod1820/commit/7d85bf70f190919ed5588033bfea56e4a982981f) |
| Base | `origin/main` [`9be0c29fc52337069192b057ef1a9882c7026009`](https://github.com/zuriel337/sod1820/commit/9be0c29fc52337069192b057ef1a9882c7026009) (read again 13.11, unchanged) |
| Source | PR #1321 frozen at [`4a406fed2`](https://github.com/zuriel337/sod1820/commit/4a406fed273b9b381577c5b2a03d91c58de46451) plus the preserved work (B5, restriction sources, CL-07), all reviewed — see `docs/reviews/contracts-enforcement-20261113/extraction-map.md` |
| Size | 52 files, +6204 / −6 (list in the appendix) |
| Gates on this head | 12/12 pull-request checks success (live-contracts-2029 with the G1 base-commit step, the 53 enforcement scenarios and the package pins; security-sql-contracts with the four CL-16 steps; the rest unchanged) |

## A. Merge of the code half (no database, no site, no Edge)

**Request:** merge #1336 at head `7d85bf70f190919ed5588033bfea56e4a982981f` into `main` (a merge commit, like the other merges of this repository).

**What changes after the merge**
* The G1 agent-routing smoke grows from 18 to 51 tests and compares the pull request with its real base (dated records, contract changes, laws snapshots). `live-contracts-2029` gains: the "G1 base commit" step (mandatory with the smoke: without it the smoke fails in CI — reproduced), the 53 enforcement scenarios (run only when the enforcement code changes) and two package pins.
* `security-sql-contracts` gains four steps that test the CL-16 **proposal** on a throwaway database (they apply nothing live).
* Repository documents only otherwise: the dated G1 records under `audits/g1-agent-entry/`, the package documents, the required-checks **definition** (`required-checks.md/json`), the gaps register, the CL-16 proposal and rollback files under `supabase/proposed/` (proposals do not run).
* **Effect on later pull requests (user-visible to the team, not to visitors):** a change to a registered contract (for example `SOD1820_DESIGN_CONTRACT_V2.md`), to the Owner Index or to a rule owner must carry a dated line containing `Human Gate` or `CHANGE-RECORD:`; a new `project_codex` master-type item is refused (B5); a new contract-like `.md` outside the exempt directories must be routed first. #1335 (public content) already carries such a line for contract §8.3.
* **One shipped source file changes (CL-07):** `src/lib/research/researchW2ExecutorsBase.js` — the owner label that the graph capability puts in every graph outcome changes from the retired `unified_graph_law` to the active `reality_graph_law` (a constant `GRAPH_CAPABILITY_OWNER`; no logic change). It is imported by the research method modules in `src/lib/research/` and by the `research-run` Edge function source. The package review found no consumer that branches on the label. **A merge changes nothing live**: the label reaches visitors only with the next site deployment, and the deployed `research-run` Edge function keeps its old bytes until it is redeployed (no Edge deployment is requested here).
* Production, the database, Edge functions, flags, secrets and the repository ruleset do **not** change by the merge. Required checks stay as they are today (none).

**Conditions to re-check immediately before the merge (the request lapses if one fails)**
1. The head is still `7d85bf70f…` and `origin/main` is still `9be0c29fc…`. If main moved: re-run `node --test scripts/test-g1-agent-routing-smoke.mjs`, the two pins and `docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh` on the updated branch and present the new head.
2. All pull-request checks green on that exact head (the list above).
3. Merge order relative to #1334, #1335 and #1337 is free (trial integration of all four: no conflict; 51 smoke tests, 121 contract tests and 53 scenarios pass on the merged tree).

**Verification after the merge (read-only):** read `origin/main` and confirm the merge commit has the head as its second parent; the push-triggered runs of `legacy-production-lock` and the gates on `main` are green; `node --test scripts/test-g1-agent-routing-smoke.mjs` on main passes. If any fails: stop and report; do not "fix forward" without a new request.

**Rollback:** `git revert -m 1 <merge commit>` through a normal pull request (CI-only, documents and proposals; no runtime, no data, no flag). Nothing outside the repository has to be undone.

**Not covered by A:** any SQL; the ruleset; any deployment (a code merge is not a deployment; the next site deployment will carry the CL-07 label and needs its own approval for its exact commit).

## B. The CL-16 database step (separate approval; proposal only until approved)

**Request:** apply, once, on the canonical project (`linswmnnkjxvweumprav`), exactly this file, and no other:

| File | sha256 |
|---|---|
| `supabase/proposed/20261112200000_g1_rule_guard_cl16.sql` | `0d7725919540cb98ed344f9e9dd9f3d2ba217c4de30d9cf86a702156f66eff63` |
| rollback `supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` | `60aa076c22461b80c97f8d91ff28f9e8a2b5c98268ff8d6a0a6e8b8c1611a2c5` |

(The apply plan with the same values: `docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json`; the runner checks that these hashes are the files.)

**What it does:** extends the same live function `public.fn_rule_compaction_integrity_guard_v1()` and the same trigger on `public.nodes`, and adds one `BEFORE TRUNCATE` trigger. For rule rows only: rule identity immutable; body/owner immutable within a version; revival of a retired family needs a verdict and an approval reference; DELETE/TRUNCATE refused; the owner chain must end at a valid root; a document owner must be registered or authorized; the successor of a retired rule is recorded in `metadata.retired_routing_v1` only; a rule row without `rule_id` cannot be created or be active. Rows that are not rules are not blocked. No grant, policy, table or other function changes.

**Dependencies (exact):** none on M0 or on any other package (all 23 M0 SQL files were read: none touches `nodes`, `work_log`, `project_codex`, the guard or its triggers); none in the code half (A may land before, after or without B). The "after M0" instruction of the earlier plan is a scheduling preference, not a dependency (decision O-1, not blocking). One real order constraint against already-prepared files, with evidence in `docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/`:
* `supabase/proposed/20261111120100_system_suggestions_law_v7_decision_record_only.sql` must come **before** CL-16 (already applied live: v7 is active in the 12.11 snapshot).
* `supabase/proposed/ROLLBACK_20261111120100_system_suggestions_law_v7.sql` (reactivates v6) is **refused after CL-16** as a revival — decision O-2 (accept / run it first / approve a revival then).

**Preconditions (read live immediately before the apply; the file also checks them itself and stops before any change on any other state, including a missing or disabled trigger):**
1. `md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure))` = `56b90b0ae0f9c5915b730314d13ca7a0` (value read on 12.11.2026; **not re-read for this request**).
2. The old trigger text on `public.nodes` and no `*_truncate` trigger.
3. Owner, privileges, `search_path`, volatility of the function as recorded in the file header.
4. No other writer is mid-change on the rule tree (journal scan for an active writer on the Owner Index / rules scope).

**Locks and timing:** `lock_timeout 5s`, `statement_timeout 30s`; `CREATE OR REPLACE TRIGGER` takes a brief SHARE ROW EXCLUSIVE lock on `public.nodes`; readers are not blocked.

**Post-apply verification (read-only):** function md5 = `90b5917b1412be02f66d1f805241018c` (identical on throwaway PostgreSQL 16.15 and 17.12; the live server is 17.6 and was not run — the file stops on its own postcondition and changes nothing if the live printout differs); both triggers present and enabled; the read-only laws snapshot (`scripts/sql/g1_laws_snapshot.sql`) returns the same set of active rules as before the apply; the nine live functions that write `public.nodes` (named in `docs/reviews/contracts-enforcement-20261113/cl16-database-step.md` §3, closure-list item R-9) are **not** run by the apply and were not exercised against the new guard — exercise one write of each class through its normal path after the apply, or state which were not exercised.

**Risk stated:** the guard is not SECURITY DEFINER; it runs as the writing role, which needs SELECT on `public.work_log` and `public.project_codex` — a writer without it is refused (fail-closed). The role grants are not changed.

**Rollback:** run `ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` (restores the 12.11.2026 function body and trigger exactly and drops the TRUNCATE trigger; it stops before any change on any other state). **Not undone by the rollback:** `metadata.rule_guard` stamps and `metadata.retired_routing_v1` records written while the extension was applied (audit metadata; the live guard ignores both).

**Not enforced by this step (stated):** retiring an owner that active rules still route to; that the referenced `work_log` row really is ZURIEL's approval (human gate); anything done by a role that can disable triggers or write with `session_replication_role = replica`.

## C. Not requested here: the ruleset (required checks)

The exact definition is in `docs/reviews/contracts-enforcement-20261113/required-checks.md` and `required-checks.json` (derived from the workflows and pinned by a test). It names nine checks that are triggered on every pull request and have unique names: `live-contracts-2029`, `perf-contracts-2029`, `release-contracts-2029`, `security-sql-contracts`, `marketing-browser-2029`, `auth-browser-acceptance-2029`, `route-seo-decision-2029`, `legacy-production-lock`, `Mobile + Accessibility Acceptance`. Decisions O-3..O-6 (names, admin bypass, `Production Canary Gate`, renaming the two `gate` jobs and the aggregator for the path-filtered gates) come first; the change itself is a security-settings change and gets its own request.

## Known gaps (not hidden)
* The wired CI steps were run by CI on this head, not on Node 24 locally; PostgreSQL 18 was not run by this package (the #1321 CI ran 18.6 at its own checkpoint).
* `gaps.md` lists 17 rows, including B13/B14 (the planned `test/wiring-*.test.mjs`, not implemented anywhere), the database side of B5, direct table creation, who can bypass.
* Open decisions O-1..O-8 are in the pull request description and `docs/reviews/extraction-1321-20261113/decisions.md`.

## Appendix — files of #1336 at `7d85bf70f…` (52)
* `M` .github/workflows/live-contracts-2029.yml
* `A` audits/g1-agent-entry/G1_CONTRACT_FILES_BASELINE_20261112.txt
* `A` audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt
* `A` audits/g1-agent-entry/G1_LAW_APPROVALS.txt
* `A` audits/g1-agent-entry/G1_MIGRATION_TABLES_BASELINE_20261112.txt
* `A` audits/g1-agent-entry/G1_PROJECT_CODEX_SLUGS_20261112.txt
* `A` audits/g1-agent-entry/G1_RETIRED_LAW_REFERENCES_20261112.txt
* `A` docs/reviews/contracts-enforcement-20261113/README.md
* `A` docs/reviews/contracts-enforcement-20261113/ci-wiring.md
* `A` docs/reviews/contracts-enforcement-20261113/cl16-database-step.md
* `A` docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/law-v7-rollback.sql
* `A` docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/law-v7-supersession.sql
* `A` docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/run.sh
* `A` docs/reviews/contracts-enforcement-20261113/cl16-rule-tree-writers.json
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/README.md
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/db-gate-test.sql
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-5c906d42c9d2/ci-scenario-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-5c906d42c9d2/db-scenario-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-5c906d42c9d2/lifecycle-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-5c906d42c9d2/order-evidence-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-5c906d42c9d2/reader-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-5c906d42c9d2/unit-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-pr1321-83005653/ci-scenario-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-pr1321-83005653/db-scenario-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-pr1321-83005653/lifecycle-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-pr1321-83005653/reader-results.txt
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh
* `A` docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-db-scenarios.sh
* `A` docs/reviews/contracts-enforcement-20261113/extraction-map.md
* `A` docs/reviews/contracts-enforcement-20261113/gaps.md
* `A` docs/reviews/contracts-enforcement-20261113/package-files.json
* `A` docs/reviews/contracts-enforcement-20261113/required-checks.json
* `A` docs/reviews/contracts-enforcement-20261113/required-checks.md
* `A` docs/reviews/contracts-enforcement-20261113/restriction-sources.md
* `A` docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json
* `A` scripts/check-g1-laws-snapshot-reader.mjs
* `A` scripts/derive-pr-check-names.mjs
* `A` scripts/lib/g1LawsSnapshotRules.mjs
* `A` scripts/run-g1-laws-snapshot-reader-test.sh
* `A` scripts/run-g1-rule-guard-sql-test.sh
* `A` scripts/sql/g1_laws_snapshot.sql
* `M` scripts/test-g1-agent-routing-smoke.mjs
* `M` src/lib/research/researchW2ExecutorsBase.js
* `M` src/lib/research/researchW2FoundationHardening.test.js
* `A` supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
* `A` supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql
* `A` test/contracts-enforcement-package-2029.test.mjs
* `A` test/required-checks-definition-2029.test.mjs
* `A` tests/live/g1_rule_reader_conformance.sql
* `A` tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql
* `A` tests/sql/g1_laws_snapshot_reader_v1.sql
* `A` tests/sql/g1_rule_guard_cl16_v1.sql
