# Measurement package: extraction map

Sources: PR #1321 frozen at `4a406fed273b9b381577c5b2a03d91c58de46451` (merge base `aa0f6bc82`), and the preserved commit `139f16214d5ab3da3da903af02cc45e5d023e04b` (branch `claude/preserve-measurement-visit-once-20261113`, one commit on top of `abb2f3907`, an ancestor of `4a406fed2`).
Base of this branch: `origin/main` `9be0c29fc`. Commits of this branch: **C1** `ff87b461e` (the #1321 family), **C2** `697a31050` (the preserved commit), **C3** `df3b97ce9` (engagement budget and tests), **C4** `2f54add5c` documentation and the scope pin (the commit that adds this directory), **C5** a test-only fix to `test/measurement-visit-once-2029.browser.mjs` (the second tab stays open until its visit is written), **C6** the test results recorded in the README.

How "byte-identical" was checked: `git diff <source> <destination>` is empty for the file at the source commit named in the row.
For every file below, `origin/main` is unchanged since the common base `aa0f6bc82` (`git diff aa0f6bc82 9be0c29fc -- <file>` is empty), except `src/pages/Post2029Page.jsx`, which main changed and which therefore received only the one #1321 hunk.

## 1. Files that belong to the topic

| File | In #1321 (`4a406fed2`) | In `139f16214` | Destination here | Decision |
|---|---|---|---|---|
| `src/lib/publicReadingTelemetry2029.js` | +59 (`readingActionSpec`, `readingActionProps`, `readingActionBody`) | same as #1321 | C1 | taken, byte-identical to `4a406fed2` |
| `src/lib/events.js` | +36 -1 (`emitPublicReadingAction`, `emitPublicArrivalOnce`) | same | C1 | taken, byte-identical |
| `src/lib/tracking.js` | +10 -3 (`trackPublicReading`, share and join in the public build) | same | C1 | taken, byte-identical |
| `src/lib/visits.js` | +3 -1 (arrival once per session) | same | C1 | taken, byte-identical |
| `src/lib/supabase.js` | +9 -1, the `logView` hunk only (public numeric item id → `content/view`) | same | C1 | taken, byte-identical. (The file is large and shared; the #1321 diff of this file is this one hunk.) |
| `src/pages/Post2029Page.jsx` | +1 -1: `logView("post", post.slug, post.id)` | same | C1 | **hunk re-applied on top of the current main file** (main changed the file since `aa0f6bc82`; the line was identical, so the edit is the same single line). Not an overwrite. |
| `public-reading-deploy/transport.js` | +18 -2 (action admission, 60 per window) | +30 -17 on `abb2f3907` (window admission, budgets for visits and actions; engagement admitted for a window, without a budget) | C1 = `4a406fed2` version, C2 = `139f16214` version, C3 = + engagement budget (6 lines) | taken in three steps so each is reviewable; **C3 is the only change in meaning relative to #1321 and the preserved commit** (see README) |
| `src/App2029.jsx` | not changed by #1321 | +19 -5 (`RouteEffects2029` beside `ResearchProvider`, settle delay, measured-entry record) | C2 | taken, byte-identical to `139f16214` |
| `test/public-reading-action-measurement.test.mjs` | new, 124 lines, 6 tests | +15 -3 (admits a window opened on another route) | C1, then C2 | taken, byte-identical to `139f16214` |
| `test/public-reading-analytics-worker.test.mjs` | not changed | +30 -5 | C2 | taken, byte-identical. Changed expectations, with the reason: "refuses a mismatched window" became "accepts a window opened on another route" (that is the fault fixed); a window of another origin and a non-window client are still refused |
| `test/public-reading-observability.test.mjs` | not changed | +10 -4 | C2 | taken, byte-identical. Changed expectation: the route-effects proof runs the 150 ms settle timer by hand |
| `test/measurement-visit-once-2029.browser.mjs` | not in #1321 | new, 85 lines | C2, extended in C3, fixed in C5 | taken; **extended** in C3 with steps 7-13 (steps 1-6 and their assertions unchanged); C5 only keeps the step-12 tab open longer |
| `test/helpers/authBrowserFixture.mjs` | +5 -1 (the optional `supabase` answer hook) | not changed | C2 | taken, byte-identical to `4a406fed2`; the hook is what lets the browser test count what reaches the Supabase origin. The same hunk is needed by the contributor browser test of the M0-D package, so the bytes are identical there. |
| `test/measurement-transport-hardening-2029.test.mjs` | – | – | C3 | **new** in this package (11 tests) |
| `test/measurement-page-view-once-2029.test.mjs` | – | – | C3 | **new** in this package (8 tests) |
| `test/measurement-package-scope-20261113.test.mjs` | – | – | C4 | **new**: the pin (documented scope and budgets equal the code) |
| `docs/reviews/measurement-20261113/*` | – | – | C4 | new: README, this map, `ci-wiring.md`, `readers-and-comparability.md`, `identity-gap.md`, `transport-review.md` |

## 2. Hunks of shared files, one by one

| Shared file in #1321 | Hunk | Decision |
|---|---|---|
| `.github/workflows/live-contracts-2029.yml` | adds `test/public-reading-action-measurement.test.mjs` to the "Analytics measurement contracts" step | **not edited** (rule 3); written down in `ci-wiring.md`, together with the three new tests and the browser job. The other hunks of that workflow (G1 base commit, N14 tests, M0 contracts, rollback package, CL-13) belong to other topics and are not taken. |
| `src/pages/Post2029Page.jsx` | `logView("post", post.slug, post.id)` | taken, re-applied on current main (above) |
| `src/components/contributor2029/publicContributor2029Model.js`, `src/pages/PublicContributor2029Page.jsx` | other topics | not touched |

## 3. Evidence and background of #1321 that is not copied

| Item (in #1321 at `4a406fed2`) | Decision |
|---|---|
| `docs/reviews/m0-security-stabilization-20261112/cluster-F-measurement.md` | not copied; it is part of the M0 documentation set and describes the action family as of #1321 (its "code on a branch only" is true until this package is merged). Read at the commit link in the README. |
| `…/measurement-audit/README.md` (the capture of 12.11.2026: findings M1-M11, P1-P4, the 51.8% double rows) | not copied; referenced. Findings **M8** (double `track_visit`, no `track_visit` on in-app navigation to another family) and **P4** (anonymous events) are the ones this package answers. |
| `…/measurement-audit/capture-measurement.mjs`, `capture-measurement-production.mjs` | not copied: the first downloads Google and Meta scripts by GET, the second reads the live site; neither is a test and neither belongs in a package that makes no live call. They remain in #1321. |
| `…/measurement-audit/results-*.json`, `production-read-only-rpcs.json` | not copied (large result files); stay in #1321. |
| `…/gsc-identity-crossref.md`, `…/foundation-closure-list.md` | read for context (C3, C7, X1-X3, the GSC family table); not copied. |
| GA4, Meta Pixel, CAPI, AdSense findings M1-M7, M9-M11, P1-P3 | **out of scope** (GA4/Meta/advertising changes are excluded); not touched. |

## 4. Not in this package, by design

`wa-raziel` v22 and `ai-analyze` v92 (already deployed), CL-13, M0 steps 3 and 12, the M0 Edge bundles, Raziel development, N14, content packages, subscriptions, performance work. No database file, no Edge function, no workflow, no `package.json` change.
