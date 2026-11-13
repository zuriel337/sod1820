# Extraction map: contracts and enforcement

Source of the work: PR #1321 frozen at `4a406fed273b9b381577c5b2a03d91c58de46451`
([commit](https://github.com/zuriel337/sod1820/commit/4a406fed273b9b381577c5b2a03d91c58de46451)), merge base `aa0f6bc82`; preserved
extensions on `origin/claude/preserve-contracts-enforcement-20261113` (head `58a90eedf`); requirements from the contract handoff
`origin/claude/laws-alignment-20261112` (`53bb72e134`). New base: `origin/main` `9be0c29fc52337069192b057ef1a9882c7026009`.

Files that #1321 changed **and** main changed since `aa0f6bc82`: `.github/workflows/live-contracts-2029.yml` (hunks below),
`src/components/contributor2029/publicContributor2029Model.js`, `src/pages/Post2029Page.jsx`, `src/pages/PublicContributor2029Page.jsx` (none of these
three belongs to this topic; not touched). Main did **not** change any file of this package since `aa0f6bc82`: of the 25 files main changed (`git diff --name-only aa0f6bc82 origin/main`), none is a file of this package (the only one that is also a file of #1321 and also of this topic is the workflow, which is not edited here), so no file of main is overwritten.

## A. Every file of the package, with its source and decision

| File (destination) | Source | Decision |
|---|---|---|
| `scripts/lib/g1LawsSnapshotRules.mjs` | scripts/lib/g1LawsSnapshotRules.mjs | taken (not in main before). B5 hunk (codexAdditionViolations, CODEX_MASTER_CATEGORIES) taken from 514fc58d9. |
| `scripts/test-g1-agent-routing-smoke.mjs` | same path in #1321 `4a406fed2` | replaced the 298-line file of main (18 tests) by the 851-line file (51 tests). Main had not changed this file since #1321 base `aa0f6bc82`, so nothing of main is overwritten. One comment path edited; B5 test taken from 514fc58d9. |
| `audits/g1-agent-entry/G1_CONTRACT_FILES_BASELINE_20261112.txt` | same path in #1321 `4a406fed2` | taken unchanged (dated record: never edited in place afterwards). |
| `audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt` | same path in #1321 `4a406fed2` | taken unchanged. |
| `audits/g1-agent-entry/G1_LAW_APPROVALS.txt` | same path in #1321 `4a406fed2` | taken unchanged (no approval pending). |
| `audits/g1-agent-entry/G1_MIGRATION_TABLES_BASELINE_20261112.txt` | same path in #1321 `4a406fed2` | taken unchanged (41 tables created by supabase/migrations). |
| `audits/g1-agent-entry/G1_PROJECT_CODEX_SLUGS_20261112.txt` | same path in #1321 `4a406fed2` | taken unchanged (35 codex items). |
| `audits/g1-agent-entry/G1_RETIRED_LAW_REFERENCES_20261112.txt` | same path in #1321 `4a406fed2` | taken unchanged; re-checked against main: every recorded reference still exists and no new unrecorded one (smoke test "real tree - readers"). |
| `scripts/sql/g1_laws_snapshot.sql` | same path in #1321 `4a406fed2` | taken unchanged. |
| `scripts/check-g1-laws-snapshot-reader.mjs` | same path in #1321 `4a406fed2` | taken unchanged. |
| `scripts/run-g1-laws-snapshot-reader-test.sh` | same path in #1321 `4a406fed2` | taken unchanged. |
| `tests/sql/g1_laws_snapshot_reader_v1.sql` | same path in #1321 `4a406fed2` | taken unchanged. |
| `tests/live/g1_rule_reader_conformance.sql` | same path in #1321 `4a406fed2` | taken unchanged (read-only catalogue query; run by hand against the live project, never by CI). |
| `supabase/proposed/20261112200000_g1_rule_guard_cl16.sql` | same path in #1321 `4a406fed2` | taken; header comment only (sequencing), function body unchanged (md5 90b5917b...). |
| `supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` | same path in #1321 `4a406fed2` | taken unchanged. |
| `tests/sql/g1_rule_guard_cl16_v1.sql` | same path in #1321 `4a406fed2` | taken; header comment only. |
| `tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql` | same path in #1321 `4a406fed2` | taken unchanged (byte-exact live function and trigger, md5 56b90b0a...). |
| `scripts/run-g1-rule-guard-sql-test.sh` | same path in #1321 `4a406fed2` | taken; the static scan of the M0 apply plan replaced by a scan of every SQL file that can reach the live database against cl16-rule-tree-writers.json. |
| `docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json` | same path in #1321 `4a406fed2` | taken; depends_on emptied, sequencing section added, test field updated, sha256 recomputed. |
| `docs/reviews/contracts-enforcement-20261113/enforcement-proof/README.md` | docs/reviews/m0-security-stabilization-20261112/enforcement-proof/README.md | moved; status banner added; the text is the Hebrew README of #1321 and describes #1321. |
| `docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh` | docs/reviews/m0-security-stabilization-20261112/enforcement-proof/run-ci-scenarios.sh | moved; usage line and scenario S15 path fixed; two scenarios added for B5 (R3d, R3e); EXPECTED_SCENARIOS 51 -> 53. |
| `docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-db-scenarios.sh` | docs/reviews/m0-security-stabilization-20261112/enforcement-proof/run-db-scenarios.sh | moved; EXPECTED_DB_CASES=72 pinned (it was not pinned before). |
| `docs/reviews/contracts-enforcement-20261113/enforcement-proof/db-gate-test.sql` | docs/reviews/m0-security-stabilization-20261112/enforcement-proof/db-gate-test.sql | moved unchanged. |
| `docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-pr1321-83005653/ci-scenario-results.txt` | docs/reviews/m0-security-stabilization-20261112/enforcement-proof/ci-scenario-results.txt | moved unchanged; evidence of #1321 commit 83005653617e (51 scenarios). |
| `docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-pr1321-83005653/db-scenario-results.txt` | docs/reviews/m0-security-stabilization-20261112/enforcement-proof/db-scenario-results.txt | moved unchanged; evidence of 83005653617e. |
| `docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-pr1321-83005653/lifecycle-results.txt` | docs/reviews/m0-security-stabilization-20261112/enforcement-proof/lifecycle-results.txt | moved unchanged; evidence of 83005653617e (its first lines mention the M0 apply plan scan that no longer exists). |
| `docs/reviews/contracts-enforcement-20261113/enforcement-proof/results-pr1321-83005653/reader-results.txt` | docs/reviews/m0-security-stabilization-20261112/enforcement-proof/reader-results.txt | moved unchanged; evidence of 83005653617e. |
| `docs/reviews/contracts-enforcement-20261113/restriction-sources.md` | docs/reviews/m0-security-stabilization-20261112/restriction-sources.md (preserve branch) | b93a2968e reviewed; taken with a status note (see section B). |
| `src/lib/research/researchW2ExecutorsBase.js` | same path in #1321 `4a406fed2` | 58a90eedf reviewed; taken (see section B). |
| `src/lib/research/researchW2FoundationHardening.test.js` | same path in #1321 `4a406fed2` | 58a90eedf reviewed; taken (see section B). |
| `docs/reviews/contracts-enforcement-20261113/README.md` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/extraction-map.md` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/ci-wiring.md` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/cl16-database-step.md` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/cl16-rule-tree-writers.json` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/law-v7-supersession.sql` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/law-v7-rollback.sql` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/run.sh` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/required-checks.md` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/required-checks.json` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/gaps.md` | written for this extraction (no #1321 counterpart) | new. |
| `docs/reviews/contracts-enforcement-20261113/package-files.json` | written for this extraction (no #1321 counterpart) | new. |
| `scripts/derive-pr-check-names.mjs` | written for this extraction (no #1321 counterpart) | new. |
| `test/required-checks-definition-2029.test.mjs` | written for this extraction (no #1321 counterpart) | new. |
| `test/contracts-enforcement-package-2029.test.mjs` | written for this extraction (no #1321 counterpart) | new. |

Kinds and sources of every file are also in `package-files.json` (pinned by `test/contracts-enforcement-package-2029.test.mjs`).

## B. The three preserved commits: reviewed one by one

They sit on `origin/claude/preserve-contracts-enforcement-20261113` on top of #1321 head `abb2f3907` (an ancestor of `4a406fed2`), were never reviewed
and had never been run by anyone but their author. Each was read as a diff, applied to current main, tested, and mutation-checked where it adds a rule.

| Preserved commit | What it is | What was done | Verdict |
|---|---|---|---|
| `514fc58d9` G1 row B5 | `scripts/lib/g1LawsSnapshotRules.mjs` (+28/-4) and the smoke (+35): a new `project_codex` slug whose name is a summary category (master, registry, final, system_map, owner_map; whole words) is refused; an ordinary `C|` approval does not admit it; the way in is its own `CM|<slug>|work_log:<uuid>|date` line. | Both files are byte-identical in `4a406fed2`, so it applies as is. Diff read. Smoke on main + commit: 50 -> 51 pass. Mutation (the master branch disabled) makes exactly the B5 test fail. The test pins the three master-type items that already exist in the 12.11 codex record (never re-judged). Matches CLAUDE.md section 15 (no new MASTER / FINAL / system map / owner map). | **Taken, with one fix.** Added on top: two end-to-end scenarios in the runner (R3d refuse with a `C` line, R3e allow with a `CM` line; 51 -> 53). **Defect found by R3e and fixed:** the preserved B5 test compared `currentCodex` (the NEWEST dated codex record) with the three known master-type items, so the first dated record that adds a master-type item *with its `CM` line* (the allowed way in) made the smoke fail on its own B5 test; it now compares the 12.11 record (`codexSlugs`), like the other assertions of that test. Limit: CI-only; see GAP-03. |
| `b93a2968e` restriction sources | `restriction-sources.md` (163 lines, Hebrew): for each restriction on measurement, public access and memory, where it is implemented and which decision or contract it rests on, or `NO VERIFIED SOURCE` / `CONTRADICTED`. | Read. 25 file paths named in it: 21 exist in this tree; the 4 missing ones belong to the rows marked BRANCH-ONLY (CL-13 and M0-F files that exist only in #1321). Eight line references to unchanged files spot-checked on main: all match. The database statements (flags, laws, journal, cron, grants, read on 13.11) cannot be re-read here. | **Taken** as a dated read-only snapshot, with a status note on top. It describes Production `aa0f6bc82` and #1321, not main `9be0c29fc`. |
| `58a90eedf` CL-07 | `researchW2ExecutorsBase.js` emitted `owner: 'unified_graph_law'` (a retired law) in four graph outcomes; now one constant `GRAPH_CAPABILITY_OWNER = 'reality_graph_law'` (the recorded successor). One test case added. | Applies to main without conflict (main did not touch the files). No reader branches on the label (grep over `src`, `api`, `supabase/functions`, `test`); other tests already use `reality_graph_law` as the graph owner. `researchW2FoundationHardening` 39 -> 40 pass; the ten test files that import the W2 executors: 130/130; `scripts/test-research-run-contract.mjs` passes; G1 smoke 51/51 (the recorded reference to this file stays true through the history comment). `supabase/functions/research-run` imports this module, so the Edge function carries the new label only at its next deployment (harmless: the label is free text). The ledger (row 61 of the retired-reference ledger) says the label is stored in result records: records already written keep the old label. | **Taken.** Its test is already wired (job `gate` of `observability-seo-gate.yml`, step "W2 Research contract tests"); no wiring needed. |

## C. Hunks of shared files

| Shared file | Hunk of #1321 | Decision |
|---|---|---|
| `.github/workflows/live-contracts-2029.yml` | job `live-contracts-2029`: step "G1 base commit" (`PR_BASE_SHA`, `G1_BASE_SHA`) | **deferred to `ci-wiring.md`** (workflows are not edited in this package); re-based on main, unchanged |
| same | job `live-contracts-2029`: step "G1 enforcement scenarios" | **deferred to `ci-wiring.md`**, with the new runner path and 53 scenarios |
| same | job `security-sql-contracts`: "G1 rule guard (CL-16) proposal lifecycle", "... case matrix", "G1 successor ... end to end" | **deferred to `ci-wiring.md`**; one step added (order evidence) |
| same | job `live-contracts-2029` / release job: M0 contract tests, N14 navigation tests, pre-M0 commit fetches, CL-13 tests | **not this topic** (M0, measurement, CL-13 packages) |
| same | job `security-sql-contracts`: M0-A, M0-B, M0-D, CL-13 SQL runners | **not this topic** |
| same | main's own change since `aa0f6bc82`: three test paths added to the release job | already in main; untouched |
| `SOD1820_DESIGN_CONTRACT_V2.md` | 20 added lines (section 8.3 and one edited record line) | **not this package** (public-content package). Interaction documented in README section "Interaction with the public-content package" |
| `scripts/test-g3-d2-public-material-path.mjs` | M0-B expectation change | not this topic |

## D. Related #1321 files that were not taken

| File | Why not |
|---|---|
| `docs/reviews/m0-security-stabilization-20261112/foundation-closure-list.md` | planning document of the frozen PR (it also carries M0, CL-13, measurement and SEO plans). Used as a source for `gaps.md` and for the CL-16 history; not copied. |
| `docs/reviews/m0-security-stabilization-20261112/apply-plan.json` and the 23 M0 SQL files | the M0 package. This package only needs to know that none of them touches the rule tree (checked, see `cl16-database-step.md`). |
| `supabase/proposed/20261112230000_cl13_personal_memory_pause*.sql`, `tests/sql/cl13_*` | CL-13 database step (another package); checked: does not touch the rule tree. |
| `tests/live/m0_post_apply_verification.sql`, `scripts/run-m0*-sql-test.sh` | M0 package |
| `docs/reviews/m0-security-stabilization-20261112/owner-questionnaire.md` | M0 package |
| the contract handoff `origin/claude/laws-alignment-20261112` (README 1273 lines, HANDOFF, ledger) | source of requirements only; not copied |

## E. What changed in meaning against #1321

1. CL-16 is documented and wired as a **separate database step with no dependency on M0** (it said "after M0 SQL steps 1-10"). Evidence in `cl16-database-step.md`.
2. The lifecycle runner no longer reads the M0 apply plan; it scans all SQL that can reach the live database against a reviewed list.
3. Scenario S15 extends the CL-16 apply plan instead of the M0 plan.
4. Two scenarios (51 -> 53) and a pinned database case count (72) were added; nothing was weakened or removed.
5. The recorded results of #1321 are kept verbatim and labelled; new results of this branch are recorded separately (README).
