# Connected Royal — shared, cached, no entrance animation

**Branch-only implementation, Draft PR #1469. Not merged, deployed or approved for release.**

Repository `zuriel337/sod1820`; same branch `codex/royal-palace-shared-intro-v1-20261121`. Incoming head `0dd0e84d40e17e2549f5e0a923bd5617ee7dd91c`; freshly fetched main/base `d353b62a520a009b130970dc82c17ad00a43ad96`. Measured final runtime source `e191b66bba876b1793f354a85014e9a37da89887`. Later evidence/test/budget-ratchet commits do not change runtime behavior.

AGENTS.md, CLAUDE §0, Owner Index and Design V2 routing reviewed. Canonical readonly work_log_current checks found no overlapping active Royal/Shell, ELS/crown or statistics-strip writer before their respective edits. User explicitly chose Codex for this visual work, the connected palace prototype, a common presentation, removal of statistics strips, and no entrance animation. No DB/work-log/flag/contract write, no cherry-pick, no other-agent dispatch. Handoff: GPT (Codex ledger identity) → ZURIEL in this conversation.

## Implemented

One shared intro on every applicable System Frame caller: existing canonical area medallion, heading, description, small accessible help, connected palace below the intact global crown. Default intro callers use the same compact geometry; explicit Full remains opt-in. No per-page palette, new icon system, AI call or parallel navigation. Text height remains content-responsive rather than clipping long labels to force identical pixel heights.

The decorative picture is a separate small lazy module. It does not suspend the title/content, has an absolute reserved geometry, responsive AVIF/WebP sources and low fetch priority, with no timer, opacity entrance, perpetual animation, Canvas or video. Explanation code loads on demand. CSS uses the existing night/day/parchment roles. The browser may choose the decoration as LCP; we do not hide or delay it to manipulate the metric.

Current-page self-links (`כאן · …`) are removed from the intro projection only. Existing subject/source/selection destinations and the exact return callback remain; absent destinations are still text. No fake routes. Existing title/eyebrow/orientation identify the current place. World action groups and the left panel are unchanged. The existing selected-item card/Here seam remains; actual #1477 owner action registration and combined real-user action acceptance remain pending from the previous handoff.

`introVariant="none"` retains priority. Found and fixed a transient ELS library loading/blocked frame that previously lacked the same none decision and fetched artwork before the final library frame. Public post navigation keeps its own background, and special-series backgrounds, cover/share media and video-first behavior are unchanged.

### Statistics strip removal

Removed all nine mounts and their imports across seven callers: Calculator2029Page, CalculatorPro2029Page, CommunityCalculator2029Page, Number2029Page, Els2029Page, PublicLibraryContinuity2029Page and NowPublications2029. This removes their lazy reader/chunk and reserved strip space, rather than hiding a loaded row. The statistics capability/page, data readers, tracking and database are retained. Calculator word-of-day/recent-expression controls are not statistics strips and remain.

### Crown line and motion

The straight bar and existing single SVG curve share the canonical 2px stroke and gold token. Removed the former 3px-per-side overlap: the straight mask gap equals the arc width, so the endpoints meet at the same vertical centre. `non-scaling-stroke` preserves thickness when the mobile arc changes width. Existing reading-progress colour and crown folding on scroll remain; these are navigation feedback, not a new entrance animation. No logo crop/redraw/recolour. No new entrance animation; disclosure still supports its existing short open/close transition and reduced-motion preference.

## Artwork and browser cache

| Delivery | Old palace | New AVIF | New WebP fallback |
|---|---:|---:|---:|
| Mobile | 30,098 bytes | **18,859 bytes** | 25,496 bytes |
| Desktop | 89,134 bytes | **22,116 bytes** | 27,936 bytes |

The original approved assets remain intact. Mobile is re-encoded at 500×547. Desktop retains the visible band at 1000×600, cropping original rows 148–747; at the desktop minimum width and fixed 370px atmosphere height, the original width-driven cover crop never displays the removed rows. The crop offset follows the existing 30% object position (rounding under one source pixel), preserving the visible composition. The file is not a replacement generated image. See [source hashes, dimensions and encoder settings](assets.json).

Only four exact content-hashed derivative URLs receive `public, max-age=31536000, immutable` in the active public-reading hosting configuration (the pinned root config remains byte-identical). Public documents and service workers keep their no-store policy; no broad folder cache exception. Local browser checks verify a single selected image, AVIF decode, WebP fallback decode, and zero image transfer on subsequent same-width route visits. These are local same-policy checks, not verification of undeployed live headers. Cold visitors still download the selected image; cache eviction is possible.

## Coverage and screenshots

[Main versus final implementation — four screens, desktop/mobile](preview.html). Also retained: 24 theme screenshots (night/day/parchment at 390/1440), crown close-ups at DPR2 before/after scroll, and machine-readable acceptance results.

The current-main scan finds **37 files with 53 direct Shell/Frame call sites; 21 files have a possible intro path**, not the previously quoted 17. This includes conditional, fallback, preview and administrative cases; it does not mean all 21 show an intro on every visit. Both main and branch use the same inventory. [Possible paths and explicit-none counts](consumers.json); [main inventory](main-consumers.json). Browser coverage is not claimed for every conditional authenticated/preview state.

## Performance comparison

Fresh main and branch default builds, identical dependencies/toolchain, Chromium, 390×844 / 1440×900, no CPU/network throttling. Public data reads are primed and served identically; only the Heichal capability flag is opened in the browser-local fixture. Unknown/write RPCs are blocked. No build or second browser suite runs concurrently with timed observations. Three rotating-order runs per arm/route/width, each cold context then same-context revisit: **96 observations**.

LCP and CLS use PerformanceObserver; the useful-content measure is a next-requestAnimationFrame viewport-visibility proxy, not an actual paint or interactivity guarantee. Targets: World story heading, Heichal research input, Books grid, ELS mode selector. Cold means browser assets, not cold backend/CDN. Resource totals are local raw transfer observations, not production compressed JS/CSS claims. Min/max, all LCP candidates and per-navigation image/cache data are retained in [raw results](repeated-metrics.json) and [summary](summary.json). The first full-height-desktop experiment is preserved as `full-image-*`; it was not selected as the final proof.

All times below are median milliseconds over three runs; “תוכן” is the viewport-visibility proxy described above. Positive deltas are slower.

| מסך / רוחב | ביקור | main: LCP / תוכן | Royal: LCP / תוכן | שינוי LCP / תוכן |
|---|---|---:|---:|---:|
| world / 390 | ראשון | 664 / 586 | 504 / 537 | -160.0 / -49.0 |
| world / 390 | חזרה | 504 / 430.6 | 404 / 430.9 | -100.0 / +0.3 |
| world / 1440 | ראשון | 680 / 572.6 | 588 / 611.8 | -92.0 / +39.2 |
| world / 1440 | חזרה | 596 / 470 | 496 / 503 | -100.0 / +33.0 |
| heichal / 390 | ראשון | 1396 / 466.6 | 528 / 480.9 | -868.0 / +14.3 |
| heichal / 390 | חזרה | 68 / 383 | 436 / 378.8 | +368.0 / -4.2 |
| heichal / 1440 | ראשון | 608 / 472.1 | 620 / 481 | +12.0 / +8.9 |
| heichal / 1440 | חזרה | 540 / 384.5 | 524 / 385.8 | -16.0 / +1.3 |
| books / 390 | ראשון | 548 / 495.6 | 476 / 487.3 | -72.0 / -8.3 |
| books / 390 | חזרה | 440 / 403.4 | 388 / 400.1 | -52.0 / -3.3 |
| books / 1440 | ראשון | 168 / 561 | 544 / 576.6 | +376.0 / +15.6 |
| books / 1440 | חזרה | 76 / 400.5 | 460 / 411.6 | +384.0 / +11.1 |
| code / 390 | ראשון | 144 / 581.9 | 496 / 586.1 | +352.0 / +4.2 |
| code / 390 | חזרה | 72 / 437.2 | 404 / 445.2 | +332.0 / +8.0 |
| code / 1440 | ראשון | 148 / 637 | 568 / 621.4 | +420.0 / -15.6 |
| code / 1440 | חזרה | 92 / 478.5 | 476 / 457.5 | +384.0 / -21.0 |

**Performance acceptance remains BLOCKED.** This is not a zero-regression result. World desktop useful visibility is +39.2ms cold / +33.0ms warm; Books desktop is +15.6ms / +11.1ms. Warm Heichal mobile useful visibility improves 4.2ms, but LCP changes from 68ms to 436ms. Books desktop warm LCP changes 76ms→460ms. The candidate changes from the original crown/logo to the much larger palace image; this is still a real reported LCP regression and is not waived. World mobile LCP improves 664→504 cold and 504→404 warm, but its candidate also changes from story cover to palace, so it does not prove the story itself paints faster.

The warm Heichal traces locate the remaining delay **after cache retrieval**, not in downloading: image response ends at 62.1–79.8ms with transfer=0, the picture first appears in the rAF DOM sample at 363.1–378.8ms, and LCP is 428–444ms. Books desktop warm similarly has response-end 64–76.4ms, picture sample 357.9–375ms and LCP 452–460ms. The shared SPA render/mount and subsequent presentation remain on the critical path. These measurements isolate the network versus presentation delay but are not a CPU trace separating React scheduling, decoding and compositing; that finer diagnosis remains unfinished. No timer or entrance animation remains, and a stronger cache policy cannot remove that mount/presentation interval.

Maximum observed CLS: main **0.033677**, branch **0.038852**, both below the unchanged 0.1 gate; no horizontal overflow in 96 observations. Do not describe CLS as zero across the app. All 24 warm branch observations have zero palace transfer. The four routes reuse the same per-width image; local JS/CSS/image raw weights for every navigation are retained under `weights` in the raw results and [the resource-weight table](resource-weights.md). The build table below supplies compressed shared-JS/CSS comparison.

Recommendation: keep entrance motion off and keep this branch out of release while regressions remain. An image-free Royal header is the lowest-cost option; the approved image-bearing design is not proven faster than main. Retain the visual result for review rather than changing acceptance thresholds or hiding visible content to alter LCP.

### Shell budget (gzip bytes)

| Metric | Fresh main | Final branch | Delta |
|---|---:|---:|---:|
| Eager JS / files | 203,358 / 17 | 203,379 / 17 | +21 / 0 |
| Frame JS / files | 47,189 / 3 | 46,228 / 3 | −961 / 0 |
| Frame CSS | 34,329 | 34,213 | −116 |
| Combined | 284,876 | 283,820 | **−1,056** |

This excludes the separately requested optional artwork/module: adding a palace is not free compared with main's image-free intro. Entry JS alone is 21 bytes larger; the complete eager/frame/CSS total is smaller. Both default and dormant public-reading build gates pass. Public-reading measurements: eager 203,397, frame 46,237, CSS 34,213. The existing public eager baseline was ratcheted **down** 203,429→203,397; no baseline/tolerance/threshold was increased.

## Verification and failures

Passed locally: default `npm run build` and shell budget, dormant public-reading build and budget; 38 distinct Node tests across crown, artwork/statistics mounts, exact cache rules, public-continuity closure, intro, share/action, palette and post-video contracts; seven graph/frame/navigation gates in `gates.json`; 48 browser UI cases (four routes × four widths × three themes), six DPR2 crown/scroll cases, three on-demand help checks, six selected-item card/Here fixture pairs, and route/cache/WebP/none transitions. Timed comparison contains 96 observations. Selected-item checks use a synthetic owner registration and do not prove the outstanding real-owner integration.

Crown test calibration: the first centre assertion incorrectly used viewport/document width although the rendered header excludes the 15px scrollbar gutter. It now compares against the actual header centre with the same <1px tolerance. No product shift or tolerance relaxation was needed. Fresh top/scrolled DPR2 cases pass.

Resolved failures: initial eager budget exceeded by 19 bytes (delivery mapping moved into lazy module; no raised limit); cache allowlist/order rejected new derivative rules (exact fingerprinted allowlist extended with existence/hash checks and rules moved before the final worker rule); fresh ELS library fetched artwork during its loading frame (the none decision now applies to that frame too). Preliminary UI runs invalidated by style changes were rerun against stable final builds. The initial root hosting-header change also failed the pinned root-config hash contract; the root file was restored byte-for-byte and the fingerprinted cache rules retained only in the public-reading config. Its unchanged pin and all seven public-continuity tests now pass. No failure was bypassed.

CI snapshot for `fe38f4690941a5b2799604b491f4fa0f7b2358d5`: **13 passed, 5 in progress, 0 failed** at capture. Includes passing perf/release/live contracts, public-core, ELS core, mobile/accessibility, marketing browser, isolated acceptance, canary and locks. ELS browser shards 1–3, auth browser and hard-isolation were still running; no claim of full CI completion. See [exact jobs and URLs](ci-fe38f46.json). A later evidence-only commit triggers its own CI and must be checked separately.

Remaining: real #1477 action-owner integration and authenticated end-to-end actions; field/real-device/throttled performance; live header/deployment verification; performance acceptance as described above. No approval to merge or deploy follows from build/CI success.

## Reproduction

Serve the freshly built main worktree on 4200 and final `dist` on 4203, with SPA fallback and the same immutable AVIF/WebP/JS/CSS cache headers. The general UI suite uses 4201 pointing to that same final `dist`. Run `test/royal-connected-repeat-2029.browser.py` alone, then `test/royal-connected-report.py`; run other browser suites separately. The public build command is `node scripts/build-public-reading-production.mjs` (dormant artifact, not a deployment). No production candidate activation was requested.

## Handoff to ZURIEL

Actor: GPT (Codex). Task key: Royal Palace Shared Intro V1 / PR1469 connected crown continuation. Owner/scope: shared Frame/Royal presentation, help, crown line, statistics-strip removal; real action implementations remain with their owners. State: DOCUMENTED / IMPLEMENTED / COMMITTED / BRANCH-ONLY; ready for visual review, **not release-ready**. No merge, deployment or production/DB/config activation. The same draft PR and branch are retained. Current-runtime tests and exact base are above; final evidence SHA is supplied in the conversation and PR head. Open threads: performance regressions/presentation profiling, real #1477 action registration, authenticated journey, field performance and undeployed live cache headers. No agent dispatch or work-log write was performed.
