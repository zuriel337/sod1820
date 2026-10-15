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

---
# Revision 3 — combined build (PR1100 + switches + F2) and visible-content tracking
Harness (`scrolltest.mjs focus`) now follows the **visible content**, not only `scrollY`: at departure a leaf element on screen is recorded by text and, after the return, its viewport offset is compared with the original (displacement 0 = the user is where they left; scrollY can differ from the saved value when the browser compensates for content inserted above). Late content = per-key response delays 150/900/1800/3200 ms (stress profile; harsher than the flat-150ms replay). Fixtures: `fixtures-combined.json.gz` (recorded on the combined build, 106 keys, same as before).

## What it showed (finding, then fix)
With the F2 as delivered (fixed 1.5 s anchoring hold) AND the baseline alike, the user ended **1460–2130 px below the place they left** in 9/9 valid runs (final visible displacement −1460…−2132, `raw/focus-combined-late.json`, `raw/focus2-base-late.json`): the page restored, the hold ended while later sections were still arriving, and scroll anchoring then locked onto the still-partial layout. This was not a regression caused by F2 (the baseline has it too) but F2 did not fix it. Fixed inside the existing restore mechanism (`src/lib/scrollRestore2029.js`): the hold now extends while the document keeps growing (`RESTORE_HOLD_MS`=2500 quiet, `RESTORE_HOLD_MAX_MS`=8000 cap); input still ends it at once. Unit tests 15/15 (2 new).

## After the fix (`raw/focus-final-*.json`, combined build, same stress profile)
| | F2 as delivered / baseline | combined + adaptive hold |
|---|---|---|
| late content: final scrollY vs saved (valid runs) | 4/5 and 4/4 off by 1460–2132 px | **0 px in 6/6** |
| late content: final visible displacement | −1460…−2132 px (9/9) | **0 px in 5/5** valid (1 run had no trackable element: invalid, listed apart) |
| scroll jumps >120px after the restore window | 3–4 per run | **0 in 6/6** |
| visible-content moves during the hold | n/a | 1–2 per run (up to 203–954 px) — late sections arriving above (pre-existing Home reveal waves; see CLS attribution), settled to 0 at the end |
| intermediate hold release (earlier 1.5 s / 8 runs of `focus-fix-*`) | | with 1.5 s quiet window 2/5 still lost the place; window raised to 2.5 s from that data |
| user input while restore pending | 8/8 pending, released, no pull-back | **8/8 pending, released, no pull-back to the saved offset** (interrupt0 + interrupt1) |
Limits: stress delays are synthetic; content arriving later than the quiet window (>2.5 s gap) or beyond 8 s is left to the browser. After a user's own touch, later content movement is the page settling (baseline too); `visibleDriftFromSwipe` 0–802 px in F2 vs 0–1 px baseline is NOT proven to be restore-related (the tracked element mounts late in a partial layout) and is not claimed either way; no pull-back to the saved offset was seen.

## Combined build, mobile main flow (7 runs, 0 invalid, 0 misses; `raw/final-main.json`)
position back→Home 7/7, forward→World 7/7, new entry top 7/7+7/7, direct+in-page anchors 7/7+7/7, cross-page `/world#world-sources` not honoured 7/7 (unchanged, page-owned). Time (median [range] ms, separate): back→Home 314 [269–664], forward→World 200 [191–264], new entry World 1589 [1535–2110]. CLS: back→Home 1.70 [0–2] (7/7 >0.1; Home/Discovery reveal, unchanged owner), forward→World 0 (0/7 >0.1).
