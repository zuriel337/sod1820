# ELS verse display payload — branch-only evidence

## Boundary

- Exact base: `gpt/perf-unified-wave3-20261018@6124db8d7ddac82654a09c49abf8ed60fe999d47`.
- Implementation commit: `df10b4aa` on `gpt/perf-els-verse-payload-defer-20261018`.
- Scope: packaging of `tools/els/data/tk-vtext.txt` only. Search letters, verse boundaries,
  results, geometry, canonical verification, niqqud and every visual component are unchanged.
- No Product database, RLS, live flag, main, merge, PR, CI, Preview, deploy or Production action.
  The only live database writes were the separately authorized passive coordination rows.

## Result

`tk-vtext.txt` is no longer base64-embedded in `public/tzofen.html`. The deterministic generator
writes a content-addressed gzip binary with a `.gzdata` suffix. The browser requests it from the
same origin only for an existing source, verse or letter display action, explicitly decompresses
it, and verifies the exact source byte length and SHA-256 before exposing any text.

The loader shares one in-flight Promise. A failed HTTP, decompression, length, UTF-8, alignment or
digest check rejects the display request, clears the Promise and permits a later explicit action to
retry with a cache-bypassing query. It never substitutes text. Search and the selected matrix remain
usable and unchanged. The former idle preload was removed.

The browser fixture change in `test/els-browser-cutover.test.mjs` only serves the new static asset.
Its assertions, thresholds, oracle and product semantics are unchanged.

## Deterministic byte measurement

See `measurements.json`. All gzip values use level 9 for a like-for-like local comparison.

| Item | Before | After | Difference |
| --- | ---: | ---: | ---: |
| `tzofen.html` raw | 2,489,355 B | 1,587,081 B | −902,274 B |
| `tzofen.html` gzip | 1,625,009 B | 944,183 B | −680,826 B (−41.90%) |
| Fresh 2029 ELS app graph + engine gzip | 1,988,096 B | 1,307,270 B | −680,826 B (−34.25%) |

The deferred binary is 677,655 B and expands to the exact 2,722,983 source bytes. This is a byte
and request-count result, not an LCP or wall-time claim. The ELS application source graph did not
change (`git diff base..df10b4aa -- src` is empty).

## Acceptance run

- `test/els-verse-payload-defer.test.mjs`: 4/4 PASS with executable Chromium. Proves deterministic
  generation and exact source bytes; zero asset requests on mount, idle and regular search; one
  shared request for concurrent verse + letter lenses; reuse after success; 404 and valid-gzip/wrong
  content fail closed; later retry succeeds with exact source rows.
- `test/els-browser-cutover.test.mjs`: 26/26 PASS with executable Chromium.
- `test/els-native-ui-browser.test.mjs`: 34/34 PASS with executable Chromium, including source,
  niqqud, restore, Classic/Research, privacy and save paths.
- Core, truth census, reference presentation, one-engine and runtime Golden set: 47 PASS, 1 SKIP,
  0 FAIL. The skip is the existing executable PostgreSQL test because no local PostgreSQL service
  was available; this task made no database or SQL change. The fixed Golden/replay assertions passed.
- Final-tree adaptive router, truth census, search parity, direction, reference and deferred-payload
  set: 34/34 PASS.
- `npm run build`: Legacy and 2029 PASS.
- `npm run test:2029-bundle-budget`: 5/5 PASS. Built entry remains 9 chunks / 187.2 KiB gzip.
- Built `dist/els-data/tk-vtext.134189ee3c5f9cb8.gzdata` is byte-identical to the generated public
  asset and decompresses to source SHA-256
  `134189ee3c5f9cb8d960bc14d958bccd598b280c7a861adc02b17728c6070093`.
- An independent Legacy build into `/tmp` contains byte-identical `tzofen.html` and deferred asset
  (SHA-256 `7f2f8965…` and `13d17191…`, respectively), confirming packaging parity.
- `git diff --check`: PASS.

The first direct cutover invocation used Playwright's absent downloaded browser and therefore did
not reach product code. The authoritative rerun pinned the already installed
`CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` and passed all 26 cases.

## Remaining limits

- No hosted Preview, Vercel response-header, Firefox, Safari, physical phone, authenticated-user or
  real-user timing acceptance was run.
- The custom `.gzdata` extension and explicit browser decompression avoid relying on
  `Content-Encoding`; hosted response headers still need verification in the eventual Preview.
- If `tzofen.html` is opened directly from `file://` without its sibling public asset, search remains
  available but full verse display fails closed. Supported site surfaces serve both files together.
