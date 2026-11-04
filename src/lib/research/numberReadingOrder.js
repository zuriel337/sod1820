// A reading default, not a ranking/calculation engine. Rows arrive in the
// canonical Legacy reader's lead_rank / visibility / recency order.
export function defaultNumberReadingExpression({ rows = [], loading = false, error = null, fallback = "" } = {}) {
  const first = rows.find(row => typeof row?.phrase === "string" && row.phrase.trim());
  if (first) return first.phrase.trim();
  // A pending/failed curation read is not proof that no curated expression exists.
  if (loading || error) return "";
  return String(fallback || "").trim();
}

// Replayable DOM locator only. It does not create a research/graph identity.
export function numberConnectionLocator(expression, method) {
  const key = `${String(method || "").trim()}\0${String(expression || "").trim()}`;
  return `number-connection-${Array.from(key, char => char.codePointAt(0).toString(16)).join("-")}`;
}
