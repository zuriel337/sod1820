# ELS verse display payload — branch-only evidence

## Boundary

- Original Wave 3 base: `gpt/perf-unified-wave3-20261018@6124db8d7ddac82654a09c49abf8ed60fe999d47`.
- Exact hardening base: `gpt/perf-els-verse-payload-defer-20261018@4e8dcebbc496a2f1da208f4312c2d085b3ab8a55`.
- Hardening implementation: `693892c18c4ebb1e90eff700420122e2d02ff654` on
  `gpt/perf-els-verse-payload-hardening-20261018`.
- Scope: the `tools/els` generator and documentation, the generated hosted ELS artifact, the
  deferred-payload acceptance test, and this evidence. Search letters, verse boundaries, results,
  geometry, canonical verification, niqqud and application source are unchanged.
- No Product database, RLS, live flag, main, merge, PR, CI, Preview, deploy or Production action.
  The only live database writes were the separately authorized passive coordination rows.

## Hosted artifact

`tk-vtext.txt` remains absent from the initial `public/tzofen.html` transfer. The deterministic
generator writes the current content-addressed gzip binary, verifies its round trip and on-disk
bytes, writes and verifies the hosted HTML, and only then prunes old generator-owned payloads.

Ownership is deliberately narrow: only non-directory entries whose complete basename matches
`^tk-vtext\.[0-9a-f]{16}\.gzdata$` are eligible. The current filename is retained. Directories,
near matches and unrelated files are never removed. The acceptance fixture plants current, stale,
near-pattern and foreign files and uses `finally` cleanup so a failed test cannot leave fixtures in
the repository. The final tree contains exactly the current owned payload.

The browser requests that payload only for an existing source, verse or letter display action,
explicitly decompresses it, and verifies the exact source byte length and SHA-256 before exposing
text. The loader shares one in-flight Promise. A failed HTTP, decompression, length, UTF-8,
alignment or digest check rejects the display request, clears the Promise and permits a later
explicit action to retry with a cache-bypassing query. It never substitutes text. Mount, idle and
ordinary ELS search make zero verse-payload requests.

## Supported standalone artifact

The generator has an explicit, deterministic offline mode:

```sh
cd tools/els
python3 build.py --standalone-out /tmp/tzofen-offline.html
```

It emits one self-contained HTML file with the exact hosted gzip payload embedded as a
`data:application/gzip;base64,...` URL. It also embeds a bounded verifier adapter that replays
browser-discovered candidates byte for byte against the same canonical corpus; it does not add a
second discovery implementation. Standalone mode does not rewrite or prune the hosted HTML or its
assets. No second multi-megabyte public route artifact is committed.

Two consecutive standalone generations were byte-identical. The measured file is 2,492,175 raw
bytes (1,626,805 bytes with comparison gzip) with SHA-256
`66570187aaf1083fd2dc6b2b4247e9b48b74a22be8e164c3a9c729c555abfde8`. Its embedded gzip bytes are
byte-identical to the hosted payload and expand to the exact canonical source bytes and SHA.

Direct Chromium `file://` navigation is blocked by this managed environment with
`ERR_BLOCKED_BY_ADMINISTRATOR`, so direct file-URL browser parity is not claimed. The executable
fallback used a Chromium context in offline mode, fulfilled only the generated standalone document
in process, and aborted and counted every other HTTP(S) request. It observed no external request,
completed an ordinary ELS search, clicked a main result letter, and displayed the exact canonical
verse row and source reference. The hosted bridge was separately exercised for concurrent verse
and letter lenses; the standalone server-only host bridge is outside the supported offline mode and
was not claimed as tested.

## Deterministic byte measurement

See `measurements.json`. All comparison gzip values use level 9.

| Item | Original | Hardened | Difference |
| --- | ---: | ---: | ---: |
| `tzofen.html` raw | 2,489,355 B | 1,587,178 B | −902,177 B |
| `tzofen.html` gzip | 1,625,009 B | 944,225 B | −680,784 B (−41.89%) |
| Fresh 2029 ELS app graph + engine gzip | 1,988,096 B | 1,307,312 B | −680,784 B (−34.24%) |

The hardening adds 97 raw bytes and 42 comparison-gzip bytes to the reviewed split artifact while
retaining its transfer savings. The deferred binary remains 677,655 bytes and expands to the exact
2,722,983 source bytes. This is a byte and request-count result, not an LCP or wall-time claim. The
ELS application source graph did not change.

## Acceptance run

- `test/els-verse-payload-defer.test.mjs`: 4/4 PASS with executable Chromium. Covers deterministic
  hosted and standalone generation, strict stale-owned cleanup, foreign-file preservation, exact
  canonical bytes, strict offline ordinary search and clicked-letter source display, hosted zero
  requests on mount/idle/search, one shared request for verse + letter lenses, reuse, fail-closed
  corruption handling and retry.
- `test/els-browser-cutover.test.mjs`: 26/26 PASS with executable Chromium.
- `test/els-native-ui-browser.test.mjs`: 34/34 PASS with executable Chromium, including source,
  niqqud, restore, Classic/Research, privacy and save paths.
- Core/callable/Tanakh/one-engine/runtime/matrix Golden set: 43 PASS, 1 SKIP, 0 FAIL. The only skip
  is the existing executable PostgreSQL migration case because no local PostgreSQL service was
  available; this task made no SQL or product database change.
- Final-tree adaptive router, truth census, search parity, direction, reference and payload set:
  34/34 PASS.
- `npm run build`: full Legacy and 2029 builds PASS.
- `npm run test:2029-bundle-budget`: 5/5 PASS. Built entry remains 9 chunks / 187.2 KiB gzip.
- Built `dist/els-data/tk-vtext.134189ee3c5f9cb8.gzdata` and an independent Legacy build contain
  byte-identical hosted HTML and payload. Hosted HTML SHA-256 is `16b44c5b…`; payload SHA-256 is
  `13d17191…`; decompressed source SHA-256 is `134189ee…`.
- `git diff --check`: PASS.

## Remaining limits

- No hosted Preview, Vercel response-header, Firefox, Safari, physical phone, authenticated-user or
  real-user timing acceptance was run.
- Direct `file://` navigation could not be exercised under the managed Chromium policy. The strict
  offline browser acceptance above validates the generated one-file artifact without network, but
  does not establish behavior under every browser's file-origin policy.
- The custom `.gzdata` extension and explicit browser decompression avoid relying on
  `Content-Encoding`; hosted response headers still need verification in an eventual Preview.
