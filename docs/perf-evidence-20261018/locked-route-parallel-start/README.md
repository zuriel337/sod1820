# Locked route parallel start — safety stop

> Historical V1 record. The separately approved V2 continuation expands the
> scope, removes the World head read, and implements the route-code start. See
> [V2.md](./V2.md), `before-v2.json`, and `after-v2.json` for the completed V2
> result. The V1 facts below remain unchanged as the reason V2 was required.

Task: `SOD1820_2029_LOCKED_ROUTE_PARALLEL_START_20261018`

Base: `origin/gpt/perf-unified-candidate-20261017@8c8e9df9b2b012b70479e398e75f16e7008b8619`

Status: **BLOCKED / NO PRODUCT IMPLEMENTATION**. The temporary App/MaintenanceLock experiment was reverted before commit. No D1 commit, `97c21f3f`, D3 file, live flag, product DB, RLS, Preview, Production, merge or deploy was touched.

## Blocking fact

The built `2029.html` injects `sod2029-primary-reads` before the application entry. On `/world` it calls `startPrimaryReads2029()` immediately and starts:

`GET /rest/v1/posts?select=*&slug=in.(flydubai-fz1073-363-14000-remzei-geula)&limit=1`

That happens before `AuthProvider`, `Locked`, or `site_flags` can decide access. The three 1500ms baseline samples in `before.json` each contain exactly this read in `earlyDataReads`. Number has zero early route-data reads in the same harness.

The source is the build-time injection in `vite.config.js`, routed by `entryPrimaryReads2029('/world')` in `src/lib/postReadQueries2029.js` and executed by `src/lib/earlyPrimaryRead2029.js`. All three files are outside this task's write scope. App2029 or MaintenanceLock cannot cancel a request that starts in an earlier inline head script.

The direct Vite module-evaluation check in `module-evaluation.json` recorded zero `fetch` calls for both World and Number. Therefore the observed read is not caused by evaluating either page module; it is a pre-existing document-head read. Nevertheless it violates the required proof of zero route-data reads before authorization, so shipping the requested parallel import would make an acceptance claim the branch cannot satisfy.

## Baseline measurement

Synthetic loopback harness, Chromium, three cold contexts per measured case. Metric: harness navigation start → route JavaScript request start. These are not LCP or real-user speed claims.

| Route | flags delay | samples (ms) | median (ms) |
|---|---:|---|---:|
| World | 0ms | 215.6, 230.2, 177.6 | 215.6 |
| World | 1500ms | 1676.4, 1674.9, 1680.7 | 1676.4 |
| Number | 0ms | 194.6, 219.1, 183.4 | 194.6 |
| Number | 1500ms | 1698.6, 1695.5, 1663.3 | 1695.5 |
| Post control | 1500ms | 176.3, 153.9, 183.0 | 176.3 |

There is no AFTER timing and no claimed improvement because the safety/acceptance blocker was found before any product commit.

## Verification

- `npm run build`: PASS for Legacy and 2029 on the unchanged product base.
- `npm run test:2029-bundle-budget`: 5/5 PASS. 2029 entry 9 chunks / 182.8 KB gzip; Home +26 / +158.1 KB; World +37 / +260.4 KB; Post +29 / +182.3 KB.
- Maintenance/route set: 18/18 PASS (`site-flags-inflight`, runtime switches, Number opening, convergence closure).
- Existing wiring/route suites: canonical-contract wiring, route legitimacy, cheap hardening, Number preview and World surface all PASS.
- Dedicated loopback baseline harness: PASS; it intentionally asserts the existing World head read as the blocker.
- `test/life-journey-2029-chain.test.mjs`: pre-existing FAIL on the exact base because the test expects `/2029/journey` while `App2029.jsx` at the required SHA registers `/journey`. The working `App2029.jsx` git object (`278d83285e7b254da57de63f1eaaa2c6e62e6964`) was verified identical to the base object before classifying this failure.
- `src/App2029.jsx` and `src/components/MaintenanceLock.jsx`: no diff from the required base after the safety stop.

Evidence identity: Node `v24.19.0`; Chromium `151.0.7922.173`; harness SHA-256 `9b695725d2586d641a9e4fc95d93a5c66f283f38ca78625cb02a5159c626aada`; baseline and final unchanged-product manifests both SHA-256 `7be7e8c7e8207b802753d32c8914c87eace1668fa3271c305d2d0cd1c9fba38b`.

## Harness boundary

`test/locked-route-parallel-start-2029.test.mjs` serves a production build on a random `127.0.0.1` port. It intercepts every Supabase request and returns synthetic responses; other non-loopback requests are blocked (font hosts are ignored as document chrome). It records route script requests, gate completion, protected DOM, route-data reads and external side effects. No live data was read or written.

Smallest safe continuation: expand a separately owned scope to make the existing World head reader consume the same fresh access decision, or remove World from `entryPrimaryReads2029` with performance/parity review. Only after that change is integrated on the exact base should the same harness be rerun for the requested App/MaintenanceLock parallel import.
