# G3 — 2029 Legacy Gematria Execution Follow-up v1

**Date:** 2026-09-16  
**Parent:** `G3_2029_EARLY_LEGACY_SEPARATION_BASELINE_V1.md`  
**Status:** BRANCH-ONLY EVIDENCE · NO RUNTIME CHANGE · NO RELEASE

## Question

Claude's READ_ONLY challenge of the early separation baseline returned PASS with one bounded sample gap: legacy calculator surfaces outside the assigned path set were not inspected, so project-wide certification could not assume that every legacy calculator already consumed the canonical 2029 Gematria engine.

This follow-up resolves that gap against current `origin/main=22b18c900ac616d5c021d335efd94b810b753918`.

## Live owner boundary

Active `gematria_engine_law v2` is explicit:

- automatic 2029 Gematria projection must originate from successful execution of the canonical SOD1820 Gematria Engine under the canonical Method Registry;
- no renderer/import/AI/legacy flag/local cached value may manufacture the calculation result;
- legacy material is **re-admitted through current canonical replay**, not trusted by age or prior display;
- compile once → project many.

The verified 2029 server path exists:

- `public.gematria_api(text)`
- `public.gematria_method_trace(method_key, phrase)`
- `public.gematria_methods`
- `src/lib/research/canonicalGematria.js` → calls `gematria_api`
- `src/lib/research/gematriaTrace.js` → calls `gematria_method_trace` and explicitly does not calculate locally.

Disposition: **`KEEP_CURRENT`**.

## Material legacy execution finding

The legacy/professional calculator family is **not yet equivalent to the server-canonical 2029 path**.

### Evidence A — current professional entry still renders the legacy calculator

`src/components/GematriaCalculator.jsx` re-exports `CanonicalGematriaCalculator.jsx`.

`CanonicalGematriaCalculator.jsx` mounts `GematriaCalculatorLegacy` and wraps its result with `calculateGematriaEnvelope(...)`.

### Evidence B — the so-called calculation envelope still executes local JS methods

`src/lib/research/gematriaCalculationContract.js` imports `METHODS` / `DEPTH_METHODS` from `src/lib/gematria.js` and calculates each result with:

`value: method.fn(raw)`

Its own provenance says:

`calculationEngine: "src/lib/gematria.js"`

The file itself states that the existing client execution definitions remain the calculation implementation in that slice.

Therefore this adapter adds Registry/provenance metadata around a **client-local calculation**, not a `gematria_api` execution result.

### Evidence C — legacy calculator performs local calculations directly

`GematriaCalculatorLegacy.jsx` imports the client `METHODS`/`DEPTH_METHODS` and runs `m.fn(word)` / `m.fn(...)` for displayed values and advanced comparisons.

### Evidence D — the pattern is broader than one component

Current source search shows direct `gematria.js` method consumption across legacy surfaces including examples such as:

- `CommunityCalculatorPage.jsx`
- `MethodAnalyze.jsx`
- `NumberDrawer.jsx`
- `NameStory.jsx`
- `VerseSearch.jsx`
- `VerseGematriaPage.jsx`
- `FileAnalyzer.jsx`
- `NumberFamilies.jsx`
- `ActiveEntityPanel.jsx`
- `ApiPanel.jsx`
- legacy placeholders/other utility surfaces.

Not every import necessarily executes a calculation; however the professional/community calculator paths above prove that **client-local calculation remains an active legacy runtime family**.

## Disposition

### 2029 canonical execution

`gematria_api` + `gematria_method_trace` + Method Registry + canonical research adapters:

**`KEEP_CURRENT`**.

### `src/lib/gematria.js` client calculation used as automatic calculation authority

**`TEMPORARY_COMPATIBILITY`** for legacy production only.

It may continue serving the transitional site until greenfield replacement is verified, but it cannot be treated as 2029 calculation authority merely because formulas are historically correct or Registry metadata is attached.

### `gematriaCalculationContract.js` current local-execution envelope

**`ABSORB_THEN_ARCHIVE`** in its present execution role.

Useful representation/method-state/provenance fields may survive, but 2029 must source the numeric result/trace from the server-canonical engine boundary rather than `method.fn(raw)`.

### Legacy calculators / drawers / utility screens

**`TEMPORARY_COMPATIBILITY` / `ABSORB_THEN_ARCHIVE` by surface**.

Preserve valuable capabilities and deep links while their greenfield projections are built; do not copy their execution path into the new System Frame/Number/Heichal/World.

## Required G3 acceptance before Number/Phrase/Heichal can be clean

1. Greenfield Number/Phrase and Heichal calculation actions call only canonical `gematria_api` / canonical trace adapters for authoritative output.
2. Method Registry controls eligible methods; no hard-coded method array becomes truth authority.
3. Legacy client/server parity is tested for every method intended to survive, but parity is a migration proof, not permission for two authoritative engines.
4. Any client-side computation retained for instantaneous preview is explicitly non-authoritative until confirmed by canonical result, or removed if it adds no value.
5. No 2029 Finding/Claim/automatic equality is built from a client-only `method.fn` result.
6. Legacy public calculators remain operational only as bounded transitional consumers until replacement/cutover.

## Verdict

**MATERIAL SEPARATION FINDING, NOT A FOUNDATION REDESIGN.**

The 2029 canonical Gematria engine already exists and is `KEEP_CURRENT`. The legacy client calculation family is a compatibility/runtime migration problem inside G3 and must not be inherited into the greenfield product as calculation authority.

No new engine, registry, store or calculation system is authorized.
