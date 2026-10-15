# F2 scroll/back-forward on PR1100 head 01ac7706 — verification (revision 2, corrected)

Branch `claude/scroll-navigation-2029-fix-oz90c0` = PR1100 `01ac7706` + F2 patch (`1701cf3a`). Neither PR1100 nor main (503b52ef) had any scroll restoration, so nothing duplicated.
Touched by F2: `src/lib/scrollRestore2029.js` (new), `src/App2029.jsx` (one layout-effect pair in `RouteEffects2029`), `test/scroll-restore-2029.test.mjs` (new). Harness: `scripts/perf/serve.mjs`, this folder.
Original raw files are kept unchanged (`raw/f2-integrated.json`, `raw/base-01ac7706.json`); corrections are in `pooled-summary.json` and below.

## Gates (this branch)
scroll unit 13/13; early-primary-read + home-preview-route 13 pass; route-legitimacy PASS; hard isolation PASS; bundle budget 5/5; `build:2029` OK. GitHub CI not run on this branch.

## Measurement validity (correction of revision 1)
A run is valid only with: no error, no invalid marker, 0 page errors, **0 fixture misses**.
- `f2-integrated` run 7: `misses=1`, forwardWorld.cls=1.785 → **SUSPECT, excluded** from every comparison. Its missing key was not recorded in that file (recording added afterwards), and no layout-shift sources were captured in that run, so **its CLS cannot be attributed to any component and a fixture-miss cause cannot be ruled out**. Revision 1's statement that the World shift was "a consequence of showing the correct region" is **withdrawn** (unsupported).
- `f2-integrated` cross-page anchor sample 5: `invalid` ("Home→World anchor link never in view") → counted separately (1 invalid sample), not as pass or fail.
- Replacement: `raw/f2-rerun.json`, 5 more runs, same conditions/fixtures/build, all 5 valid (0 misses). Pool = 6 valid original + 5 rerun = **11 valid F2 runs**; baseline = 7 valid runs.

## Mobile replay (390x844 DPR2 touch, CPU x4, 1.6Mbps/150ms RTT, cold context, replayed live-recorded read-only fixtures; real touch swipes/taps/drawer/browser back-forward)
| Position (separate) | 01ac7706 (n=7) | + F2 (valid n=11) |
|---|---|---|
| back→Home within 120px of departure | 0/7 | **11/11** |
| forward→World within 120px | 0/7 | **11/11** |
| new entry Post / World at top | 7/7, 7/7 | (original 7/7, 7/7) |
| direct hash + in-page anchor in view | 7/7, 7/7 | (original 7/7, 7/7) |
| cross-page `/world#world-sources` honoured | 0/7 | 0/11 (+1 invalid sample, listed apart); anchor owned by the page, unchanged |

| Time to usable content, median [range] ms (separate; no speed claim) | 01ac7706 | + F2 |
|---|---|---|
| back→Home | 768 [307–1154] | 404 [357–906] |
| forward→World | 202 [197–298] | 203 [193–290] |
| new entry World | 1842 [1795–2020] | 1810 [1735–2485] |
Back→Home baseline range spans the F2 range; this is a position fix, not a speed improvement.

| CLS in action window (separate) | 01ac7706 | + F2 (valid) |
|---|---|---|
| back→Home | 2.29 [0.84–2.58], 7/7 >0.1 | 1.85 [0.83–2.35], 11/11 >0.1 |
| forward→World | 0, 0/7 >0.1 | 0, **0/11 >0.1** |

## CLS attribution (layout-shift `sources`, rerun runs 1–5, `raw/f2-rerun.json` → `steps.backHome.shifts`)
back→Home shifts are in `[data-experience-capability=home-composition]`: `section.dg29` (DiscoveryGateways height/appearance), `article.dg29-gateway`, `div.k29-reveal.k29-rv-self` and `section.h29-sec.k29-reveal` (Home reveal wrappers), `div.sod29-watch-icon-wrap`. Present on the baseline's scores too (0.84–2.58). Not caused by the restore mechanism; Discovery/Home reveal height reservation is the owner of the fix (scopes 75/839 + visual owner). Not changed here.
forward→World: no shift >0.02 in any of the 11 valid F2 runs. The single >0.1 observation (excluded run 7) is unexplained.

## Browser test: user input while restore is pending; late content (`scrolltest.mjs focus`, fixtures replayed with per-key delays 150/900/1800/3200 ms so content keeps arriving across and after the restore window; raw `raw/focus-*.json`)
User input during a pending restore (real touch swipe 400px; F2 n=8: 4 immediately after back commit, 4 after 900ms):
- Restore was pending at the moment of input in **8/8** (`overflow-anchor: none` set by F2), and **released after the swipe in 8/8** (final `overflow-anchor` empty).
- **No pull-back to the remembered offset in 8/8** (final scrollY never returned to within 120px of the saved offset after the user had moved away). Cancel works.
- Baseline (n=4, after 900ms) shows the same browser behaviour: no pull-back (no F2 there).
- Caveat: scrollY after the swipe still rose by 1000–1750px in both arms while the document grew 5075→7417px. That is the browser's scroll anchoring compensating for content inserted above the viewport (identical in baseline), not F2; the y-metric cannot separate that from visual movement, and visible-content identity was not tracked.

Late jump after restore (n=5 F2, n=4 baseline, content arriving until ~3.2s):
- F2 restores to the saved offset at ~0.5–0.7s (baseline's early browser restore ~0.75–1.3s), but with content arriving **after the 1.5s anchor hold** both arms show **3 scroll jumps >120px after the hold** and final |scrollY − saved| of 1460–2090px (F2) vs 1460–2090px (baseline). Post-hold CLS ≈2.05 in both (F2 one run 2.49).
- **Conclusion: F2 does not prevent late movement when content arrives later than ~2s after navigation (stress profile).** The hold covers content that arrives within 1.5s after the jump. This is a real limit of the current F2, not fixed here (extending/adapting the hold or anchoring on a content element would be a separate change in the single scroll owner).
- The same stress profile is harsher than the 150ms-flat replay used for the position table; the position results above stay valid for that profile only.

## Limits
Lab replay, mobile only; no physical phone, desktop, signed-in, or hosted-preview measurement in this revision; fixtures replayed, not live. Visible-content identity not tracked (see caveat).

## Integration
Merge `claude/scroll-navigation-2029-fix-oz90c0` into the PR1100 branch (ff-able at 01ac7706) or `git am` the single patch `1701cf3a`. On main re-apply the effect pair manually (App2029.jsx differs after PR1103/PR1104).
