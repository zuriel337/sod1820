# Numeric Derived Root Traversal v1

Status: FOUNDATION CONTRACT — implemented on branch, not merged/deployed.

## Purpose
A deterministic research lens may return a numeric value that is itself useful as a Numeric Root for bounded follow-up research. Such an output must not be rendered as dead text only.

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

## Golden paths
- `1820 -> sequence:pi / exact_digit_sequence_first_occurrence -> 24653 -> Numeric Root lookup(24653)`
- `233 -> sequence:fibonacci / exact_term_first_occurrence -> 13 -> Numeric Root lookup(13)`
- `337 -> sequence:fibonacci -> NOT FOUND` produces no derived root.

## Budget
Depth 1 = direct lens finding.
Depth 2 = one bounded lookup/traversal from a derived numeric root.
No automatic Depth 3 or recursive graph walk in v1.

## Convergence
If independent derivation paths later reach the same Numeric Root, the system may rank/propose a convergence candidate. It does not create a canonical edge automatically. Persistence and convergence remain Human-Gated under the existing Research Object / Composite Convergence contract.

## Fibonacci extension points — not implemented in this pass
- Number-as-Index -> Fibonacci term.
- Zeckendorf decomposition -> Fibonacci component roots.
- Cross-lens traversal, e.g. Fibonacci index -> pi lens, bounded by Depth 2.

## General extension points — not implemented in this pass
- `arithmetic_stride(sequence_id, start_position, step, length)` / Number-as-Operator.
- Additional deterministic sequences through the existing adapter registry.

These are extension points, not authorization to build a new engine, table, store, graph, or UI.
