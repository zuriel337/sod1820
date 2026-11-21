# Royal Palace — three options, draft PR #1469

**Comparison only. No production/default component change, merge, deployment, database write, active-contract change or new PR.**

Same branch `codex/royal-palace-shared-intro-v1-20261121`; incoming code/evidence head `17fb67610e21814869a88afcce06ced9288cfef0`; main/base `d353b62a520a009b130970dc82c17ad00a43ad96`. Draft state verified before work. AGENTS, CLAUDE §0 and Owner Index were reread; prior contract/decision review is recorded in [the continuation report](../royal-palace-compact-full-20261121/README.md). Canonical `work_log_current` returned no active overlapping Royal/SystemFrame/DesignV2 writer. It was queried read-only; this report is the handoff to ZURIEL.

## Actual visual alternatives

[18 real browser screenshots: World, Heichal, Books × mobile/desktop × three options](preview.html).

- **Compact**: current PR implementation, unchanged compiled output.
- **Strip**: same original approved responsive palace WebP, constrained to a 72px decorative strip, `object-fit: cover; object-position: center 20%`. The palace atmosphere is cropped for presentation; the original logo is never cropped. Existing frame, area medallion, title, description, help and navigation remain. Padding/gaps and title size are reduced using existing geometry and tokens.
- **Crown + frame**: same reduced geometry as Strip, but the picture element is omitted entirely before React renders it. The intact original crown/lockup remains in the existing global header, and the canonical area medallion remains in the intro. No new crown image, duplicate logo or hidden/delayed content. The palace image is not requested.

These are **review fixtures**, not three deployed product modes. `test/royal-palace-three-options-fixtures.py` copies a successful default `dist` build to isolated scratch directories and changes only the identified structural/decorative CSS and the optional picture expression in the crown fixture. The exact transformations and SHA-256 outputs are recorded in `fixture-manifest.json`. This intentionally avoids selecting a new production default without a visual decision. Compiled fixture filenames retain their original hashes: **never deploy these directories**. A selected variant needs implementation through the existing shared source component and a fresh normal build.

## Measurement method and limits

108 observations: three rotating-order runs × three alternatives × three routes × 390/1440px widths × first/repeat visit. Viewport height 900px, local Chromium, no CPU/network throttling, same compiled application and same public-response fixtures, fresh browser context for each cold visit followed by navigation in the same context for warm. Asset server supplies immutable cache headers. No simultaneous build or second browser suite during timings.

Heichal's public lock is bypassed **only in the browser's received public flag response**, as in the earlier acceptance suite; no database flag changes. Only allowed public reads reach Supabase. This is not authenticated/live-production performance or mobile-hardware testing. First visit means cold browser asset cache, not a cold backend/CDN: public responses are primed identically before all arms.

LCP is the browser PerformanceObserver value captured after the actual useful element exists plus 1.2 seconds. The second metric is a **measured next-animation-frame visibility proxy**, not an actual Element Timing paint or complete interactivity guarantee. It measures the first viewport intersection of the real World story heading, Heichal query input or Books grid. `usefulDom` separately records layout presence, even below the viewport. All raw LCP candidates, ranges, resource sizes and observations are retained. With n=3, small differences cannot establish a reliable speed improvement.

## Results

Median milliseconds. Each cell is **LCP / useful-content visibility**. Full min/max ranges: [summary.json](summary.json); individual observations: [repeated-metrics.json](repeated-metrics.json).

| עמוד / רוחב | ביקור | Compact LCP / תוכן | רצועה LCP / תוכן | כתר ומסגרת LCP / תוכן |
|---|---|---:|---:|---:|
| world / 390 | ראשון | 520 / 571 | 576 / 528.6 | 620 / 565.2 |
| world / 390 | חזרה | 404 / 441.5 | 480 / 443.6 | 524 / 476.3 |
| world / 1440 | ראשון | 608 / 639.7 | 540 / 606.2 | 696 / 571.5 |
| world / 1440 | חזרה | 500 / 535.1 | 452 / 485.9 | 632 / 482.1 |
| heichal / 390 | ראשון | 544 / 493.4 | 556 / 493 | 148 / 482.4 |
| heichal / 390 | חזרה | 444 / 381.7 | 436 / 378.4 | 64 / 385.6 |
| heichal / 1440 | ראשון | 612 / 482.5 | 584 / 476.9 | 564 / 474.3 |
| heichal / 1440 | חזרה | 532 / 383.8 | 480 / 385.8 | 476 / 386.2 |
| books / 390 | ראשון | 488 / 500.2 | 536 / 505.8 | 548 / 509.2 |
| books / 390 | חזרה | 380 / 406.1 | 440 / 389.8 | 452 / 404.9 |
| books / 1440 | ראשון | 556 / 594.3 | 568 / 581.6 | 156 / 570.9 |
| books / 1440 | חזרה | 464 / 421.2 | 472 / 403.7 | 76 / 457.3 |

## Reproduction

1. `npm run build`
2. `python test/royal-palace-three-options-fixtures.py`
3. Serve the three copied directories on localhost ports 4191 (compact), 4192 (strip), 4193 (crown), with SPA fallback to `2029.html` and immutable `.webp/.js/.css/.woff2` headers. See `serve-review.py`.
4. `python test/royal-palace-three-options-2029.browser.py`
5. After timed runs finish: `python test/royal-palace-three-options-checks.browser.py`
6. `node scripts/test-2029-shell-budget.mjs` (normal build); fixture `--dist` values are separately checked, without raising thresholds.

Raw evidence from earlier main/V1/Compact/Full comparison remains untouched. The new comparison does not claim to rerun main, to resolve its full release acceptance, or to implement changes to posts, left rail, central Raziel or the four actions.

## Interpretation, weights and acceptance

There is **no universal performance winner**. Strip is a visual compromise, not a demonstrated general speed fix. Both lower options save 26px of vertical intro space on mobile and 39.6px on desktop, with the same complete text and controls.

- Heichal/mobile/warm: crown changes LCP **444 → 64ms** but useful input visibility **381.7 → 385.6ms**. The small original header logo becomes the last LCP candidate; the research tool did not become 380ms faster.
- Books/desktop/warm: crown changes LCP **464 → 76ms**, while useful grid visibility actually worsens **421.2 → 457.3ms (+36.1)**. Again, an earlier logo LCP does not mean earlier useful content.
- World/mobile/warm: Strip LCP **404 → 480ms (+76)**, crown **404 → 524ms (+120)**; useful content **441.5 → 443.6 / 476.3ms**. The story cover, not the reduced/absent palace, is now the largest visible image. On desktop crown's LCP also worsens **500 → 632ms**, even while useful heading visibility improves **535.1 → 482.1ms**.
- Books/mobile/warm: Strip/crown LCP **380 → 440 / 452ms**, now measured against content text. Strip useful visibility improves **406.1 → 389.8ms**, crown is **404.9ms**. These are local medians with overlapping variability, not statistical claims.
- Maximum observed CLS across all 108 navigations: **0.0002378253**. No horizontal overflow. All 36 warm palace requests transferred **0 bytes**. Crown made **zero palace requests** across all its 36 navigations. Removing the image does not remove the existing route reveal delay.

[Exact changes from Compact](delta-from-compact.json), including every cold/warm condition. Do not compare this run's absolute timings directly to the earlier run as if the machine/session were identical.

| Bytes | Compact | Strip | Crown + frame |
|---|---:|---:|---:|
| Eager JS gzip / files | 203,424 / 17 | 203,424 / 17 | 203,424 / 17 |
| Frame JS gzip / files | 47,127 / 3 | 47,127 / 3 | 47,127 / 3 |
| Frame CSS gzip | 34,225 | 34,318 | 34,318 |
| Palace image mobile | 30,098 | 30,098 | 0 |
| Palace image desktop | 89,134 | 89,134 | 0 |

All values are measured. Strip does **not** reduce image download bytes: it uses the same approved file. Added review CSS is +93 gzip bytes in the frame; no source baseline/tolerance or static import changes. Crown removes 261 raw bytes from the lazy RoyalIntro JS; exact lazy JS/CSS bytes in [fixture-file-weights.json](fixture-file-weights.json). Per-navigation local JS/CSS/image totals are retained under `weights` in the raw results; the local server serves JS/CSS uncompressed, so these are not production gzip transfer claims. External public-response transfer sizes are not included in those local totals.

Passed: `npm run build`, normal shell budget, both modified fixture shell budgets, two focused Palace source tests, and the timed 108-observation run. All **36 geometry/keyboard cases passed** (three arms × three routes × 320/390/768/1440): RTL, one intro H1, no help/medal overlap, 44px help target, Enter/Escape and focus restoration, reduced-motion, identical canonical icons and hrefs, and expected image request counts. See [geometry-keyboard.json](geometry-keyboard.json). Link targets were compared; every destination was not re-navigated in this comparison. No source functionality changed, so the earlier broad implementation checks were not redundantly rerun.

Incoming head CI: **18 passed / 1 failed** ([snapshot](incoming-ci.json)). The failed [Production Canary Gate](https://github.com/zuriel337/sod1820/actions/runs/44874945262/job/136757490132) reports the pre-existing `latest_canary_failure` on main/base `d353b62`, pointing to [production canary run 44854981457](https://github.com/zuriel337/sod1820/actions/runs/44854981457). The guard is not bypassed. No new deployment was made to clear it.

Still incomplete: selecting and implementing a production alternative; proving zero regression against main; real mobile hardware/throttled/field performance; release-canary recovery; any new live preview deployment. Day/parchment and exact-return behavior were validated in the prior implementation report, not re-measured for all three review fixtures. This comparison alone is not release approval. PR #1469 remains draft.
