# Post 2029 body-media deferral — branch evidence

Status: **IMPLEMENTED / LOCAL TESTED / BRANCH ONLY**. This is not merged,
deployed, Preview-tested or released.

- Exact base: `gpt/perf-unified-wave3-20261018` at
  `6124db8d7ddac82654a09c49abf8ed60fe999d47`.
- Implementation commit: `c069b0f0baa8388c86f79124b62560eae2c1698c`.
- Branch: `gpt/perf-post-body-media-defer-20261018`.
- Work-log BEFORE: `24840318-dd8d-4010-bd1a-751549ae1dad`.

## Proven bottleneck

A bounded read-only query of the canonical project's public Post row found three
body images in the FZ1073 article. None had `loading`, `width` or `height` in its
authored tag. Exact HTTPS downloads were inspected with `wc`, `file` and
`sha256sum`; [measurement.json](measurement.json) records their URLs, hashes,
dimensions and byte counts.

The three bodies total **2,308,906 bytes**. The opening body PNG alone is
**2,087,487 bytes**, `941x1672`, or 90.41% of those bytes. The browser negative
control proves the unchanged authored `src` markup starts all three requests as
soon as the HTML enters the document, even while the images are far below the
viewport.

## Implemented behavior

`Post2029Page` now hardens the authored HTML as before and then prepares only its
2029 body media in an inert `<template>`. Before insertion, `img[src]`,
`img[srcset]` and `picture source[srcset]` move to private data attributes.
Text, order, links, captions, alt text, classes, styles and exact source strings
remain present.

An `IntersectionObserver` restores the exact attributes once each image enters
a `600px` approach zone. Picture candidates are restored before the fallback
image so the browser performs one normal selection. A loaded image is not
re-observed. React effect replay and a same-document return do not add a second
server hit; the latter is backed by the browser's immutable-cache behavior in
the loopback test.

The three current FZ body assets receive only their verified exact dimensions:
`941x1672`, `576x1024` and `691x1536`. No ratio is guessed for another asset.
Authored dimensions elsewhere remain untouched. The known heavy asset therefore
reserves its full ratio before network activation.

On failure, the Post stays mounted and the reserved box remains. A bounded
status offers `נסו שוב` and, for an HTTP(S) source, `פתחו את המקור`; retry uses
the original URL without a cache-busting mutation. In a browser without
`IntersectionObserver`, sources are restored and native `loading=lazy` remains
the conservative hint, so the article never loses the media capability.

Legacy source does not import the helper. An exact base/candidate Legacy build
comparison found **293 files / 24,504,416 bytes on both sides, with zero changed
files**.

## Verification

- `PERF_CHROME=... node --test test/post-body-media-defer-2029.test.mjs`:
  **15/15 passed**, Chromium `141.0.7390.37`.
  - widths `320`, `390`, `1440`;
  - themes `light`, `parchment`, `dark`;
  - zero body-image requests before the approach zone;
  - one chosen request after approach;
  - preserved text/link/alt/caption and picture source;
  - isolated CLS asserted `<=0.1` in every width/theme case;
  - bounded failure, exact-source retry, no-IO fallback and cache-backed return;
  - negative control: three eager requests before preparation, zero after.
- `node scripts/test-2029-control-plane.mjs`: PASS.
- `node scripts/test-entry-contextual-learn-2029.mjs`: PASS.
- Focused Post suites: 36 relevant assertions passed. The pinned-context source
  assertion and the old `/2029/posts` route assertion fail unchanged at the
  exact Wave3 base; they were not edited or counted as candidate regressions.
- `npm run build`: PASS for Legacy and 2029.
- `npm run test:2029-bundle-budget`: **5/5 passed**.
  Entry remains `187.2 KB` gzip. The Post route graph changes from `175.3 KB`
  to `176.6 KB` gzip (`+1.3 KB`), below the `185 KB` gate; chunk count remains
  `+29`.

## Measured effect and limits

For the audited FZ body, **2,308,906 body-media bytes and three eager requests
move out of initial insertion**. The isolated browser test proves zero requests
until approach and one selected request on activation. This is a network-byte
and request-timing result, not a hosted LCP claim.

`NOT_MEASURED`: hosted Preview timings, end-to-end FZ LCP/usable time, physical
phone, authenticated reader, Safari, Firefox, SEO crawler image-index behavior,
and ratios for authored images without stored dimensions or a verified asset
record. The exact source URL remains in the rendered DOM data attribute and all
authored semantic text/link markup remains, but crawler acceptance still needs
the later Preview/SEO gate.

No Product/Legacy/DB/RLS/flag/reader/projection/Vite/main/Production/deployment
change was made.
