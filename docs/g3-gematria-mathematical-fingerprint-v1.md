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

## Canonical live fixture — צוריאל פולייס

Live canonical verification on 2026-09-25 used:

`public.fn_method_profile('צוריאל פולייס','value')`.

The current canonical profile is NOT identical to the externally supplied/raw report that motivated this slice. The engine fixture therefore follows live truth and proves, among other relations:

- `רגיל = 533` and `גדול = 533` — same numeric output, not independent evidence;
- `משולש מילה + משולש הפוך = 6929 = 13 × 533`;
- factor 13 shared by 533, 1118 and 6929;
- factor 37 shared by 777, 2368 and 60273;
- factor 181 shared by 2172 and 60273;
- duplicate live outputs at 137, 2368, 60273 and 2172 are grouped and do not inflate evidence.

## External/raw compatibility fixture

The supplied report is retained only as a compatibility fixture for the mathematical analyzer. It is explicitly NOT labeled current canonical Gematria truth because live verification found DRIFT, including:

- current `אי"ק בכ"ר = 1242`, while the supplied report said 3332;
- current `מילוי = 1178`, while the supplied report said 1160;
- the supplied 47 / 11 / 139 values are not present as active outputs in the current live method profile.

Given those raw numbers, the adapter still correctly recognizes the mathematical structure `3731 = 7 × 533`, 137/139 twin primes, `47=L8`, `11=L5`, and the factor families — but this proves analyzer compatibility only, not canonical Gematria verification.

`Equivalence = 1865.5` remains intentionally NOT implemented because no canonical operation definition was resolved for that label in this scope.

## Consumer

`fetchCanonicalGematriaMathFingerprint(expression)` is the canonical read path:

`expression → fn_method_profile / Registry → distinct verified method outputs → number_math_profile + sequence adapter → deterministic relation bundle`.

No UI was added in this slice.
