# Royal Palace Shared Intro V1 — branch review

**Draft; not release-ready for the owner's zero-regression target.** Implemented on `codex/royal-palace-shared-intro-v1-20261121`, based on `d353b62a520a009b130970dc82c17ad00a43ad96` (`origin/main`, rechecked unchanged before delivery). No main write, merge, deployment, protected Preview, product database write or flag change.

## Authorization and ownership

Read `AGENTS.md`, `CLAUDE.md` §0, Owner Index, Design V2 including §14 and the System Frame contracts. The user's explicit instruction assigns this visual task to Codex for this session; it does not reassign the general Claude lane. Canonical read-only `work_log_current` checks at start and before delivery found no overlapping BEFORE/ACTIVE/IN_PROGRESS writer. Open PR file lists were checked; World and Beit Midrash files owned by other drafts were not edited. No work-log row was written: this connection is read-only. Handoff is to ZURIEL in this conversation.

## Implementation

- Extend `SystemFrame2029` through one conditional `React.lazy` slot. `Sod2029Shell` remains the compatibility entry; no second shell, navigation system, icon family, palette, AI call or explanation query.
- Heading, description and context links render eagerly. Structural geometry is eager; artwork, Royal styles and explanation load only for actual intros. The image itself is eager **inside the conditional chunk**, avoiding redundant browser lazy-image scheduling.
- Existing `r29-hall`, `r29-medal`, `r29-btn`, palette roles, `NavigationIcon2029`, `ENTRY_ORIENTATION_MANIFESTS` and `contextNavigationItems2029` are reused. Explicit page SVGs are retained (including Video); Topic uses `graph`; the simple calculator now uses `calculator` instead of `number`.
- Help: keyboard-operable trigger, `aria-expanded`, controlled panel, inert hidden content, Escape and explicit close returning focus, bounded internal scrolling, finite transitions. Uses the existing MethodsLearningLink with its exact-origin preservation; that unchanged helper was extracted and deferred until requested.
- One finite frame sheen, medallion entrance and press feedback; both OS and frame reduced-motion settings respected. Day/Parchment/Night use the existing palette.
- The original full logo is untouched. The two WebP files were extracted byte-for-byte from the supplied approved HTML; they are not generated replacements. Central asset pointers and fingerprinted immutable HTTP cache rules are included.

## Scope

The original count is confirmed: **37 interface files, 17 with a possible intro**. `App2029.jsx` is an additional caller for gated notices, making 38/18 when the routing file is included. A possible intro is not necessarily public or enabled. `none`, conditional `none` and a Number page with no intro title/description remain unchanged. Full call-site evidence: [consumer-inventory.json](consumer-inventory.json).

Affected possible consumers:

- `src/App2029.jsx`
- `src/pages/BooksLibraryJourney2029Page.jsx`
- `src/pages/Heichal2029Page.jsx`
- `src/pages/SeferYetzirahWorld2029Page.jsx`
- `src/pages/Researcher2029Page.jsx`
- `src/pages/BookPublicationReview2029Page.jsx`
- `src/pages/Home2029Page.jsx` (conditional)
- `src/pages/Els2029Page.jsx` (conditional)
- `src/pages/PublicLibraryContinuity2029Page.jsx`
- `src/pages/ControlPlane2029Page.jsx`
- `src/pages/LifeJourney2029Page.jsx`
- `src/pages/Video2029Page.jsx`
- `src/pages/Books2029Page.jsx`
- `src/pages/BentovFindingsProduct2029Page.jsx`
- `src/pages/Topic2029Page.jsx`
- `src/pages/IntegratedPreview2029Page.jsx`
- `src/pages/World2029Page.jsx`
- `src/pages/Calculator2029Page.jsx`

The Pro calculator, community calculator, Posts, ordinary Post reader, auth, personal/community layouts and other explicit `none` consumers retain their own headers. The simple calculator has an intro; the Number detail page does not supply one. ELS library and the immersive Sefer Yetzirah path retain their existing suppression decisions.

## Screenshots — actual compiled app

| Surface | Mobile 390 | Desktop 1440 |
|---|---|---|
| World | [image](world-390-night.png) | [image](world-1440-night.png) |
| Heichal | [image](heichal-390-night.png) | [image](heichal-1440-night.png) |
| Books | [image](books-390-night.png) | [image](books-1440-night.png) |

Heichal is currently locked publicly. Its screenshots use a **browser-local `site_flags` response fixture** opening only `lock_heichal`; this is not live public acceptance or a database change. Other reads are public read-only responses. Day/Parchment/reduced-motion screenshots are also included. [Image unavailable fallback](books-390-missing-image.png).

## Build weights — gzip bytes, identical default build commands

| Metric | Base | Branch | Difference |
|---|---:|---:|---:|
| eagerJsFiles | 17 | 17 | +0 |
| eagerJsGzip | 203,373 | 203,438 | +65 |
| frameJsFiles | 3 | 3 | +0 |
| frameJsGzip | 47,178 | 47,153 | -25 |
| frameCssGzip | 34,329 | 34,223 | -106 |

The combined entry + frame JS/CSS is **66 gzip bytes smaller**; the eager JS metadata alone grows **65 bytes**, with no increase in eager/frame file counts. This is disclosed rather than calling every individual byte metric unchanged. Both default and public-reading shell gates pass. No threshold/tolerance was raised and no check was weakened. The required ratchet records only lower existing metrics/imports.

Conditional intro module: 939 bytes gzip JS; palace CSS 1,111 bytes gzip; shared Royal CSS 2,640 bytes gzip (reused if already loaded). Mobile image **30,098 bytes**, desktop **89,134 bytes**. Only the matching source is fetched. All 12 measured warm revisits report **0 transferred image bytes**. See [build-metrics.json](build-metrics.json) and [browser-metrics.json](browser-metrics.json).

## Browser measurements

Local Chromium, compiled default builds, 900px viewport height, no network/CPU throttle, fresh context followed by same-context warm revisit; 1,500ms observation after intro appears. Public read responses cached within the run; Heichal fixture as above. One sample per route/width/cache state (48 observations); this is a laboratory check, **not field Web Vitals, a production benchmark or a statistical guarantee**. The compared design changes the LCP candidate. Rendering, external read timing and environment noise are not isolated into causal estimates.

| Surface / width | Cold LCP base → branch (ms) | Warm LCP base → branch (ms) | CLS base → branch (cold) |
|---|---:|---:|---:|
| /world / 320 | 7156 → 928 | 1208 → 420 | 0.04405 → 0.00496 |
| /world / 390 | 680 → 516 | 540 → 428 | 0.03871 → 0.00000 |
| /world / 768 | 744 → 556 | 612 → 500 | 0.04110 → 0.00000 |
| /world / 1440 | 672 → 536 | 560 → 428 | 0.02002 → 0.00000 |
| /heichal / 320 | 1064 → 536 | 64 → 408 | 0.00000 → 0.00000 |
| /heichal / 390 | 1124 → 520 | 64 → 432 | 0.00024 → 0.00024 |
| /heichal / 768 | 1472 → 564 | 56 → 468 | 0.00024 → 0.00011 |
| /heichal / 1440 | 644 → 540 | 520 → 488 | 0.00003 → 0.00003 |
| /books / 320 | 972 → 600 | 452 → 380 | 0.00000 → 0.00000 |
| /books / 390 | 512 → 476 | 440 → 380 | 0.00000 → 0.00000 |
| /books / 768 | 632 → 640 | 548 → 428 | 0.00000 → 0.00000 |
| /books / 1440 | 164 → 528 | 72 → 476 | 0.00000 → 0.00000 |

**Open performance issue:** Heichal's warm median across the four widths is 64ms → 450ms. Removing the redundant `loading=lazy` did not eliminate this difference. All measured CLS values are below 0.1 and the fixed shell gates pass, but the owner's stronger zero-slowdown acceptance is **not proven/met**. Do not merge or release this draft on the strength of the passing budgets. A repeated 390px profile identifies the new palace image as the final LCP candidate (420–452ms), while the base candidate is the brand lockup (52–88ms). The palace file is already returned from cache around 63–69ms. See [heichal-lcp-detail.json](heichal-lcp-detail.json). The next step is to resolve the render delay without enlarging the eager graph; no baseline increase.

## Validation

Passed locally:

- `npm run build`, including the postbuild shell budget; explicit `scripts/test-2029-shell-budget.mjs`.
- `scripts/build-public-reading-production.mjs` and its enforced public-reading budget. This produces a local artifact only.
- 74 tests (including the static cache contract): production artifact, Realtime split, Storage boundary, icon catalog, shell budget, palace asset/context checks and Raziel frame seam.
- `scripts/test-entry-contextual-learn-2029.mjs`; `scripts/test-2029-system-frame.mjs`; `scripts/test-2029-first-load-graph.mjs`; module-boundary, live-contracts and 59 canonical-presentation checks.
- World/Heichal/Books: 320/390/768/1440, one intro H1, correct icons, RTL, no horizontal overflow, keyboard open/Escape/focus return; image-cache behavior and CLS.
- Three presets × four widths × three surfaces: close button, keyboard activation and reduced motion. Details in [interaction-checks.json](interaction-checks.json).
- Image failure keeps text/links/help usable; frame motion override; measured 16px controls and 44px targets: [fallback-checks.json](fallback-checks.json).
- Existing learning link preserves the exact originating query/hash; opening/closing help leaves settled Research Context unchanged; explicit `none` makes no palace image request. Exact return with a locally seeded context is recorded separately.

Failures during development: initial shell budget +2 bytes; then an unwanted fourth shared chunk after helper extraction; both corrected by retaining the owned learning URL in the frame and passing it into the deferred helper. Desktop help stacking/clipping was found and corrected. Browser harness retries fixed a selector that incorrectly included an aria-hidden `?`, awaited settled research state, and avoided reading removed build chunks while rebuilding. These are not silently counted as passing runs.

Not completed / limitations:

- The warm Heichal LCP regression above remains open. No claim of zero performance impact.
- No exhaustive navigation test of every live data item across all 17 consumers, signed-in/private/admin screens, real authenticated saved journeys, or every possible research context. Shared route/return behavior is checked with bounded cases.
- No full repository CI suite run locally; GitHub CI results are reported separately by exact PR head. No protected deployment, production measurement or release approval.
- No field LCP/CLS, throttled mobile-network benchmark, automated full WCAG audit or statistical multi-run performance study.

## Reproduction and handoff

`test/royal-palace-intro-2029.browser.py` compares locally served compiled base on port 4180 and branch on 4181; `--interactions` runs the preset/keyboard matrix. Install Python Playwright and use `/usr/bin/chromium`. The test transport permits public reads and blocks writes/unknown RPCs; the Heichal flag fixture is explicit. The server must serve `2029.html` for app routes and immutable caching for fingerprinted images/JS/CSS. Do not rebuild/delete the served output mid-run.

Actor: GPT (Codex ledger label) · task: ROYAL_PALACE_SHARED_INTRO_V1_20261121 · owner: existing Design/System Frame/Experience · scope: branch-only shared intro · status: IMPLEMENTED / COMMITTED / BRANCH-ONLY, release acceptance incomplete · handoff_to: ZURIEL.

השפעה על התיעוד הקנוני: אין שינוי בבעלות או בסמנטיקה הקנונית; ההקצאה לקודקס והעיצוב המאושר הם הוראת הסשן הנוכחי. מסמך זה הוא ראיות מסירה בלבד, לא חוזה עיצוב מקביל.

## CI follow-up

On initial head `19bce7ab49dfce77adb6f78994c81739fa5a529f`, GitHub `perf-contracts-2029`, `live-contracts-2029`, route SEO, legacy-retired and security SQL gates passed.

- `release-contracts-2029` caught an overly broad immutable palace path rule. **Corrected** to the two exact fingerprinted files, after the no-store catch-all. The existing cache tests were extended to verify both hashes, precedence and missing-file exclusion; no assertion or protection was removed. All seven cache tests pass locally.
- `Production Canary Gate` fails closed on `latest_canary_failure` for current Production SHA `d353b62a520a009b130970dc82c17ad00a43ad96`, whose canary failed at 02:17 UTC, before this task. [Existing failing canary](https://github.com/zuriel337/sod1820/actions/runs/44854981457). This draft neither caused that deployment nor overrides its gate.
- Final-head GitHub CI must be read from [PR #1469](https://github.com/zuriel337/sod1820/pull/1469); earlier-head passes are not presented as final-head passes.

Final CI also identified the existing whole-file pin on root `vercel.json`. The root file was restored byte-for-byte to the base; immutable palace rules apply only to the active `public-reading-deploy/vercel.json` artifact. The continuity pin and its test are unchanged. Seven cache checks and the public-continuity closure suite pass locally after this correction.
