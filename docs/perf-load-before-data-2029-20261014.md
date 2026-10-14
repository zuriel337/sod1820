# 2029 — load before data arrives · 14.10.2026

Status: measured lab report. Branch-only (`claude/perf-testing-2029-5ayyow`), no merge, no deploy, no production, DB, flag or env change.
Base: PR1092 head `91a4c925` + measurement tooling only (`d269c81e`, then READY/CLS/nav tooling — product code identical to `91a4c925`).
Conditions: `docs/perf-measurement-conditions-2029.md` (mobile 390×844, CPU ×4, 1.6 Mbps / 150 ms, cold cache, Supabase GETs replayed from fixtures at a fixed 150 ms, median of 7 with min–max in the JSON).
Raw data: `docs/perf-evidence-20261014/load-before-data/` (`res-*.json` per variant, `nav-*.json`, the persistent-shell patch).

Lab limits: a replayed-fixture lab on one machine, not field data. Third parties (Google Fonts) are answered empty after 400 ms, so any extra real-world cost of that blocking stylesheet is not captured. HTTP/1.1 local server, so resource priorities (H2) are not modelled.

## 1. Why the first content request leaves late (measured on the base)

Home (`/`), mobile profile, ms from navigation start:

| t | what happens |
|---|---|
| 0–1.6 s | HTML → entry JS (95 KB br) + CSS + 4 font preloads (70 KB br) share 1.6 Mbps |
| ~1.9 s | React renders (`root`), then **lazy route chunk requested only now** |
| 1.9–3.9 s | Home chunk + **~43 static dependency chunks (~372 KB br)** download in parallel and starve each other; the last (`post2029ReadingProjection`, 42 KB br) lands at ~3.9 s |
| ~4.3 s | page effects run → **first content request** (35 requests in one burst) |
| ~4.7 s | first post card visible (READY) |

So the content read is issued from a `useEffect` inside the lazily loaded page, i.e. after the whole page code wave. Telemetry RPCs (`link_identity`, `track_visit`, `ingest_event`) leave at ~1.9 s and are *not* content; counting them as "first request" hides this. The harness reports the first **content** request separately.

CPU (profile at ×4): entry chunk ≈ 0.6 s self time, `supabase-js` 0.13–0.22 s, `(program)` (parse/compile) ≈ 0.8–1.3 s. The page is bandwidth-bound before it is CPU-bound: ~455 KB br of JS = ~2.3 s at 1.6 Mbps.

## 2. Experiments (each its own commit; medians of 7; Δ vs base)

Base: Home FCP 1940 / READY 4746 / LCP 4292 · World FCP 2184 / READY 4660 · Post FCP 1912 / READY 4305 / LCP 4368 · CLS 0.021 / 0.037 / 0.008.

| # | change | result | verdict |
|---|---|---|---|
| F1 | render without the ≤1.5 s font wait | neutral (Home READY 4669, Post 4400; inside range) | neutral alone; **required companion of F3** |
| F2 | Google Fonts CSS non-blocking (`media=print` swap) | neutral in lab | not adopted (unprovable here; recommend as a separate, low-risk decision) |
| F3 | drop all 4 local font preloads | with F1: FCP −400 ms (ranges do not overlap), READY −170…−290 ms. **Without F1 it is worse** (Home FCP 1860→2456, the render waits for fonts that are no longer preloaded) | needs F1 |
| F3b | …but post CLS 0.008 → 0.038 once content arrives early (body face swaps after paint) | | all-drop rejected |
| s3a | keep only Noto Sans Hebrew Regular/Bold preloads (26 KB br) | CLS 0.009 (kept), FCP −210 ms, READY −300…−500 ms | **adopted** |
| s3b | keep only Rubik preloads | CLS 0.038 | rejected (Noto is the shifting face) |
| E4 | start the first content read from `main2029.jsx` (Home projection / Post reading projection), page takes the in-flight promise once | first content request Home **4308 → 2513**, Post **3880 → 2834**; READY Home −180, Post −350, Post LCP −700; no extra or duplicate requests | **adopted** |
| E5 | `ContactGateway` (issue panel) lazy | shell 57.8 → 49.6 KB br; READY within noise | measured, **not on the branch** (no effect alone) |
| E7 | load `post2029ReadingProjection` on demand from `WorldFlightStory` | Home READY −220 ms, LCP −290 ms (ranges do not overlap base) | **adopted** |
| E6 | persistent shell (layout route, one frame instance) | see §3 | **not adopted** |

Final stack on the branch (E4 + E7 + F1 + s3a), medians of 7:

| route | FCP | LCP | READY | first content req | CLS |
|---|---|---|---|---|---|
| Home | 1940 → **1700** | 4292 → **3840** | 4746 → **4282** | 4308 → **2461** | 0.021 → 0.021 |
| World | 2184 → **1932** | 6536 → 6576 | 4660 → **4398** | 1853 → 1631 | 0.037 → 0.037 |
| Post | 1912 → **1840** | 4368 → **3688** | 4305 → **3904** | 3880 → **2902** | 0.008 → 0.009 |

World's first content request already leaves early (its own code is lighter and its reads are not in the page effect), so E4 is not applied there yet.

## 3. Persistent shell — comparative experiment (not inferred from TBT)

Prototype: one `SystemFrame2029` instance mounted in a layout route; `Sod2029Shell` in every page only registers its props (patch in the evidence folder). Same conditions; cold load via `harness.mjs`, client navigations via `scripts/perf/nav.mjs` (`/` → post → `/world` → `/`, n=5).

| | current | persistent |
|---|---|---|
| cold Home FCP | 1700 | **2500** (entry 346 KB → 610 KB raw: the 2.3k-line frame becomes part of the entry) |
| cold Home READY | 4282 | 4247 |
| nav → post READY | 942–993 (range 909–1271) | 882 (854–1012) |
| nav → world READY | 1045–1058 | **1187** (1138–1265) |
| nav → home READY (warm) | 544–552 | 515 |
| main-thread blocking per nav (post / world / home) | 174–181 / 42–76 / 30–66 ms | 148 / **103 / 111 ms** |
| CLS per nav (post / world / home) | 0.008 / 0 / 0.027 | **0.064 / 0.111** / 0.036 |
| REST requests on nav to post | 7 | 4 (frame mount-time reads no longer repeat) |

Conclusion: no navigation speedup (differences are within range or worse), higher blocking and CLS, +800 ms cold FCP. The only measurable benefit is fewer repeated shell reads and preserved state — a state-continuity argument, not a speed one. The prototype's CLS comes from the frame re-rendering with the new page's props after the page registers; a polished version could reduce that, but the cold-entry cost is structural.

## 4. Not done / risks

- Lazy shell panels: only the ContactGateway split was measured (no effect). Splitting `WorkspaceProjection`, `AccountConnection2029`, `RazielNativeChat` (all in `SystemFrame2029.jsx`, shell-owner file) would save at most ~20–30 KB br ≈ 0.1–0.15 s of bandwidth; not attempted without the shell owner.
- `supabase-js` (52 KB br) stays in the critical path. A thin public-read client is the next-largest byte lever (decision #4 in the max-speed plan) and is a data-lane/owner decision.
- Fonts: dropping Rubik preloads means headings/numerals paint in the fallback face first. CLS unchanged in the lab; needs a visual check by the visual owner.
- E4 reads are issued even if the route later turns out to be locked/redirected (one wasted read at most), and only for `/` and `/post/:slug`.
- Duplicate requests that already exist on Home (same URL prefix repeated: e.g. 7× `convergence_meter`, 6× `gematria_method_trace`, 5× `notification_prefs_guest_get_v1`, 4× `gematria_words` counts) belong to the data lane and are not touched here.
- Fixtures replay a snapshot; a query-shape change from another lane requires re-recording on both sides before comparing.
