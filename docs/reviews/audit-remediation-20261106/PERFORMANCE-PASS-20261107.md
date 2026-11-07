# Performance pass on the RC (7.11.2026) — what was done, measured before/after, and what was not done

Scope: the RC branch only; focused, proven, low-risk optimizations from the evidence already collected (no new mapping). Every item was implemented in an isolated worktree, measured on the same machine against the unchanged tree, then re-measured and attacked by an independent reviewer before it was cherry-picked. **Nothing was deployed; no DB, Storage, Auth, permission, `vercel.json` routing or Production state changed. Heichal (ההיכל) was not touched.** Platform and database items are recommendations only (see [`PERFORMANCE-RECOMMENDATIONS-20261107.md`](PERFORMANCE-RECOMMENDATIONS-20261107.md)).

Measurement honesty: byte, request and chunk counts are exact. Timings come from a lab (headless Chromium 141, CDP CPU throttling, a shared-bandwidth h2 emulator, public-row fixtures, other CPU-heavy jobs running at the same time), so they are indicative; where a difference is inside the min-max noise it is reported as no change. Field numbers (RUM) cannot move until an approved deploy.

## 1. Build and bundle (base `7a820d049` -> integrated RC, same machine, `npm run build`)

| Metric | Before | After |
| --- | ---: | ---: |
| Build | exit 0, 3.8 s, 2 notices | exit 0, 2.4 s, same 2 notices (no new warning) |
| Tracked files / src files | 5,346 / 1,214 | 5,369 / 1,218 (new tests and docs; dead code removed, see below) |
| src JS+JSX lines | 190,257 | 189,107 (-1,150 net, after adding the recovery, boundary and read-dedupe code) |
| Dependencies / devDependencies | 14 / 3 | 13 / 3 (`xlsx` removed) |
| `package-lock.json` | 141,283 B | 137,776 B |
| Files in `dist/` | 481 | 493 (more, smaller lazy chunks) |
| JS chunks / raw / gzip | 243 / 6,683,660 B / 1,967,368 B | 254 / 6,698,591 B / 1,974,051 B (+15 KB raw: lazy wrappers, recovery + boundary) |
| CSS raw | 1,406,207 B | 1,406,311 B |
| Entry chunk | 348,997 B raw / 109,026 B gzip | 354,377 B raw / 110,930 B gzip (+5.4 KB raw, +1.9 KB gzip: `appRecovery2029` + `ErrorBoundary2029`, well inside the unchanged built-graph budget) |
| Largest chunks | OrbitControls 927 KB, BookPdfPage2029 436 KB (lazy only) | unchanged |
| Modules in the 2029 graph | 878 | 880 |
| Files mentioning "legacy" in `src/` | 210 | 205 |

Whole-build size is therefore **not** smaller; the gain is in what a route loads first (next section). Raw data: `metrics-base.txt`, `metrics-rc.txt` (session scratchpad).

## 2. First-load JS per route (exact, brotli, cold, service worker active, 390 px; 1440 px identical except `/code`)

From PF1 (reviewer re-measured within 8-16 B). Request counts include the lazy wrappers.

| Route | JS before | JS after | Delta |
| --- | ---: | ---: | ---: |
| `/` | 464,399 B / 74 req | 433,098 B / 74 req | **-31.3 KB** |
| `/post` | 321,194 B / 41 | 305,787 B / 43 | -15.4 KB |
| `/post/<slug>` (public fixture) | 417,077 B / 60 | 369,822 B / 58 | **-47.3 KB** |
| `/number/1820` | 449,443 B / 65 | 421,493 B / 67 | -28.0 KB |
| `/gematria` | 328,831 B / 43 | 313,409 B / 45 | -15.4 KB |
| `/code` | 394,465 B / 45 | 379,145 B / 47 | -15.3 KB |
| `/world` | 503,255 B / 73 | 445,867 B / 73 | **-57.4 KB** (CSS -411 B) |
| `/community/chat` | 363,693 B / 42 | 348,451 B / 44 | -15.2 KB |
| `/map` | 301,599 B / 32 | 286,216 B / 34 | -15.4 KB |

Mechanism: contributor link policy and the golden-post claim helpers were pulled into the always-loaded shell by static imports; the shell chunk drops from 295,960 B to about 249,300 B raw and `postSourceUpdates2029` from 47,546 B to 20,124 B; the World sources view and two number/world readers load on demand. Budgets unchanged (`scripts/test-2029-built-graph.mjs`: eager gzip 205,290 B, limit untouched); a new guard `scripts/test-2029-first-load-graph.mjs` keeps the heavy modules out of the shell. Three routes outside the audited nine pay a few KB (`/community/researcher/888` +2.9 KB and +6 requests, `/beit-midrash` -0.9 KB and +6 requests): disclosed, not hidden.

## 3. Requests and payload (PF2, PF4)

| What | Before | After |
| --- | ---: | ---: |
| Method Lens open on `/2029/calculator`: page API requests in the first 5 s | **1,365** median (a refetch loop, 1,316 `fn_relation_candidate`) | **29** |
| ...main-thread long tasks in that window | 675 ms median | 0 ms |
| ...time until the evidence list is visible | **17,977 ms** median | 1,278 ms |
| 4-page walk home -> number -> post -> home: identical (method+URL+body) requests | 72 requests, 16 duplicates | 54 requests, 0 duplicates |
| 5 in-app navigations: page-level API requests | 81 | 47 (revisits of `/` and a number: 10 -> 0 and 12 -> 6) |
| Global frame stream (posts + topic cards + group arrivals) per navigation | 3 requests on every navigation | one set per 30 s window |
| Home system pulse per Home view | 7 requests (4 exact-count scans of `gematria_words`) | 5 (one union count) |
| Topic convergence for 41 slugs | 156 requests | 6 |
| Topic convergence for `/number/1820` | 28 requests | 4 |
| World prominence supplement payload, number 1820 / 358 | 144,608 B / 191,819 B | 6,625 B / 5,599 B |
| `getPostBySlug` columns | `select *` (42 incl. `content_old`) | 30 explicit columns (about -1.5 KB per average post view) |

Rules kept: only anonymous read-only RPCs are shared/memoised (explicit list, `pg_proc` checked); signed-in and admin requests are never remembered; no telemetry, consent, auth or write path was touched. Freshness for anonymous visitors: up to 30 s (120 s for the methods registry).

## 4. Entry module preload (PF3) and LCP / CLS / assets (PF5)

* **Entry preload** (`<link rel="modulepreload">` for the entry before the inline bootstrap): the entry is requested exactly once (about 600 loads checked: wire log, CDP, Resource Timing). Entry download ends 158 ms earlier (99 of 112 pairs, p<0.0001); time-to-app -94 ms pooled (p=0.010); LCP -46 ms (not significant); FCP no effect. In the slow-4G priority-blind cell the effect is neutral. Modest and model-dependent: validate with RUM after an approved deploy; revert is one line.
* **CLS on `/post` (the only route group over the 0.1 line in the field: footer shift 42 of 67 bad events, avg 0.70)**: footer is hidden while the route shows only the loading placeholder. Lab, return visit 390 px: **1.167 -> 0.212**; 1440 px: **0.947 -> 0.032**; deep link cold 390 px: **0.816 -> 0.000-0.152**. Cold loads of other routes unchanged (0.000-0.006). Visible only in the transient loading state.
* **Post cover** is eager with `fetchpriority=high`; lazy canonical media decodes async. Supabase `preconnect` added to the shell (lab connection setup charged to cold `/post` requests 897 -> 621 ms on slow 4G; this is a harness model, not an observed early socket). LCP on `/post` fast 4G 2,504 -> 2,412 ms (inside noise); deep link 3,292 -> 2,816 ms.

## 5. Final lab A/B, base vs integrated RC (same harness for both, N=7, interleaved)

_The final base-vs-RC lab run (slow and fast 4G, seven routes, N=7, interleaved) was still running when this file was first committed; its table is added in a follow-up commit. The per-area A/B numbers in sections 2 to 4 were measured by the implementers and re-measured by independent reviewers._

## 6. Legacy / dead code removed in the same pass (proven unused, behaviour-neutral)

`xlsx` dependency (known-vulnerable, no importer); 15 retired/dead files (four 3D/number-tree stubs, stage3 harness, `design-backup-441.js`, three analysis tools, EntityHub functional page + controls + two orphan CSS); about 1,950 lines of client wrappers orphaned by #1239 in `supabase.js`/`visits.js` (dist differs only by chunk hashes and a 3.2 KB smaller JS total in that step). Each removal batch was re-proven unused by an independent reviewer (import graph, string references, workflows, `package.json`, `vercel.json`, Worker allow-lists, tests) and the build output compared by hash where the batch is meant to be byte-neutral.

## 7. Recommended but NOT done (needs approval or is not low-risk), ranked by expected gain

1. Document delivery: `/post/:item` TTFB p50 about 740 ms (the document function reads Supabase per request, `no-store`); CDN caching with `Vercel-CDN-Cache-Control` and revalidation, plus the `api/og.js` `Promise.all` (est. -0.25 to -0.5 s on `/post` LCP). Production routing/header change.
2. Right-sized, modern-format images and a server-document preload of the post cover (LCP load delay is the dominant phase: 1.2 s of 2.5 s on fast 4G).
3. Self-host IBM Plex Mono (Google Fonts stylesheet on 92 of 98 routes); long-lived `Cache-Control` for content-hashed `/brand/2029/*` and the 12 post backgrounds.
4. Service-worker policy: `fn_relation_candidate` is requested up to 28 times per Method Lens open and always denied (403) by the production worker; needs a worker-policy or DB decision.
5. DB (proposals as text only, nothing applied): indexes behind `contributors_feed` / `writer_public_contributions_page_v1` timeouts, ANALYZE of never-analysed tables, `video_media_assets_v1` HTTP 500s from Vercel functions, `/gallery` catalog projection (2,195 rows x 21 columns, about 2.5 MB), advisor items (unindexed FKs, unused indexes, RLS init-plan).
6. Further first-load trims identified but not applied (smaller or design-owned): delay Home -> Post preparation (rejected experiment: -196 ms LCP, noisy, design decision), lazy `unifiedResearchEntry`, split `Sod2029Shell.css` (229 KB raw, 19-22 % rule usage on first load), lazy Storage client in the shared Supabase chunk, lazy ELS discovery panels on `/code`.
7. RUM: add LCP element attribution to the `web_vital` event (the only way to know what the 5.6 s `/post` LCP p75 is made of in the field).
8. Telemetry volume (`ingest_event` x32, `track_visit` x8, `link_identity` x9 in one calculator Golden flow) and CI traffic hitting production Supabase: owner decision (analytics scope, gate changes).

## 8. Risks that remain

* Lab, not field: LCP/TTFB claims need RUM after an approved deploy. The entry preload and the footer rule (CSS `:has()`; older engines fall back to today's behaviour) are the two changes to watch.
* A1 (stale-chunk recovery) and the dead-wrapper removal rename about 170 chunks: ship together (same RC), never the removal alone.
* The read memo holds up to 64 entries (no per-entry byte cap): a very large anonymous response is retained until the next insert prunes it.
* Chromium only; no WebKit/Gecko measurements.
