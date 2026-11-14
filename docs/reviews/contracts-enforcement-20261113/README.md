# Contracts and enforcement: G1, dated records, scenarios, CL-16, required checks

**Status: BRANCH-ONLY, extraction package (package 2).** Nothing here is merged, deployed or applied; Production is unchanged. No SQL was run
against any live database, no workflow was edited, the repository ruleset was not read or changed. Everything in the database half is a
**proposal** that needs ZURIEL's explicit approval of the exact file (CLAUDE.md 0.4).

| | |
|---|---|
| Source | PR #1321 frozen at [`4a406fed2`](https://github.com/zuriel337/sod1820/commit/4a406fed273b9b381577c5b2a03d91c58de46451) (merge base `aa0f6bc82`) |
| Preserved extensions | [`514fc58d9`](https://github.com/zuriel337/sod1820/commit/514fc58d947cda8f23c65ddd5f0e3a6b3b14f572) (G1 B5), [`b93a2968e`](https://github.com/zuriel337/sod1820/commit/b93a2968e5e4b692e7a8ebb1dcf042f085f8b203) (restriction sources), [`58a90eedf`](https://github.com/zuriel337/sod1820/commit/58a90eedfe372100983b60cdad5a9e2d69ed80a5) (CL-07), all reviewed (extraction-map.md section B) |
| Requirements | the contract handoff `origin/claude/laws-alignment-20261112` @ `53bb72e134` (docs only, read; not copied) |
| Base | `origin/main` [`9be0c29fc`](https://github.com/zuriel337/sod1820/commit/9be0c29fc52337069192b057ef1a9882c7026009) |
| Branch / HEAD | `claude/extract-contracts-enforcement-20261113`; the code commit on which the recorded results were produced is named in `enforcement-proof/results-*/`; the commit after it only adds those results and the "Tests run" section below |

## 1. What is in the package

1. **The unified G1 (code half, CI only).** `scripts/lib/g1LawsSnapshotRules.mjs` (pure rules), the extended smoke
   `scripts/test-g1-agent-routing-smoke.mjs` (18 -> 51 tests), and the dated records under `audits/g1-agent-entry/`. It refuses: an owner that
   retired or does not exist (law, codex slug, unregistered document, chains of any depth, cycles), a registered contract changed without a new
   dated record, an unrouted or self-routed contract file, a new law / family / table without an approval or `-- OWNER-CHECK:`, a dated record
   edited in place, a new runtime reference to a retired law, a new master-type `project_codex` slug (B5), and compares the head with the **real
   PR base** (`G1_BASE_SHA`).
2. **The proof.** `enforcement-proof/` (moved out of the frozen M0 directory): `run-ci-scenarios.sh` (53 scenarios, each the real smoke on a
   real base and head with an expected outcome; a refusal must be for its reason), `run-db-scenarios.sh` + `db-gate-test.sql` (72 cases x 2
   variants, live guard vs applied), the results recorded in #1321 (`results-pr1321-83005653/`, labelled) and the new ones of this branch.
3. **CL-16 as a separate database step** (proposal, rollback, 25-case lifecycle test, byte-exact fixture of the live guard, its own apply plan):
   `cl16-database-step.md`. Independent of M0 (evidence there), never bundled with the code half.
4. **The snapshot reader** (`scripts/sql/g1_laws_snapshot.sql`, one read-only SELECT) with its 18-check end-to-end test, and the read-only
   rule-reader conformance query `tests/live/g1_rule_reader_conformance.sql` (run by hand against the live project, never by CI).
5. **Preserved extensions:** B5 (a new master-type codex item is refused), CL-07 (the graph capability names `reality_graph_law`, not a retired
   law), `restriction-sources.md` (a dated audit snapshot).
6. **Order evidence for CL-16** (`cl16-order-evidence/`, 4 cases): the guard against the already prepared law v7 supersession and its rollback.
7. **Required checks (B6) as a definition for approval:** `required-checks.md`, `required-checks.json`, `scripts/derive-pr-check-names.mjs`,
   and a pin test. **The ruleset is not changed.**
8. **Documents:** `extraction-map.md`, `ci-wiring.md`, `gaps.md`, this file; pins `test/contracts-enforcement-package-2029.test.mjs` and
   `test/required-checks-definition-2029.test.mjs`. The full file list with kind and source: `package-files.json`.

<!-- counts:start -->
ci_scenarios=53
lifecycle_cases=25
db_cases=72
order_cases=4
required_now=9
reader_checks=18
g1_smoke_tests=51
<!-- counts:end -->

## 2. Not included, and why

* **Workflow edits** (hard rule): `ci-wiring.md` gives the exact steps for the integrator. **The smoke fails in CI without the "G1 base commit"
  step**, so the wiring and the code must land in the same pull request.
* **Any application of SQL** (CL-16 is a proposal), **the ruleset change**, **required checks being set**.
* **B13 and B14** (wiring tests for the duplicate gematria engine; trackers and sitemap without a single owner): not implemented anywhere,
  not in #1321 and not on the preserve branch (`gaps.md` GAP-01, GAP-02). No new rule system was built to close gaps.
* **The M0 package, the CL-13 package, measurement, public content** (other packages). `SOD1820_DESIGN_CONTRACT_V2.md` is not edited here.
* **`foundation-closure-list.md` and the contract handoff's 1273-line README:** sources only.
* **Edge functions `wa-raziel` v22 and `ai-analyze` v92**, CL-13 database proposal: out of scope and untouched.

## 3. Dependencies on other packages (exact)

| Package | Dependency | Detail |
|---|---|---|
| CI wiring (integrator) | **required** | step "G1 base commit" before the smoke; without it the smoke test "REAL base vs head" fails in CI |
| M0 / database foundations | none for code or tests | CL-16 does not depend on any M0 step and no M0 step depends on it (evidence: `cl16-database-step.md`). When the M0 apply plan lands, the smoke scans its 23 SQL files for tables without `-- OWNER-CHECK:` and the CL-16 runner scans them for the rule tree; both passed with the real M0 and CL-13 files placed on this branch for one run |
| Public content | interaction, not a dependency | see section 7 |
| CL-13 database/Edge packages | none | their SQL does not touch the rule tree (checked) |

## 4. Merge and apply order

1. Merge the code half **together with** the workflow wiring (`ci-wiring.md` steps 1-3), which makes `live-contracts-2029` run it. CL-07 and B5 come with it.
2. The four database-half CI steps (security-sql-contracts) can be merged at the same time or separately; they test the proposal only.
3. **Applying CL-16 to the live database is a separate step** (own approval, own plan): any time relative to M0; but see `cl16-database-step.md` section 3: law v7's rollback no longer runs afterwards.
4. Required checks (ruleset) after the code is merged and has run green on a few pull requests; step 1 needs no workflow change.

## 5. Rollback

* Code half: revert the commits (nothing is applied anywhere). The workflow steps are removed with them.
* CL-16: `ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` (exact restore of the live 12.11.2026 guard; stamps and successor records written meanwhile stay).
* Required checks: remove the `required_status_checks` rule or `PUT` the saved ruleset JSON.

## 6. What changes for people (plain language)

* The site, its content and its behaviour do not change. The only runtime-visible change is an internal label (`reality_graph_law`) that a
  research capability returns instead of the name of a retired law.
* Pull requests that change contracts, laws, owners or database structure without the required note or approval are stopped by CI, with a
  message that names the reason and the successor to use. Pull requests that do not touch these things see nothing new.
* Until required checks are set in the repository, a red check still does not block a merge (see `required-checks.md`).

## 7. Interaction with the public-content package, and any later change of a registered contract

`SOD1820_DESIGN_CONTRACT_V2.md` is a **registered contract** (named in the Owner Index). Once this package is in `main`, G1 compares every pull
request with its base: a change to a registered contract must **add a new line** that contains `Human Gate` or `CHANGE-RECORD:` **and a date**
(`dd.mm.yyyy` or `yyyy-mm-dd`), or must also touch the contract's Owner Index row. Editing an existing record line, or a date next to an ordinary
word, does not count. Checked with the real library: the V2 change of #1321 (section 8.3, "Human Gate ZURIEL . 12.11.2026") satisfies the rule;
a V2 change without such a line is refused ("registered contract changed without a dated Human Gate / CHANGE-RECORD line or an Owner Index update").
A **new** contract-like file (name with `CONTRACT`, `_LAW`, `MASTER`, `REGISTRY` or `FINAL`, outside `docs/reviews`, `audits` and the other exempt
folders) must be routed in the Owner Index **before** the change, or carry an `OWNER-ROUTING:` header; a row added in the same change that routes
it is self-routing and is refused. The frozen baseline (`G1_CONTRACT_FILES_BASELINE_20261112.txt`) may only shrink. The public-content package
therefore has to carry its V2 record line in the same hunk it re-applies on main (main has not changed V2 since `aa0f6bc82`, so the hunk applies as is).

## 8. Requirements of the contract handoff (`laws-alignment-20261112` README)

Section numbers refer to that README. `CI` = this package's code half (dated records on repository content); `DB` = the CL-16 proposal (not applied);
case ids are the ones of the scenarios (`S`/`R` = `run-ci-scenarios.sh`, `D` = `db-gate-test.sql`).

| Requirement (section 13.1 row) | Implemented here | Gap |
|---|---|---|
| A1 owner = law (retired, missing, empty) | CI (S3, S4, S4b, R1); DB (D05, D13) | DB not applied |
| A2 owner = codex slug | CI via the dated slug record (R2, R3, R3b, R3c); DB (D13b, D13c) | none in CI; DB not applied |
| A3 owner = registered document | CI (R10, R10b, R10c, R14, R14b); DB (D13d-D13h) | DB not applied |
| A4 ownership chain | CI (R11, R11b, R11c); DB (D26-D26i): any depth, cycles, 16 links | owner retired with live children: GAP-06 |
| A5 Owner Index rows | CI (S4, S4b, S5, R6, R6b) | none |
| B1, B2, B4 text and owner within a version | CI (S13, S14); DB (D11, D12, D12b) | DB not applied |
| B3 version bump without text change | CI (`compareLawsSnapshots`) | not checked in the database (stated in the matrix) |
| B5 owner in a new version | DB (D06, D07, D07b, D07c) | DB not applied |
| B6, B7 metadata allowed; dated records | CI (S6-S10); DB (D08) | none |
| C1-C3 create / activate / revive a law | CI (S11, S12, S12b, `G1_LAW_APPROVALS.txt`); DB (D03, D09a/b, D10, D10b) | authenticity of the approval is a human gate (GAP-12) |
| C4 version integrity | live guard today (D01) | none |
| D1 table in a migration or apply package | CI (S2, S15, R7, R8, R8b, R12, R12b, R12c) | covers 41 of 305 live tables (GAP-04, GAP-07) |
| D2 table created directly in the database | **not built** | GAP-04 |
| E1-E3 DELETE, TRUNCATE, retirement | DB (D14, D15, D16) | DB not applied |
| E4 bypass (`DISABLE TRIGGER`, `CREATE OR REPLACE`) | stated; nothing blocks `postgres` | GAP-05 (permissions query) |
| E5 `project_codex` writes | CI only: B5 (R3d, R3e, smoke test B5) | database gate and body gate: GAP-03 |
| 13.2 proof: a refusing and an allowing fixture per rule; runners exit 1 on any unexpected result | yes: every runner pins its case count and fails on a mismatch; self-checks exist (`G1_RG_FLIP`, `G1_READER_FLIP`, the count pins) | none |
| 13.2 DB cases on isolated PostgreSQL with the exact function and rollback | yes (16.15 and 17.12 here; 18.6 in #1321's CI) | not run live |
| 13.2 live application only after A2 (the M0 SQL) and a DDL approval | the approval is required; "after A2" is **not a technical dependency** (`cl16-database-step.md` section 4) | open decision O-1 |
| 15 item 9: successor routing (`retired_routing_v1`): add to a retired row allowed; change `canonical_owner` of a retired row refused; the key needs an existing approval; G1 accepts both successor sources | DB (D25-D25n, D22b/c); CI (R13, R13b); reader test (18 checks) | DB not applied |
| 15 item 2 "section 0 items 6-7" (guard gaps) | D12, D12b, D14, D15 in the proposal | DB not applied |
| 6 E1-E5 proposals and 13.3 (BEFORE DELETE does not stop TRUNCATE; adding `description` to the column list is not enough) | both corrected in CL-16: a statement-level TRUNCATE trigger, and a body comparison in the function | DB not applied |
| 11 ledger / repoint verdicts (CL-07) | CL-07 reader repointed in code; the other readers are recorded in `G1_RETIRED_LAW_REFERENCES_20261112.txt` (may only shrink) | CL-06, CL-11, CL-12: GAP-09, GAP-10 |
| 13.1 header: CI is advisory until required checks (B6) | definition and pin | not set: GAP-13 |

## 9. Open decisions (one line each, for ZURIEL)

* **O-1.** Keep "apply CL-16 after M0" as a scheduling policy, or release it (no technical reason either way).
* **O-2.** After CL-16 is applied the documented rollback of the law v7 supersession no longer runs (revival rule): accept, or run that rollback first, or approve a revival then.
* **O-3.** Approve the ruleset change: the nine names of `required-checks.md` section 2 (no workflow change).
* **O-4.** Admin bypass of the ruleset: keep, or remove with a written emergency procedure.
* **O-5.** `Production Canary Gate` as a required check: never by default (it reads live state).
* **O-6.** Rename the two jobs called `gate` (and promote the Observability/SEO one to required), and later the aggregator for the four path-filtered gates.
* **O-7.** Restriction sources: which of the rows marked NO VERIFIED SOURCE / CONTRADICTED become decisions (the document's own section 3).
* **O-8.** Whether an approval is required for every new store under an existing owner (the implementation requires it; the contracts text does not say so).

## 10. Tests run (on the code commit `5c906d42c9d295136fb9a29f3e337d14b9835709`; the commit after it adds only the result files and this section)

Local, offline. Node v22.23.4 (CI uses `.nvmrc` 24.21.0; a second run used Node 24.22.1). PostgreSQL 16.15 and 17.12 (local binaries, throwaway data
directory, unix socket; the CI runner used 18.6 at #1321 `0e928e34b`, not available here). Recorded outputs: `enforcement-proof/results-5c906d42c9d2/`.
The PR #1321 results (51 scenarios, produced on commit `83005653617e`) stay in `enforcement-proof/results-pr1321-83005653/`.

| Command | Result |
|---|---|
| `node --test scripts/test-g1-agent-routing-smoke.mjs` | 51 pass / 0 fail (Node 22 and Node 24.22.1) |
| `GITHUB_ACTIONS=true G1_BASE_SHA=<origin/main> node --test scripts/test-g1-agent-routing-smoke.mjs` | 51 pass / 0 fail (Node 22 and 24.22.1) |
| `bash docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh` | **53 scenarios, all as expected**, exit 0 (about 55 s). It creates and removes one temporary detached worktree, as designed |
| `G1_PG_BIN=<16 and 17> bash .../enforcement-proof/run-db-scenarios.sh` | 72 cases x 2 variants (live / applied) as expected on both; outputs identical apart from the version line |
| `G1_PG_BIN=<16 and 17> bash scripts/run-g1-rule-guard-sql-test.sh` | 25 lifecycle cases as expected on both; sha256 of the plan match; rule-tree scan: 36 SQL files, 4 reviewed hits. Self-check `G1_RG_FLIP=G3-apply-exact-live-state`: exit 1 |
| `G1_PG_BIN=<16 and 17> bash scripts/run-g1-laws-snapshot-reader-test.sh` | 18 checks as expected on both. Self-check `G1_READER_FLIP=G-S1`: exit 1 |
| `G1_PG_BIN=<16 and 17> bash .../cl16-order-evidence/run.sh` | 4 cases as expected on both |
| `node --test test/contracts-enforcement-package-2029.test.mjs test/required-checks-definition-2029.test.mjs` | 13 pass / 0 fail (Node 22 and 24.22.1) |
| `node scripts/test-legacy-retired.mjs` | PASS |
| CL-07: `node --test src/lib/research/researchW2FoundationHardening.test.js` | 40 pass / 0 fail (39 before); the 10 test files that import the W2 executors: 130 pass / 0 fail; `node scripts/test-research-run-contract.mjs` PASS |
| Cross-package check: the 28 files of the M0 and CL-13 apply plans from `4a406fed2` placed on this branch for one run (then removed) | smoke 51/51; CL-16 runner scan: 56 SQL files, only the 4 reviewed ones mention the rule tree |
| Mutation checks | B5 branch disabled: exactly the B5 test fails; DB case count 71 instead of 72: runner exits 1; renamed job / added paths filter / changed timeout in temporary copies of the workflows: the required-checks pin fails |

**Not run, and why:** the wired CI steps themselves (workflows are not edited here); PostgreSQL 18; anything against the live database or the
repository ruleset (no live access). **Failures and findings of this work:** the end-to-end scenario R3e exposed a defect in the preserved B5
test (it compared the newest codex record); fixed in its own commit (extraction-map.md section B). No test failed on plain main for a reason
unrelated to this topic.

## 11. Known gaps

`gaps.md` (17 rows: B13, B14, B5 database side, direct table creation, who can bypass, owner retirement with live children, SQL detection
limits, retired families the snapshot does not know, the database and Edge readers of retired laws, live-writer check after apply, approval
truth, required checks, never run live, scenario coupling, two named inconsistencies of the contracts session, PostgreSQL 18 locally).
