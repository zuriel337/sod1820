# Post 2029 body-image deferral — hardened branch evidence

Status: **IMPLEMENTED / LOCAL TESTED / BRANCH ONLY**. This is not merged,
deployed, Preview-tested or released.

- Exact base: `6124db8d7ddac82654a09c49abf8ed60fe999d47`.
- Initial implementation: `c069b0f0baa8388c86f79124b62560eae2c1698c`.
- Independent-review evidence: `fc78fa80bbf3359479cf710fcb06f79bc7a7b7b2`.
- Hardening implementation: `34b8e77a`.
- Branch: `gpt/perf-post-body-media-defer-20261018`.
- Existing work-log BEFORE reference: `24840318-dd8d-4010-bd1a-751549ae1dad`.
  This hardening performed no DB or work-log write.

## Exact scope

The captured public FZ1073 Post body contains three `img` assets and two
`video[poster]` assets. The three images total **2,308,906 bytes**:

| Image | Exact bytes | Verified dimensions | SHA-256 |
| --- | ---: | ---: | --- |
| opening PNG | 2,087,487 | 941×1672 | `a450baf86a9943d22f61ce6d22f52841faae0280445511d33e9ccf6553b90bc8` |
| Assaf frame | 31,166 | 576×1024 | `cbb11df6aebd569d1170b1f53896c834f576f6b41862483f05dea5453af265f8` |
| Smit frame | 190,253 | 691×1536 | `dc86a86e9b9cccf87a9f929347491a9bfebe9106529db58cce887fc1239d1baa` |

The image-only optimization does not defer video posters. **Both body poster
requests remain eager**. It also makes no whole-page zero-media claim: the
cover, shell and other page media remain outside this boundary.

## Hardening behavior

`Post2029Page` still runs `hardenPassiveMediaHtml` first, then prepares the
result in an inert template before insertion. Deferral now requires a stable
reservation proven by either:

1. a valid, positive authored `width` and `height` pair; or
2. an exact image URL in the three-entry verified-dimensions map.

An unknown image without that reservation stays on the base path. Its `src`,
`srcset`, `loading`, dimensions and state attributes are not changed. If a body
contains no eligible image, its hardened HTML string is returned byte-for-byte.
The mixed eligible/ineligible browser case also proves the unknown image stays
eager and receives no private data attributes.

`picture source[srcset]` moves only when its associated fallback `img` is
eligible and managed. A source-only picture (`source[srcset]` plus an `img`
without `src`/`srcset`) remains unchanged and loads normally. On activation,
picture candidates are restored before the fallback image; Chromium selected
one candidate and made one request.

The first observer uses `0px` margin, so only an image intersecting the actual
viewport may activate without input. A trusted wheel, touch, pointer or scroll
key event replaces it with the persistent `600px 0px` approach observer.
Synthetic events do not enable prefetch. Cleanup removes both observers and all
intent/load/error/retry listeners. Retry restores the exact URL once without a
cache-busting mutation or loop.

The three verified assets reserve their exact ratios. The generic managed-image
CSS no longer forces authored inline images to become blocks. No ratio is
invented for another image.

## Passive BEFORE / AFTER evidence

| Case | Before hardening | Hardened result |
| --- | --- | --- |
| three raw FZ `img[src]` tags | 3 eager target requests at insertion | 0 target requests before viewport/authorized approach |
| old 600px first observer at 1440×1080/1200 | real first target at 1661.125px was already in the margin | first observer root ends at 1080/1200; state stays `pending`, `src=null`, 0 target requests |
| trusted 1px wheel near an image | no separate intent gate | enables the persistent 600px approach observer; one eventual request |
| unknown 400×800 asset without authored dimensions | raw eager markup | byte-identical raw markup, one normal eager request, no inferred dimensions or data attrs |
| source-only picture | normal selected-source load | unchanged source, one normal selected-source request |
| two video posters | 2 eager body-poster requests | 2 eager body-poster requests; videos untouched |

The committed tall-viewport fixture places the target at 1650px, matching the
captured Post's first-observer top of 1661.125px. It therefore exercises the
failure boundary that the former 2200px spacer missed.

## Exact captured-Post replay

The prior read-only public-row capture was replayed locally through the exact
production build. Its UTF-8 body is 31,843 bytes with SHA-256
`772ab9168dc437bad9b582dc93ffee3e9b32ea001bcfababc050005a77da14f2`.
All external requests were intercepted locally; no live telemetry or write was
allowed.

For every theme (`light`, `parchment`, `dark`):

| Viewport | First target top at initial observer | Initial state | Target requests |
| --- | ---: | --- | ---: |
| 320×844 | 2121.047px | `pending`, `src=null` | 0 |
| 390×844 | 1878.500px | `pending`, `src=null` | 0 |
| 1440×900 | 1661.125px | `pending`, `src=null` | 0 |
| 1440×1080 | 1661.125px | `pending`, `src=null` | 0 |
| 1440×1200 | 1661.125px | `pending`, `src=null` | 0 |

At 390×844 in all themes, approach/loading followed by a real SPA navigation
away and browser back produced one target request total, returned in `loaded`
state, and restored scroll position (`scrollY=2265`).

An independent DOM comparison after activation found 349 elements on both
sides, identical tag order and text, zero authored-attribute differences, and
identical image, video, link and caption semantics. Counts were 3 images, 2
videos, 2 links and 4 captions. The `hardenPassiveMediaHtml` → prepare → insert
sequence remains unchanged.

## Reproduced checks

- `PERF_CHROME=/usr/bin/chromium node --test test/post-body-media-defer-2029.test.mjs`:
  **27/27 passed, 0 failed, 0 skipped**, Chromium `151.0.7922.173`.
  Coverage includes 320/390/1440 and all themes; 1440×1080/1200 first frame;
  trusted tiny scroll; true in-viewport loading; distinct picture candidates;
  unknown 400×800 standalone and mixed cases; source-only picture; retry
  bounding; no-IO fallback; cleanup/remount; StrictMode replay; cache-backed
  return; and both untouched video posters.
- Exact captured-Post replay: 15 viewport/theme first-frame cases passed; the
  390×844 three-theme SPA/back lifecycle passed.
- Exact semantic comparison: 349/349 elements, tag/text/link/caption/image/video
  parity, zero authored-attribute differences.
- `node scripts/test-2029-control-plane.mjs`: PASS.
- `node scripts/test-entry-contextual-learn-2029.mjs`: PASS in the isolated
  dependency-complete checkout.
- `npm run build`: PASS for Legacy and 2029.
- `npm run test:2029-bundle-budget`: **5/5 passed**. Wave3 entry is 187.2 KB
  gzip; Post is 176.9 KB gzip (`+1.6 KB` from the 175.3 KB base), below the
  185 KB gate; Post remains +29 chunks.
- Independent Legacy-only builds from the exact base and hardened commit:
  **293 files / 24,504,416 bytes each / 0 changed files**. Both tree hashes are
  `cdc717c9db647ef97309cf6db7d40b4e12294387c8e9843b9c41251ff6044e64`.

## Wave4 compatibility

Against local Wave4 head `d03627e2cade2484c3ec5422229845a1c5eb675d`,
the implementation has zero overlapping paths and applies cleanly. The combined
tree passes the full build, the 27-test Chromium suite, the 5-test bundle gate,
and all 16 Realtime static/loopback tests with zero skips. Its entry is 173.2 KB
gzip and Post is 176.9 KB gzip. No manual merge is required; the branch can be
integrated into that Wave4 head as-is.

## Honest holds

No client-generated `noscript` fallback was added. This is a client-only React
surface: JavaScript must run before it could create such markup, so it would not
help a JavaScript-disabled crawler, while duplicating live media markup could
create request and semantic risk. The exact URL remains in the DOM data
attribute for managed images, but that is not proof of crawler acceptance.
Hosted Preview/crawler acceptance therefore remains a **Production HOLD**.

Safari, Firefox, hosted Preview timings, physical devices, authenticated
readers and end-to-end hosted LCP remain `NOT_MEASURED`. No deploy, merge,
Production action, live DB write, work-log write or live telemetry was run.
