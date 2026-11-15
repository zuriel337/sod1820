# Extraction map: PR #1321 (`4a406fed2`) to this branch (base `9be0c29fc`)

Method: files that main did not change since #1321's base (`aa0f6bc82`) were taken with `git checkout 4a406fed2 -- <path>` (the result is #1321's diff exactly); the two shared contributor files that main did change were taken with `git apply --3way` of #1321's diff of that file on top of main's current file (it applied cleanly, main's lines kept). All commits named are #1321 commits.

Legend for the decision column: **taken** = same content as #1321 · **taken on main** = #1321's hunks applied on main's current file · **taken + adjusted** = taken, then changed by this extraction (reason given) · **added** = not in #1321 · **not taken** · **deferred**.

## A. Files of the topic

| File | #1321 commits | Decision / destination (same path unless noted) |
|---|---|---|
| `supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql` | `b068468e5`, `6e1068b23`, `d3b266d6d` | taken (sha256 unchanged `24251111…bfce`) |
| `supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql` | `b068468e5`, `6e1068b23` | taken (sha256 unchanged `77ccd15c…100f`) |
| `tests/sql/m0d_world_contributor_research_candidates_v1.sql` | `b068468e5`, `6e1068b23`, `d3b266d6d` | taken + adjusted: re-run step asserts "same object, definition, options, privileges, rows"; rollback step also checks `v1` privileges and untouched rows (no assertion removed) |
| `scripts/run-m0d-contributor-view-sql-test.sh` | `b068468e5` | taken + adjusted: `G1_PG_BIN` override and version print (so it runs on PostgreSQL 16 and 17) |
| `src/lib/research/contributorResearchView.js` | `6e1068b23` | taken (new file) |
| `src/lib/research/contributorFindingsProjection.js` | `6e1068b23` | taken |
| `src/lib/research/contributorFindingsProjection.test.js` | `6e1068b23` | taken |
| `src/lib/research/worldAllResearchProjection.js` | `b83e890d3` | taken |
| `src/lib/research/worldDiscoveryStream.js` | `b83e890d3` | taken + adjusted: the candidate read moved into `readUnverifiedPublicResearch()` and passes `admitPublicCandidateRows()` (commit `57874ce6c`, README 6.1) |
| `src/lib/research/worldFindingShare.js` | `b83e890d3` | taken |
| `src/lib/research/worldPublicFindingReader.js` | `b83e890d3`, `6e1068b23` | taken + adjusted: new `admitPublicCandidateRows()`; a candidate opened by id must pass `publicResearchPresentationEligible` (commit `57874ce6c`) |
| `src/lib/research/worldZviApprovedFindings2029.js` | `b83e890d3` | taken |
| `src/lib/research/researchObjectPresentation.js` | `b83e890d3` | taken |
| `src/lib/research/numberSourceCards.js` | `b83e890d3` | taken |
| `src/components/research/ContributorFindingsLens.jsx` | `5ded5b7e1` | taken |
| `src/components/research/FindingSurface.jsx` | `5ded5b7e1` | taken |
| `src/components/research/WorldPublicUpdates2029.jsx` | `b83e890d3`, `1ebee2627` (+ merge `2a9753287`, no extra change) | taken |
| `src/components/research/ZviFindingCards2029.jsx` | `b83e890d3` | taken (fixes the card that labelled every non-canonical row «מאושר») |
| `src/components/number2029/NumberZviPublicResearch2029.jsx` | `b83e890d3`, `1ebee2627` | taken (status admission; findings open by themselves when the section is read) |
| `src/components/experience2029/CanonicalMediaImage2029.jsx` | `1ebee2627` | taken (a failed image is removed instead of a broken square) |
| `src/components/experience2029/sod2029.css` | `b83e890d3` | taken (4 lines: `.sod29-research-status`) |
| `src/pages/World2029Page.jsx` | `b83e890d3` | taken |
| `src/pages/worldComposition2029.css` | `1ebee2627` | taken (2 lines: fixed 16:9 thumbnail box) |
| `api/og.js` | `b83e890d3` | taken + adjusted (CR-X2): the share card uses the shared display policy and, for a candidate, the admission of the finding pages; `src/lib/research/worldZviApprovedFindings2029.js` and `worldPublicFindingReader.js` carry the same policy |
| `api/og.js` (original line) | `b83e890d3` | taken (candidate accepted by the query and the status check; label; `noindex, nofollow`) |
| `src/components/contributor2029/publicContributor2029Model.js` | `5ded5b7e1` | **taken on main** (see B) |
| `src/pages/PublicContributor2029Page.jsx` | `5ded5b7e1` | **taken on main** (see B) |
| `src/components/contributor2029/publicContributor2029.test.js` | `6e1068b23` | taken (mock answers the table `v2`) |
| `src/components/contributor2029/publicSourceCatalog2029.test.js` | `6e1068b23` | taken (mock answers the table `v2`) |
| `SOD1820_DESIGN_CONTRACT_V2.md` | `813998b5b` | taken (4 hunks, see B); contract change, README section 9 |
| `scripts/test-content-visible-before-entry-e2e.mjs` | `225b96e68` | taken (reads the live backend; not run) |
| `test/m0d-contributor-view-v2.test.mjs` | `b068468e5`, `6e1068b23`, `d3b266d6d`, `5ded5b7e1` (via `e110ba6a5`, `304a70ffd`) | taken + adjusted: the pre-change client commit `9be0c29fc` joins the list of commits that must read `v1` only |
| `test/m0d-contributor-stale-client.browser.mjs` | `5ded5b7e1`, `d3b266d6d` | taken (unchanged; needs `OLD_DIST` and `NEW_DIST`) |
| `test/public-research-candidates-visible-2029.test.mjs` | `b83e890d3` | taken |
| `test/world-all-source-findings-2029.test.mjs` | `b83e890d3` | taken. **Changed expectation (owner's rule of 12.11.2026, explained, not weakened):** with a faulty upstream the page returns the verified row **and** the public candidate after it (`publicationState` "candidate", label «טרם אומת»); before, only the verified row |
| `test/world-finding-share-og-2029.test.mjs` | `b83e890d3` | taken. **Changed expectation:** the exact query is `status=in.(approved,canonical,candidate)`; the mock table is `topic_cards_public` (the dead-link fix reads the published Topic view) |
| `test/world-public-finding-reader-2029.test.mjs` | `b83e890d3` | taken. **Changed expectation:** the status filter includes `candidate`; the mock table is `topic_cards_public` |
| `test/world-public-reader-contract-2029.test.mjs` | `b83e890d3` | taken. **Changed expectation:** a public candidate is now in the DTO after the verified rows (status `candidate`, label «טרם אومت», not verified, no `terms` leaked) and opens as an exact finding; the old assertion that it was `null` is replaced; `duplicateProjection` counts follow (raw research rows 2 to 3, clustered 1 to 2); `topic_cards_public` mock table |
| `test/public-content-privacy-2029.test.mjs` | none | **added**: one test per privacy claim (status kept, private / person_only / dossier hidden, contact details, owner mention, excluded material, non-live source, no contributor id, share card) |
| `test/public-content-display-policy-20261113.test.mjs` | none | **added** (CR-X2): the real share handler, the real exact reader and the list admission on the same synthetic rows: contact details and owner mentions in the statement and in the stored Hebrew presentation, for a candidate and an approved row; the allowed cases |
| `test/m0d-world-candidate-visible.browser.mjs` | none | **added**: new site vs pre-change site on the exact finding, in Chromium |
| `test/topic-public-findings-via-number-2029.browser.test.mjs` | none (existing file of main) | **added edit**: manual path runs without `IntersectionObserver`; new test for the automatic path |
| `test/public-content-package-scope-20261113.test.mjs` | none | **added**: pins this file list, the SQL bytes, the `v2` readers and contract section 8.3 |

## B. Hunks of shared files

| File | Hunk of #1321 | Decision |
|---|---|---|
| `SOD1820_DESIGN_CONTRACT_V2.md` | Human Gate header entry (12.11.2026) | taken |
| | section 8.1: "Superseded in part 12.11.2026 by section 8.3" on the sentence about candidate research | taken |
| | new section 8.3 «תוכן גלוי לפני כניסה» | taken |
| | section 12 acceptance item 10 | taken |
| `src/components/contributor2029/publicContributor2029Model.js` | import of `orderResearchByPublicStatusTier`, `researchPublicStatusPresentation` | taken on main |
| | `publicStatus` on each finding item (stored status only) | taken on main |
| | verified tier first in `selectContributorItems` | taken on main |
| | (main's own change since `aa0f6bc82`: commit `67342160f`, "Link reviewed public passages to contributor profiles", 15 lines) | kept, untouched |
| `src/pages/PublicContributor2029Page.jsx` | import of `researchPublicStatusPresentation` | taken on main |
| | the «טרם אומת» label in the finding metrics | taken on main |
| | (main's own change: same commit `67342160f`) | kept, untouched |
| `src/pages/Post2029Page.jsx` | `logView("post", post.slug, post.id)` (third argument) | **not taken**: measurement (M0-F), another package. Main's file is unchanged by this branch. |
| `test/helpers/authBrowserFixture.mjs` | optional `supabase` answers hook in `startFixture` | **not taken**: used only by `test/raziel-access-2029.browser.mjs` (Raziel). Nothing in this package uses it (the stale-client test serves the builds itself). |
| `src/components/experience2029/SystemFrame2029.jsx`, `src/lib/research/numberPageAddress.js` | `numberPageRouteHref` / public number address | **not taken**: N14, another package |
| `.github/workflows/live-contracts-2029.yml` | M0 contracts step, `m0d-contributor-view-v2` step, `run-m0d-contributor-view-sql-test.sh` step | **not edited**; written in `ci-wiring.md` (the workflow also changed on main since #1321's base) |
| `tests/live/m0_post_apply_verification.sql` | the three D rows | **deferred** to the M0 integration; reproduced as `post-apply-checks.sql` and run on a throwaway database |
| `test/m0-intermediate-states.test.mjs` | the D rows ("any order of SQL and site") | **deferred** (reads the M0 apply plan, which is not in this package); this package's equivalents are `m0d-contributor-view-v2` and the browser tests |
| `docs/reviews/m0-security-stabilization-20261112/cluster-D-visible-content.md`, `round4-review-package.md` (section 3), `release-request.md`, `intermediate-states.md` | the M0-D prose | **replaced** by this README (M0 folder is frozen; not copied) |
| `scripts/m0-public-readonly-smoke.mjs` | "public research CANDIDATES readable by anon" check | **deferred** (M0-E file). It is the live check of the RLS precondition in README section 7. |

## C. Files of #1321 that are NOT this topic (listed for completeness)

Edge functions and their rollback sources, CL-13, Raziel tests and fixtures, N14 (`test/n14-public-number-links.test.mjs`, `numberPageAddress.js`, `SystemFrame2029.jsx`), measurement (`src/lib/events.js`, `tracking.js`, `visits.js`, `supabase.js`, `publicReadingTelemetry2029.js`, `public-reading-deploy/transport.js`, `test/public-reading-action-measurement.test.mjs`), M0-A / M0-B / M0-C / M0-E SQL, tests and runners, G1 enforcement (`scripts/lib/g1LawsSnapshotRules.mjs`, `audits/g1-agent-entry/*`, `tests/sql/g1_*`), and the M0 / CL-13 documents: none of them is in this branch.
