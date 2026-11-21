# Royal Palace Compact / Full — continuation of draft #1469

**BRANCH ONLY. Release acceptance remains incomplete; no merge or deployment.**

- Repository: `zuriel337/sod1820`; same branch `codex/royal-palace-shared-intro-v1-20261121`, same [PR #1469](https://github.com/zuriel337/sod1820/pull/1469).
- Main/base rechecked: `d353b62a520a009b130970dc82c17ad00a43ad96`.
- Resumed head: `3a9ffd43852379352047009f27a61463751d7af2`.
- Implementation: `e89184903fc07f9415d0da2f67d6302e95293620`; exact-title dedup and screenshot settling: `6bcd4e4562839007197b78f7a4ad8449917d0cae`.
- PR was found **ready**, contrary to the requested draft state, and was explicitly converted back to **draft** before code work.

## Decisions and boundaries

Re-read AGENTS, CLAUDE §0, Owner Index, main Design V2 §§10/14, PR #1475 at `207cf0f6da384ab6295087d5044e4c7147cf1bad` (particularly 10.6–10.8, 14.11), PR #1474 at `84706352cf73279298f06a2d96962d14be68fd2a`, and the action plan #1470. The other PRs are decision/control references only: no cherry-pick, contract edit or implementation takeover. The current user's explicit Compact/Full brief governs this scoped continuation; proposed full-site role matrices are not treated as active contracts.

Canonical `work_log_current` was queried read-only for Royal/System Frame/Design and active writers, and again for the topbar role fix. No overlapping active claim was found. Open PRs were checked; #1472 owns Post reading/media/comment changes, #1463 owns first-document work, and the other Post/World drafts remain separate. No database or passive work-log write was made; this is the report to ZURIEL.

The existing 37-interface-file / 17-possible-intro inventory remains applicable, plus App's gate caller. [Exact consumers](../royal-palace-shared-intro-20261121/consumer-inventory.json). All inherit Compact when an intro is actually rendered. The topbar token correction affects every SystemFrame route, including `none`, without adding an intro. Explicit `none` still omits it. Existing `hero` callers no longer silently request a large introduction; Full requires `introVariant="full"`. No consumer is automatically opted into Full. The World/Heichal/Books Full presentations below are **review comparisons**, not a proposed automatic route policy.

## What changed

- One existing SystemFrame intro, one approved WebP pair, one Royal hall/frame/medal/button family and context-navigation mechanism. No new design system, palette, store, route or engine.
- Compact: 44px medallion, less top padding, tighter spacing and readable heading/lead; the 44px help and navigation targets remain. It removes 96.8px on mobile and 107.6px on desktop relative to V1 for World/Heichal; Books saves another 25.6px by omitting its eyebrow when it exactly repeats the H1. Full adds 66px on desktop / 70px on mobile relative to Compact using the same component and asset.
- Removed the inherited `is-compact` legacy styling hook: its old copy/icon entrance animation no longer adds a second animation on top of Royal. Live title/description are immediately visible when the route commits. Royal retains its finite medallion/frame motion and reduced-motion rules.
- Fixed the 320px help/medallion overlap with horizontal button padding, not smaller text or touch height.
- Night topbar glass now uses existing `--s29-frame`, rather than the warm editorial `--s29-panel` resolved on the root. This implements main Design V2 §14.9 with the existing palette. Day/Parchment overrides are unchanged; no new research-blue palette values or route-local colors.
- Post covers/OG/media readers, four-action row, left rail and central Raziel behavior are untouched. Their decisions are preserved, not falsely reported as implemented by this PR.

## Real browser comparisons

[Local screenshot comparison gallery](preview.html). This is a screenshot gallery of the compiled app, not a deployed or interactive live site.

| Surface | Mobile Compact / Full | Desktop Compact / Full |
|---|---|---|
| World | [Compact](world-390-compact.png) · [Full](world-390-full.png) | [Compact](world-1440-compact.png) · [Full](world-1440-full.png) |
| Heichal | [Compact](heichal-390-compact.png) · [Full](heichal-390-full.png) | [Compact](heichal-1440-compact.png) · [Full](heichal-1440-full.png) |
| Books | [Compact](books-390-compact.png) · [Full](books-390-full.png) | [Compact](books-1440-compact.png) · [Full](books-1440-full.png) |

Heichal remains publicly locked. Its acceptance uses a **browser-local read-response fixture** changing only the received `lock_heichal` value; no DB flag changed. Full is selected by a browser-only `data-intro-variant` override exercising the real shared CSS before paint. There is no product query flag, new route or production override. Day/Parchment/Night reduced-motion screenshots and keyboard checks are included separately.

## LCP investigation — what the evidence establishes

The old Heichal warm LCP of ~64ms represented the already-visible **brand logo**, not the usable Heichal. [Base trace](main-commit-profile.json): warm logo LCP 56/68ms, but the page intro enters the DOM at 340.7/355.6ms. [V1 trace](v1-commit-profile.json): cached palace image response ends at 59.1/70.9ms, intro/image commit at 340/351ms, palace LCP at 460/444ms. The palace is simply a much larger eligible image (123,895px in this 390px V1 trace vs 24,012px logo).

There are two different costs: route reveal after the initial loading/fallback frame, and paint after commit. Image bandwidth/cache is not the dominant warm delay. The existing App route Suspense boundary and React DOM's `globalMostRecentFallbackTime + 300` retry scheduling are consistent with the ~300ms reveal gap present in **both** base and Palace. This is source-plus-browser timing evidence, not a CPU trace proving every millisecond's attribution. The residual post-commit paint delay is recorded, not attributed to network.

Experiments rejected: moving the picture into eager markup and effect-loading help did not eliminate the route delay and increased shared bytes; synchronous image decoding/default priority did not improve the repeated results consistently. Both were reverted. No React internals, timers, global route loader or other writer's first-document work were patched. No LCP exclusion, hidden palace, delayed content, placeholder LCP trick or threshold increase was introduced.

**The absolute warm LCP gap against main is not resolved.** Compact improves vertical access and removes the redundant copy animation, but passing byte budgets and changing the LCP candidate do not constitute the requested zero-slowdown acceptance. This draft must not be released on that claim.

## Build weights and image bytes

Default builds, gzip with the same default zlib setting as the shell gate. [Machine-readable weights](build-metrics.json).

| Metric | Main | V1 | Compact / Full |
|---|---:|---:|---:|
| Eager JS files | 17 | 17 | 17 |
| Eager JS gzip | 203,373 | 203,438 | 203,424 |
| Frame JS files | 3 | 3 | 3 |
| Frame JS gzip | 47,178 | 47,153 | 47,127 |
| Frame CSS gzip | 34,329 | 34,223 | 34,225 |

Combined entry/frame JS+CSS: **38 bytes smaller than V1, 104 smaller than main**. Individual metadata/CSS differences remain visible above; this is not a claim that every metric shrank. No new static import or initial graph file. Public-reading gate also passes. Its baseline was **lowered 10 bytes only** by the required existing ratchet; no tolerance or budget increased.

Artwork bytes/hashes unchanged: mobile `bc3e82850af6` **30,098 bytes**, desktop `61280d3bdc55` **89,134 bytes**. Compact and Full use the same responsive source, not separate downloads.

## Repeated performance measurements — final implementation

144 observations: 3 runs × 4 arms (main, V1, Compact, Full) × 3 routes × 2 widths × cold/warm. Arm order rotates per run. Same local Chromium, 900px viewport height, unthrottled desktop CPU/network, default compiled builds, public-response fixture cache primed before timing. Each cold observation uses a fresh context; warm revisits reuse it. No concurrent build or other browser suite. Full uses the documented review-only presentation override. Latency repetitions cover **390 and 1440**, not all four widths; geometry/keyboard cover 320/390/768/1440. These are local lab measurements, not production/mobile-hardware/field Web Vitals or statistical proof of zero regression.

The useful-content metric is a **measured rAF visibility proxy**, not a browser paint event or interactive-ready guarantee: first frame after an actual flight-story heading / Heichal query input / loaded Books grid intersects the viewport with visible geometry. No synthetic placeholder is counted. `usefulDom` also records when it exists visibly in layout, even below the viewport. The raw field `usefulPaint` names this proxy, not a direct Element Timing paint measurement.

[All observations](repeated-metrics.json) · [Median/min/max per cell](performance-summary.json). Local server transfers are uncompressed; `weights` records measured local resource totals, while the separate build table reports gzip. One sample does not replace the other.

### Median LCP, ms (n=3 per cell)

| Route / width / cache | Main | V1 | Compact | Full |
|---|---:|---:|---:|---:|
| world / 390 / cold | 640 | 504 | 500 | 500 |
| world / 390 / warm | 520 | 400 | 404 | 396 |
| world / 1440 / cold | 684 | 588 | 604 | 608 |
| world / 1440 / warm | 572 | 540 | 512 | 524 |
| heichal / 390 / cold | 1116 | 508 | 520 | 516 |
| heichal / 390 / warm | 60 | 436 | 428 | 432 |
| heichal / 1440 / cold | 612 | 548 | 628 | 604 |
| heichal / 1440 / warm | 548 | 460 | 520 | 516 |
| books / 390 / cold | 512 | 472 | 464 | 484 |
| books / 390 / warm | 436 | 392 | 392 | 392 |
| books / 1440 / cold | 148 | 552 | 548 | 548 |
| books / 1440 / warm | 80 | 460 | 464 | 460 |

### Median useful-content visible frame, ms (n=3 per cell)

| Route / width / cache | Main | V1 | Compact | Full |
|---|---:|---:|---:|---:|
| world / 390 / cold | 569 | 559.5 | 544.3 | 558.5 |
| world / 390 / warm | 453.9 | 439.3 | 431.4 | 426.7 |
| world / 1440 / cold | 566.7 | 632.9 | 645.9 | 639.7 |
| world / 1440 / warm | 435.4 | 547.5 | 521.6 | 554.7 |
| heichal / 390 / cold | 472.7 | 457.8 | 458.7 | 463.8 |
| heichal / 390 / warm | 371 | 377.9 | 372.5 | 389.8 |
| heichal / 1440 / cold | 468.8 | 470.6 | 486.5 | 483.2 |
| heichal / 1440 / warm | 388.7 | 387.2 | 384.2 | 381.1 |
| books / 390 / cold | 480.8 | 496.3 | 489 | 496.4 |
| books / 390 / warm | 403.7 | 397.9 | 404.6 | 401 |
| books / 1440 / cold | 575.9 | 582.6 | 586 | 569 |
| books / 1440 / warm | 446.1 | 460.9 | 460.7 | 459.4 |

**Regression accounting:** warm Heichal 390 LCP remains **60 → 428ms** vs main; useful input is **371 → 372.5ms**. Warm Books desktop LCP remains **80 → 464ms**, and useful grid **446.1 → 460.7ms**. World desktop useful content is later than main (**435.4 → 521.6ms** warm), although earlier than V1 (**547.5 → 521.6ms**). Heichal desktop is slower than V1 in LCP (**460 → 520ms** warm; **548 → 628ms** cold). These regressions are reported, not dismissed as noise or compensated by wins elsewhere. Compact vs Full has no consistent latency advantage in this small lab sample; its reliable improvement is vertical density and earlier physical access to content.

Maximum measured CLS across all 144 observations: **0.0002378253**. Horizontal overflow: **0** observations. All **54** warm Palace image observations (V1/Compact/Full) transferred **0 bytes**. Files are unchanged; no second Compact/Full image.

### Confirmed scheduler diagnostic

[Forwarding-only timer diagnostic](timer-diagnostic.json) records, for example, React scheduling at 50.4ms with 298.3ms delay, then at 67.4ms with 281.3ms delay: both target ~348.7ms. The stack points to `2029-DBWrQbGz.js:9:124248`, whose emitted code is `i=md+300-Ue()` followed by `timeoutHandle=...(..., 'Throttled', ..., i)`. This matches `globalMostRecentFallbackTime + 300 - now()` in the installed React DOM source. The diagnostic forwards every original callback/delay unchanged and is **not used in performance runs or shipped**. The scheduler contribution is therefore observed directly; the additional image paint delay remains separately visible in the timing evidence. No timeout bypass or React patch was made.

## Validation

- Default `npm run build` and public-reading build pass, including both enforced shell budgets.
- 35 focused tests pass (palace/assets/context, cache, Raziel frame seam, topbar/palette, public continuity and shell); separately 27 artifact/shell tests pass. These groups overlap and are not added into a fictitious unique total.
- System Frame, contextual learning, first-load graph, module-boundary and live-contract checks pass.
- 24 Compact/Full geometry+keyboard cases: 3 routes × 4 widths × 2 variants, no overflow or help/medal overlap; Enter opens, Escape closes and returns focus. [Results](geometry.json).
- 36 three-preset/reduced-motion/keyboard cases plus learning exact-return, context-preservation and `none` no-image-request checks pass. [Results](interaction-checks.json).
- Not a complete authenticated/private/admin consumer audit, field Web Vitals or full WCAG audit.

Failures and corrections are retained: initial 320px overlap on all three routes ([evidence](geometry-initial-failure.json)); corrected and rerun. The topbar test initially pinned the old warm-panel glass token; it now pins the requested canonical frame token, preserving all numeric, theme and accessibility assertions. A mistyped plural module-boundary script path failed to resolve; the actual singular script was run and passed. A measurement launch concurrent with a build was stopped and discarded; final measurements run without builds or other browser suites. Experimental synchronous decoding results are not presented as final acceptance.

## Delivery boundary

No main write, merge, deployment, Preview publication, DB mutation, active contract change, action-row/left-rail behavior change or new Raziel window. Actor GPT/Codex · owner Design/System Frame · same PR #1469 · handoff ZURIEL. User visual acceptance, the warm LCP blocker and final-head CI remain release gates.

## CI at the implementation commit

At `6bcd4e4562839007197b78f7a4ad8449917d0cae`, **18 GitHub checks passed** (including release/performance, mobile/accessibility, ELS browser/core, auth, isolation and security). **One failed:** Production Canary Gate. [Exact snapshot](ci-implementation.json). Its job log confirms `latest_canary_failure` on production/base SHA `d353b62a520a009b130970dc82c17ad00a43ad96`, from the [existing canary run](https://github.com/zuriel337/sod1820/actions/runs/44854981457) predating this work. No bypass or production retry. A subsequent evidence-only commit has its own CI status; code-head passes are not claimed as final-head passes.

The final 36-preset interaction run also completed on the title-deduplicated implementation. Remaining release blockers are the explicitly tabulated regressions, visual acceptance of Compact/Full, the existing canary and final-head checks. Repeated latency at 320/768, throttled mobile hardware/network, authenticated/private surfaces and complete full-site action/link acceptance are not completed.

## Reproduce

Serve compiled main on `4180`, resumed V1 on `4182`, and the current branch on `4181`, each with SPA fallback to `2029.html` and immutable fingerprinted assets. Use Python Playwright with `/usr/bin/chromium`. Do not build while measuring.

- `python test/royal-palace-variants-2029.browser.py` — actual Compact/Full geometry, screenshots and keyboard checks.
- `python test/royal-palace-repeat-2029.browser.py` — four-arm repeated measurements, with the existing read-only transport guard.
- Set `SOD_PALACE_EVIDENCE` to this evidence directory, then run `python test/royal-palace-intro-2029.browser.py --interactions` for presets, reduced motion, exact return and none behavior.

No stylesheet or user-agent replacement is used in the measurements. Full's one presentation attribute override is the review fixture described above. Browser/data fixtures are not production access authorization.
