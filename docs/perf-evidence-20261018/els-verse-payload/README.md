# ELS verse display payload — branch-only evidence

## Boundary

- Original Wave 3 base: `gpt/perf-unified-wave3-20261018@6124db8d7ddac82654a09c49abf8ed60fe999d47`.
- Exact hardening base: `gpt/perf-els-verse-payload-defer-20261018@4e8dcebbc496a2f1da208f4312c2d085b3ab8a55`.
- Prior hardening evidence: `ba3bb64e0b440dc5682a3fb42f1ef4ce707fd9f1`; TOCTOU repair implementation:
  `a3b09f01b237534bb621b57230e411278999107f` on
  `gpt/perf-els-verse-payload-hardening-20261018`.
- Scope: the `tools/els` generator and documentation, the deferred-payload acceptance test, and
  this evidence. Search letters, verse boundaries, results, geometry, canonical verification,
  niqqud, generated hosted bytes and application source are unchanged.
- This repair made no Product database, coordination database, RLS, live flag, main, merge, PR,
  CI, Preview, deploy or Production change.

## Hosted artifact

`tk-vtext.txt` remains absent from the initial `public/tzofen.html` transfer. The deterministic
generator validates all source inputs, writes the current content-addressed gzip binary, verifies
its round trip and on-disk bytes, then writes and verifies the hosted HTML. The generator does not
scan or delete pre-existing asset-directory entries. Rebuilding the same source reuses the same
content-addressed name and adds nothing. Publishing a different valid source can leave both old
and current assets; the HTML points to the exact current asset written in its transaction. Old
regular assets, invalid matching regular files, near matches, unrelated files, directories,
internal and external symlinks, FIFO and Unix-socket entries are all preserved.

The complete hosted transaction (`asset → HTML`) is protected by a cross-process
exclusive kernel lock. Its deterministic scope is the canonical hosted output directory and its
artifact is under the per-user system temp lock directory, outside the deployed `public/` tree.
Exceptions release the lock in `finally`; abrupt process exit releases it in the kernel. Failure
injection before asset replacement, between asset and HTML, and after HTML publication leaves a
usable old or new pair, and a subsequent build completes. A race at the former cleanup boundary
plants a symlink after HTML publication and proves that it and its target remain untouched. A
separate SIGKILL test while holding the lock proves that the next build is not blocked. This is
process-failure safety; hosted file and directory `fsync` are absent, so power-loss durability is
not claimed.

All mutation, failure and concurrent-publisher fixtures execute in a copied temporary repository
with their own `public/`, inputs and lock scope. The different-input fixture uses a real historical
source normalized with a final LF (`8efa6670cdf792b8…`) and the canonical source
(`134189ee3c5f9cb8…`). Two different-input processes and four same-input processes complete as
serialized transactions. The final HTML references an extant exact asset, both different-source
content-addressed assets remain, a same-source rebuild adds no asset, and no atomic-write temp file
remains. The real worktree's hosted snapshot is asserted unchanged after each fixture group. Its
final asset directory still contains only the canonical
`tk-vtext.134189ee3c5f9cb8.gzdata`; the historical asset exists only in the copied fixture.

Before render or mutation, the build validates the 1,204,583-letter stream, strict positive VLENS
count and sum, chapter/book alignment, strict UTF-8 verse text, final LF, exact 23,204-row count,
and minimum per-row Hebrew-letter alignment. Inputs that the browser would always reject cannot be
published.

The browser requests the payload only for an existing source, verse or letter display action,
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
assets.

Before loading inputs or rendering, the generator opens the output parent component by component
with `O_DIRECTORY|O_NOFOLLOW`, checks repository ancestry by bound directory descriptors and inode
identities, and holds that parent descriptor through render, write and verification. It never
returns to the parent pathname. Publication is create-new only: it writes and `fsync`s a complete
temporary regular file, then uses a dirfd-relative hard link as an atomic no-clobber publish. Any
existing or raced basename—regular file, symlink, directory, FIFO or another special entry—wins and
remains unchanged while the build fails explicitly and removes only its own temporary entry.

Absolute, relative and `..` spellings that bind inside the repository, exact hosted HTML/assets,
new paths under `public/`, `dist/` or `inputs/`, symlink parents, existing outputs and missing
parents are rejected without hosted mutation. An orchestrated swap replaces the validated parent
pathname with a symlink to fixture `public/`; the held descriptor keeps publication in the original
external directory and nothing appears in `public/`. A second race plants a final-output symlink
immediately before publish; no-clobber publication fails, preserves the symlink and target, and
leaves no temp file. No second multi-megabyte public route artifact is committed.

Two distinct create-new standalone destinations were byte-identical. The measured file is
2,492,175 raw bytes (1,626,805 bytes with comparison gzip) with SHA-256
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

No repository or document CSP was added or measured. The hosted request is same-origin and is
compatible with `connect-src 'self'`. The standalone artifact fetches its embedded `data:` URL, so
an externally imposed CSP must permit `data:` for `connect-src`. The offline Chromium harness did
not impose such a CSP.

## Deterministic byte measurement

See `measurements.json`. All comparison gzip values use Node zlib level 9 with `mtime: 0`.

| Item | Original | Hardened | Difference |
| --- | ---: | ---: | ---: |
| `tzofen.html` raw | 2,489,355 B | 1,587,178 B | −902,177 B |
| `tzofen.html` gzip | 1,625,009 B | 944,225 B | −680,784 B (−41.89%) |
| Fresh 2029 ELS app graph + engine gzip | 1,988,096 B | 1,307,312 B | −680,784 B (−34.24%) |

The repair does not change the generated hosted or standalone bytes. The hardened hosted HTML adds
97 raw bytes and 42 comparison-gzip bytes to the reviewed split artifact while retaining its exact
transfer savings. The deferred binary remains 677,655 bytes and expands to the exact 2,722,983
source bytes. This is a byte and request-count result, not an LCP or wall-time claim. The ELS
application source graph did not change.

## Acceptance run

- `test/els-verse-payload-defer.test.mjs`: 4/4 PASS with executable Chromium. Covers deterministic
  hosted and standalone generation, isolated path-rejection and source-validation matrices,
  no-cleanup preservation for regular/link/directory/FIFO/socket entries, bound-parent and
  final-basename races, three hosted failure cut points, SIGKILL lock release, 2-way
  different-input and 4-way same-input publication, exact canonical bytes, strict offline ordinary
  search and clicked-letter source display, hosted zero requests on
  mount/idle/search, one shared request for verse + letter lenses, reuse, fail-closed corruption
  handling and retry.
- `test/els-browser-cutover.test.mjs`: 26/26 PASS with executable Chromium.
- `test/els-native-ui-browser.test.mjs`: 34/34 PASS with executable Chromium, including source,
  niqqud, restore, Classic/Research, privacy and save paths.
- Broad static ELS set: 175 tests, 172 PASS, 3 SKIP, 0 FAIL. All three skips are existing
  executable PostgreSQL cases because no local PostgreSQL service was available; this task made no
  SQL or product database change.
- Legacy launch gate + Advanced + FORMS executable-browser set: 5/5 PASS.
- `npm run build`: full Legacy and 2029 builds PASS.
- `npm run test:2029-bundle-budget`: 5/5 PASS. Built entry remains 9 chunks / 187.2 KiB gzip.
- Fresh `dist/els-data/tk-vtext.134189ee3c5f9cb8.gzdata` and `dist/tzofen.html` are byte-identical
  to the public asset and HTML. Hosted HTML SHA-256 is `16b44c5b…`; payload SHA-256 is
  `13d17191…`; decompressed source SHA-256 is `134189ee…`.
- A fresh canonical generator run left the tracked hosted outputs unchanged and the real asset
  directory held only the canonical regular asset. `git diff --check` passed.

## Remaining limits

- No hosted Preview, Vercel response-header, Firefox, Safari, physical phone, authenticated-user or
  real-user timing acceptance was run.
- Direct `file://` navigation could not be exercised under the managed Chromium policy. The strict
  offline browser acceptance above validates the generated one-file artifact without network, but
  does not establish behavior under every browser's file-origin policy.
- The custom `.gzdata` extension and explicit browser decompression avoid relying on
  `Content-Encoding`; hosted response headers still need verification in an eventual Preview.
- Process-failure recovery is tested. The standalone temporary file is `fsync`ed before its
  no-clobber link, but containing directories and hosted artifacts are not; power-loss durability
  is not claimed.
- Hosted `connect-src 'self'` compatibility and standalone `connect-src data:` requirements were
  reviewed statically; no deployed CSP/header combination was exercised.
