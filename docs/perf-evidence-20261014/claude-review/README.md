# CLAUDE_REVIEW_2029_PERF_20261014 — independent review of the PR1100 line and the continuation candidates

Role C of journal row `5070f5af`. READ_ONLY on product code, CI and PR1100; this folder is the only thing written. No merge, deploy, DB write; no message or ACK to GPT.
Candidates (exact SHAs, re-verified by fetch before the run): PR1100 `gpt/perf-execution-20261014` **5dd4afaa**; continuation `claude/perf-continuation-20261014` **5de85cfe** (= `eac046a` CI, `5d709c4` Home, `5de85cf` World); base of PR1100 **18821815**. GPT's local `9009b245` / native image `15af7aff` are not pushed → **UNMEASURED**, not reviewed. Main `12fea7a3`.
Not comparable with lane-A tables (different product tree and different flow). Fixtures (GET + allow-listed read-RPC POST, recorded live per SHA, fixed 150 ms) and hosted results are never mixed. Every number below is a lab replay, not a device.

## 1. Method (what was actually run)
- 10 cumulative stages built from PR1100's own commits plus the continuation (`static-s*.json`, `raw/*`):
  s0 `18821815` · s1 `15fb1e83` · s2 `44dd9824` · s3 `2b97b058` · s4 `e8c3a2cf` · s5 `aa626181` · s6 `1f2f4758` · s7 `5dd4afaa` (= product of `568c783b`) · s8 `5d709c47` · s9 `5de85cfe`.
- Conditions: mobile 390×844 DPR2 touch, CPU ×4, 1.6 Mbps / 750 kbps / 150 ms RTT, fresh context per sample, dark theme (light + parchment functional on s9), replay delay 150 ms, writes/telemetry answered 204 and never sent, third parties answered after 400 ms.
- Interaction flow (`review.mjs`) with **real input**: cold Home → real touch swipes (Home) → **tap** a Home post card → swipes (Post) → **browser back** → open the real mobile drawer and **tap** "העולם" → swipes (World) → **back** → **forward**; plus injected chunk-load failure and theme presets. n=7 on s0,s3,s4,s7,s8,s9; n=3 on s1,s2,s5,s6 (time-boxed, labelled). Window metrics are measured inside the interaction (tap/back → target READY marker), long tasks clipped to that window (not "through networkidle"), event-timing of the tap, CLS in the window, requests started in the window, rAF frame gaps for scrolling.
- Cold load decomposition (`coldload.mjs`): static graph (manifest, brotli) vs JS actually fetched **before** READY vs **after** READY, REST before READY, duplicate reads; n=5 (n=7 for the World lead marker).
- Mechanism probes: `shiftprobe.mjs` (layout-shift sources and scroll timeline on back), `stagecheck.mjs` (5de85cfe Stage on demand), Hebrew-slug request check.
- Input-validity: 0 page errors, 0 unmapped RPCs after normalising one random-id RPC, 0 fixture misses, no horizontal overflow in any run.

## 2. Code size is not time — the two kept apart
Static route graph (JS, brotli KB / files beyond nothing else; `static-s*.json`) vs JS fetched before the route's READY vs cold READY (median [range], ms).

| stage (change) | Home static | Home JS before READY | Home cold READY | World static | World JS before READY | World lead card | Post static | Post (ASCII) READY |
|---|---|---|---|---|---|---|---|---|
| s0 base `18821815` | 372 / 44 | 459 / 45 | 5191 [5086–5368] | 433 / 45 | 476 | 7406 [7203–7834] | 331 / 36 | 4553 [4398–4688] |
| s3 head read + Home primary independent | 372 / 44 (**0**) | 408 / 44 | 4561 [4445–4609] (**−630**) | 433 (0) | 476 | 7143 [6905–7655] (noise) | 331 (0) | 4305 [4127–4357] (**−250**) |
| s4 lazy post projection / arrivals v2 / abort | 315 / 39 (**−56**) | 345 / 39 (−63) | 4341 [4285–4694] (noise) | 393 / 45 (**−40**) | 432 | 7355 [7112–7727] (noise) | 331 (0) | 4450 [4391–4577] (noise) |
| s7 PR1100 head (world source-first, golden lazy) | 316 / 39 | 346 / 39 | 4614 [4454–4868] (noise vs s4) | 393 / 46 | 433 | **5776 [5473–5866] (−1580)** | 308 / 36 (**−24**) | 4401 [4093–4574] (noise) |
| s8 + Home explorerFacets lazy | 284 / 33 (**−32**) | 312 / 33 | 4190 [4178–4588] (−424, ranges touch) | 394 / 47 | 433 | — | 308 | 4172 [4035–4371] (noise) |
| s9 + World Story/Stage lazy | 285 / 34 | 312 / 34 | 4193 [4073–4337] | 373 / 45 (**−20**) | 410 | 5475 [5137–5712] (−300, ranges overlap) | 308 / 37 | 4207 [4105–4363] |

Reading: the biggest cold gain (s3, −630 ms Home) came with **zero** change in the static graph — it is request scheduling (the READY no longer waits for 51 KB still in flight). The largest size cuts (s4 −56 KB Home / −40 KB World) did **not** produce a time change distinguishable from noise once s3 was in. The World lead-card gain (−1.58 s) came from data ordering (source-first), not from bytes. Size budgets therefore cannot stand in for speed evidence.
Data bytes are a third thing: `aa626181` cuts the Home category-list reads from **569 KB to 43 KB decoded** (recorded bodies; ≈112 KB → ≈9 KB gzip). The replay serves bodies without bandwidth shaping, so the time effect of that cut is **UNMEASURED** here (derived ≈0.4–0.5 s on 1.6 Mbps for the gzip bytes, not a measurement).

## 3. Clicks, back, revisit, scroll (n=7 unless stated; median [range], ms)
| | s0 | s3 | s7 | s8 | s9 |
|---|---|---|---|---|---|
| tap Home→Post, to READY | 1289 [1248–1345] | 1378 [1238–1404] | 1340 [1235–1369] | 1255 [1231–1381] | 1268 [1192–1323] |
| …main-thread blocking in the window | 189 [181–223] | 186 [159–207] | 146 [134–194] | 144 [115–172] | 148 [126–217] |
| tap-to-paint event (input→next paint) | 64 | 80 | 72 | 72 | 88 (all within range) |
| drawer + tap "העולם", to READY | 1355 [1318–1479] | 1409 [1333–1447] | 1403 [1319–1497] | 1343 [1324–1476] | 1249 [1112–1336] |
| browser back → Home READY | 640 [561–730] | 614 [564–688] | 601 [492–659] | 511 [480–604] | 530 [447–631] |
| browser back from World → Home READY | 649 | 626 | 538 | 492 | 510 |
| forward → World READY | 248 | 243 | 251 | 253 | 252 |
| **back → Home: CLS (runs with CLS>0.1)** | 0.97 (6/7) | 0.99 (6/7) | 0.53 (7/7) | 0.03 (2/7) | 0.20 (4/7) |
| **back from World → Home: CLS (runs >0.1)** | 0.99 (7/7) | 1.04 (6/7) | 0.54 (7/7) | 0.16 (4/7) | 0.17 (7/7) |
| **scroll restored after back / forward** | 33 px (was ≈2047) / 0 px (was ≈2749) | same | same | same | same |
| touch scroll Home / Post / World: frames >50 ms | 0 / 0 / 0 | 0 / 0 / 1 | 0 / 0 / 1 | 0 / 0 / 1 | 0 / 0 / 0 |
| touch scroll: p95 frame | 17 ms (Home s0: 33) | 17 | 17 | 17 | 17 |

- In-app tap/back/forward times are **flat across the whole line** (differences inside ranges); the PR1100 line helps cold entry, not client navigation. The only interaction deltas outside noise: blocking on tap→Post drops ≈40 ms from s6 (187 [159–223]) to s7 (146 [134–194]) (golden executors lazy; ranges touch); drawer→World is plausibly ≈150 ms faster at s9 (ranges overlap — not proven).
- Scroll never janks (p95 16.7 ms at ×4 CPU, no CLS). One signal: Home scroll in **s4 had 2 frames >50 ms [1–4] (n=7) and s5 2 [1–3] (n=3)** vs 0 before and ≈0 from s6 — consistent with the deferred 42 KB projection executing right after READY while the user scrolls; it disappears at s6+ (0 [0–1]).
- **Scroll restore is absent at every stage**: after browser back the Home is at 33 px, not where the user left it (≈2050); after forward the World is at 0, not ≈2750. No candidate changes this.
- **Why CLS≈1 on return** (`raw/shift-*.json`): leaving a scrolled Post (≈1800 px) and going back keeps that offset on the freshly mounting, short Home; the document grows 5075→7226 px over ≈1.5 s while `scrollY` slides 1803→33, and `SECTION.dg29` (131→44→366 px) / `h29-sec k29-reveal` / hero reveals insert late. s7/s8 reduce the amplitude (total 0.04–0.54 vs 0.45–0.99) but not the mechanism; s8/s9 are bimodal (some runs 0.03, some 0.5), so a median hides it — hence the "runs >0.1" counts.
- Failure injection (Post chunk aborted when tapping from World): no blank page and the previous content stays in all 10 stages. My message check is weak (a generic "טוען/שגיאה" text match), so recovery UX is **not proven**, only "not blank".
- Three theme presets on mobile, s9 (light, parchment n=2; dark n=7): no errors, no overflow, timings in the dark range (cold 4023 / 4175 vs 4028).

## 4. Verdict per change
| change (SHA) | verdict | reasoning, evidence, regressions / trade-offs |
|---|---|---|
| `15fb1e83` matchMedia instead of `innerWidth` read in render | **ACCEPT** (benefit UNMEASURED) | Equivalent predicate (viewport width incl. scrollbar), listener cleanup added. It matters ≥1560 px/desktop; my run is mobile only, no effect visible (n=3, `s1`). No regression seen. |
| `c43c6faa` render without font wait + `44dd9824` Noto-only preloads | **ACCEPT, conditional on visual-owner check** | FCP s0→s3 Home 2020→1792, World 2328→2052, Post 2004→1836 (confounded with s3, which should not move FCP). Not measured here: the fallback-face paint and font-swap CLS on cold load (lane A measured 0.009). |
| `e2a209b7` + `2b97b058` head-started primary reads + Home reads independent of World | **ACCEPT with a required fix** | Cold READY Home −630 ms, World −150, Post (ASCII slug) −250, ranges do not overlap; in-app navigation unchanged (by design); disabled when an auth token exists (signed-in path **UNMEASURED**, no demo auth available). **Defect:** for a non-ASCII slug the head asks for `slug=in.(%25D7…raw-encoded…)` while the client asks for the decoded Hebrew set → two different requests (slug reads 2 vs 1 for ASCII), the head read is wasted and gives no handoff (Hebrew post READY −46 ms, noise, vs ASCII −250). Hebrew-slug posts appear among the Home post links. Fix: decode the path segment in `entryPrimaryReads2029` the way the router does and add a Hebrew-slug case to `test/early-primary-read-2029.test.mjs`. |
| `73a3eabe` + `c7039326` + `e8c3a2cf` lazy post projection, installed arrivals v2, abort semantics | **ACCEPT as a byte reduction; time effect NOT SHOWN** | Static −56 KB Home, −40 KB World; on World 45 KB (1 file) moves after READY. Cold READY not distinguishable from s3 (Home 4561 [4445–4609] → 4341 [4285–4694], median −220 but ranges overlap; World 4741 → 4678). Trade-off: deferred execution lands in the first seconds of use (Home scroll 1–4 frames >50 ms at s4/s5). Lane A's earlier −220 ms did not reproduce on top of s3 — its value shrank once the read was started in the head. |
| `aa626181` Home category reads bounded to card fields + one body | **ACCEPT** (time UNMEASURED) | Filters, order, range identical to `getPostsFromSupabase` (read from code); `content` is consumed only for Post 5018 and that body is still read; no other consumer of `content`/`total`. Decoded REST 569 KB → 43 KB. Fragility: hard-coded id 5018 (duplicates the existing hard-coded consumer); if the 5018 read fails the four highlights silently disappear (documented as optional). |
| `6cc20ed6` reserve reading-trail height | **ACCEPT** (desktop effect UNMEASURED) | Mobile: no regression (tap→Post CLS 0.04→0.03). The claimed desktop CLS 0.17→0.07 was not re-measured (mobile-only run). |
| `6b0e40b9` + `1f2f4758` (+`647331c4`, `42a39934`) World: hidden story reads deferred, source-first lead, fallback preview lazy | **ACCEPT** | World **lead card** cold 7355 [7112–7727] → 5776 [5473–5866] (−1.58 s, ranges do not overlap); World REST requests 67→61. Honest limit: my World "doors/topics" READY did **not** move (4678→4741) — secondary landing is not faster. Trade-off: the story timeline shows a loading state until enrichment ends; the early projection carries only post/identity/media (consumers must tolerate missing fields — read from code, error path not exercised by me). |
| `568c783b` golden executors only for admitted packs | **ACCEPT** | Post static −24 KB; tap→Post blocking ≈ −40 ms (ranges touch); READY unchanged. |
| `5d709c47` Home notable-convergence reader on its own trigger | **ACCEPT** | Home static −32 KB / −6 files; JS before READY 346→312 KB; cold READY medians −424 ms (ranges touch: 4454–4868 vs 4178–4588), back→Home 601→511. Trade-off: 28 KB / 6 files fetched after READY; a failed module load hides the strip silently (by design). Does not fix the return-CLS. |
| `5de85cfe` World Story + method Stage on demand | **ACCEPT, conditional** | World static −20 KB; JS before READY 433→410 KB; Stage chunks fetched at World open: **2 files (s7) → 0 (s9)** (verified); lead card 5776→5475 and drawer→World 1403→1249 are medians only (ranges overlap) → unproven. The open-details path and the explicit-reload failure path are **UNMEASURED** (the witness UI needs live anonymous reads; `scripts/test-world-source-connections.mjs` was also not run by its author). Caution: dev/integrated preview still mounts WorldStory at entry while production renders it only for `#world-discovery-*`, so hosted-preview timings cannot confirm production for this change. |
| `eac046a` CI: bundle budget enforced + route graphs | **ACCEPT as a guard, never as speed proof** | Closes a real gap (the budget test was run by no workflow). It measures static gzip size only; this review shows size cuts without time change (s4) and time wins without size change (s3). It would not have caught the Hebrew-slug handoff miss or the missing scroll restore. CI not executed by me. |
| fonts/head/lazy line vs "persistent shell / global prefetch / ContactGateway-only" | n/a | Not re-tested; consistent with lane A's earlier negative results (persistent shell: no navigation gain). |

## 5. Proven / ruled out / unknown / recommended
**Proven (lab replay, mobile ×4 CPU):** the head-started read removes ≈0.15–0.65 s from cold READY and decouples READY from the post-projection chunk; World source-first removes ≈1.6 s from the World lead card; Home category reads shrink 93 % in bytes; static size cuts of 20–56 KB per route did not by themselves change cold READY; in-app tap/back/forward times are unchanged across the line; scroll itself is smooth; back/forward restore **no** scroll position and the return to Home shifts by CLS ≈0.5–1.0 in most runs; non-ASCII slugs defeat the head handoff.
**Ruled out:** page errors, blank pages on a failed route chunk, horizontal overflow, fixture contamination (0 misses); jank in touch scroll (≤1–2 frames >50 ms); a blocking-time regression from any candidate.
**Unknown:** signed-in/admin and demo-auth paths; physical phone, Israel latency, real PostgREST time (replay is 150 ms fixed); desktop and warm visits; hosted preview numbers (not re-verified — no Vercel access in this lane); the Stage open/failure path of `5de85cfe`; GPT's unpushed `9009b245`/native image; font-swap CLS on cold load; whether my medians at n=3 stages (s1,s2,s5,s6) hold.
**Recommended fixes (not applied — product code is read-only here):**
1. Decode the slug before building the head read (and test a Hebrew slug); otherwise the "early read" costs an extra full-body request on those posts.
2. Fix return navigation, the user-visible gap no candidate touches: restore the saved scroll once content height exists (or keep the previous Home/World result for back/forward through the existing owners, with args+scope+freshness+abort+auth separation as the coordination row requires), reset scroll on forward navigation, and reserve the heights of `DiscoveryGateways` (`dg29`) and the hero reveals so the document stops growing 5075→7226 px under the user.
3. Treat the continuation as three independent commits: take `5d709c4` and `5de85cf` only with the World preview/production difference written down, and keep `eac046a` as a size guard with that label.
4. Next measurement, on the same SHA with a real server: hosted/live n≥7 for the back-to-Home flow and the Hebrew-slug post, signed-in once, and a desktop pass for `15fb1e83`/`6cc20ed6`.

Files: `review.mjs`, `coldload.mjs`, `shiftprobe.mjs`, `stagecheck.mjs`, `static-graph.mjs`, `summarize.mjs`, `static-s*.json`, `raw/*` (per-sample JSON and text output).
