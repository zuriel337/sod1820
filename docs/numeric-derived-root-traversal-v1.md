# Numeric Derived Root Traversal v1

Status: FOUNDATION CONTRACT — implemented on branch, not merged/deployed.

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
- Preserve `fact` != `midrash`/interpretation.
- Preserve provenance, truth-state separation, bounded traversal and Human Gate.
- Keep Geometry/mathematical calculation separate from 2D/3D representation and UI projection.

EXISTING CAPABILITY — ADAPTER NEEDED:
- Spatial Gematria (`src/lib/spatialModels.js` + its existing presentation surfaces) into Universal Finding / Research Router / Derived Subject contracts.

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
