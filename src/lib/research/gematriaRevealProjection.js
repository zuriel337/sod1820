// Display-only projection of a canonical gematria_method_trace Finding for GematriaReveal2029.
// GEMATRIA_REVEAL_2029_V1. No arithmetic, no method formulas: every number returned here is
// copied verbatim from the trace. Anything that is not exactly trustworthy fails closed (null).

const clean = (value) => value == null ? "" : String(value).trim();

export function traceIdentityMatches(finding, selection) {
  const trace = finding?.projection?.dimensions?.trace;
  if (!trace || !selection) return false;
  if (selection.resultValue == null) return false;
  return clean(trace.input) === clean(selection.expression)
    && clean(trace.methodKey ?? trace.method_key) === clean(selection.methodKey)
    && Number(trace.result ?? trace.value) === Number(selection.resultValue);
}

// Returns an array of { token, contribution, subtotal } or null when the shape is unsupported.
export function projectRevealSteps(finding, selection) {
  if (!traceIdentityMatches(finding, selection)) return null;
  const raw = finding.projection.dimensions.trace.steps;
  if (!Array.isArray(raw) || !raw.length) return null;
  const out = [];
  for (const step of raw) {
    if (!step || typeof step !== "object" || step.scope !== "letter") return null;
    const token = clean(step.token);
    const contribution = step.contribution ?? step.base_value;
    const subtotal = step.running_subtotal;
    if (!token || contribution == null || subtotal == null) return null;
    if (typeof contribution === "boolean" || typeof subtotal === "boolean") return null;
    if (!Number.isFinite(Number(contribution)) || !Number.isFinite(Number(subtotal))) return null;
    out.push({ token, contribution: Number(contribution), subtotal: Number(subtotal) });
  }
  // Identity check only (not a derivation): the trace's own last subtotal must equal the verified result.
  if (out[out.length - 1].subtotal !== Number(selection.resultValue)) return null;
  return out;
}
