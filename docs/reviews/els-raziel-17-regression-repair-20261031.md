# ELS / Raziel: repair of the 17 integrated acceptance failures

## Provenance and boundaries

- Task: `ELS_RAZIEL_17_REGRESSION_REPAIR_20261031` · actor: existing GPT.
- Base/source: `gpt/2029-central-posts-els-raziel-integration-20261031` at
  `f4aedfe3ed2dc34dde184e978c396b10f8186f9a`, verified by fetch and `ls-remote`.
- Isolated delivery branch: `gpt/els-raziel-regression-repair-20261031`.
- Read AGENTS, linked owner instructions and the central integration receipt.
  Live bounded `work_log_current` reads found no overlapping active writer on
  these acceptance tests. Central release receipt: `a1547816-ce20-4510-8c39-1baba322e2d4`.
  Rechecked before handoff. The connector is read-only: no BEFORE/AFTER row was
  written or claimed; this receipt is for the existing authorized coordinator.
- No ELS reimport, merge, main write, Preview, deployment, paid model request,
  product data write, DB/RLS change or migration application.
- Changes are acceptance tests, a test-only source-stage helper and this receipt.
  All product/runtime files, Providers, SystemFrame and engine are unchanged.

## Before / after and diagnosis

On the exact base the ten affected files reproduced **116 tests: 99 pass, 17 fail**.
The same selection after repair is **116 pass, 0 fail**, with no skips.
All seventeen failures were stale source-shape assertions, not demonstrated
product defects. This conclusion is specific to these failures, not a claim
that the whole product is defect-free.

| # | Original test (short label) | Cause and retained contract |
|---|---|---|
| 1 | Phase B: plan before model | The first model call is now an explicit ELS action. Check plan injection before the **ordinary synthesis**, after its quota. |
| 2 | Phase B: deterministic zero-model | The first quota belongs to another branch. Check the ordinary deterministic exit before its quota/model. |
| 3 | Phase B: semantic surface | Grounded ELS deliberately removes the unverified client ELS pack. Assert redaction, companion exclusion and the ordinary whitelist, not the obsolete direct invocation. |
| 4 | Phase B: Frame semantic pack | Snapshot uses guarded `requestView` to retain only the same occurrence's matrix. Assert that derivation and snapshot; retain all no-open-call, no-HTML and single-transport assertions. |
| 5 | Phase C: identity before planning/quota | Check the specific ordinary quota. Single identity resolution, server-derived tier/ref and no client-admin authority remain asserted. |
| 6 | Phase C: operator before synthesis | Distinguish the ordinary trace/quota/model from earlier ELS calls. Keep caller-JWT, read-only allowlist, failure redaction and L0 assertions. |
| 7 | Phase D: intelligence wiring | Check deterministic → selector → ordinary quota → ordinary model, preserving L2/L3 mapping and metadata assertions. |
| 8 | Phase I: cross-surface pack | Same guarded `requestView` correction as #4; preserve Number/reading/ELS fields, bounds and no-I/O assertions. |
| 9 | Phase K: coordination call-site | Coordination must follow ordinary quota and precede ordinary synthesis, not the earlier independent ELS planner. L0/pack/admin/privacy tests remain. |
| 10 | Phase L: personal call-site | Same ordering correction. The plan concatenation now starts with content-comparison guidance before personal state. Assert actual personal-pack concatenation within the plan block; keep caller/privacy/A–K tests. |
| 11 | Faithful port: native workspace | Page mounts `ElsNativeWithRaziel`; prove that its single Native Classic child receives `...props` and the page still supplies the exact saved matrix and activation guards. |
| 12 | Faithful port: cross delegation | Envelope gained `maxLetterGap`. Assert it explicitly, including zero-gap default; keep canonical engine, scope, onboarding and tier guards. |
| 13 | Faithful port: mounted continuity | Check the page's wrapper mount before Research details and forwarding to the same Classic child. No hidden/remounted parallel engine allowed. |
| 14 | Faithful port: context selection | Activity observes pending/error states before the separate OK guard. Require source/type and current-frame guards, observation, then OK-only selection. |
| 15 | Research bar | Assert the wrapper and forwarding; initial seed is intentionally empty on saved/share/reading/task exact returns. Preserve that full guard and research-only composition. |
| 16 | Semantic surface: projection | Assert the wrapper/Classic path; keep one canonical tool, replay-only projection and no inline search engine. |
| 17 | Visual representation | Same wrapper correction; retain canonical replay/layers/renderer and one-engine assertions. |

`test/helpers/raziel-ordinary-stages.mjs` identifies unique, existing ordinary
quota/trace/model bindings instead of the first occurrence of a function name.
Missing or duplicated boundaries fail closed; negative tests exercise both.
It is not a runtime seam, Provider, transport or engine.

## Additional behavioral proof

`test/raziel-ordinary-route-contract.test.mjs`: **9/9**.
Uses the existing real-handler VM harness, replacing external I/O only:

- Deterministic gematria and ELS responses bypass AI quota/model even on deep requests.
- Reused and fallback plans reach exactly one synthesis after one verified identity
  and ordinary quota; forged client admin/tier/user-ref fields cannot alter authority.
- Quota denial blocks synthesis.
- Semantic context strips tags and excludes raw body/HTML/private fields from prompts/traces.
- Non-admin operator escalation is denied; an admin owner-RPC denial uses the caller
  JWT, redacts the error payload and continues without private data.

These are synthetic-provider tests, not live AI or database validation.
Existing permission, private-save/RLS-contract, canonical replay, cancellation,
late-result/principal-isolation and no-model-on-open tests were not weakened.

## Reproduction commands

Original affected selection (run before and after, identical test names/count):

```sh
node --test src/lib/research/razielPhaseBPlanWiring.test.js src/lib/research/razielPhaseCOperatorRead.test.js src/lib/research/razielPhaseDMinimumIntelligenceGolden.test.js src/lib/research/razielPhaseICrossSurfaceContext.test.js src/lib/research/razielPhaseKOperatorCoordination.test.js src/lib/research/razielPhaseLPersonalResearchContinuity.test.js test/els-2029-classic-faithful-port.test.mjs test/els-2029-research-bar.test.mjs test/els-2029-semantic-surface.test.mjs test/els-2029-visual-representation.test.mjs
node --test test/raziel-ordinary-route-contract.test.mjs
```

Broad suites use the **exact** `test_selections.raziel` and `.els` arrays already
recorded in `central-posts-els-raziel-integration-20261031.json`, passed to
`node --test` without changing expectations, timeouts or skip conditions.

## Verification results

| Gate | Result |
|---|---|
| Original affected selection | 116/116 |
| Added real-handler/source-boundary contracts | 9/9 |
| Central Raziel selection | 668/668, 0 failures/skips |
| Central ELS selection | 435 pass, 0 fail, 5 skip (440 total) |
| Central Posts/Follow selection | 163 pass, 0 fail, 1 local-PostgreSQL skip (164 total) |
| Integrated Preview auth guard (no deploy) | 9/9 |
| Real built-app Raziel browser group | 4/4 |
| ELS card/advanced/principal/controls browser group | 6/6 |
| Forms preview / background research in all presets | 4/4 |
| Native full browser acceptance | 68/68, 0 failures/skips/cancellations; one full run, no test changes/retries |
| Legacy build / 2029 build | PASS with real locked dependencies; no stubs |
| Built graph/lazy bundle | PASS; eager gzip 437,834 bytes; submit adapter and Research Plan lazy |
| Hard isolation / cheap hardening | PASS |
| Legacy Production lock / public 2029 language | PASS; language 3/3 |
| `git diff --check` (this cut) | PASS |

The five local-PostgreSQL skips are unchanged: durable jobs SQL/races, operation
through PostgreSQL, stream migration admission, private saves/RLS and batch replay
parity. They were **not** replaced by fakes or declared green. No remote DB is
used as an alternative. Live RLS, paid-provider quality and real-account sync
are not established by this branch's synthetic tests.
Selections overlap; do not sum their counts. The Posts skip repeats the same
operation-through-PostgreSQL case already listed in the ELS selection.

Browser runs use the actual canonical/native tool or the built global app with
declared intercepted backend/model fixtures. They cover mobile 320/360/390,
tablet/desktop where applicable, all three presets, mixed English/Hebrew,
no horizontal overflow, exact return, private/public saving, no AI on open,
cancellation and principal/occurrence isolation. This is one successful full
native run, not a claim that every possible browser/network flake is eliminated.
The four non-overlapping browser groups total **82/82**, with zero skips.

```sh
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node --test test/els-native-ui-browser.test.mjs
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node --test test/els-raziel-responsive-browser.test.mjs test/els-matrix-reading-activity-browser.test.mjs test/raziel-account-sync-map.browser.test.mjs test/raziel-canonical-navigation-actions-2029.browser.test.mjs
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node --test --test-concurrency=1 test/els-matrix-reading-card-browser.test.mjs test/els-advanced-page-browser.test.mjs test/els-background-principal.browser.test.mjs test/els-research-controls-browser.test.mjs
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node --test --test-concurrency=1 test/els-forms-preview-browser.test.mjs test/els-background-research.browser.test.mjs
```

The first build attempt exposed missing `pdfjs-dist` in the older local install.
`npm ci` restored the exact lockfile dependencies; both final builds passed without
source, lockfile, dependency-version or stub changes.

## Delivery state

IMPLEMENTED / TESTED / HANDOFF_READY on isolated branch only. Not merged or live. No new ELS chain
or capability is included. Authorized coordinator may record a passive AFTER
from this receipt; no dispatch, ACK, production or release authority is implied.
Handoff to ZURIEL / central integration; no continuing ownership retained on these
tests after delivery. No PR was opened and no integration into central was performed.
