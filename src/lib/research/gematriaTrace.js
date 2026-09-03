import { supabase } from "../supabase.js";
import { makeUniversalFinding } from "./universalFinding.js";

// Canonical Gematria Method Trace -> Universal Finding adapter.
// GEMATRIA_SINGLE_TRUTH_FOUNDATION_CLOSURE_V1 (2026-09-03) MUST-2.
//
// This module never calculates or re-derives a Gematria step itself. It accepts only the live
// canonical `gematria_method_trace(p_method_key, p_phrase)` response and projects it into the
// existing Universal Finding contract, the same way canonicalGematria.js projects gematria_api.
// The RPC itself guarantees result === fn_method_value(method_key,phrase) and fails closed
// (status:"error") rather than ever return a trace whose value disagrees with the governed
// calculation -- this adapter simply refuses to fabricate a Finding out of that error shape.
//
// Trace != Finding, Trace != Claim, Trace != interpretation (truth_axes_foundation_law). This
// envelope explains HOW a result was produced; it asserts nothing about what it means.
export function gematriaTraceToFinding(trace, { inputText = null, createdAt = null } = {}) {
  if (!trace || trace.status === "error") return null;
  const methodKey = String(trace.method_key || "").trim();
  const expression = String(inputText ?? trace.input ?? "").trim();
  if (!methodKey || !expression) return null;
  if (!Number.isFinite(Number(trace.result))) return null;

  const at = createdAt || new Date().toISOString();
  const value = Number(trace.result);

  return makeUniversalFinding({
    kind: "gematria-trace",
    // stage deliberately NOT set -- same INVARIANT PR1 reasoning as canonicalGematria.js and the
    // reconciled Numeric Router: a projection adapter does not own epistemic type.
    subject: { type: "phrase", key: expression, label: expression, value, lang: "he" },
    source: {
      engine: "gematria",
      adapter: "gematria-trace-v1",
      sourceRef: null,
      method: methodKey,
      corpus: null,
      lang: "he",
    },
    identity: {
      sourceIdentity: { methodKey, expression, value, methodVersion: trace.method_version ?? null },
      occurrence: null,
      entityRef: null,
      relationRef: null,
    },
    // Same HG-3 pattern as canonicalGematria.js: no claim was submitted, so nothing was
    // "matched" -- the honest state is not_tested, declared explicitly because this adapter
    // genuinely knows it, while the engine's own output (the full trace) is recorded verbatim.
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: methodKey,
      engine_result: value,
      verification_state: "not_tested",
    },
    evidence: {
      refs: [],
      facts: [{
        type: "gematria-method-trace",
        methodKey,
        expression,
        value,
        trace_kind: trace.trace_kind ?? null,
        mathematical_family: trace.mathematical_family ?? null,
        execution_kind: trace.execution_kind ?? null,
      }],
      score: null,
      confidence: null,
    },
    provenance: {
      createdBy: "ENGINE:gematria",
      createdAt: at,
      inputRef: null,
    },
    projection: {
      anchors: [],
      relations: [],
      // Native key "trace" -- not yet registered in researchDnaDimensions.js's crosswalk;
      // an unregistered (kind,key) pair is handled gracefully as UNMAPPED by that module's own
      // contract, so this is additive and non-breaking.
      dimensions: {
        trace: {
          methodKey,
          value,
          trace_kind: trace.trace_kind ?? null,
          steps: trace.steps ?? null,
          semantics: trace.semantics ?? null,
          dependencies: trace.dependencies ?? null,
          verification: trace.verification ?? null,
        },
      },
    },
    view: { rendererHints: { role: "method-trace" } },
  });
}

export async function fetchGematriaMethodTrace(methodKey, text) {
  const inputText = String(text || "").trim();
  const key = String(methodKey || "").trim();
  if (!inputText || !key) return null;

  const { data, error } = await supabase.rpc("gematria_method_trace", { p_method_key: key, p_phrase: inputText });
  if (error) throw error;
  return gematriaTraceToFinding(data, { inputText });
}
