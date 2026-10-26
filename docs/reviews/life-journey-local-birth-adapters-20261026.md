# Life Journey 2029 — local birth adapters v1

Date: 2026-10-26
Base: `7b0502709737beb70cfdae8726f7805154462aa8`
Branch: `gpt/life-journey-local-birth-adapters-v1-20261026`

## Scope

This slice replaces the Human Design and sky-map placeholders inside the existing Life Journey birth studio. It does not create a Person store, Journey store, graph, Research Context, ELS engine, Raziel memory, database migration, RLS policy or live-data mutation.

The user explicitly selects one existing private Ledger person and starts the calculation. Birth date and time come from the existing read-only projection. IANA timezone and latitude/longitude are session-only inputs and are cleared when the page is refreshed or the selected person changes.

A later Preview-usability extension permits a temporary date/time override and a bounded local city lookup. A matched city supplies its city-centre coordinates and IANA timezone without contacting a location service. Manual coordinates remain available under an advanced disclosure; neither path writes back to the profile.

## Adapter and provenance

- Narrow adapter: `src/lib/research/lifeJourneyBirthAdapters.js`
- Calculation dependency: `natalengine@1.6.0`, pinned in the lockfile
- Ephemeris dependency used by the package: `astronomy-engine@2.1.19` (VSOP87)
- npm release source commit: `a7b6530a1df504697e3498c85d08bd3860c13330`
- License: MIT
- Upstream exact-release suite: 208/208 passed
- Independent Human Design cross-check: five third-party reference charts; 127/130 exact gate-line activations, with the three differences at a one-line/reference-timezone boundary
- Local city catalogue source: GeoNames geographical database, CC BY 4.0, retrieved 2026-10-26; the UI attributes the processed data

The UI exposes calculated coordinates and bounded Human Design structure only. Interpretive source prose from the dependency is discarded. Human Design is labeled as an interpretive framework, not scientific or medical diagnosis. Sky signs are labeled as coordinate sectors, not predictions or personality claims.

## Privacy boundary

- Calculation runs in the browser only after the explicit `חשב מפה מקומית` action.
- No external geocoding or birth-data API is called; city matching is a pure lookup against the bundled catalogue.
- Person name, person-ref and free-text birth place are not passed to the adapter.
- Date, time, timezone and coordinates are not put in URL, telemetry, network request bodies, localStorage, sessionStorage or a new store.
- Returned results do not echo the birth input.
- The heavy calculation modules are dynamically imported only after the action.

## Verification

- Full focused Life Journey suite: 59/59 passed.
- Bounded adapter/projection/contract slice: 11/11 passed, including five historical-timezone charts.
- Full Life Journey browser chain: 1/1 passed at 390px and 1280px in Light, Parchment and Dark; the local calculation itself was exercised and produced no private request URL/body.
- Normal dual build (`Legacy` + `2029`): passed.
- Integrated read-only Preview build and auth guard: passed (5/5).
- Direct Preview login/exact return: passed at 390px and 1440px (2/2).
- Hard isolation and Legacy Production lock: passed.
- Built graph: passed; eager 2029 graph recovered 75,768 gzip bytes against the required 12,288 bytes. Human Design, astrology and astronomy chunks remain lazy.
- `git diff --check`: passed.

No merge, hosted Preview, Production, site flag or database action is authorized by this document.
