# Home return visual stability V2 — CLAUDE_PERF_HOME_STABILITY_V2_20261015 (BRANCH_ONLY, TESTED_LOCAL, NOT_MERGED / NOT_DEPLOYED / NOT_LIVE_ACCEPTED)
Base A = `a1f7cd0b08674daf89c98a666fc9676efca80998` (branch derived from exactly A). Code head = `36c96bcf9e7238c360dc3fbf3c5df16611e9835c` ("B"). Lab action-window shifts, not field CWV.
Runner `runner.mjs` (this folder), fixture `../scroll-integration/fixtures-combined.json.gz` sha256 `3eaf939f3b96…49cc` (106 keys, frozen, identical for A and B; no refresh needed or possible — Supabase is unreachable from this sandbox).
Profile: Chromium 141 (Playwright), 4-CPU sandbox, mobile 390x844 DPR2 touch, CPU x4, CDP 1.6 Mbps/750 kbps/150 ms RTT, fixtures replayed with a flat 150 ms (Node timers only), writes/telemetry answered 204 and never sent (15/sample, same in A and B), cold context per sample.
Method fixes vs old runner: no renderer await in route handlers; controller wall/monotonic stamps around the real command; observers (layout-shift with sources, DOM mutation, per-frame block geometry, long task, event) installed pre-navigation; explicit usable predicate (hero + ≥1 update card; dgLoaded = gateways loaded); real touch tap on a Home post control that is fully in view (no scrollIntoView; sample invalid otherwise); fixed 7 s wall horizon after Back; strict fixture-miss gate (a miss is answered 404 and invalidates the sample); visible content anchor identity + viewport top recorded.

## Core: 7 interleaved A/B pairs, same fixture, same departure (`/post/chibur-bein-hasafot-mafteach-lagan`, anchor «מתוך הפוסט · מפתח לגן»), 14/14 valid, 0 fixture misses, 0 page errors
| arm | action-window CLS (7 valid) | median | anchor displacement at end (px) | max anchor displacement after first within-120 (px) | usable ms after Back (median) | reads depart / back |
|---|---|---|---|---|---|---|
| A (base) | 1.865 1.957 1.960 2.310 2.311 2.314 2.395 | 2.31 | 0 | ≤20 | 602 | 72 / 53–56 |
| B (this branch) | 0.005 0.007 0.009 0.010 0.013 0.014 0.014 | 0.0099 | ≤8 | ≤8 | 315 | 72 / 53–55 |
Gates: every B CLS ≤0.1 ✔; anchor within 120 px and stable ✔; no added initial reads (72 = 72, back-phase reads not higher) ✔; usable-content time not regressed ✔ (no speed claim). Per-sample rows: `summary.json`; raw incl. shifts/mutations/geometry: `raw/core-AB-7pairs.json`.

## Causal sequence (exact A, `raw/diag-A-*.json`)
Back → Home remounts with loading blocks (doc 5075 px) → restore to Y≈2330 at ~560 ms **while above-viewport blocks are still in loading state** → reads complete → blocks above the restored viewport grow (updates 233→741 px, notable section inserted 0→645, story 188→305, Discovery 876→1636, hero 418→458) and push the visible content down (one event ≈0.98, one ≈0.72, …). Moving victims were Discovery/Reveal wrappers; triggering ancestors are the loading-state heights of the strips above. Shared Reveal/WatchButton are not the cause (their boxes only follow). The final layout equals the departure layout, which is why scrollY/anchor look "preserved" while ~2.3 CLS was real.
## Fix (4 product files only; presentation only; no read/query/count/cache change)
* updates: 4 card-shaped loading slots (loaded markup/classes, NBSP text) + reserved category chip row until the secondary read settles;
* notable convergences: card-shaped slots while its reader is pending (only if the strip was shown earlier in the session);
* Discovery gateways: per-item slots (language feature + rows, cinema, biblical rows with detail, Dimension Five posters) with the last-shown counts; status text kept sr-only;
* `useSettledBox`: per-session memory (key + width) of the natural box a strip settled to; the strip keeps it while it loads again (updates, notable, gateway lists, Dimension row, hero slot for the same lead Post, story slot). A different width/count releases it. No fixed px values.
* notable placement before the world gate resolves: `worldPending ?? loading` (existing prop). Optional hardening (not done, out of scope): `Home2029Page.jsx` `worldPending={worldFeature.loading}` — verified in temporary uncommitted builds (B*x in raw/diag) to give the same result.
Rollback: revert commit `36c96bcf` (plus the evidence commit).

## Additional checks (one sample each, `raw/*.json`; B only)
| case | result |
|---|---|
| late arrival 150 / 900 / 1800 / 3200 ms (all reads in the Back phase delayed by that value; horizon 7–9 s) | valid; CLS 0.0139 / 0.0143 / 0.0149 / 0.0055; anchor disp 6 / 5 / 8 / 29 px |
| user interruption (real swipe 400 px) | valid; CLS 0.0138; **no pull-back** (pulledBack=false). Caveat: the swipe landed 3.2 s after Back (renderer busy), i.e. after most content — it does not prove cancellation of an early restore; existing F2 cancel behavior is untouched (restorer not modified) |
| width 360 | valid, CLS 0.0118 |
| width 320 | **INVALID**: fixture miss (`posts?…slug=in.(matrix-506)`), cannot be refreshed here; not claimed |
| width 1440 | **INVALID / not run**: 2 fixture misses (logo asset) and no fully-visible Home post control for the real tap; not claimed |
| Day / Parchment / Night @390 | valid; CLS 0.0065 / 0.0137 / 0.0138 |
| reduced motion | valid; CLS 0.0139 |
| empty / error data states | **NOT measured as Back samples** (no Home post control exists to depart from by design); no page error was raised by loading in either state in these attempts (`raw/state-*.json` `pageErrors`), loading/empty/error text paths untouched; layout not inspected visually |
Screenshots: `raw/shot-*.png` (representative, 390 themes and widths).
## Tests / build
`vite build` (SOD_BUILD_TARGET=2029) OK. Existing directly relevant node tests identical to base A: runtime-switches 7/7, home-discovery-gateways 7/7, home-v2-density 4/4; date-display-rule 0/2 and home-build-and-classification 2/4 **fail identically on base A** (pre-existing, unrelated to this diff). `tests/home-return-stability-v2-20261015.spec.cjs` wraps the runner (needs `HOME_STABILITY_DIST`); not executed through Playwright test runner here.
## Open / limits
Lab replay, one fixture/route, mobile only for the core; widths 320/1440 and empty/error Back flows not completed; no physical device, signed-in, hosted or desktop acceptance; coordinator review of the `:has()` + min-block-size hold (releases only on width/count change) and of the heuristic `worldPending ?? loading` is recommended before integration.
