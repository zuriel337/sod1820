# Semantic Animation Projection V1

Owner: `spatial_research_runtime_vision_v1` (EXTEND_EXISTING). Branch-only; no UI adoption.

Helper: `src/lib/research/semanticAnimationProjection.js` — `buildSemanticAnimationProjection({ selection, trace, relations, returnTo, provenance, truthState, reducedMotion, previousSignature })`.

- Inputs are already-governed state only: Research Context selection / Calculation Selection, canonical `gematria_method_trace` response, supplied existing relations.
- Output is semantic cues only: `focus_enter, expression_reveal, trace_step_reveal, result_reveal, relation_connect, relation_follow, convergence, source_open, exact_return, settle`.
- No arithmetic: `result_reveal` targets the supplied canonical result; count-up is presentation metadata only.
- Trace gate: expression + method + result must equal the selection; mismatch / unsupported / error fails closed (no step cues).
- Relations: only supplied existing ones (id + findingId/relationRef); never discovered.
- Signature `sap1:<stable JSON>` is deterministic; `lifecycle.cancelPrevious/supersedes` represents selection change; `reducedMotion` gives a zero-timing, no-count-up profile.
- `provenance` and `truthState` pass through by reference, unchanged (null if absent).
- Not a truth store; nothing is persisted; no DB/engine/registry touch.

Test: `node --test test/semantic-animation-projection-v1.test.mjs`
