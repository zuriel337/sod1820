# `.github/workflows/live-contracts-2029.yml` — every hunk of PR #1321 and its destination

PR #1321 (`4a406fed2`) added 90 lines to this one file; main also changed it after the base `aa0f6bc82` (three test paths in the release job). The four extraction branches apply their hunks **on top of main's current file** at **different anchors**, so that they merge in any order (the trial integration merged P1, P2, P3 and P4 without a textual conflict; see the README).

| # | Hunk of #1321 (job → step) | Destination | Where it sits on the extraction branch |
|---|---|---|---|
| 1 | `live-contracts-2029` → "G1 base commit (the PR base, or main on a manual dispatch)" | **P2** (mandatory with the smoke change: without it the smoke fails in CI) | between "G1 captured main commit" and "G1 agent-routing smoke" |
| 2 | `live-contracts-2029` → "G1 enforcement scenarios" (51) | **P2** (now 53 scenarios, runner moved to `docs/reviews/contracts-enforcement-20261113/enforcement-proof/`) | after the smoke step, with the two package pins |
| 3 | `release-contracts-2029` → N14 node tests (`n14-public-number-links`, `raziel-canonical-navigation-actions`, `raziel-wa-navigation-handler`) | **deferred** (N14 / Raziel navigation; decision N14 is ZURIEL's) | not taken |
| 4 | `release-contracts-2029` → `test/public-reading-action-measurement.test.mjs` added to the analytics list | **P4** (+ its three new measurement test files) | end of the "Analytics measurement contracts" list |
| 5 | `release-contracts-2029` → "M0 security contracts": `m0a-db-permissions-contract`, `m0c-gallery-upload-contract` | **P1** | its own step "DB foundations contracts" before "Top bar" |
| 6 | same step: `m0b-caller-limits`, `m0b-paid-ai-handlers`, `m0e-contact-notify` | **deferred** (step 3 / Edge bundles) | not taken |
| 7 | same step: `public-research-candidates-visible-2029` | **P3** | P3's own "Public content contracts" step (after "Navigation symbols") |
| 8 | `release-contracts-2029` → fetch of seven pre-M0 commits + "M0 Edge rollback package, intermediate states, contributor view v2": `m0-edge-rollback-manifest`, `m0-intermediate-states` | **deferred** (Edge bundles); `m0d-contributor-view-v2` → **P3** (with a fetch of the four commits it needs) | P3's fetch step + node step |
| 9 | `release-contracts-2029` → "CL-13 personal memory, Edge half" | **deferred** (CL-13) | not taken |
| 10 | `security-sql-contracts` → "M0-A permissions regression" | **P1** | after the DEF-001/001b/004/005 step (plus a DEF-004 negative-modes step) |
| 11 | `security-sql-contracts` → "M0-B ai_quota_check" | **deferred** (step 3) | not taken |
| 12 | `security-sql-contracts` → "G1 rule guard (CL-16) lifecycle", "case matrix", "successor of a retired rule" | **P2** (+ "CL-16 order evidence", new) | end of the job |
| 13 | `security-sql-contracts` → "M0-D contributor research view" | **P3** | after the "«הגילוי היומי»" intake step |
| 14 | `security-sql-contracts` → CL-13 database proposal, "fetch three commits", CL-13 Edge handlers | **deferred** (CL-13) | not taken |
| 15 | `auth-browser-acceptance-2029` → "Raziel access" browser test | **deferred** (Raziel) | not taken |
| — | new in the extraction (not in #1321) | **P3**: two builds + two real-browser proofs in `auth-browser-acceptance-2029` (after the public-media step) | — |
| — | new in the extraction (not in #1321) | **P4**: rebuild without the test marketing ids + the real-browser measurement proof (about 3 min) as two steps of `marketing-browser-2029` (no new job: a new pull-request job would change the set of checks pinned by P2's required-checks definition) | after "Meta Pixel and AdSense" |

Not changed anywhere: triggers, path filters, `timeout-minutes`, permissions, job names (the required-checks pin of P2 fails when any of them changes).
