# Post 2029 body-image deferral — successor evidence

Status: **IMPLEMENTED / LOCAL TESTED / BRANCH ONLY / INDEPENDENT REVIEW
REQUIRED**. This document does not assert GO. Nothing here is merged, deployed,
Preview-tested or released.

- Exact Wave3 base: `6124db8d7ddac82654a09c49abf8ed60fe999d47`.
- Initial implementation: `c069b0f0baa8388c86f79124b62560eae2c1698c`.
- First evidence commit: `fc78fa80bbf3359479cf710fcb06f79bc7a7b7b2`.
- First hardening implementation: `34b8e77ae2a6e9a19de4234d1c025b47cc83466e`.
- First hardening evidence / independently rejected head:
  `4bbaa1e1a878aa4a938a23708215cd3f92aa7cc8`.
- Reservation/intent successor implementation:
  `99aff99a89d461bb0b512b43efb4e1901e765edd`.
- Its evidence commit / independently rejected combined-intent head:
  `83845c974f9c42a33168a9372c8d9e88251bb6c3`.
- Current narrow intent successor implementation:
  `825712229149c8ab2307627acaf2afa5f5282cb0`.
- Branch: `gpt/perf-post-body-media-defer-20261018`.
- Existing work-log BEFORE reference: `24840318-dd8d-4010-bd1a-751549ae1dad`.
  This repair performed no DB or work-log write.

## Exact scope

The captured public FZ1073 Post body contains three `img` assets and two
`video[poster]` assets. The three images total **2,308,906 bytes**:

| Image | Exact bytes | Verified dimensions | SHA-256 |
| --- | ---: | ---: | --- |
| opening PNG | 2,087,487 | 941×1672 | `a450baf86a9943d22f61ce6d22f52841faae0280445511d33e9ccf6553b90bc8` |
| Assaf frame | 31,166 | 576×1024 | `cbb11df6aebd569d1170b1f53896c834f576f6b41862483f05dea5453af265f8` |
| Smit frame | 190,253 | 691×1536 | `dc86a86e9b9cccf87a9f929347491a9bfebe9106529db58cce887fc1239d1baa` |

The image-only optimization still leaves both video posters eager. It makes no
whole-page zero-media claim: cover, shell and other page media remain outside
this boundary.

## Repaired contracts

### Stable reservation under the product CSS

Eligibility remains narrow: an image is deferred only when it has a valid,
positive authored `width` and `height` pair or its exact `src` is one of the
three verified URLs above. An unknown image without dimensions remains on the
base path with byte-identical standalone markup, its eager request and no
private state/source attributes.

Before insertion, an eligible image receives a transparent local SVG data URL
whose intrinsic dimensions equal the proved reservation. This is a replaced
image with the same box rules as the eventual asset and makes no network
request. It therefore works with the actual `post2029-reading.css` rule
(`max-width:100%; height:auto`) for authored inline images as well as the
captured Post's authored `display:block; width:100%; height:auto` images. The
former one-URL CSS sizing exception was removed; loaded layout follows the
authored/base CSS.

Chromium comparisons at 390, 400 and 1440 px used the real product stylesheet.
For all three verified objects and a generic authored 400×800 image, pending,
held-loading and loaded rectangles, display mode, vertical alignment and the
following text/caption position matched a raw loaded baseline within 0.51 px.
Activation CLS was at most 0.001 (measured result: zero). The committed test
would fail against `4bbaa1e1`: that head has no local intrinsic placeholder and
collapses under the same stylesheet.

`picture` candidates are still restored before the fallback image, producing
one selected request. A source-only picture (`source[srcset]` with an `img`
that has neither `src` nor `srcset`) remains unchanged and loads normally.

### Meaningful approach intent

The first observer remains `0px`, so actual viewport intersection can load
without approach authorization. The persistent `600px 0px` approach observer
is enabled only when both conditions are true within the bounded 600 ms intent
window:

1. cumulative trusted, non-prevented wheel or touch movement reaches 24 px; and
2. the document has actually moved at least 24 px from the pre-input scroll
   position.

Pointer and keyboard events are not authorization sources and have no intent
listeners or state. Keyboard navigation retains capability through the always
active `0px` observer when it truly moves the image into the viewport.

The implementation tracks the last observed scroll position because Chromium
can expose compositor movement before a window-level wheel callback. A plain
scroll event cannot create intent. Cleanup removes the observer, all input and
scroll listeners, and the reset timer.

Browser negatives prove that a trusted 1 px wheel, synthetic wheel, any pointer
click/tap, an 80 px pointer drag, a 5 px touch, keyboard input, programmatic
scroll, hash navigation, browser back and forward restoration do not authorize
the approach margin. In the two exact rejected combinations, an 80 px pointer
drag followed within 600 ms by `scrollBy(80)`, and a prevented `ArrowDown`
followed by `scrollBy(80)`, both remain pending with zero requests. Meaningful
trusted wheel and touch movement do authorize approach. A later `End` key loads
only after the target enters the actual viewport. The same suite covers
cleanup, StrictMode replay and remount without duplicate requests or listeners.

### Transparent loaded parity and failures

The neutral placeholder background now applies only to `pending`, `loading`
and `failed`. On `loaded`, the private placeholder source is removed and the
computed background returns to the transparent base value. Real transparent
SVG and PNG responses were drawn into a canvas and both produced alpha zero
with `rgba(0, 0, 0, 0)` computed backgrounds.

A slow in-viewport response remains `loading` until the real response arrives;
the local placeholder's load event cannot complete it. Failure clears active
picture/image candidates, returns to the reserved local placeholder and exposes
one retry. Retry restores the exact source once, with no cache-busting URL,
loop or duplicate request.

## Exact captured-Post replay

The locally captured public row was replayed through the final production
build. Its UTF-8 body is 31,843 bytes with SHA-256
`772ab9168dc437bad9b582dc93ffee3e9b32ea001bcfababc050005a77da14f2`.
Every external request was intercepted locally and write-like RPCs were
aborted; no live telemetry or write was allowed.

| Viewport | Themes | First target top | Reserved box | Initial observer bottom | Initial target requests |
| --- | ---: | ---: | ---: | ---: | ---: |
| 320×844 | 3 | 2566.922 px | 250×444.203 px | 844 px | 0 |
| 390×844 | 3 | 2403.125 px | 320×568.578 px | 844 px | 0 |
| 1440×900 | 3 | 2479.875 px | 576×1023.453 px | 900 px | 0 |
| 1440×1080 | 3 | 2479.875 px | 576×1023.453 px | 1080 px | 0 |
| 1440×1200 | 3 | 2479.875 px | 576×1023.453 px | 1200 px | 0 |

All 15 cases were `pending` with the local intrinsic placeholder, the exact
real URL in the deferred attribute, a nonintersecting `0px` observer result and
zero target requests. At 390×844 in all themes, the pending target's top,
width and height exactly matched a separately built raw Wave3 page after its
first target loaded. The raw page made all three eager target requests; the
candidate made zero before approach.

At 390×844 in all themes, activation followed by real SPA navigation away and
browser back produced one target request total, returned in `loaded` state and
restored `scrollY=2265`.

An independent DOM comparison after activation found 349 elements on each
side, identical tag order and text, zero authored-attribute differences, and
identical image, video, link and caption semantics. Counts remain 3 images, 2
videos, 2 links and 4 captions. `hardenPassiveMediaHtml` still runs before
preparation and insertion.

## Reproduced checks

- `PERF_CHROME=/usr/bin/chromium PLAYWRIGHT_DIR=/workspace/sod1820-perf-wave3-20261018 node --test test/post-body-media-defer-2029.test.mjs`:
  **35/35 passed, 0 failed, 0 skipped**, Chromium `151.0.7922.173`.
- The two new runtime regressions replayed against exact rejected head
  `83845c974f9c42a33168a9372c8d9e88251bb6c3`: **0/2 passed, 2/2 failed**.
  That head loaded after pointer-drag + programmatic scroll and after prevented
  `ArrowDown` + programmatic scroll.
- Selected regression replay against exact rejected head `4bbaa1e1`:
  **0/4 passed, 4/4 failed**. It independently fails the 24 px source contract,
  real-CSS intrinsic placeholder, tall first-frame/tiny-input case and loaded
  transparent-media background.
- Exact captured-Post replay: all 15 viewport/theme first-frame cases and all
  three SPA/back lifecycle cases passed.
- Exact semantic comparison: 349/349 elements, tag/text/link/caption/image/video
  parity and zero authored-attribute differences.
- `node scripts/test-2029-control-plane.mjs`: PASS.
- `node scripts/test-entry-contextual-learn-2029.mjs`: PASS.
- `npm run build`: PASS for Legacy and 2029.
- `npm run test:2029-bundle-budget`: **5/5 passed, 0 skipped**. Wave3 entry is
  187.2 KB gzip; Post is 177.4 KB gzip with 29 extra chunks, below the 185 KB
  gate.
- Fresh Legacy-only builds from exact base and successor: **293 files /
  24,504,416 bytes each / zero changed files**. A deterministic
  `path\0size\0file-sha256` manifest hashes to
  `d7f0a63b31c8933c41bd4f08e24320cfbb63118cc21487bd178bf29730da4536`
  on both sides.

## Wave4 compatibility

Against Wave4 head `d03627e2cade2484c3ec5422229845a1c5eb675d`, the complete Post branch has
zero overlapping paths and `git apply --check` succeeds. A locally composed
tree passes the full build, the 35-test Post Chromium suite, the 5-test bundle
gate and all 16 Realtime static/SDK/loopback tests with zero skips. Its entry is
173.2 KB gzip and Post is 177.4 KB gzip. No manual merge is required for that
exact Wave4 head.

## Honest holds

No client-generated `noscript` fallback was added. This client-only React
surface cannot create useful markup for a JavaScript-disabled crawler, while a
duplicate live source risks extra requests and duplicate semantics. The exact
URL remains in a private DOM attribute, but that is not proof of crawler
acceptance. Hosted Preview/crawler acceptance therefore remains a **Production
HOLD**.

Safari, Firefox, hosted Preview timing, physical devices, authenticated readers
and hosted end-to-end LCP remain `NOT_MEASURED`. No deploy, merge, CI run,
Production action, live database write, work-log write, live telemetry or live
media request was performed.
