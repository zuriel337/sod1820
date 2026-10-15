# Post reading path: local processing and render cost (task CLAUDE_POST_RENDER_COST_2029_20261015)
Branch `claude/post-render-cost-2029-20261015`, base = `origin/claude/combined-test-2029-20261015` @ `28cf3ba0` (PR1100 01ac7706 + switches 62fdfdca + F2 4d315ea3). That combined build had a BEFORE row (a14efb75) but no delivering AFTER row when I started: integration with the unified version is **not verified by its owner**. Only Post files touched; no App2029, SystemFrame, scroll mechanism, World2029Page, number readers, runtimeSwitches or control panel.

## Method
Fixture replay (`scripts/post-measure.mjs`, same conditions as docs/perf-measurement-conditions-2029.md: mobile 390x844, CPU x4, 1.6 Mbps/150 ms, cold, Supabase GET fixtures at fixed 150 ms, writes 204, third parties 400 ms), 0 fixture misses. Posts from the live site: short `seventh-to-tenth-sefirot-2027` (1.8 KB, 16 nodes in the body), median `mah-kore-mokesh-har-naftali` (7 KB), rich `chibur-bein-hasafot-mafteach-lagan` (24 KB, 104 data-gem, 60 number links, 388 nodes, authored widget with infinite CSS animations), golden `flydubai-fz1073-363-14000-remzei-geula` (30 KB, 114 gems, 8 regions). Scenarios: first entry, post->post (history push + popstate), back, and real scroll (CDP mouse-wheel gesture, 5 x 1200 px, ~6000 px). Order alternated base/fix across 3 rounds.

## Profile: where the cost is (what was ruled out)
- JS processing of the body is small: `hardenPassiveMediaHtml` 0.2-0.9 ms in total per visit (2-6 calls, same string so React does not touch the DOM); the DOM-mapping effect (data-gem roles, number links, regions) 12-20 ms unthrottled per post; PostReadingBody renders 3-4 times on entry (+4 while scrolling the golden post through its regions); no re-render cascade.
- Navigation to a rich post (trace, x4): RunTask ~708 ms = UpdateLayoutTree 133 + Layout 100 + PrePaint 65 + Paint 27 + Commit 22 + JS FunctionCall 88 + microtasks 38. The JS share is small; **style recalculation is fragmented: 90 UpdateLayoutTree events**.
- Invalidation tracking: 3171 of the recalc invalidations have reason "Animation" (2571 on `<i>`, 600 on `div.sgx-big`) - the post body carries its own `<style>` with `animation: sgx-float 3s infinite` on 31 `<i>` and `sgx-beat 2.4s infinite` on the big number. Every tick invalidates style even when the element is far off screen. 9 of 1273 public posts (0.7%) contain `infinite` animations (live DB count, read-only).
- Continuous cost while reading (scroll test, x4, ~5.5 s): animated post task **1163 ms / style 407 ms** versus short post 383 / 67 and median post 377 / 62.
- Not the cause (no change made): re-renders, HTML hardening, source tree/context building, DOM-mapping effect, network (entry and nav ready are bound by the chunk waterfall found in the earlier World work, not by Post code).

## Fix (one, narrow)
`src/lib/pauseOffscreenAnimations2029.js` + one effect in `Post2029Page.jsx`: infinite animations inside the reading source are paused while their element is outside the viewport (+160 px margin) and resumed when it comes into view; cleanup resumes only elements still in the document. No new cache or engine, no content/style change, no switch needed (behaviour identical to the eye; animation continues from where it paused).

## Results (fixture harness, median of rounds; base -> fix)
| scenario | metric | base | fix | note |
|---|---|---|---|---|
| scroll, animated rich post | main-thread task | 1163 ms | 852 ms | -27% (rounds 1163/1165/1020 vs 958/844/852) |
| scroll, animated rich post | style recalc | 407 ms | 150 ms | -63% |
| scroll, short / median / golden post | task | 383 / 377 / 553 | 339 / 375 / 525 | within noise (no animations; not claimed) |
| short -> animated rich post | navigation task | 558 ms | 475 ms | -15% (ranges 556-576 vs 465-501) |
| back to the short post | task | 261 ms | 274 ms | equal (a first version of the fix measured 456 ms here: it resumed animations of nodes already removed; fixed and re-measured) |
| entry rich / short | ready, task | 3756 / 1475 ; 3684 / 1205 | 3754 / 1372 ; 3686 / 1260 | no effect on entry (as expected) |
**Not improved / not claimed:** time to usable content, CLS (nav short->rich 0.444, short->golden 0.112, identical), requests (identical), the 4 frames >50 ms (max 83 ms) in the animated post's scroll, golden-post script cost while scrolling.

## Preservation (base vs fix, `raw/pres-*.txt`, identical output)
Source HTML hash and length, data-gem / .sod-numlink / number-link / role=button counts, images, regions, capability list, section nav, title/h1, the number-opening click on a gem, tracking writes; rapid switching A,B,A,B,C,B... ends on the last post only (h1, title, body length of the last), no animation left paused after switching and none running off-screen (39 infinite animations: top of page 39 paused; scrolled to the widget 5 running, 0 visible-but-paused, 0 off-screen running).
Tests: new `test/post-offscreen-animations-2029.test.mjs` 6/6; post-* tests (category identity, comments, lineage, publishing chain, bennett/elections golden, connections, home cards) pass; bundle budget 5/5; hard isolation PASS; route legitimacy PASS; `npm run build` (legacy + 2029) OK. One failing test in `post-topic-pinned-context-rail-2029.test.mjs` (SystemFrame source assertion) fails identically without my change.

## Integration instruction
Cherry-pick the single code commit (files: `src/lib/pauseOffscreenAnimations2029.js`, `src/pages/Post2029Page.jsx` one import + one effect, the test) onto the unified version after its owner delivers it; no switch, no migration. Re-run `node --test test/post-offscreen-animations-2029.test.mjs`, bundle budget, and one scroll comparison on an animated post (scripts/pm-scroll.mjs).

## Not measured
Hosted preview, real phone, Israel, desktop, warm cache, signed-in sessions, the 8 other animated posts individually, Safari/Firefox (feature-detected: no-op without `getAnimations`/IntersectionObserver). The per-post processing path itself offered no further proven saving.
