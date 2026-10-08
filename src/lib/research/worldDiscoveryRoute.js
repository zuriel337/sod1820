// Pure routing decision for a World discovery finding click.
// Number(null) === 0 and Number("") === 0, so a value-less finding must be
// gated BEFORE numeric coercion or it opens Number 0 (empty AnchoredWorld).
export function discoveryFindingRoute(item) {
  if (!item) return { route: "none" };
  const raw = item.value;
  if (raw != null && raw !== "" && (typeof raw === "number" || typeof raw === "string") && String(raw).trim() !== "") {
    const value = Number(raw);
    if (Number.isFinite(value)) return { route: "number", value };
  }
  if (item.id) return { route: "inspect", id: String(item.id), type: "finding", sourceRef: item.sourceRef || null };
  return { route: "contributor" };
}
