# G3 Number Math Profile Adapter v1

Status: BRANCH-ONLY / NOT RELEASE-AUTHORIZED

Owner check: EXTEND_EXISTING `research_strategy_layer_law v15` + `reality_graph_law v8` + `truth_axes_foundation_law v3`.

## Purpose

Provide a bounded deterministic mathematical passport for any non-negative JavaScript safe integer without creating a second Number store/engine or mixing mathematical facts with SOD1820 interpretation.

## Implemented

- exact primality for JS safe integers via deterministic Miller-Rabin bases valid across the 64-bit range;
- bounded factorization with explicit incomplete coverage;
- divisor count/sum, proper-divisor sum and Euler totient when factorization is complete;
- perfect / abundant / deficient and semiprime classification when factorization is complete;
- polygonal membership for triangular through octagonal families with exact BigInt discriminant checks;
- square/cube/power-of-two properties;
- base-10 palindrome, repdigit, Harshad/Niven, happy and narcissistic/Armstrong properties;
- OEIS sequence identifiers carried as external references only, never as runtime truth;
- Universal Finding projection with `stage=null`, `status=null`, `verification_state=not_tested`, no auto-canonicalization and no auto-publication;
- bounded-factorization fail-closed behavior.

## Explicitly delegated / not duplicated

- Pi stays owned by the existing `piSequenceAdapter`.
- Fibonacci stays owned by the existing `fibonacciSequenceAdapter`.
- Future Lucas/other sequence families should extend the existing sequence-adapter contract, not this arithmetic classifier.
- No UI or Number Page changes in this scope because active Number/World writers already exist.
- No DB schema/data writes, no node creation, no external network request during profile execution.

## Golden values covered

- 101 — prime + base-10 palindrome;
- 153 — triangular + Harshad + narcissistic;
- 256 — square + 2^8 + exact factor/divisor profile;
- 496 — perfect + triangular;
- 777 — repdigit + Harshad;
- 1237 — prime;
- deliberately expensive semiprime fixture — bounded factorization remains incomplete/unknown instead of fabricating derived classes.

## Next consumer step

A later isolated integration pass may expose this capability through the canonical Numeric Research Router / Number Hub after reconciling with the active Number Core writer. This document does not authorize that UI integration, merge or deployment.
