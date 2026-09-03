# Numeric Derived Root Traversal v1

Status: FOUNDATION CONTRACT — implemented on branch, not merged/deployed.

> **Reconciliation note (NUMERIC_ROUTER_PR206_CURRENT_MAIN_RECONCILIATION):** ported from PR #206
> onto `origin/main` at `2109110bd5b2928ef108f732bd2353116f5f5f0b` (PR #206's own base,
> `998240255e`, had gone stale). The architecture described below was cross-checked against the
> current Universal Finding envelope (`src/lib/research/universalFinding.js`), the current
> canonical Gematria adapter (`canonicalGematria.js`), and `truth_axes_foundation_law` — no
> conflict was found in this document's own claims. The one drift found was in the
> *implementation*, not this contract: `numericResearch.js`'s sequence-finding projector was
> asserting `stage:"candidate"` directly, which the now-live INVARIANT PR1 reserves for a
> Human-Gate decision, not a projection adapter. That has been corrected in the reconciled
> `numericResearch.js` (stage left unset; `verification_state:"not_tested"` now declared
> explicitly instead). This contract's own vocabulary (`stage:"candidate"` on the
> `derived_numeric_root`/relation-candidate objects below) is a separate, locally-scoped field —
> not the Universal Finding envelope's controlled `stage` — and needed no change.

## Purpose
A deterministic research lens may return a numeric value that is itself useful as a Numeric Root for bounded follow-up research. Such an output must not be rendered as dead text only.

This Numeric contract is also the first concrete implementation of a broader Research Routing law: the architectural boundary is not `number -> number`, but `Research Subject -> Lens -> Finding -> Derived Research Subject`. Numeric Roots remain the first implemented subject type; this generalization is a Foundation contract/extension point, not authorization to build a parallel universal router.

## Contract
For a deterministic lens result that yields an unambiguous numeric output, the Numeric Research Router may expose a `derived_numeric_root` candidate.

Required properties:
- source root
- lens id
- operation
- derived numeric root value
- verification state
- provenance / sequence version / position convention / search depth where applicable
- optional bounded Numeric Root context lookup
- `traversable=true`
- `canonical=false`
- `published=false`

The derived root is a research-navigation candidate, not proof of semantic meaning.

## Universal Research Routing law — Foundation extension point

Canonical direction:

`Research Subject -> registered Lens -> Finding -> Derived Research Subject(s) -> existing Research OS / Reality Graph -> Human Gate`

Rules:
- A Research Subject is not limited to a Numeric Root. Future subject types may include an existing Research Object, source, image-derived structure, geometric structure, entity, text span, or other canonically identified subject.
- A Finding may derive zero or more subjects. A numeric output is represented through the existing Derived Numeric Root contract; non-numeric derived subjects require their own canonical identity before traversal.
- Do not create a second graph, second research store, second router, or domain-specific truth lifecycle.
- Finding != Derived Subject != Research Object != Canonical Entity.
- Traversability does not imply truth, significance, persistence, canonical status, publication, or visibility.
- Persistence and promotion remain Human-Gated under the existing Research OS contracts.
- The current Numeric Research Router is an implementation/proof of this law, not a permanent architectural boundary that forbids non-numeric inputs.

## Existing Spatial Gematria capability — REUSE, DO NOT REBUILD

Live repo already contains `src/lib/spatialModels.js` and the Spatial Gematria / 3D presentation surfaces. This is an EXISTING CAPABILITY, not a hypothetical future Geometry Engine.

The live Spatial Gematria framework already uses four layers:

`Text -> Gematria (engine-verified) -> Mathematical Structure -> Geometric Form`

That four-layer discipline must be preserved when adapting Spatial Gematria into the Research Router / Universal Finding system.

Existing live examples include:
- 1020 / "Cube of Tov": six faces, ten `טוב` units per face -> 60 units -> `60 × 17 = 1020`.
- 910 / "Cube of Echad": includes `70 × 13 = 910`, and the documented path `910 + 910 = 1820 = 70 × 26`.
- 620 / icosahedron model: 20 faces × `אל` (31) -> `620`.

These examples are evidence that SOD1820 already has a spatial/geometric research capability. The missing Foundation work is an ADAPTER/RECONCILIATION into the one Research Routing contract, not creation of a second Geometry Engine, second graph or second truth store.

Required adapter behavior when implemented:
- preserve the existing four layers as provenance/structure rather than flattening them into one string;
- preserve engine-verified gematria separately from mathematical derivation;
- preserve deterministic mathematical structure separately from geometric representation;
- preserve `fact` separately from `midrash`/interpretation;
- emit verified numeric outputs as Derived Numeric Root Candidates where applicable;
- normalize findings into the existing Universal Finding / Research OS lifecycle;
- never auto-promote spatial interpretation or symbolism to Fact/Canonical.

Status: **EXISTING CAPABILITY — ADAPTER NEEDED**.

## Existing Powers-of-Two research family — REUSE / ADAPTER CANDIDATE

Live canonical Numeric Root data already recognizes a doubling/powers-of-two family rather than this being a newly invented sequence:
- `256 = 2^8`, live node description identifies it as `אהרן` and as a root of the doubling sequence.
- `512 = 2^9`, live node description identifies it as an anchor of the doubling sequence.
- `1024 = 2^10`, live node description identifies it as the doubling of 512.

The live dossiers also already contain Hebrew/gematria research around these roots. Therefore the Foundation must preserve this as an existing research family and must not create a separate 256/512/1024 engine or truth store.

Preferred adapter family: `powers` / `exponentiation`, with `powers_of_two` as the first evidenced specialization.

Required deterministic directions when implemented:
- **Number as Target / membership:** `256 -> powers_of_two -> exponent 8 -> Derived Numeric Root 8`; likewise `512 -> 9`, `1024 -> 10`.
- **Number as Operator / exponent:** `8 -> base 2 exponentiation -> 256 -> Derived Numeric Root 256`; likewise `9 -> 512`, `10 -> 1024`.

Truth discipline:
- `2^8 = 256`, `2^9 = 512`, `2^10 = 1024` are mathematical calculations.
- Hebrew/gematria matches such as `אהרן = 256` remain separate gematria findings with their own method/provenance; they are not properties of exponentiation itself.
- A path such as `X -> Fibonacci -> 8 -> powers_of_two -> 256 -> gematria -> אהרן` is a bounded cross-lens research path, not automatic semantic proof.
- Powers/exponentiation findings may emit Derived Numeric Roots but may not auto-persist, auto-create canonical edges, or promote interpretation.

Status: **EXISTING RESEARCH FAMILY — ADAPTER/CROSSWALK NEEDED**. No powers adapter is implemented in this pass.

## Source / Geometry / Representation separation

A source image or post is evidence/input, not a Geometry Engine and not a canonical geometric fact by itself.

General flow:

`Source/Image/Post -> Extraction -> identified Geometric/Figurate Structure -> existing/new Geometry adapter calculation -> Finding -> Derived Numeric Root(s) and/or other Derived Research Subject(s)`

Spatial Gematria is the first existing capability to be reconciled under this flow. Future geometric sources, such as a dot-based hexagram image, should extend the same contract rather than create a parallel system.

A Geometry/Figurate adapter may expose deterministic properties such as component counts, boundary/interior counts, vertices, intersections, layers, symmetry classes, ratios, face counts, or other explicitly defined structural measurements. Each calculation must preserve construction identity, operation, parameters, verification and source provenance.

2D/3D representations are representations/projections of the same research structure. They do not create truth or relations. Projection must not invent a status, edge, world, count, relation or interpretation that Foundation did not supply.

Therefore:
- Geometry/mathematical structure computes or verifies structure.
- Representation describes that structure in 2D/3D or another form.
- Projection/Experience renders it.
- Theological or symbolic meaning remains interpretation/Human Gate unless independently admitted under the truth lifecycle.

This preserves the same law already demonstrated by the Roadmap 3D prototype and by Spatial Gematria: visualization consumes structured research truth and must not invent graph truth.

## Golden paths
- `1820 -> sequence:pi / exact_digit_sequence_first_occurrence -> 24653 -> Numeric Root lookup(24653)`
- `233 -> sequence:fibonacci / exact_term_first_occurrence -> 13 -> Numeric Root lookup(13)`
- `337 -> sequence:fibonacci -> NOT FOUND` produces no derived root.
- Existing powers path: `256 -> powers_of_two membership -> exponent 8 -> Numeric Root lookup(8)`.
- Existing powers reverse path: `8 -> base-2 exponentiation -> 256 -> Numeric Root lookup(256)`.
- Existing Spatial Gematria path: `910 -> mathematical structure 70 × 13 -> 910; 910 + 910 -> 1820` remains a structured research path and may later expose 70, 13, 910 and 1820 as traversable numeric subjects under the adapter contract.
- Existing Spatial Gematria path: `20 faces × 31 -> 620` may later expose 20, 31 and 620 as traversable numeric subjects under the adapter contract.
- Future image-derived geometry example (contract only, not a verified fact): `identified geometric structure -> verified count X -> Derived Numeric Root X -> bounded Numeric Root lookup(X)`.

## Budget
Depth 1 = direct lens finding.
Depth 2 = one bounded lookup/traversal from a derived numeric root or other canonically identified derived subject.
No automatic Depth 3 or recursive graph walk in v1.

## Convergence
If independent derivation paths later reach the same Numeric Root or canonically identified Research Subject, the system may rank/propose a convergence candidate. It does not create a canonical edge automatically. Persistence and convergence remain Human-Gated under the existing Research Object / Composite Convergence contract.

## Fibonacci extension points — not implemented in this pass
- Number-as-Index -> Fibonacci term.
- Zeckendorf decomposition -> Fibonacci component roots.
- Cross-lens traversal, e.g. Fibonacci index -> pi lens, bounded by Depth 2.

## General extension points — not implemented in this pass
- `arithmetic_stride(sequence_id, start_position, step, length)` / Number-as-Operator.
- Additional deterministic sequences through the existing adapter registry.
- Canonical geometric-structure identity and representation contract.
- Source/Image -> extraction -> geometric finding adapters for new geometric sources.
- Non-numeric Derived Research Subject traversal once canonical identity contracts exist.

These are extension points, not authorization to build a new engine, table, store, graph, router, or UI.

## Foundation Expansion Gate

MUST FOUNDATION NOW:
- Preserve `Research Subject -> Finding -> Derived Research Subject` as the universal routing law.
- Keep numeric outputs traversable through Derived Numeric Roots.
- Reuse/reconcile existing Spatial Gematria instead of building a parallel Geometry Engine.
- Preserve its four layers: Text -> Gematria -> Mathematical Structure -> Geometric Form.
- Preserve/reconcile the existing powers-of-two/doubling research family rather than creating a parallel sequence system.
- Preserve `fact` != `midrash`/interpretation.
- Preserve provenance, truth-state separation, bounded traversal and Human Gate.
- Keep Geometry/mathematical calculation separate from 2D/3D representation and UI projection.

EXISTING CAPABILITY — ADAPTER NEEDED:
- Spatial Gematria (`src/lib/spatialModels.js` + its existing presentation surfaces) into Universal Finding / Research Router / Derived Subject contracts.

EXISTING RESEARCH FAMILY — ADAPTER/CROSSWALK NEEDED:
- Powers/exponentiation, with live powers-of-two evidence at 256/512/1024. First crosswalk must determine what is already engine-backed versus stored research description before implementation.

EXTENSION POINT NOW:
- Source/Image extraction into identified structures.
- Canonical geometric-structure identity.
- Additional 2D/3D representations of the same research structure.
- Non-numeric derived-subject traversal.

LATER:
- New full geometric reconstruction capabilities not already present.
- Bulk image/geometry scanning.
- Automatic cross-domain recursive exploration.

Foundation -> Projection -> Experience.
Preserve capability, truth and provenance — not necessarily the legacy interface.
