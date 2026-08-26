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

## Source / Geometry / Representation separation

A source image or post is evidence/input, not a Geometry Engine and not a canonical geometric fact by itself.

Future flow:

`Source/Image/Post -> Extraction -> identified Geometric/Figurate Structure -> Geometry Lens calculation -> Finding -> Derived Numeric Root(s) and/or other Derived Research Subject(s)`

A future Geometry/Figurate Lens may calculate deterministic properties such as component counts, boundary/interior counts, vertices, intersections, layers, symmetry classes, ratios, or other explicitly defined structural measurements. Each calculation must preserve construction identity, operation, parameters, verification and source provenance.

2D/3D representations are representations/projections of the same research structure. They do not create truth or relations. Projection must not invent a status, edge, world, count, relation or interpretation that Foundation did not supply.

Therefore:
- Geometry computes/verifies structure.
- Representation describes a structure in 2D/3D or another form.
- Projection/Experience renders it.
- Theological or symbolic meaning remains interpretation/Human Gate unless independently admitted under the truth lifecycle.

This preserves the same law already demonstrated by the Roadmap 3D prototype: visualization consumes canonical/view-model truth and must not invent graph truth.

## Golden paths
- `1820 -> sequence:pi / exact_digit_sequence_first_occurrence -> 24653 -> Numeric Root lookup(24653)`
- `233 -> sequence:fibonacci / exact_term_first_occurrence -> 13 -> Numeric Root lookup(13)`
- `337 -> sequence:fibonacci -> NOT FOUND` produces no derived root.
- Future geometry example (contract only, not a verified fact): `identified geometric structure -> verified count X -> Derived Numeric Root X -> bounded Numeric Root lookup(X)`.

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
- Geometry/Figurate Lens adapter(s).
- Canonical geometric-structure identity and representation contract.
- Source/Image -> extraction -> geometric finding adapters.
- Non-numeric Derived Research Subject traversal once canonical identity contracts exist.

These are extension points, not authorization to build a new engine, table, store, graph, router, or UI.

## Foundation Expansion Gate

MUST FOUNDATION NOW:
- Preserve `Research Subject -> Finding -> Derived Research Subject` as the universal routing law.
- Keep numeric outputs traversable through Derived Numeric Roots.
- Preserve provenance, truth-state separation, bounded traversal and Human Gate.
- Keep Geometry calculation separate from 2D/3D representation and UI projection.

EXTENSION POINT NOW:
- Geometry/Figurate Lens.
- Source/Image extraction into identified structures.
- 2D/3D representations of the same structure.
- Non-numeric derived-subject traversal.

LATER:
- Full geometric reconstruction engine.
- Production 3D research UI.
- Bulk image/geometry scanning.
- Automatic cross-domain recursive exploration.

Foundation -> Projection -> Experience.
Preserve capability, truth and provenance — not necessarily the legacy interface.
