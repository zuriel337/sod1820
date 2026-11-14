# Extraction of PR #1321 onto current main — integrator overview (13.11.2026)

PR #1321 (frozen at [`4a406fed2`](https://github.com/zuriel337/sod1820/commit/4a406fed273b9b381577c5b2a03d91c58de46451), merge base `aa0f6bc82`) mixed 209 files of several topics. Its work was extracted, without merging it wholesale, onto current `origin/main` [`9be0c29fc`](https://github.com/zuriel337/sod1820/commit/9be0c29fc52337069192b057ef1a9882c7026009) in four packages. **Everything below is draft: nothing was applied to a database, merged or deployed, the repository ruleset was not changed.**

| Package | Pull request (draft) | Branch | What it carries | Database step |
|---|---|---|---|---|
| P1 DB foundations | [#1334](https://github.com/zuriel337/sod1820/pull/1334) | `claude/extract-db-foundations-20261113` | M0 steps 1, 2 (DEF-005 by exact signature), 4–10 | yes — nine separate approvals |
| P2 contracts and enforcement | [#1336](https://github.com/zuriel337/sod1820/pull/1336) | `claude/extract-contracts-enforcement-20261113` | unified G1, dated records, scenarios, CL-16 as a separate DB step, required-checks definition | CL-16 (independent) |
| P3 public content | [#1335](https://github.com/zuriel337/sod1820/pull/1335) | `claude/extract-public-content-20261113` | M0-D view v2, «טרם אומת» readers, Design Contract V2 §8.3 | step 11 (independent) |
| P4 measurement | [#1337](https://github.com/zuriel337/sod1820/pull/1337) | `claude/extract-measurement-20261113` | bounded action family, one visit per real page view, in-app navigation counted | none |

Each package has its own README (source, base, scope, dependencies, tests, user impact, apply order, rollback, decisions, gaps) and `extraction-map.md`:
`docs/reviews/db-foundations-extraction-20261113/`, `docs/reviews/contracts-enforcement-20261113/`, `docs/reviews/public-content-20261113/`, `docs/reviews/measurement-20261113/`.

This directory holds what belongs to no single package:

* [`extraction-table.md`](extraction-table.md) — every one of the 209 files and its destination (package / deferred / replaced / needs decision), 0 unassigned.
* [`workflow-hunks.md`](workflow-hunks.md) — every hunk of the shared workflow file.
* [`release-request-1336-contracts-enforcement.md`](release-request-1336-contracts-enforcement.md) and [`release-request-1337-measurement.md`](release-request-1337-measurement.md) — exact, separate release requests for #1336 (A: merge of the code, B: the CL-16 database step, each its own approval) plus [`release-request-1336-required-checks.md`](release-request-1336-required-checks.md) (the ruleset / required checks, a third and separate action) and #1337 (step 1: merge, step 2: deployment of the public site, the commit of which does not exist yet). Requests only; nothing approved. #1334 and #1335 get theirs after the Codex corrections CR-X1 and CR-X2.
* [`decisions.md`](decisions.md) — section 0: decisions already approved by ZURIEL and **pending implementation** (visitor identification: browser id for guests, account id for signed-in members, administrator detail); then the questions that are still open, in one place.

## Update 14.11.2026 — the foundation package (read this first)

State: #1333 and #1335 (community, public content) and #1336 and #1337 (contracts, measurement) are **merged**; DEF-001b (steps 1 and 9 of #1334) is **applied live** (Codex packet, PR #1339). What is left is one package, prepared for one review:

* [`foundation-package-20261114.md`](foundation-package-20261114.md) — the integrated handoff: final heads, test results, findings, the **ordered execution list with stamps (SHA-256, live preconditions), verification and rollback for every action**, and the single table of product decisions.
* [`contracts-enforcement-state-20261114.md`](contracts-enforcement-state-20261114.md) — G1, CL-16, required checks and the contracts-session handoff, item by item (read-only live checks of 14.11).
* [`release-request-1333-1335-site-deployment-and-db-step.md`](release-request-1333-1335-site-deployment-and-db-step.md) — the Production deployment and the view `world_contributor_research_v2` of the merged code (A and B), updated.
* The pull requests: #1341 (CI fix), #1340 (`contribution_links`), #1334 (remaining DB foundations, steps 2, 4, 5, 6, 7, 8, 10), #1339 (Codex's record), and **#1342, the integrated tree** (draft; proves that they work together on current `main`). The older release requests below (#1336, #1337) describe merges that already happened; their database and ruleset parts are lines D10 and K1 of the new list.

## Update 13.11.2026 (after the Codex review of the five pull requests)

* **CR-X1 (#1334)** fixed at head `e88afdb2e6cd38546eb5acf0f3697377c4d4721e`: the DEF-005 rollback refuses a state the apply did not record (owner, security mode, definition, a function dropped and re-created, a mixed state) before it changes any privilege; the apply records the definition md5 and the original comment and states what it cannot check (a body replaced before the apply).
* **CR-X2 (#1335)** fixed at head `36a411b05e1030b8c57ae403da6bd0c7ee01ddb5`: one display policy for the list, the exact finding and the share card, over the fields that are shown.
* **#1333** (not part of the four packages; another writer's branch, head `2eb012e2586091eb0ca250409362ffa06741884c`): description updated to its full scope; integration with #1335 checked (no conflict in the two shared files; Esther26 and the reviewed account link intact; ZURIEL confirmed in the database that the account of `REVIEWED_ESTHER_LINK` is `eftgem` and that the writer is linked to it). Open for its writer: the test mock in `writerCommunityReuse.test.js` lacks `.is()` (3/3 on `main`, 2/3 on the PR) — update the mock, assert the two filters `deleted_at` and `thread_hidden_at`, and run the test in the existing CI step; the filters must not be removed to pass it.
* **Release requests** updated for the ruleset facts Codex read (no required checks, `required_linear_history`, admin bypass): squash merge instead of a merge commit, tree-equality verification, and a required-checks verification on a non-bypass identity.

## Not extracted (deferred by instruction)

Raziel development and N14 links, the CL-13 database proposal, the Edge bundles (the live `wa-raziel` v22 and `ai-analyze` v92 are not to be replaced), M0-B AI quotas (step 3), DEF-005b (step 12), subscriptions, research expansions, new performance work. The speed tools stay as working material.

## Trial integration (all four branches merged in a throwaway worktree on `9be0c29fc`)

* Merge order P1, P2, P3, P4: **no textual conflict**, including `.github/workflows/live-contracts-2029.yml`, to which all four add steps at different anchors (see `workflow-hunks.md`).
* On the merged tree: `scripts/test-g1-agent-routing-smoke.mjs` 51/51 in CI mode; 121 tests of the package contracts and pins (G1 package pin, required-checks pin, workflow-references, P1/P3/P4 scope pins, DEF-005/M0-A/M0-C contracts, measurement and public-content suites) all pass; the 53 G1 enforcement scenarios behave as recorded; `vite build` (2029 target), the public-reading build and the first-load graph guard pass.
* One finding of the trial, fixed in P1: its scope pin required the step-11 files to be absent; with P3 merged they are legitimately present.
* The browser proofs (P3: two builds, P4: four profiles) run in CI on each pull request; they were not run together on the merged tree.

## Findings of the extraction worth knowing

1. The CI runner exposed that the new DEF-005 baseline check needs the throwaway cluster's superuser to be named `postgres` (as on Supabase); fixed in the P1 runners and re-verified as a non-root user.
2. P2: the smoke fails in CI without the new "G1 base commit" step — the step is in P2, mandatory with its code.
3. P3: #1321 let a candidate with a phone number or e-mail appear in the World feed and by id; fixed with the finding pages' admission (it can only show fewer rows).
4. P3's agent ran the end-to-end script once without `BASE_URL` (about 20 s): anonymous read GETs may have reached the live Supabase; non-GET and write RPCs are blocked by the script; nothing could be written.
5. P4: page engagement had no per-window budget; added (240 per 10 minutes). The account id for signed-in users is not implemented anywhere and cannot be sent safely from the browser — listed, not built.
