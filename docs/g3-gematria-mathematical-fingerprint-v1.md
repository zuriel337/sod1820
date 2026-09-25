# G3 Gematria Mathematical Fingerprint v1

Status: IMPLEMENTED BRANCH-ONLY / NO MERGE / NO DEPLOY

## Owner check

EXTEND_EXISTING only:

- `project_codex.gematria_engine` / `gematria_engine_law v2`
- `canonical_methods_registry_law v6`
- existing `number_math_profile`
- existing Sequence Lens adapter contract
- `cross_vs_convergence_criteria v4`
- `truth_axes_foundation_law v3`

No new Gematria engine, Number store, registry, graph, convergence truth system or publication path.

## Capability

The adapter accepts canonical method-profile outputs and derives a deterministic mathematical fingerprint over their numeric results.

Per-number fingerprint adds, without changing Gematria formulas:

- Euler totient φ from the existing Number Math Profile;
- divisor count τ and divisor sum σ from the existing Number Math Profile;
- Carmichael λ;
- radical rad;
- bounded exact prime/composite ordinal;
- centered polygonal forms `Ck(n)`;
- Lucas membership through a Sequence Lens-compatible Lucas adapter.

Cross-method relations include:

- exact integer multiple relations;
- retained/shared prime factors;
- twin-prime pairs;
- shared Lucas-family membership;
- same numeric result across distinct method identities.

Equal numeric values are collapsed before cross-value factor-frequency analysis so duplicated/equivalent-looking method outputs do not inflate evidence.

## Truth boundary

All Gematria values must arrive from the canonical Gematria engine / Method Registry path. The adapter analyzes numbers only after that boundary.

A mathematical relation is a deterministic structure fact. It is NOT automatically:

- Research Convergence;
- independent evidence;
- a Finding with promoted epistemic status;
- canonical;
- published;
- interpretation.

Human Gate remains required for interpretation or promotion.

## Golden fixture — צוריאל פולייס

The focused test fixture proves the engine can derive, mechanically:

- `533 = 13 × 41`, φ=480, τ=4, σ=588, λ=120, rad=533, Composite #433;
- `3731 = 7 × 533`, retaining factors 13 and 41;
- factor 13 shared by 65, 533, 1118 and 3731;
- factor 37 shared by 2368, 3811 and 60273;
- factor 181 shared by 2172 and 60273;
- 137 and 139 are a twin-prime pair;
- 47 = L8 and 11 = L5 under `L0=2, L1=1`;
- 545 includes centered-square form `C4(17)`;
- 11 includes centered-decagonal form `C10(2)`;
- repeated 533/47 outputs across methods are marked deterministic same-value collisions and explicitly do not count as independent evidence.

`Equivalence = 1865.5` is intentionally NOT implemented because no canonical operation definition was resolved for that label in this scope.

## Consumer

`fetchCanonicalGematriaMathFingerprint(expression)` is the canonical read path:

`expression → fn_method_profile / Registry → distinct verified method outputs → number_math_profile + sequence adapter → deterministic relation bundle`.

No UI was added in this slice.
