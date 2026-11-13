# Measurement: one visit per real page view, in-app navigation counted, the bounded action family (package 4)

Branch `claude/extract-measurement-20261113`. Base `origin/main` [`9be0c29fc`](https://github.com/zuriel337/sod1820/commit/9be0c29fc52337069192b057ef1a9882c7026009). Not pushed, not merged, not deployed. No database, Edge function, workflow or `package.json` change.

| Source | Link | What it is |
|---|---|---|
| PR #1321 at `4a406fed2` | [commit](https://github.com/zuriel337/sod1820/commit/4a406fed273b9b381577c5b2a03d91c58de46451) | the "fix measurement" family (M0-F): `readingActionSpec`/`Props`/`Body`, `emit()` in the public build, share, join, arrival and content views, the worker admission with 60 actions per window |
| `139f16214` (branch `claude/preserve-measurement-visit-once-20261113`) | [commit](https://github.com/zuriel337/sod1820/commit/139f16214d5ab3da3da903af02cc45e5d023e04b) | one commit on top of #1321's history: one visit per real page view, and in-app navigation is counted |
| Evidence | [`cluster-F-measurement.md`](https://github.com/zuriel337/sod1820/blob/4a406fed273b9b381577c5b2a03d91c58de46451/docs/reviews/m0-security-stabilization-20261112/cluster-F-measurement.md), [`measurement-audit/README.md`](https://github.com/zuriel337/sod1820/blob/4a406fed273b9b381577c5b2a03d91c58de46451/docs/reviews/m0-security-stabilization-20261112/measurement-audit/README.md), [`gsc-identity-crossref.md`](https://github.com/zuriel337/sod1820/blob/4a406fed273b9b381577c5b2a03d91c58de46451/docs/reviews/m0-security-stabilization-20261112/gsc-identity-crossref.md) | read, referenced, not copied (the result JSON and the two capture scripts stay in #1321) |

Commits here: `ff87b461e` C1 (#1321 family, byte-identical files + one hunk of `Post2029Page.jsx`), `697a31050` C2 (the preserved commit, byte-identical, + the 5-line fixture hook), `df3b97ce9` C3 (engagement budget and the new tests), C4 (this directory and the scope pin). The final HEAD is in the report that accompanies the branch.

## What the package does, in plain language

- **Visitors see no change.**
- A page view is written **once**: on a direct entry, a hard refresh, back, forward and every in-app move to another page, for guests and for signed-in members, on desktop and phone width. Before, a direct entry or refresh was written **twice**, and a move inside the app to another page family was **not written at all** (the worker refused it).
- Product actions (calculator, share, join, arrival source, post view) are written again to `events`, **without** a visitor or session id; they had stopped on 4.11.
- **For the administrator the daily visit counts change at the release date**: the double rows disappear, the missing in-app page views appear, so the counts before and after are not comparable. Unique visitors are unchanged. Details and the list of every reader: [`readers-and-comparability.md`](readers-and-comparability.md).
- Nothing is rewritten in the database; nothing is published to the public.

## Scope

<!-- measurement-package-scope
{
  "files": [
    "src/lib/publicReadingTelemetry2029.js",
    "src/lib/events.js",
    "src/lib/tracking.js",
    "src/lib/visits.js",
    "src/lib/supabase.js",
    "src/pages/Post2029Page.jsx",
    "src/App2029.jsx",
    "public-reading-deploy/transport.js",
    "test/helpers/authBrowserFixture.mjs",
    "test/public-reading-action-measurement.test.mjs",
    "test/public-reading-analytics-worker.test.mjs",
    "test/public-reading-observability.test.mjs",
    "test/measurement-visit-once-2029.browser.mjs",
    "test/measurement-page-view-once-2029.test.mjs",
    "test/measurement-transport-hardening-2029.test.mjs",
    "test/measurement-package-scope-20261113.test.mjs",
    "docs/reviews/measurement-20261113/README.md",
    "docs/reviews/measurement-20261113/extraction-map.md",
    "docs/reviews/measurement-20261113/ci-wiring.md",
    "docs/reviews/measurement-20261113/readers-and-comparability.md",
    "docs/reviews/measurement-20261113/identity-gap.md",
    "docs/reviews/measurement-20261113/transport-review.md"
  ],
  "tests": [
    "test/measurement-package-scope-20261113.test.mjs",
    "test/measurement-page-view-once-2029.test.mjs",
    "test/measurement-transport-hardening-2029.test.mjs",
    "test/measurement-visit-once-2029.browser.mjs",
    "test/public-reading-action-measurement.test.mjs",
    "test/public-reading-analytics-worker.test.mjs",
    "test/public-reading-observability.test.mjs"
  ],
  "budgetsPer10Minutes": { "visit": 120, "engagement": 240, "action": 60 },
  "liveWindowsPerFamily": 500,
  "settleMs": 150,
  "actionFamilyUsers": [
    "public-reading-deploy/transport.js",
    "src/lib/events.js",
    "src/lib/publicReadingTelemetry2029.js"
  ]
}
-->

The 22 files above (8 source, 1 test helper, 7 test, 6 documents). Per-file source, hunk and decision: [`extraction-map.md`](extraction-map.md).
`src/pages/Post2029Page.jsx` is one of the four files that main changed after #1321's base; only its one measurement line was re-applied, on top of main's file.

**Not included, and why:** GA4, Meta Pixel, CAPI and AdSense findings of the audit (out of scope by the brief); Raziel, N14, content, M0-A/B/C/D/E packages and the Edge bundles; CL-13; the capture scripts and result JSON of the audit (they read Google, Meta or the live site); any database change; any report change; the CI workflow (written down in [`ci-wiring.md`](ci-wiring.md)).

## The one change in meaning

Relative to #1321 and the preserved commit there is one code change, in C3: page **engagement** has a per-window budget (240 per 10 minutes). Both sources limited visits and actions per window but left engagement unlimited (found in the review, [`transport-review.md`](transport-review.md) F1). Everything else is taken as it was; the expectations of three older tests changed in C2 for the reasons in the commit message and in [`extraction-map.md`](extraction-map.md).

## The six acceptance criteria

| # | Criterion | Result | Proof |
|---|---|---|---|
| 1 | One page view is counted exactly once: direct entry, hard refresh, redirects, back/forward, the account-state change that re-mounted the tree | **Met** | Real Chromium on the built artifact, 4 profiles (desktop and phone, guest and member): `test/measurement-visit-once-2029.browser.mjs`, 13 steps each, the page asks as often as the database receives. The same cases without a browser: `test/measurement-page-view-once-2029.test.mjs`. **Negative control:** on the build of C1 alone (the #1321 state) the same browser test fails: direct entry asks and writes 2 rows, refresh 2, and every in-app move is asked once and written 0 times. |
| 2 | In-app navigation is measured for guests and members, desktop and phone width | **Met** | Same test: another page family, a post, another post, back, forward, a redirect alias, an unmeasured route and a second tab. |
| 3 | Refresh and browser behaviour create no duplicates (bfcache restore, visibility change, StrictMode double effects, service-worker revisit) | **Met, with one honest limit** | Tab hidden and shown again, and the `pagehide`/`pageshow(persisted)` pair: 0 visits (browser test steps 8-9). StrictMode double effect, a keyed remount before and after the write, a quick chain of redirect hops: node test. Service-worker revisit: refresh, forward and a second tab with the worker already active. Engagement lifecycle: `src/lib/engagement.test.js` (hidden/visible, `pagehide` race, idempotent flush). **Limit:** the headless fixture cannot produce a real back/forward cache restore (it serves documents with `no-store` and Playwright disables the cache), so the lifecycle events are dispatched; a real restore runs no script and cannot write a visit. |
| 4 | Impact on the existing reports | **Done as analysis** | [`readers-and-comparability.md`](readers-and-comparability.md): 16 readers, what each counts, the effect, and the statement that counts drop for the doubles and rise for the in-app views, so periods are not comparable. No report was changed. |
| 5 | Align with the decision (pages and arrival sources, a browser id for guests, an account id for members, detail for the administrator) | **Gap table written; nothing built that needs a decision** | [`identity-gap.md`](identity-gap.md). Today: the browser id is on visits only; **no account id exists anywhere** and the browser cannot send one safely; no reader reads the new `events` surfaces. Items that need a database change, a worker change that forwards the member's token, or a data-model choice are listed D2-D7 below. |
| 6 | Review the worker hardening adversarially | **Done; one fix, two residual risks documented and pinned** | [`transport-review.md`](transport-review.md): budgets cannot be spent by another window; the maps are bounded (500, 10-minute age-out); a window can write another measured route (residual); budgets restart with the worker (residual); engagement had no budget (fixed in C3). |

## Tests run

Node `v22.23.4`. Browser: Playwright `1.63.0`, Chromium `1243` (Chrome for Testing 153.0.8010.12), `/opt/pw-browsers`. The public artifact was built with `node scripts/build-public-reading-production.mjs` on the final code (exit 0). PostgreSQL is not involved (no SQL test belongs to this package). CI uses Node 24 and Playwright 1.55; **those were not run**.

| Command | Result |
|---|---|
| `node --test test/public-reading-action-measurement.test.mjs test/public-reading-analytics-worker.test.mjs test/public-reading-observability.test.mjs` (the required trio, after the build) | **26 / 26 pass** |
| `node --test test/measurement-page-view-once-2029.test.mjs test/measurement-transport-hardening-2029.test.mjs test/measurement-package-scope-20261113.test.mjs` (new) | **23 / 23 pass** (8 + 11 + 4) |
| `node --test test/measurement-visit-once-2029.browser.mjs` (real Chromium, built artifact, real worker; desktop and phone, guest and member) | **4 / 4 pass**, 13 steps each, about 190 s |
| Fixture users, because `test/helpers/authBrowserFixture.mjs` gained the optional hook: `auth-browser-acceptance-2029`, `auth-storage-browser-2029`, `ga-measurement-browser-2029`, `public-media-transport-2029`, `personal-area-browser-2029` (`*.browser.mjs`) | @@FIXTURE@@ |
| `node scripts/test-legacy-retired.mjs`, `node scripts/test-one-tree-content-contract.mjs`, `node scripts/test-2029-module-boundary.mjs` | @@SCRIPTS@@ |
| Every other test under `test/`, `src/` and `scripts/` that imports or reads a changed file (grep for the changed file names, 97 files) | 86 run: **77 pass**; **8 fail and 1 times out, all on the unmodified `origin/main` sources too** (below); 11 not run by that sweep: 8 browser tests (6 of them run separately in the row above or are the package's own), 1 shared helper, 1 build-dependent script (`test-2029-first-load-graph.mjs`, needs `npm run build`) and `post-one-tree-measures-2029.browser.test.mjs`, `elections-world-integrated-preview.browser.mjs` (preview tooling) |

**Pre-existing failures** (same pass/fail counts when the 8 changed source files are replaced by their `9be0c29fc` versions in this worktree, then restored): `doc37-mixed-page-readiness`, `doc37-runtime-admission`, `els-home-card-2029` (10 pass, 1 fail), `els-saved-cipher-owner-actions` (5 pass, 1 fail), `posts-public-reading-seo`, `posts-taxonomy-ui-2029`, `raziel-canonical-navigation-actions` (26 pass, 1 fail), `release-visual-egress-guard`. `els-native-ui-browser.test.mjs` (a Vite dev server plus the ELS matrix in a browser) did not finish in 180 s with the package and did not finish in 420 s on the unmodified sources either; it is unrelated and slow in this sandbox.

**Negative controls** (the new tests fail without the fix, so they test it): on the build of C1 alone the browser test fails (direct entry 2 asked and 2 written, refresh 2 and 2, every in-app move asked once and written 0 times); `measurement-page-view-once-2029.test.mjs` fails 5 of 8 on the previous `App2029.jsx`; `measurement-transport-hardening-2029.test.mjs` fails 2 of 11 on the previous `transport.js`.

**Not run:** Node 24 and Playwright 1.55 (the CI pins); the `marketing-browser-2029` job (needs a build with marketing ids); the G1 smoke; anything against the live site or a database.

## Apply, order, rollback

- **Apply:** merge the four commits in order. The package depends on no other package. `public-reading-deploy/transport.js` is shared with other work named in the closure list (C2b, CL-14): whoever merges second re-applies on top; the three admission blocks of this package are one contiguous region. The 5-line hook in `test/helpers/authBrowserFixture.mjs` is also needed by the M0-D contributor browser test, in the same bytes.
- **Then:** the integrator applies [`ci-wiring.md`](ci-wiring.md).
- **Release:** a code merge is not a deployment. The public site changes only with a separate approved deployment (CLAUDE.md rule 7, §0.4). After a deployment, the way to see it work is one direct entry, one in-app move and one refresh in a browser, then reading the new `site_visits` rows of that browser id (read-only).
- **Old workers:** the page bootstrap opens the application only when the service worker's `sourceSha` equals the page's (`startPublicReading`, `transport.js`), and self-heals once per tab session otherwise. A visitor whose browser still holds the previous worker therefore gets the new admission before the first page view of the new build; the old and new admission never meet inside one visit.
- **Rollback:** `git revert` of the four commits, or redeploy the previous deployment (an alias change, with approval). There is no schema, no data migration and no flag. Rows written by the fixed build stay valid. Reverting brings back the double rows and the refused in-app navigation.

## Open decisions (plain language)

- **D1 Marker.** Which marker shows the admin that visit counts changed on the release date (a note on the days, a column, a line in the law text)? The date is unknown until the release.
- **D2 Browser id on events.** Should engagement, actions, content views and arrival carry the browser id, and which one (the visit's `sod_vid` or the identity spine's `sod_id`)? The database very probably then creates a person for every public browser.
- **D3 Account id.** Members can only be identified safely if the worker forwards the member's token for these calls and a database function records the user on the server.
- **D4 Page views for the new terminal.** Either the public build writes `page/view` events with identity and session (closure list C3), or `site_visits` is declared the canonical source and the readers change.
- **D5 Readers.** Arrival, share, join, hot posts and AI-usage reports still read `visitor_events` and `page_views`; they need to read the new `events` surfaces.
- **D6 Wider arrival detail.** Campaign medium, campaign name, click ids, a full referrer: each is its own collection decision.
- **D7 Historical series.** Whether to publish a de-duplicated series for the old period (a read-side rule) so a continuous line exists across the release date.
- **D8 Budgets.** 120 visits, 240 engagements and 60 actions per window per 10 minutes are working values (the first and last come from the preserved commit and #1321); say if a different number is wanted.

## Known gaps

- A real back/forward cache restore is not exercised (see criterion 3).
- A browser that **prerenders** a predicted page runs the application before the visitor sees it, so a prerender that is never shown would be counted. The site sends no speculation rules; a few lines in `RouteEffects2029` could wait for `prerenderingchange`. Not done.
- A **chunk-load recovery reload** after the application has mounted (`appRecovery2029.js`, after a deployment) is a second page load and writes a second visit.
- A raw `history.pushState` inside a reader (`BookSourceReader2029`, `AhavatTorahSystem2029Page`) is not a router navigation and is not a page view; a later **back** to the earlier address is.
- A move to the same path with a different query or hash is not a page view (the effect depends on the path).
- The referrer host is sent on the first visit of every page load, and a browser keeps `document.referrer` on refresh, so a refresh repeats the original source (existing behaviour of `site_visits.referrer`).
- The admission cannot bind a visit to the visitor's live route (it only sees the address the document was created with): residual risk, pinned.
- Nothing was verified on the live site; the live capture of 12.11 is the "before".
