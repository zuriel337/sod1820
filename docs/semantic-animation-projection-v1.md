# Semantic Animation Projection V1

Owner: `spatial_research_runtime_vision_v1` (EXTEND_EXISTING). Branch-only; no UI adoption.

Helper: `src/lib/research/semanticAnimationProjection.js`.

The projection consumes already-governed selection/context, canonical trace, supplied existing relations, optional explicit invoked action, provenance, and truth-state. It returns semantic motion cues only.

Safety invariants:
- No Gematria arithmetic or formula logic.
- Trace identity must match expression + method + result.
- Trace step animation fails closed unless every supplied step is a letter step with token, finite contribution/base_value, finite running_subtotal, and final subtotal equals the supplied canonical result.
- sourceRef/returnTo availability alone never emits action cues.
- `source_open` and `exact_return` require explicit `invokedAction`.
- Relations are rendered only when supplied as existing governed relations; the projection never discovers them.
- Result count-up is presentation metadata only.
- Reduced motion is deterministic.
- Provenance/truth-state pass through unchanged.
- Nothing is persisted and no UI/DB/engine/registry is mutated.

Test: `node --test test/semantic-animation-projection-v1.test.mjs`.
