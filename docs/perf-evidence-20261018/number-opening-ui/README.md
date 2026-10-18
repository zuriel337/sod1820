# Number 2029 compact opening handoff

Date: 2026-10-18

- Branch: `gpt/perf-number-opening-ui-20261018`
- Exact base: `gpt/perf-number-opening-contract-hardening-v2-20261018@820491802b6c3367366edefae7f44af88f8ba54d`
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

Full depth begins only after the existing near-depth sentinel observes real scroll intent or the
user presses the bounded depth action. One access-partitioned in-flight request calls the existing
canonical `fetchEntityHubProjection` with its null-cursor lookup path. The full projection replaces
the compact projection wholesale; compact samples are never promoted or merged into Universal
Findings or complete 37-field rows. A depth error retains the opening and exposes a bounded retry.
An opening module/RPC error exposes opening retry and never falls back to the full lookup.

Request caches include the authenticated principal and auth/profile/role/tier revisions. Rendered
state is also keyed by access context and root, and latest-request gates reject late root results or
completion after unmount. Re-render/StrictMode and back/forward reuse the same settled or in-flight
promise without duplicating reads. Numeric route parsing preserves the existing leading-zero URL
contract while the orchestration API rejects coercible non-route inputs such as null, blank text,
booleans and arrays.

## Loopback browser/network receipt

The browser test serves the production `dist/2029.html` over loopback and intercepts the Supabase
transport with deterministic synthetic responses. It waits 900 ms after the usable compact marker
at each viewport before asserting that full depth is still idle.

| Viewport | Depth trigger | Synthetic compact response | Requests before intent | Auto depth at rest |
| --- | --- | ---: | ---: | --- |
| 320×700 | scroll near depth | 1,539 bytes | 8 | no |
| 390×844 | expression click, then depth action | 1,539 bytes | 12 | no |
| 1440×1000 | depth action | 1,539 bytes | 10 | no |

The receipt also proves identity precedes compact/anchor transport; the first usable marker precedes
the depth request; the compact RPC starts once; `/number/001820` resolves to Number 1820 and
sends numeric `1820` to the compact RPC; and a real expression click starts `fn_method_profile`
without starting `fn_number_lookup`. These are local synthetic request/order and byte observations.
Hosted latency, cache behavior, transfer size and user-visible speed remain `NOT_MEASURED`.

## Bundle result

The reviewed base added `31` chunks / `202.9 KB gzip` for Number and `37` / `253.6 KB gzip` for
World. The candidate production build adds:

- Number: `26` chunks / `179.3 KB gzip` (budget remains `205 KB`; no budget change)
- World: `37` chunks / `253.8 KB gzip`
- Entry: `9` chunks / `187.2 KB gzip`
- Home: `26` chunks / `152.0 KB gzip`
- Post: `29` chunks / `174.7 KB gzip`

The compact projection and full Entity Hub projection are behind retryable dynamic boundaries; the
canonical identity implementation remains shared and export compatible.

## Validation completed

- `node --test test/number-opening-ui-orchestration-2029.test.mjs test/number-opening-ui-browser-2029.test.mjs`: `12/12` passed, including the three real-browser viewport scenarios.
- `PGLITE_MODULE=/workspace/private-perf-20261017/unified-tools/node_modules/@electric-sql/pglite/dist/index.js node --test test/number-opening-projection-2029.test.mjs`: `9/9` passed with the exact migration and representative 0/376/718/1820 fixtures.
- All focused Entity Hub consumers passed: `110/110` across Number opening context, progressive/full projection, facets, topic returns and World connections.
- Focused Number/World opening, method, lookup transport, expression, live-glass and presentation gates passed: `44/44`.
- Scripture discovery plus compact-opening orchestration gates passed: `16/16`.
- `node scripts/test-2029-number-preview.mjs`: passed.
- `node scripts/test-2029-world-surface.mjs`: passed.
- Full `npm run build` for Legacy and 2029: passed.
- `npm run test:2029-bundle-budget`: `5/5` passed with the route graph sizes above.
- `git diff --check`: passed.

The browser transport is synthetic and does not establish hosted performance. The browser receipt
proves when the full request begins; full projection truth/admission, selected method/order parity,
retry, race, and exact SQL behavior are covered by the unit, Entity Hub, and PGlite gates above.
