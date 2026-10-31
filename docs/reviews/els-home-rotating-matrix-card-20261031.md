# ELS entrance card on the 2029 Home — 31 October 2026

Task key `ELS_HOME_ROTATING_MATRIX_CARD_HANDOFF_20261031` (handoff row `840b197a`, GPT → ZURIEL).
Branch `ccr-4f7f2318-32ormn` over `origin/gpt/elections-world-seed-integration-20261030` =
`4b342d12f3f1b2eb5176e4a6cf4d10c125145d38` (verified equal to the handed-over remote HEAD before work).
All browser/perf evidence below was measured on that base plus this change. The integration branch then advanced to
`d52ff6b834fbbaf69d2fa79177750c4bdf73c2ad` (One Tree CI gate: `package.json`, a workflow, a script, tests, a doc —
no `src/` file, no overlap); this change was rebased onto it, the clean merge was checked, and `npm run build`
(now including `test:one-tree-content`) and the static tests were re-run and pass. `origin/main` at the time:
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. The final commit SHA and the
Preview status are recorded in the coordination AFTER, not in this file. **Nothing here is deployed,
merged, or released; this is a Preview-only branch result.** Ownership of Home as a whole stays with the
existing Home owner; this scope was a bounded component plus one slot and one callsite.

## What was built

A full-width entrance card between the existing world story and the cipher/video strips:

- **Two foci.** (1) A softly swaying, lit Hebrew letter matrix with one golden thread through four letters
  (an illustrative equal-step line, *not* a result). (2) A dark live panel: title, one factual sentence, the
  `פתח את הצופן` action to the existing `/code` route, and the note `מטריצה להמחשה`.
- **Depth.** A dim flat far layer stays still behind a lit near layer that sways in 3D (`rotateX/Y/Z`, 46 s,
  alternate). The relative motion is the depth cue; in the static / reduced-motion pose the tilt still shows it.
- **Live UI, not image.** Title (`h2`), sentence, action (`a href="/code"`), note and the pause control are DOM
  text/controls. The matrix is `aria-hidden` decoration drawn from ~220 spans — no image, no new asset.
- **Layout.** Wide (≥720px container): panel on the start edge over the matrix, 412px minimum height.
  Narrow: matrix on top at a fixed 5:4 ratio, panel overlapping its lower edge. Heights are fixed per state.
- **Copy.** Title `חיפוש בצופן התנ״כי`; sentence `דילוגי אותיות בתורה ובכל התנ״ך, עם אימות כל מופע במנוע.`

### Decisions for ZURIEL (flagged, reversible)

1. **The suggested subtitle `AI · מנוע חיפוש עוצמתי` is not used.** It was offered "only if it matches the
   available capability". It does not: the existing ELS guided page states `בלי ניחוש של AI`; the engine is
   deterministic and AI appears only through Raziel, which has its own lock. The sentence above is limited to
   what the UI states (`כל התנ״ך` scope option, `מאמת כל מופע`). Wording remains ZURIEL's to approve.
2. **A bounded "Night window" in all three presets.** The user asked for a dark panel that guarantees
   legibility over a luminous matrix. The card therefore reads the *Night* roles from the palette owner
   (`DESIGN_V2_PALETTES.dark`, no literal colours) and stays dark in Day and Parchment, framed with the host
   border. This is a bounded content treatment (Brand-atmosphere moment, §7), not a fourth theme.
3. **No translucency blur on the panel.** `backdrop-filter` over moving content re-rasterises every frame; the
   panel is a plain translucent surface instead (worst-case contrast is tested against a white backdrop).
4. **Placement** is a single optional `elsEntry` slot after `story` and before the ciphers/videos section.
   Moving it is a one-line change in `HomeComposition2029.jsx`.

## Availability and motion (existing mechanisms only)

- `useFeatureState("lock_els")` from `MaintenanceLock.jsx` — the same hook `Els2029Page` uses. Nothing is
  enabled locally. Open: live link to `/code`. Loading: non-link status `בודק זמינות…`. Blocked: non-link
  `הצופן ייפתח בקרוב`, or `פתוח למשתמשים רשומים` for `mode: anon`. All states occupy the same box (verified).
  Live DB at test time: `lock_els.enabled = false` (open).
- One CSS animation (`transform` on the rig). Paused when off-screen (`IntersectionObserver`), when the tab is
  hidden (`visibilitychange`), and by a visible 44×44 pause toggle (`aria-pressed`). Absent under the OS
  `prefers-reduced-motion` and the frame's `data-frame-reduced-motion="true"`; the pause control is not
  offered when nothing moves.
- No ELS engine, scan, AI call or result load. The only network change is **one additional
  `GET /rest/v1/site_flags`** (the existing availability reader; each `useFeatureState` consumer issues one).

## Files

| File | Change |
| --- | --- |
| `src/components/experience2029/ElsRotatingMatrixCard2029.jsx` | new |
| `src/components/experience2029/elsRotatingMatrixCard2029.css` | new |
| `src/components/experience2029/HomeComposition2029.jsx` | additive optional `elsEntry` slot (3 lines) |
| `src/pages/Home2029Page.jsx` | import + one prop at the existing callsite (2 lines) |
| `test/els-home-card-2029.test.mjs` | static contract (11 tests) |
| `test/els-home-card-2029.browser.mjs` | real-browser acceptance |
| `test/els-home-card-2029.perf.mjs` | local before/after measurement |
| `docs/reviews/els-home-rotating-matrix-card-evidence-20261031/` | screenshots (WebP) + JSON reports |

Untouched: hero, posts, reality river, story, arrivals, palette, Frame, readers, data, permissions, Legacy,
ELS engine/pages, `/code` route.

## Verification (local, Chromium headless; static builds from 127.0.0.1; real anonymous Supabase reads)

- `node --test test/els-home-card-2029.test.mjs` — 11/11.
- `test/els-home-card-2029.browser.mjs` — 0 failures: widths 320/390/768/1440 × Day/Parchment/Night.
  No horizontal page/card overflow; card inside viewport; height stable (±1px between samples);
  title Rubik 650–780 (700), line-height ≥1.04; sentence Noto Sans Hebrew ≥16px (≥18px desktop); note ≥14px;
  action ≥44px tall/wide and ≥16px; pause ≥44×44; worst-case contrast ≥4.5 for title/sentence/note and for the
  button label on every gradient stop; real fonts loaded; no page errors; exactly one running animation.
  Reduced motion (OS) at 390/1440: nothing animates, static tilted pose kept, pause control not offered.
  Gates: running when visible → paused off-screen → resumes → paused in hidden tab → resumes.
  Keyboard: pause control and action reachable by Tab, Space/Enter toggle `aria-pressed` + play state, focus ring
  `solid 3px`, Enter on the action opens `/code`.
  Availability through the real feature-state mechanism (a build **without** the preview bypass, `site_flags`
  intercepted): open, closed, registered-only, no row, and loading→open (height unchanged).
  Requests vs. the base build: exactly `+1 site_flags`; nothing ELS/AI/engine-shaped.
- `node scripts/test-legacy-production-lock.mjs` PASS; `npm run build` PASS (legacy + 2029).
- Related existing guards pass (`home-preview-2029-route`, `date-display-rule-2029`, `life-journey-2029-chain`,
  `test-home-2029-system-pulse`, `test-2029-system-frame`, `test_canonical_presentation`,
  `test-2029-world-surface`, `test-2029-cheap-hardening`). Three existing guards fail **identically on the
  untouched base `4b342d12`**: `test/public-internal-year-copy.test.mjs` (#2),
  `scripts/test-public-2029-language.mjs` (#2), `scripts/test-connected-golden-2029.mjs`. Not caused by this change.

### Asset weight (build diff, content-hash normalised)

No new file and no binary/media/font asset. Home chunk JS 50,449 → 55,668 B (gzip 14,803 → 16,626);
Home chunk CSS 15,892 → 22,545 B (gzip 3,349 → 4,979). All assets +11.6 KB raw / **+3.4 KB gzip**.

### LCP / CLS / frame cadence — before vs after, same machine, same conditions (LOCAL, not hosted)

Median of 6 interleaved ABBA runs per side, fresh context each run; throttled profile = CPU 4×, 1.6 Mbps/150 ms.
Raw per-run values are in `local-before-after-perf.json` (its `frame_*` fields compare the top of the page on the
base build with the card centred on the new build, so they are *not* like-for-like; use the card-vs-hidden-card
A/B below).

| | desktop 1440 before | after | mobile 390 (throttled) before | after |
| --- | --- | --- | --- | --- |
| LCP | 1,992 ms | 2,282 ms | 12,518 ms | 10,922 ms |
| LCP element | post image `IMG.h29-media` | same | `H1` / `SPAN` | same |
| CLS (load + scroll through) | 0.141 | 0.144 | 0.794 | 0.640 |
| Requests | 160 | 161 (+`site_flags`) | 149 | 150.5 |

Reading these honestly:

- **LCP is not the card.** The card is below the fold at every tested width and is never the LCP element.
  Desktop medians differ by +290 ms but the ranges overlap (before 1,804–2,340; after 2,012–3,532 with one
  3.5 s outlier); the mobile LCP is bimodal (≈9.1 s / ≈12.5 s) on both sides. With n=6 and live network reads this
  does not establish a difference in either direction. **A hosted-Preview measurement is still required.**
- **The card's own layout is stable** (fixed height in every state and across font load), but **CLS is high on
  the existing Home on both sides** (0.14 desktop; 0.5–1.7 throttled mobile) — late content above/below the
  card. When the card is on screen during such a shift, its `Reveal` wrapper is moved as a passive element and
  adds to the *score* of that existing shift (attribution run: involving-card 0.23–0.44 of 0.47–0.79 total;
  the largest outlier, 0.76 of 1.70, came from sections below it). The cause is upstream skeleton→content height
  changes in the existing Home sections, owned elsewhere; this scope neither created nor fixed it.
- **Frame cadence** (software rasteriser — no GPU in this environment, so absolute numbers are pessimistic):
  median frame 16.7 ms with the card on screen at 1440 and at 390/CPU 4×. Same page with the card hidden:
  desktop ≈124 vs ≈105 frames per 2.5 s (the card costs roughly 15% of throughput in software raster); mobile
  throttled equal within noise. **First version measured ~100 ms median frames** (five 3D layers with
  `filter: drop-shadow/blur`); removing every `filter` and flattening the far layer brought it to the numbers
  above. A static test now forbids `filter`/`backdrop-filter` in this stylesheet. No real-GPU or real-phone
  measurement was possible here.

## Not verified / not claimed

- No hosted Preview was available from this environment: **not deployed**. The exact commit is handed over for
  integration; any hosted LCP/CLS/GPU result must be recorded separately.
- No real-device (GPU, iOS Safari) check; the `container` query units (`cqw/cqi`) and `color-mix` need a modern
  engine (same baseline as the existing Home CSS).
- Copy and the dark-in-all-presets decision await ZURIEL (Human Gate). `lock_els` was open in the live table at
  test time; production behaviour depends on that flag, never on this component.

## Re-run

```bash
node --test test/els-home-card-2029.test.mjs
node scripts/build-integrated-preview.mjs          # → preview-deploy/dist (after)
# build the base commit the same way into another folder (before), and a variant without
# VITE_UNLOCKED_2029_PREVIEW for the availability cases, then:
DIST=… LOCKED_DIST=… BASELINE_DIST=… EVIDENCE_DIR=… node test/els-home-card-2029.browser.mjs
BEFORE_DIST=… AFTER_DIST=… RUNS=6 EVIDENCE_DIR=… node test/els-home-card-2029.perf.mjs
```
