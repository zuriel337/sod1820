# World story opening split — local evidence

Base: `6124db8d7ddac82654a09c49abf8ed60fe999d47` (Wave 3). Candidate: the working tree on `gpt/perf-world-story-opening-split-20261018` used for the after build.

The normal image-bearing World opening now performs only `getPostCardBySlug`. The focused browser harness observes no projection-module request, full-post read or extension read until the user opens **הסיפור לאורך הזמן**. On the base component, its negative control observes `fetchPost2029ReadingProjection`, `getPostBySlug` and the extension phase during the opening.

The base build's automatically reached projection plus FZ1073 executor closure is 2 JavaScript chunks / 30,042 gzip bytes. After the split, those initial requests are zero. The same full closure remains reachable from the details action at 2 chunks / 30,042 gzip bytes. A compact row with neither image field deliberately keeps the established automatic full-reader media fallback.

Static emitted graphs remain within the repository budget. World stays at 37 route-extra chunks and changes from 259,638 to 259,963 gzip bytes. Home stays at 26 route-extra chunks and changes from 155,379 to 155,725 gzip bytes; its compact query, read count and rendered card are byte-for-byte equal in the browser parity fixture. Entry stays at 9 chunks and changes from 191,697 to 191,688 gzip bytes. See [comparison.json](./comparison.json) for the exact closure method and values.

Local verification:

- `PLAYWRIGHT_DIR=/opt/codex/cua_node/lib PERF_CHROME=/usr/bin/chromium node --test test/home-story-2029.test.mjs` — 15/15 pass.
- `node --test test/early-primary-read-2029.test.mjs` — 11/11 pass.
- `node --test src/lib/research/worldDiscoveryStream.test.js` — 13/13 pass.
- `node --test --test-name-pattern='loader shares|failed loader' test/story-viewer-isolation-2029.test.mjs` — pass.
- `npm run build:2029` — pass.
- `npm run test:2029-bundle-budget` — 5/5 pass; World +37 chunks / +253.9 KiB gzip, inside the +37 / +265 KiB limits.

`test/date-display-rule-2029.test.mjs` remains red in the candidate and exact base for two unrelated existing files: `SourceRepeatInfo2029.jsx` and `ZviGroupTimeline2029.jsx`. This branch does not touch either file.

These are local build and deterministic fixture results. They do not establish hosted speed, LCP, live-data payload, production cache or contention behavior.
