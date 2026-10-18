# Home cold path after the temporal removal — World projection out of Home's code

Status: **IMPLEMENTED / LOCAL TESTED / BRANCH ONLY (Draft PR)**. Not merged, not deployed, not tested on the Preview
(protected; no share link was provided), not released. `main`, Production, Legacy, the database, RLS and live
switches were not touched.

- Task: `PERF_2029_HOME_COLD_GRAPH_AFTER_TEMPORAL_REMOVAL_20261018`
- Base: `gpt/perf-unified-wave4-preview-20261018` @ `1085305ddd5639fd16f7bed19458acfda7f17791` (PR #1121)
- Work branch: `claude/home-2029-cold-path-1ltlrb`
- Raw numbers: `comparison.json`. Tools: `tools/` (all read-only; every write method, beacon and analytics request is aborted).

## 1. What was measured, and what was not

**Preview: NOT_MEASURED.** The Preview is a protected deployment: the repository's own hosted runner
(`scripts/perf-execution-2029/hosted.mjs`) requires `SOD_PERF_PREVIEW_BASE` and a temporary `_vercel_share` link, and none was given to
this session. An unauthenticated probe (`curl`) was answered `403 Access denied` by the site's own edge bot rule
(`middleware-core.js:374`, which blocks `curl/` and headless user agents), so the Preview was not opened further and no
protection or bot rule was bypassed. Re-running `tools/` against the Preview needs the temporary share link (and the hosted runner's
service-worker handling); nothing else.

Disclosure: four unauthenticated `curl` probes were sent while diagnosing this — three to the Preview host (GET, HEAD, GET) and one `GET /` to the
production domain's homepage. Each was answered `403` by the edge, and the edge itself writes its own crawl/edge log row for such requests (`log_crawl`),
so a few blocked-bot rows from this session's egress IP may exist. No product data, flags, cookies or accounts were touched.

What was measured instead: a **Preview-equivalent build of the exact base SHA** (`tools/build-variant.mjs`: same
`SOD_BUILD_TARGET=2029` and `VITE_INTEGRATED_PREVIEW` / `VITE_KINGDOM_PREVIEW` defines, without the Preview's read-only
service-worker bootstrap), served locally with brotli and immutable assets, as a guest, in Chromium 141 (Playwright 1.56.1):

- mobile 390×844, DPR 2, CPU ×4, RTT 150 ms, 1.6 Mbps; desktop 1366×768, CPU ×1, RTT 40 ms, 10 Mbps;
- 9 s window from navigation, **no scroll, no click**; a fresh context per run (empty storage, service workers blocked);
- real anonymous Supabase `GET` reads passed through; **every POST/PATCH/PUT/DELETE, beacon and analytics-looking request was aborted
  before leaving the browser** (so RPC results such as `convergence_meter` or `get_category_videos` are absent from both sides);
- `scrollY` was 0 and `sendBeacon` calls 0 in every run.

Limits: shared 4-core sandbox (timing noise is large), Node 22 instead of the declared 24.9+, no real device, no Preview
read-only worker. Time metrics here are lab figures, not field figures.

## 2. Bottleneck proven

The requested premise holds, in part. `Home2029Page` imported `home2029Projection` statically, and the manifest of the base
shows it pulling `worldDiscoveryStream`, `curationProjection2029`, `worldContributorLens` (and `worldContextualProminence`)
into the Home route graph. In a cold mobile run all five chunks are fetched with Home's own code, before any scroll
(`comparison.json` → `balanced_ab.mobile.beforeChecks.worldModuleFetchesPerRun` = 5 in 12 of 12 runs).

But that is **not the largest cost** of the cold path, and only **four** of the five chunks can leave with this change:

| | chunks | gzip | wire (mobile run) |
|---|---|---|---|
| Home route graph, base | 26 | 149.1 KB | 310.6 KB JS in 33 requests |
| Home route graph, change | 22 | 137.1 KB | 298.2 KB JS in 29 requests |
| removed | 4 (`home2029Projection` 3.0, `curationProjection2029` 1.8, `worldContributorLens` 2.3, `worldContextualProminence` 5.0) | 12.2 KB | 12.3 KB |

`worldDiscoveryStream` stays: `WorldFlightStory2029.jsx:7` imports `postRowToWorldUpdate` from it statically, and it drags
`topicConvergence`, `sourceBundleProjection`, `researchObjectPresentation`, `universalFinding`, `Timeline2029`, `PostTimeline2029`
with it: **7 chunks, 19.2 KB gzip that remain in Home's graph**. That static edge is larger than the one this change removes, and is
outside this task's file scope (see §6).

The CPU profile of the base (mobile ×4, 3 runs, `tools/profile-home.mjs`) puts the evaluation cost of the World modules below
4 ms each. The cost of this change is bytes and requests, not CPU:

| self time per run (ms) | |
|---|---|
| browser-native `(program)` (parse/compile, style, layout, paint) | 1802 |
| `2029` entry | 421 |
| `Sod2029Shell` | 143 |
| `Home2029Page` | 111 |
| `supabase` | 76 |

Where the time goes on the 1.6 Mbps profile (one base run, `comparison.json` → `larger_factors`): entry file downloaded
300→1575 ms, Home's route chunk requested only at 1883 ms (after the entry executed), 26 route chunks arrive 1990→3420 ms, READY
at 4547 ms. By source: the `2029` entry is 341 KB raw (react-dom 202 KB = 59%, first-party 97 KB, react-router 38 KB);
`Sod2029Shell` is 190 KB raw first-party code, of which `SystemFrame2029.jsx` alone is 84 KB. JS (311 KB) + CSS (41 KB) +
local fonts/lockup (113 KB) are what the link carries before the first content.

## 3. Change

`src/pages/Home2029Page.jsx` (+4 −2): the static `import { fetchHome2029Projection }` is replaced by a dynamic
`import("../lib/research/home2029Projection.js")` inside the existing effect that is gated by `worldPreviewRequested`
(set once by `onWorldPreviewApproach`). Same call (`includeWorld: true, includeTemporal: false`), same result handling, same
`live` guard. A failed module load takes the existing `.catch`: the area stops waiting and Home is unaffected.
Content, order, design, access and freshness are unchanged; `HomeComposition2029.jsx`, the projection itself and every reader are untouched.

Tests added or tightened: `scripts/test-2029-bundle-budget.mjs` (Home budget 160 KB/27 chunks → 140 KB/23 chunks, the projection
and two readers listed as deferred, `home2029Projection` required to stay reachable as an on-demand boundary),
`test/home-build-and-classification-2029.test.mjs` (static contract), `test/home-world-module-deferral-2029.test.mjs` (built app,
fixture reads, 4 cases).

## 4. Before / after (balanced design: 12 pairs per profile, order alternated)

A fixed order (before always first) credited the warm-up of the second run to the change: desktop READY looked −354 ms and LCP −832 ms.
With the order alternated the second run of a pair is faster whichever variant it is (desktop READY: base-first 1043, base-second 865,
change-first 926, change-second 919 ms) and the difference disappears. **Only the order-balanced figures below are results.**

Mobile (390×844, ×4 CPU, 1.6 Mbps), medians:

| metric | base | change | Δ | Mann–Whitney p | reading |
|---|---|---|---|---|---|
| requests | 65 | 61 | −4 | <0.001 | deterministic |
| transfer | 599.9 KB | 587.5 KB | −12.3 KB | 0.005 | deterministic |
| JS requests / wire | 33 / 310.6 KB | 29 / 298.2 KB | −4 / −12.3 KB (−4.0%) | <0.001 | deterministic |
| Home route wave (first route request → last route chunk) | 1446 ms | 1324 ms | −122 ms | <0.001 | network-bound, reliable |
| READY (Hero post title + link visible) | 3965 ms | 3478 ms | −487 ms | 0.057 | **not proven** (IQR ≈ 900 ms) |
| LCP | 4144 ms | 3896 ms | −248 ms | 0.028 | not proven (n = 12, noise) |
| FCP | 3920 ms | 3496 ms | −424 ms | 0.057 | not proven |
| TBT / long tasks | 648 ms / 6.5 | 326 ms / 6.5 | −322 ms / 0 | 0.27 / 0.60 | not proven |
| CLS | 0.004 | 0.004 | 0 | 0.47 | unchanged |

Desktop (1366×768): requests 120 → 122, wire 357.7 → 357.8 KB JS, READY 935 → 926 ms (p = 0.85), LCP 1584 → 1516 ms (p = 0.93),
route wave 361 → 312 ms (p = 0.007). Nothing leaves the window: the World preview area is inside its 800 px lead from the
first screen, so the same modules load right after the cards enrich (after READY) in both builds. The change moves them off
Home's own critical path; it does not remove them from the desktop window.

**NOT_MEASURED on the Preview:** READY/LCP on the deployed Preview, mobile device, RUM.

## 5. Safety and behavior checks (built app, real browser)

- **Cold, no scroll, mobile:** none of `home2029Projection`, `curationProjection2029`, `worldContributorLens`, `worldContextualProminence`
  fetched in 11 of 12 runs. In 1 of 12 the existing approach observer fired inside the cold window without a scroll (the base shows the same,
  78 requests once): a pre-existing geometry race at observation time, unchanged.
- **Approach (scroll):** one request for the projection chunk at the first step that enters the 800 px lead; returning to the zone, scrolling
  to the bottom, to the top and back added 0 requests.
- **No `IntersectionObserver`:** Home shows Hero, cards and sections; the projection is requested exactly once after the cards enrich.
- **Module failure:** Hero, updates, gateways, entry and continuity remain, one attempt, no retry loop, no page error. On the base the same
  failure removes the whole Home chunk (the new test fails on the base for this reason).
- **Hero:** the latest Post in every run, equal to the live latest by `modified` (`posts.id` 5119 `mah-kore-goliath-benjamin-gath-david`).
- **Temporal:** zero requests matching `fn_method_value`, `gematria_words`, `/nodes`, `research_contributions` with `target_type=eq.number`,
  `timeFlow`, `dayContext`, `hebcal`, in every run of both builds. `research_contributions` reads that do appear (desktop, and on approach)
  select `author_contributor_id` — the World contributor lens, not the removed "now" read.
- **Text:** neither «העת עכשיו» nor «מספר העת» in any run.
- **Deferred areas:** World preview, convergence strip and discovery gateways still start only on their own approach triggers.

Tests: focused Home set 194 pass / 0 fail / 0 skipped (with Chromium); `npm run build` exit 0; bundle budget 5/5;
`scripts/test_canonical_presentation.mjs` 94 passed; `npm run test:2029-cheap-hardening` PASS. Negative controls on the base:
tightened budget fails (149.1 KB > 140 KB), browser cases 1 and 4 fail, static contract fails.

## 6. Larger factors, in the order the evidence ranks them

1. **JavaScript volume on the critical path**: entry 171 KB gz (react-dom is 59% of it) + `Sod2029Shell` 62 KB gz (`SystemFrame2029` 84 KB raw).
2. **Serial entry → route waterfall**: Home's chunks are requested only after the entry has downloaded and executed (≈ 1.7–1.9 s on the mobile profile).
3. **`WorldFlightStory2029` → `worldDiscoveryStream`** static edge: 7 chunks, 19.2 KB gz still in Home's graph. `postRowToWorldUpdate` is a pure
   mapper used by the story's admission check; moving it (or its few dependencies) out of the discovery module, or loading it with the story's own
   on-demand loader, would take this cluster out. Not done here: another component, another owner scope, and the admission rule must stay identical.
4. Fonts (113 KB local + one external font family, 17 KB) and the browser-native `(program)` time (1.8 s per run at ×4).

## 7. Judgement call to review

The brief asks not to ship a marginal fix when another factor is larger. This change is **small** (−4.0% of cold JS bytes, −4 requests,
−122 ms of the network-bound route wave on the throttled mobile profile, READY/LCP gains not separable from noise here) but it is
measured, deterministic, zero-risk to content, and it is exactly the deferral the previous waves were building toward; it also turns the
budget from "allows +11 KB" into "fails on regression". If the review finds it too marginal, closing the Draft PR loses nothing else:
§6 gives the ranked targets.
