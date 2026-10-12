const clean = (value) => value == null ? "" : String(value).trim();
const finite = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Reads the structured letter ledger the canonical gematria_method_trace RPC already returns
// (token / contribution / running subtotal) out of the Universal Finding built by
// fetchGematriaMethodTrace. It never derives a value: no ledger step means no strip.
export function ledgerFromFinding(finding) {
  const trace = finding?.projection?.dimensions?.trace;
  const raw = Array.isArray(trace?.steps) ? trace.steps : [];
  const steps = raw.map((step) => {
    if (!step || typeof step !== "object") return null;
    const token = clean(step.token ?? step.word ?? step.label);
    const value = finite(step.contribution ?? step.base_value);
    if (!token || value == null) return null;
    return { token, value, running: finite(step.running_subtotal), scope: clean(step.scope) || null };
  }).filter(Boolean);

  return Object.freeze({
    kind: clean(trace?.trace_kind) || null,
    result: finite(trace?.result),
    parity: trace?.verification?.parity === true ? true : trace?.verification?.parity === false ? false : null,
    steps: Object.freeze(steps),
  });
}
