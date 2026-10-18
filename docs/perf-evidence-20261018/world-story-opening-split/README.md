# World story opening split — repaired branch evidence

Status: **IMPLEMENTED / LOCAL TESTED / BRANCH ONLY**. This is not merged,
deployed, Preview-tested or released.

- Exact product base: `6124db8d7ddac82654a09c49abf8ed60fe999d47`
  (`gpt/perf-unified-wave3-20261018`).
- Opening-split parent: `b55f914c9472cfb8067924413fc519fb983da1a8`.
- NO_GO repair implementation: `577d71cae9453b93cc008d4f511f3b4528599200`.
- Unmount/terminal-state repair: `3b5b0d1c82891ce51136167f57d110e8ed7201cc`.
- Branch: `gpt/perf-world-story-opening-split-20261018`.
- Repair work-log BEFORE: `945f5018-eb49-4161-89a9-bfe894934cfd`.
- Unmount repair work-log BEFORE: `34bc5dd2-ef41-4fa1-a0ab-b429414c6c94`.

## Opening-read contract

The image-bearing World opening performs exactly one compact
`getPostCardBySlug` read. It does not request the projection module, full Post
row or extension reads until the person opens **הסיפור לאורך הזמן**.

The media fallback is explicit and is not hidden by the fixture:

- World with `image_url`: compact read only;
- World without `image_url`, including a row that has only `thumb_url`:
  compact read followed by the full projection fallback;
- Home with either `thumb_url` or `image_url`: compact read only;
- Home with neither image field: compact read followed by its existing Wave 3
  full projection fallback.

The Locked-route main fixture now contains both image fields, so its one-read
assertion describes the normal image-bearing path. The focused Chromium suite
separately asserts the honest two-read no-image and thumb-only World exceptions.

## Recovery contract

`WorldFlightStory2029` now honors `createOnDemandLoader.recovery()`:

- a first module failure with a recoverable same-origin script URL offers one
  explicit **נסה שוב** action;
- a failure without a usable module URL immediately offers **רענן את הדף**;
- if the one recovery request fails, the UI changes to **רענן את הדף** and
  cannot start a third request;
- closing/reopening details and same-document remount after a terminal failure
  do not start another module request;
- a no-URL failure that settles after unmount is recorded before lifecycle
  checks, so the remount remains at one module request;
- a failed recovery that settles after unmount is likewise recorded before
  lifecycle checks, so the remount remains at two requests and never asks for
  `?retry=2`;
- an extension-data failure is not mislabeled as a module retry.

The story opening stays mounted in every mounted failure case. The loader
fixture implements `recovery()`, delayed deterministic failures and records
whether each request was the importer, a recovery URL, a no-URL failure or a
second failure. React state remains lifecycle-bound; only the shared loader's
terminal state survives an unmount.

## Exact Home parity anchor

The browser reference fixture is the exact
`WorldFlightStory2029.jsx` from Wave 3 `6124db8d`, with only its relative import
prefixes redirected into the isolated harness. The test reverses those prefixes
and verifies source SHA-256
`771c7d8eec67e6b8fec05896b9a10e96ec4d467fbdcaf042b6aba6a2fea8a8a1`.

Candidate and exact Wave 3 produce identical Home HTML and identical read
sequences in five core scenarios: both image fields, image-only, thumb-only,
neither image field with experience-media fallback, and rejected draft. A
separate fat-row case also proves that body/excerpt/author fields do not alter
the compact card.

## Verification

- `PERF_CHROME=/workspace/private-perf-20261017/browsers/chromium-1194/chrome-linux/chrome node --test test/home-story-2029.test.mjs`
  — **19/19 pass**, real Chromium; Home/World, normal and fallback reads,
  loader URL/no-URL/second-failure request counts, delayed failures across
  unmount/remount, lifecycle and navigation.
- `LOCKED_ROUTE_DIST=dist LOCKED_ROUTE_EXPECT=after LOCKED_ROUTE_REPS=1 CHROMIUM_PATH=/workspace/private-perf-20261017/browsers/chromium-1194/chrome-linux/chrome node --test test/locked-route-parallel-start-2029.test.mjs`
  — **1/1 pass**. The normal image-bearing World fixture receives one Post
  response/read after the lock gate opens; blocked World receives none.
- `npm run build` — PASS, full Legacy followed by 2029 production builds.
- `npm run test:2029-bundle-budget` — **5/5 pass**. Entry 9 chunks / 187.2 KiB;
  Home +26 / 152.3 KiB; World +37 / 254.1 KiB; all under their gates.
- `node --test test/early-primary-read-2029.test.mjs` — **11/11 pass**.
- `node --test src/lib/research/worldDiscoveryStream.test.js` — **13/13 pass**.
- the focused real-loader unit in `test/story-viewer-isolation-2029.test.mjs`
  passes.

The date-display suite still fails on `SourceRepeatInfo2029.jsx` and
`ZviGroupTimeline2029.jsx`. Both files are byte-unchanged from exact Wave 3 and
outside this branch's scope; this is the same pre-existing baseline failure.

## Bytes and limits

[comparison.json](./comparison.json) records gzip-9 manifest closures. Relative
to exact Wave 3, the final candidate is:

- entry: 9 chunks / 191,690 bytes;
- Home route extra: 26 chunks / 155,972 bytes;
- World route extra: 37 chunks / 260,209 bytes;
- the timeline action still reaches the two deferred projection/executor
  chunks, 30,040 bytes total;
- image-bearing World opening reaches zero of those deferred chunks.

These are deterministic local bundle/request-path results. `NOT_MEASURED`:
hosted Preview behavior, live payload size, LCP/usable timing, physical phone,
authenticated reader, Production cache and contention. The Locked-route timing
samples are synthetic gate evidence, not a speed claim.

No shared loader, reader, Legacy product code, DB/RLS, flag, integration branch,
main, Production or deployment was changed.
