# G3-D · GEMATRIA AUTHORITY ISOLATION PASS

Date: 2026-09-16  
State: BRANCH-ONLY · NOT MERGED · NOT DEPLOYED · HUMAN GATE ABSENT

## Live bootstrap

- origin/main at pass start: `22b18c900ac616d5c021d335efd94b810b753918`
- canonical Supabase: `linswmnnkjxvweumprav`
- owner: `gematria_engine_law v2`
- Registry owner: `canonical_methods_registry_law v5`
- coordination: `inter_agent_coordination_law v12`
- branch base: G3-B release-package head `3e16dc8fa17508c44ae28ac1752b2e86ba9edcc6` (stacked on G3-A)
- rule: SERVER / REGISTRY = authority; local client calculation = legacy compatibility / preview only.

## Canonical live authority re-verification

Live DB was re-read during this pass.

- `public.gematria_methods`: 41 rows live at inspection time; 32 active; 37 declared in-engine; 28 scannable. This count is observational only and is NOT a product contract.
- `public.fn_method_value(method_key, phrase)`: resolves the method through `gematria_methods` and dispatches via the registered execution kind. It is the canonical numeric execution function.
- `public.gematria_method_trace(method_key, phrase)`: resolves the Registry row, gets the canonical result from `fn_method_value`, attaches method/version/semantics/dependencies/provenance, and fail-closes with `TRACE_PARITY_MISMATCH` when a supported trace disagrees with the canonical value.
- `public.gematria_api(text)`: numeric values are canonical because every exposed value is sourced through `fn_method_value`. Its response is a backward-compatible nine-method projection, not the Registry itself and not a fixed-count contract for 2029.
- `src/lib/research/gematriaMethodRegistry.js`: dynamic reader over `public.v_method_states`; owns no method count or method truth.
- `src/lib/research/canonicalGematria.js`: server consumer. It calls `gematria_api`, then projects only that server response into Universal Findings. It does not calculate a numeric value locally and correctly leaves `verification_state = not_tested` when no external claim was submitted.

### Important projection distinction

`gematria_api` is canonical for the numbers it returns, but it is NOT Registry-complete. A future native 2029 calculator that needs the full current method set must enumerate live Registry state and use canonical server execution / `gematria_method_trace`; it must not treat the API's current nine keys as a permanent method list.

## Targeted legacy surface certification

| Surface | Current numeric source | Can directly mint Universal Finding / verification? | 2029 reachability | Disposition |
|---|---|---|---|---|
| `GematriaCalculatorLegacy.jsx` | LOCAL `METHODS + DEPTH_METHODS` → `method.fn`; local regular value also feeds wall/search telemetry and legacy Research bookmark actions | No direct Universal Finding or verification constructor. It can persist legacy values/bookmarks, so those values are NOT eligible for automatic 2029 truth projection without canonical replay | Forbidden by 2029 built-graph gate | TEMPORARY PRODUCTION COMPATIBILITY → ABSORB_THEN_ARCHIVE |
| `CommunityCalculatorPage.jsx` | LOCAL `calculateGematriaEnvelope` + legacy `resolve` fallback; values feed shares/discovery/AI copy/wall | No direct Universal Finding or verification constructor. Its engine-sounding UI/AI copy does not upgrade the local number into canonical truth | Forbidden by 2029 built-graph gate | TEMPORARY PRODUCTION COMPATIBILITY → ABSORB_THEN_ARCHIVE |
| `GematriaCube.jsx` | none | no | forbidden and currently `return null` | RETIRED / archive when dead imports are removed |
| `GematriaMiniDemo.jsx` | LOCAL `calcGem` | no | forbidden by 2029 built-graph gate | NON-AUTHORITATIVE PREVIEW / TEMP COMPATIBILITY → retire or server-back |
| `GematriaCalculator3D.jsx` | none | no | forbidden and currently `return null` | RETIRED / archive when dead imports are removed |

## Direct dependencies discovered

### `src/lib/research/gematriaCalculationContract.js`

Despite its historical name/comments, it currently calculates every numeric result with `method.fn(raw)` from `METHODS/DEPTH_METHODS`. Registry state is metadata only. Therefore it is a LEGACY CLIENT CALCULATION CONTRACT, not a 2029 numeric authority contract.

It is consumed by more than the five named surfaces, including `src/lib/research/coreEngine.js` and `src/components/MethodAnalyze.jsx`. Replacing it in-place would require shared Research changes and can collide with other G3 work. Per the G3-D instruction, this pass does NOT write that shared contract.

### `src/lib/research/coreEngine.js`

Synchronous Research compatibility consumer of `calculateGematriaEnvelope`. Its computed values are client-side. It is therefore explicitly forbidden from route/build reachability in the isolated 2029 runtime by this branch. A future native 2029 Research calculation path cannot use this module as numeric authority without a shared-core migration authorized by G3 MAIN.

### `src/components/MethodAnalyze.jsx`

Consumes the local calculation contract and can feed the resulting values into AI analysis/event metadata. It does not mint Universal Findings or verification state itself, but the numeric facts it passes are local compatibility values. It is forbidden from 2029 reachability by this branch.

### `src/lib/engine.js`

Its fallback `resolve()` uses local `calcGem`. It remains legacy compatibility and is forbidden from 2029 reachability by this branch.

## Finding / Claim / verification gate

Targeted source inspection found no `makeUniversalFinding` or `verification_state` production inside the client-only calculation surfaces/dependencies listed above.

The canonical Universal Finding path inspected in this pass is `canonicalGematria.js`, and it is server-first (`gematria_api`). It records the engine result but does not fabricate a claim match. Therefore the current client-only calculators cannot become a 2029 canonical Finding merely by being rendered or by emitting their local result.

Legacy personal bookmarks / wall/search rows remain legacy data. Re-admission into 2029 truth/finding projection requires current canonical replay under `gematria_engine_law v2`.

## Parity evidence

### Live server/trace parity in this pass

Six discriminating inputs × nine currently exposed API methods were re-run live through `fn_method_value` + `gematria_method_trace`: 54 result checks. Every supported trace returned parity `true`; zero trace errors occurred.

Inputs included:

- `התגלות`
- `עופר וינטר`
- `רבי עקיבא`
- `מלך`
- `שלום, עולם`
- `משיח`

The live `התגלות` values also match the locked client comment fixture in `src/lib/gematria.js` for all eight named legacy methods: regular 844, miluy 1026, misratar 1237, kadmi 3137, gadol 844, siduri 70, atbash 392, albam 241.

### Client/SQL snapshot parity

The existing offline `test/normalize-parity.test.mjs` compares the legacy JS functions against a frozen live SQL snapshot across 14 mapped methods and normalization / punctuation / multi-word / final-letter cases. G3-D wires this test into the 2029 isolation CI so parity regressions cannot silently accompany a compatibility change.

Parity is compatibility evidence only. It does NOT confer authority on the client implementation.

## Branch enforcement added by G3-D

1. New `scripts/test-gematria-authority-isolation.mjs`:
   - proves current 2029 Calculate action remains a document-boundary handoff, not an in-tree legacy execution;
   - proves the canonical Finding adapter is server-RPC sourced and does not call local numeric execution;
   - proves Registry state is read dynamically;
   - certifies the five requested legacy surfaces and their direct local dependencies;
   - proves client-only paths do not mint Universal Findings / verification state.

2. Extended `scripts/test-2029-built-graph.mjs`:
   - forbids all named legacy calculator surfaces plus `MethodAnalyze`, `gematriaCalculationContract`, `research/coreEngine`, and `lib/engine` from the 2029 built dependency graph.

3. Extended `.github/workflows/2029-isolation-gate.yml`:
   - reruns when Gematria compatibility/canonical files change;
   - runs the new authority gate;
   - runs the existing 14-method JS/SQL parity snapshot;
   - runs the canonical Gematria Finding adapter shape test;
   - keeps the existing source/build isolation gates.

## Retirement conditions

### `GematriaCalculatorLegacy`
Retire after a native server-backed projection preserves required production capabilities (input, method list from Registry, advanced comparison, trace/provenance, wall/search behavior intentionally retained or explicitly dropped) and no consumer relies on local `onResult.ragil` / `method.fn` side effects.

### `CommunityCalculatorPage`
ABSORB_THEN_ARCHIVE after its useful public/share/discovery behavior is projected from canonical Result Bundles/server results. AI analysis must consume canonical server values, not the local compatibility envelope.

### `GematriaMiniDemo`
Retire or replace when the onboarding surface receives a server-backed regular result. Until then it is preview only and may not be imported by 2029.

### `GematriaCube` / `GematriaCalculator3D`
Already runtime-retired (`return null`). Remove remaining imports/references when their legacy callers are archived; do not reactivate them as calculators.

## DRIFT

1. Historical naming/comment drift: `gematriaCalculationContract.js`, `coreEngine.js`, `MethodAnalyze.jsx`, and `CanonicalGematriaCalculator.jsx` use “canonical/engine verified” language around a local `method.fn` calculation path. Current owner law v2 supersedes that semantic implication. No shared-file rewrite was performed in this pass because the user explicitly required STOP BEFORE WRITE on shared Research files.
2. `gematria_api` is a canonical numeric adapter but still a bounded nine-method backward-compatible projection. It must not be interpreted as a fixed Registry count.
3. Legacy surfaces can persist local values/bookmarks/wall rows. Those are compatibility data and require canonical replay before automatic 2029 truth/finding projection.

## Shared-file blocker

A full native 2029 Gematria cutover cannot reuse `gematriaCalculationContract.js` / `research/coreEngine.js` as-is, because they are synchronous client calculators. Converting those shared contracts would require a coordinated shared Research change (and potentially Result Bundle/Resolver consumers). Per G3-D instruction, this branch stops before that shared WRITE.

This does NOT block authority isolation of the current 2029 runtime: the isolated 2029 build cannot reach those modules after this branch's gate. It DOES block claiming that a native 2029 calculator has already been implemented.

## Release state

BRANCH-ONLY. No DB/schema change. No Registry change. No engine change. No merge. No deploy. No production change. Human Gate authorization absent.
