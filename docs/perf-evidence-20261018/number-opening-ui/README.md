# Number 2029 compact opening handoff

Date: 2026-10-18

- Branch: `gpt/perf-number-opening-ui-20261018`
- Exact base: `gpt/perf-number-opening-contract-hardening-v2-20261018@820491802b6c3367366edefae7f44af88f8ba54d`
- Sentinel-hardening remediation base: `b755562c7b063b8c62b598ee1b19bd057961ae9d`
- Second-review remediation base: `bb664d0172419c0c7ad22a54ed94456fdbc9efa9`
- Scope: `Number2029Page` opening orchestration, the shared Number identity seam, and focused tests/evidence
- Hosted timing/speed result: `NOT_MEASURED`
- Database/deployment state: no migration, RLS, flag, live database, deployment, or Production change

## Implemented request boundary

The page now awaits `fetchNumberOpeningIdentity(root)` before it imports or calls the compact
projection. A missing identity returns the existing honest empty state and starts neither the
compact RPC, anchor read, nor full projection.

After identity admission, the compact `fetchNumberOpeningProjection(identity.value)` and
`fetchNumberAnchorProfile(identity.value)` reads start together. `projectNumberOpeningCore` is the
first usable Number projection. Its samples, returned/total counts, and incomplete/deferred status
are rendered explicitly; a compact result can never report a complete full projection.

The opening does not call `fetchEntityHubProjection`, `researchNumber`, `fn_number_lookup`, the
topic/graph/media/world/signature/zero-scale/depth readers, or a redundant
`getValuePhrasesPage`. Method profile, hidden crossings, method trace, system methods, language
bridges, curation, verse reads, and related stage reads wait for an explicit expression/method
focus or depth request. A real compact-expression click establishes that focus and starts its
canonical method profile read.

Full depth begins only after the existing near-depth sentinel observes fresh explicit input intent
or the user presses the bounded depth action. Scroll position and scroll events never create intent.
The testable state machine requires at least 32 pixels of accumulated wheel or touch movement, or a
recognized scrolling key, within 900 ms and then requires sentinel proximity. Mouse and pen
pointer movement are not intent inputs, so selection and drag gestures cannot request depth. The
DOM adapter also requires trusted input. Hash, POP and pageshow/restoration events clear pending
intent; synthetic wheel/key events cannot impersonate it. One access-partitioned
in-flight request calls the existing
canonical `fetchEntityHubProjection` with its null-cursor lookup path. The full projection replaces
the compact projection wholesale; compact samples are never promoted or merged into Universal
Findings or complete 37-field rows. A depth error retains the opening and exposes a bounded retry.
An opening module/RPC error exposes opening retry and never falls back to the full lookup. A failed
depth dynamic import is classified and bounded; its retry records the explicit request in tab-local
session storage and reloads before retrying, so a poisoned browser module-map entry is not reused.

Request caches include the authenticated principal and auth/profile/role/tier revisions. Rendered
state is also keyed by access context and root, and latest-request gates reject late root results or
completion after unmount. Re-render/StrictMode and back/forward reuse the same settled or in-flight
promise without duplicating reads. A stable empty-family sentinel prevents a loading-state update
loop during route remount and is exercised by real internal back/forward navigation. Numeric route
parsing preserves the existing leading-zero URL contract by normalizing `/number/001820` to numeric
`1820` before the identity seam. One parser validates both direct identity input and the returned
node label: it accepts safe nonnegative integer numbers or the exact strings `0` and
`[1-9][0-9]*`. It rejects leading-zero strings, signs, whitespace, booleans, arrays/objects,
exponential/fraction syntax, negative/fractional numbers and unsafe values. Returned identity labels
and links are projected from the admitted canonical value.

## Loopback browser/network receipt

The browser test serves the production `dist/2029.html` over loopback and intercepts the Supabase
transport with deterministic synthetic responses. It waits after the usable compact marker and
after every negative stimulus before asserting that full depth is still idle.

| Viewport | Accepted trigger | Initial compact response | Requests before intent | Programmatic scroll/navigation stayed idle | Depth lookups |
| --- | --- | ---: | ---: | --- | ---: |
| 320×700 | real wheel | 1,539 bytes | 39 | yes | 1 |
| 390×844 | real `End` key | 1,539 bytes | 50 | yes | 1 |
| 1440×1000 | real CDP touch gesture | 1,539 bytes | 41 | yes | 1 |
| 390×844 | explicit depth button | 1,539 bytes | 8 | n/a | 1 |
| 390×844 | failed depth chunk, reload-safe retry | 1,539 bytes | 15 | n/a | 1 |

The receipt also proves identity precedes compact/anchor transport; the first usable marker precedes
the depth request; `/number/001820` resolves to Number 1820 and sends numeric `1820` to the compact
RPC; and a real expression click starts `fn_method_profile` without starting `fn_number_lookup`.
At 320/390/1440 it covers `scrollTo(1)`, `scrollTo(20)`, `scrollTo(500)`, a hash jump directly to the
sentinel, a saved-position pageshow fixture, internal navigation/back/forward, StrictMode replay,
programmatic placement inside the 900px margin, script-dispatched wheel/key events, and a trusted
80-pixel primary-mouse drag whose scroll position remains unchanged. All remain at zero depth
lookups. The following real wheel probe changes `window.scrollY`; real wheel/key/touch inputs near
the sentinel and the explicit action each start exactly one lookup. The chunk-failure case aborts
the built Entity Hub chunk once, retains the opening and proves that retry reloads and then starts
exactly one depth lookup. These are local synthetic request/order and byte observations.
Hosted latency, cache behavior, transfer size and user-visible speed remain `NOT_MEASURED`.

## Bundle result

The reviewed base added `31` chunks / `202.9 KB gzip` for Number and `37` / `253.6 KB gzip` for
World. The candidate production build adds:

- Number: `26` chunks / `180.6 KB gzip` (budget remains `205 KB`; no budget change)
- World: `37` chunks / `253.9 KB gzip`
- Entry: `9` chunks / `187.2 KB gzip`
- Home: `26` chunks / `152.0 KB gzip`
- Post: `29` chunks / `174.7 KB gzip`

The compact projection and full Entity Hub projection are behind retryable dynamic boundaries; the
canonical identity implementation remains shared and export compatible.

## Validation completed

- `node --test test/number-opening-ui-orchestration-2029.test.mjs src/lib/research/entityHubNumberOpeningContext.test.js`: `44/44` passed, including the hostile input/returned-label matrix, intent state-machine, dynamic-module failure, race, retry and parity matrices.
- `node --test test/number-opening-ui-browser-2029.test.mjs`: passed with five production-Chromium scenarios across 320/390/1440 widths.
- `PGLITE_MODULE=/workspace/private-perf-20261017/unified-tools/node_modules/@electric-sql/pglite/dist/index.js node --test test/number-opening-projection-2029.test.mjs`: `9/9` passed with the exact migration and representative 0/376/718/1820 fixtures.
- The expanded focused Entity Hub consumer run passed `137/137` across Number opening context, progressive/full projection, facets, topic/source returns and World connections.
- Focused Number/World opening, method, lookup transport, expression, live-glass and presentation gates passed: `44/44`.
- An optional expanded Scripture/Heichal/opening run reported `29/30`: all Scripture projection and Number opening checks passed, while one stale Heichal source-shape assertion failed. Both `Heichal2029Page.jsx` and that assertion are byte-identical to the `bb664d01` remediation base and outside this scope.
- `node scripts/test-2029-number-preview.mjs`: passed.
- `node scripts/test-2029-world-surface.mjs`: passed.
- Full `npm run build` for Legacy and 2029: passed.
- `npm run test:2029-bundle-budget`: `5/5` passed with the route graph sizes above.
- `git diff --check`: passed.

The browser transport is synthetic and does not establish hosted performance. The browser receipt
proves when the full request begins; full projection truth/admission, selected method/order parity,
retry, race, and exact SQL behavior are covered by the unit, Entity Hub, and PGlite gates above.
