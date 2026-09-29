// SOD1820 — client interaction correlation (No-Black-Box, system_suggestions_law v5).
//
// PURE helper. It mints ONE non-PII UUID per material user action so a browser action can be
// correlated to the server-issued Operational Trace root (op_trace_roots.interaction_id). It is not a
// trace system and holds no state: the server always generates trace_id/root_span_id itself, so an
// untrusted client can correlate an action but can never choose or merge trace roots.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function newInteractionId() {
  try {
    const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : null;
    return id && UUID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function safeInteractionId(value) {
  const text = String(value || "").trim();
  return UUID_RE.test(text) ? text : null;
}

export default newInteractionId;
