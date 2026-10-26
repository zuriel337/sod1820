# Life Journey — interactive birth charts

Task: LIFE_JOURNEY_INTERACTIVE_BIRTH_CHARTS_20261026

Actor: GPT · report to ZURIEL

Base: `d472106595468d28668a5ee56fd8cbbddbb52cbe`

Branch: `gpt/life-journey-unified-synthesis-pack-v1-20261026`

## Existing owners and boundaries

Extends Person Foundation v6, Research Workspace v5 and the existing local birth adapter. Read-only live coordination found no overlapping Life Journey/birth-map writer. No coordination or product DB row was written. Current remote main was `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; its common ancestor with this branch is `8642f7c93c9b653b7a42faaa2809362f3cd280e0`. This is continuation of the user-approved isolated Life Journey branch, not an import or merge of current main. The approved ELS base `de27c6ea` remains an ancestor.

## Behavior

- Human Design: nine-center BodyGraph with the installed `natalengine@1.6.0` topology supplied through the existing adapter. Full defined channels consume the calculation's channel keys; the renderer does not recompute type, authority, gates or channels. Center and channel buttons expose calculated status, connected channels and active gates. Layout coordinates are presentation only.
- Sky: twelve zodiac sectors, exact computed longitudes, ASC/MC and engine-provided aspects, including aspects to angles. Selecting a body highlights its aspects and presents numeric details. Native buttons provide keyboard and touch access to the same plotted identities.
- The package does not expose house cusps. The wheel labels its sectors as zodiac signs and reports this coverage gap; no house system is fabricated.
- Chart interaction uses component selection state only. It does not rerun the calculation, transmit inputs, create a store, persist topology/results or change the normalized family synthesis.
- Existing explicit calculation, date/time/city inputs, privacy boundaries, lazy calculation modules and read-only Preview guard are retained. Existing GPU spatial view remains available separately; these new charts are lightweight SVG projections.

## Birth-profile storage correction

`PersonJourney.jsx` already reads/writes `birth_time_local` and `birth_place` through the existing private self/family profile adapters. This Preview deliberately rejects product writes. That guard is not evidence that a new schema or migration is necessary. Temporary calculator overrides still remain session-only. Enabling live persistence is outside this slice.

## Verification

Commands:

```sh
node --test src/lib/research/lifeJourney*.test.js test/life-journey-2029-chain.test.mjs
LIFE_JOURNEY_CHART_SCREENSHOT_DIR=/tmp/life-journey-charts-20261026 node --test test/life-journey-person-context.browser.test.mjs
npm run build
node scripts/build-integrated-preview.mjs
node scripts/test-integrated-preview-auth-guard.mjs
node scripts/test-2029-isolation.mjs
node scripts/test-legacy-production-lock.mjs
node scripts/test-2029-built-graph.mjs
git diff --check
```

Browser assertions cover nine centers, 36 engine-owned channels, center/channel keyboard and pointer selection, twelve sky bodies/sectors, body-specific detail, 44px targets, readable body text, no chart/page overflow at 320/390/1440px, three presets, reduced motion, no private calculation values in requests, and the existing full Person/Name/Date/family/exact-return chain. Generated captures contain synthetic test data only. The adapter test checks full-channel membership against actual activated gates from the installed engine.

Results: focused Life Journey suite **58/58 PASS**; browser chain **1/1 PASS**, including **18 chart captures** (two charts × three presets × three widths); normal dual build and integrated Preview build **PASS**; read-only guard **5/5 PASS**; hard isolation, Legacy lock and built dependency graph **PASS**; eager gzip recovery **75,767 bytes** against 12,288 required; `diff --check` **PASS**. Browser captures were visually inspected and the mobile nested padding was reduced before final verification. Existing package deprecation/chunk warnings remain.

No new engine, provider, Person/Journey/Context store, graph, migration, RLS, site flag, public source, ELS or Raziel change. No merge to main or Production.
