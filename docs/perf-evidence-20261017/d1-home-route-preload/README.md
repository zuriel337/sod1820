# D1 — Home route graph hint (`/` only)

task_key `CLAUDE_PERF_2029_ENTRY_COST_20261017` · branch `claude/perf-entry-cost-20261017` · base for this change: `43ad82da` (D3 + evidence) on the unified candidate `8c8e9df9`. State **BRANCH-ONLY**: no PR, no CI, no deployment, no Production/Legacy/DB/RLS/switch change.

## Cause (from the earlier evidence, re-verified on this base)
The Home route graph (the Home chunk, its static imports and stylesheets) is requested only when React renders `/`, i.e. after the entry has been downloaded, compiled and run. `dist` of this base: **34 files beyond the entry document's own preloads — 26 scripts + 8 stylesheets, 463,479 B raw JS, 189,813 B transferred (brotli, loopback server)**; this matches the 26-script / 158 KB gzip figure of `next-wave/dependency-handoff-20261016.md` D1.

## Change (commit `97c21f3f`)
* `src/lib/homeRoutePreload2029.js` (new) + a 2029-only `transformIndexHtml` plugin in `vite.config.js` (`order: 'post'`, needs the bundle, so it does nothing in dev or in the legacy build).
* Build side derives, from the bundle, (a) the files the entry document itself loads and (b) the Home chunk's static graph minus (a), plus their stylesheets. Runtime side is one small inline function in the head: **only when `pathname === '/'` and `preview !== 'community'`** (same predicate as `HomeEntry2029`) it waits, with a `PerformanceObserver` on resource timing, until every entry-document file has arrived, then appends `modulepreload` links (scripts) and `preload as=style` links (stylesheets). Without resource timing: no hint, route loads exactly as before.
* Same files, same execution order: the hint set is **exactly** Vite's own `__vite__mapDeps` set for the Home import minus the entry preloads (asserted by a real-build test). No new request, no new byte except ~1 KB of inline script in `2029.html`. Vite's preload helper finds the existing links and does not fetch twice (measured: 0 duplicated asset URLs).
* Why "after the entry has arrived": the first two variants started the hint immediately (the D1 proposal) and delayed the entry's own download.

| variant (2–3 pairs, smoke, mobile profile) | entry download done | route graph done | Home route rendered |
|---|---|---|---|
| immediate | **+715 ms** | −481 ms | −427 ms |
| immediate + `fetchpriority=low` | **+724 ms** | −539 ms | −222 ms |
| **after the entry arrived (shipped)** | −44 ms (noise) | −244 ms | −311 ms |

(`results/variants-2-3-pairs/`, paired B−A medians.) `fetchpriority=low` did not remove the contention on this HTTP/1.1 loopback server; whether HTTP/2 priorities on the real host would is **not tested here**.

## Measurement (route-code timeline only)
Tool: `measure-route-graph.mjs` (A = `dist-A`, the build of `43ad82da`, no hint; B = the build of `97c21f3f`). Same machine, same loopback server for both arms, cold context per run, A/B order alternating, Chromium 141 / playwright-core 1.56.1, run through `scripts/ci-isolation/run.mjs` (network guard: exit 0, empty audit; every non-loopback host aborted, DNS disabled in the browser). Profile **mobile**: 390×844, DPR 2, touch, CPU ×4, 1.6 Mbps down / 150 ms RTT; **desktop**: 1440×900, CPU ×1, same network. 10 pairs each, all valid.

**Input: none. No data is served, so there is no content, no image, no LCP and no READY in these numbers.** They show when the route's code arrives and when the Home shell renders (`.h29` present), nothing else.

Paired B − A, median [bootstrap 95 %], samples negative:

| profile | route graph done | Home route rendered | entry download done |
|---|---|---|---|
| mobile 390 | **−151 ms** [−192, −106], 10/10 | **−159 ms** [−288, −81], 9/10 | +1.5 ms [−17, +16] |
| mobile 390, **control A vs A** (same build) | −55 ms [−119, −2], 8/10 | −25 ms [−181, +2], 8/10 | −10 ms [−45, +2] |
| desktop 1440 | −18 ms [−41, −7], 9/10 | −20 ms [−42, −10], 9/10 | +6.5 ms [−1, +8] |

Reading: the control shows an order/warm-up bias of up to ≈55 ms on the route graph in this lab, so the mobile gain net of it is ≈100 ms (route graph) and a more uncertain ≈130 ms (render); desktop is ≈ the lab noise (the idle gap is only ≈35 ms there: entry done 1353 ms, first route request 1387 ms in arm A). Median requests 43 → 43, JS/CSS bytes identical, total +1,003 B (the inline script). The D1 estimate of ≈350 ms idle network is **not reproduced** here — with no data the entry runs faster than with the real corpus — so the real-input figure is open.

Route behaviour in a real browser (`check-routes.mjs`, `results/route-behaviour-*.json`): `/` gets 34 + 8 = 42 hint links (arm A: 34); `/?preview=community`, `/world`, `/posts`, `/post/x`, `/number/1820`, `/gematria` have **identical request and link counts in A and B**; no browser preload warnings on any route.

## Tests
* `test/home-route-preload-2029.test.mjs`: 6/6 — plan derivation on a synthetic bundle (other routes' chunks excluded), nothing hinted until every entry file arrived, then exactly the plan once; no hint for `/world`, `/post/…`, `/number/…`, `/2029`, `?preview=community`, or without resource timing; `?utm` queries still hinted; a throwing host never escapes; the serialized script is self-contained; **real 2029 build vs Vite's mapDeps** (set equality) and the legacy build carries no hint. It fails on the base (the module does not exist).
* `test/early-primary-read-2029.test.mjs` 11/11 and `npm run test:2029-bundle-budget` 5/5 and `scripts/test-2029-system-frame.mjs` PASS on the branch; `npm run build` (legacy + 2029) succeeds.

## Not done / not proven
* **Real-input acceptance (BLOCKED_INPUT).** The private central corpus is not in this environment; no cold-load READY/LCP/CLS pairs on real content. The numbers above are not a user-facing speedup and not an acceptance percentage.
* HTTP/2 priority behaviour and a real network/CDN; a Preview of this SHA was not built or hosted.
* Warm-cache repeat visits (the hint also fires then, harmlessly; not measured).
* Home itself did not change; CLS at 320 and the failure-area limit are untouched (see `../entry-cost/README.md`).
* Residual risk: a person who lands on `/` and immediately navigates elsewhere has downloaded the Home graph (190 KB transferred) for nothing; first-time visitors landing on `/` are the intended majority (Home is the entry). Not quantified.
