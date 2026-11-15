# Post loading and GA4 page identity — 15 November 2026

Branch-only review. Base: `4b9a8687eea94afcf2466046708903b512d44f38` (also the live site read at task start). Owner: existing `traffic_intelligence_law` v11 for measurement; existing Post source admission, series/background projection and SEO metadata for reading. This document is evidence, not a new contract, owner or release approval.

## Changes

1. Start the **same** responsive Post background after the existing reader admits its public source, while canonical calculations/connections are pending. The CSS asset, content, calculations, design and publication boundaries are unchanged. Light/parchment, denied sources, invitations and cancelled source reads do not get this hint. CSS reuses the preload.
2. The existing manual GA4 page view waits for the current route's public SEO metadata, then sends its canonical path and actual title. The initial Post loading title and a previous SPA page's title cannot label the new page. Cleanup cancels pending work; an unresolved/noindex-nofollow page has one family fallback after five seconds. Literal numeric addresses are distinguished; free number expressions remain grouped. Existing private route exclusions remain.
3. Include bounded explicit campaign source/medium/name/content/id and the external referrer origin. Raw search queries, click identifiers and referrer search/path are not included in this manual event. `www` is not treated as a separate referring site. This does not change Meta or Google stream settings.
4. The `/books/:slug` route is an existing unconditional redirect, not a reading page. Skip its page measurement even if React takes more than the existing 150 ms settle period to complete the redirect. `/book/:slug` and the real `/books` list still count. No timer threshold is increased.

No SQL, Edge function, authorization, storage, URL rewrite, new table, identity store, law or live configuration changes. Existing first-party schemas/RUM labels stay the same; the earlier visit-once work remains in place. No historical analytics rows are rewritten.

## Live observations (read-only)

Headless Chromium at 390 px, current public artifact, writes and third-party analytics/ads blocked locally. These are individual lab observations, **not field p75 or an AdSense performance assessment**:

- `/post`: content visible at 1,483 ms; the document title was correct, but manual GA parameters used `SOD1820`.
- `/post/remzei-geula-ai-sod-hashir`: source request finished around 1,804 ms; canonical calculation ran around 1,826–2,037 ms; backdrop request started only at 2,071 ms; LCP 2,428 ms was the article background.
- `/post/us-ground-stop-new-orleans-nov-17-rumor-20261113`: HTTP 200, document TTFB 1,406 ms, LCP 3,412 ms, again the article background. Early backdrop discovery does not fix document TTFB.
- `/post/bennett-melach-631-78` returned HTTP 404 and was excluded from valid-post timing comparisons.

## Controlled before/after

`controlled-comparison.json` contains all 12 runs, including resources, manual GA arguments and LCP elements. `compare.mjs` reproduces the comparison using two separately built local worktrees and the existing HTTPS/worker fixture. The old side is the unmodified application at the base SHA; the fixture test added locally for the alias reproduction does not participate in the build.

Conditions: fresh browser contexts; three alternating before/after runs at each viewport; source response delayed 100 ms, canonical RPC 600 ms and the unchanged background image 300 ms. All requests stay in the fixture; Google is stubbed. These imposed delays illustrate overlap and are not a prediction for production.

| Viewport | Before LCP (ms) | After LCP (ms) | Median before → after |
|---|---|---|---|
| 390 px | 2320, 1888, 2128 | 1532, 1720, 1636 | 2128 → 1636 |
| 1280 px | 1924, 1972, 2096 | 1736, 1688, 1700 | 1972 → 1700 |

Before: backdrop discovery was 22–58 ms **after** the RPC finished. After: discovery was 619–628 ms **before** it finished. Exactly one backdrop request in every run; the LCP element was the same article background. Before GA: `/post/:item`, `SOD1820`, no campaign fields. After GA: the real public Post path/title and the explicit fixture campaign fields.

To repeat, build both worktrees with `VITE_GA_ID=G-TEST node scripts/build-public-reading-production.mjs`, install the repository's pinned browser tooling, then run:

```sh
CHROMIUM_PATH=/usr/bin/chromium node docs/reviews/post-speed-measurement-20261115/compare.mjs /absolute/baseline /absolute/candidate /absolute/results.json
```

## Acceptance and limitations

- `post-speed-page-analytics.browser.mjs`: real built application/worker at 390 and 1280 px; keeps the canonical RPC blocked until the correct image starts; confirms one image request and distinct current-title manual page views for two successive Posts. Runs in the existing auth browser job, without skipping. The build's `G-TEST` identifier is local fixture configuration only.
- `post-background-preload-20261115.test.mjs`: actual reader with pending RPC, denied/cancelled reads, invitations, themes and exact responsive asset.
- `public-page-analytics-20261115.test.mjs`: old/loading titles, cancellation, bounded fallback, public canonical identity, number expressions, campaign/referrer handling and private routes.
- Existing measurement, SEO, Post boundary, style, source-cancellation and G1 checks are retained. The books-alias regression fails on the base application's actual route effect when the redirect is delayed beyond 150 ms; the destination/list controls still pass after the fix.
- During the first full browser regression, 3/4 profiles passed and the phone guest counted the book alias as well as its destination. The isolated retry on main passed, but the deterministic delayed-alias case reproduced the underlying issue on main. This package fixes that case rather than changing timing expectations.

Outgoing `gtag` arguments are proven; **Google ingestion/reports, GA4 and Search Console dashboards are not**. Earlier #1321 captures found Google Enhanced Measurement emitting additional SPA page views and raw search terms. That external stream configuration is still open, so this package does not claim complete GA deduplication or privacy coverage. Meta URL/CAPI behavior, full account/browser identity reporting, GA-to-database sync and historical URL coverage remain separate work. Public pages with unresolved or noindex-nofollow SEO can still use the family fallback; this is not a claim that every page family now has a detailed identity.

Production p75 improvement must be measured after an approved release, using the existing RUM pipeline and comparable traffic/device cohorts. No production performance threshold, CI budget or rollback baseline is changed.

## Release boundary

Prepare one PR, validate its final head, then obtain the exact merge/deployment approval required by `AGENTS.md` and `CLAUDE.md` §0. The foundation release approval does not authorize this new code release. A merge alone does not deploy the site. No GA dashboard changes are included in that eventual code release.
