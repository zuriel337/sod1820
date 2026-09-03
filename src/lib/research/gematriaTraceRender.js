// Pure, presentation-only projection of a live gematria_method_trace() response into a small
// generic {kind, ...} shape each family renderer component consumes.
//
// GEMATRIA_RESEARCH_CALCULATOR_V1. This module NEVER calculates or re-derives a Gematria value.
// Every number returned here is copied verbatim from the trace envelope the canonical
// gematria_method_trace(method_key, phrase) RPC already produced. If a field is absent on the
// live envelope, it stays absent here too (never fabricated) -- matches truth_axes_foundation_law
// INVARIANT PR1/PR3, the same discipline already applied by universalFinding.js/canonicalGematria.js.
export function normalizeTrace(trace) {
  if (!trace || typeof trace !== "object") return null;
  if (trace.status === "error") {
    return { kind: "error", error: trace.error || "UNKNOWN_ERROR", methodKey: trace.method_key ?? null };
  }

  const result = trace.result ?? null;
  const kind = trace.trace_kind || "unavailable";

  switch (kind) {
    case "LETTER_LEDGER":
      return {
        kind,
        result,
        rows: (Array.isArray(trace.steps) ? trace.steps : []).map(s => ({
          token: s.token, position: s.position, transform: s.transform,
          baseValue: s.base_value, contribution: s.contribution, runningSubtotal: s.running_subtotal,
        })),
      };

    case "SUBSTITUTION_LEDGER":
      return {
        kind,
        result,
        rows: (Array.isArray(trace.steps) ? trace.steps : []).map(s => ({
          token: s.token, transformedToken: s.transformed_token,
          baseValue: s.base_value, contribution: s.contribution, runningSubtotal: s.running_subtotal,
        })),
      };

    case "ADJACENT_DIFFERENCE":
      return {
        kind,
        result,
        words: (Array.isArray(trace.steps) ? trace.steps : []).map(w => ({
          word: w.word,
          letterValues: Array.isArray(w.letter_values) ? w.letter_values : [],
          pairs: (Array.isArray(w.pairs) ? w.pairs : []).map(p => ({
            left: p.left_value, right: p.right_value, diff: p.difference,
          })),
          wordSubtotal: w.word_subtotal,
        })),
      };

    case "CUMULATIVE_PREFIX": {
      const steps = Array.isArray(trace.steps) ? trace.steps : [];
      const wordReset = steps.length > 0 && Object.prototype.hasOwnProperty.call(steps[0], "word");
      if (wordReset) {
        return {
          kind, result, scope: "word_reset",
          words: steps.map(w => ({
            word: w.word,
            rows: (Array.isArray(w.steps) ? w.steps : []).map(s => ({
              token: s.token, index: s.index, baseValue: s.base_value, prefixSubtotal: s.prefix_subtotal,
            })),
            wordSubtotal: w.word_subtotal,
          })),
        };
      }
      return {
        kind, result, scope: "continuation",
        rows: steps.map(s => ({
          token: s.token, index: s.index, originalPosition: s.original_position,
          baseValue: s.base_value, prefixSubtotal: s.prefix_subtotal,
        })),
      };
    }

    case "POSITION_WEIGHTED":
      return {
        kind,
        result,
        words: (Array.isArray(trace.steps) ? trace.steps : []).map(w => ({
          word: w.word,
          rows: (Array.isArray(w.steps) ? w.steps : []).map(s => ({
            token: s.token, position: s.position, baseValue: s.base_value, contribution: s.contribution,
          })),
          wordSubtotal: w.word_subtotal,
        })),
      };

    case "COMPOSITE":
      return {
        kind,
        result,
        operator: trace.steps?.operator ?? null,
        components: (Array.isArray(trace.steps?.components) ? trace.steps.components : []).map(c => ({
          methodKey: c.component_method,
          value: c.component_value,
          trace: c.component_trace ? normalizeTrace(c.component_trace) : null,
        })),
      };

    case "context_required":
      return { kind, result, contextContract: trace.context_contract ?? null };

    default:
      return { kind: "unavailable", result };
  }
}

// Pure helper: family-agnostic verification summary, used by the technical-disclosure panel.
export function traceProvenance(trace) {
  if (!trace || trace.status === "error") return null;
  return {
    methodKey: trace.method_key ?? null,
    methodVersion: trace.method_version ?? null,
    mathematicalFamily: trace.mathematical_family ?? null,
    executionKind: trace.execution_kind ?? null,
    function: trace.provenance?.function ?? null,
    canonicalValue: trace.verification?.canonical_value ?? null,
    traceValue: trace.verification?.trace_value ?? null,
    parity: trace.verification?.parity ?? null,
    semantics: trace.semantics ?? null,
    dependencies: trace.dependencies ?? null,
  };
}
