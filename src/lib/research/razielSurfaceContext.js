// Raziel Intelligence Core v1 Phase I — cross-surface context projection.
// Pure, bounded projection of the EXISTING Research Context (subject / lens / journey / dimensions)
// into the existing surface_semantic descriptor. No reads, no store, no router. Identity + focus only:
// never HTML, post body, raw discovery or private workspace data. Context is not Truth.

const cap = (v, n) => (v == null ? "" : String(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, n));
const isObj = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

export function buildRazielSurfaceContext(context) {
  if (!isObj(context)) return null;
  const out = {};
  const lens = cap(context.lens, 40);
  if (lens) out.lens = lens;
  if (isObj(context.journey)) {
    const j = {};
    for (const [k, n] of [["kind", 30], ["id", 60], ["findingId", 60]]) { const c = cap(context.journey[k], n); if (c) j[k] = c; }
    if (context.journey.position != null && typeof context.journey.position !== "object") { const c = cap(context.journey.position, 20); if (c) j.position = c; }
    if (Number.isInteger(context.journey.revisionNo)) j.revisionNo = context.journey.revisionNo;
    if (Object.keys(j).length) out.journey = j;
  }
  const dims = isObj(context.dimensions) ? context.dimensions : {};
  const f = isObj(dims.surfaceFocus) ? dims.surfaceFocus : null;
  if (f) {
    const focus = {};
    for (const [k, n] of [["type", 30], ["entityType", 30], ["id", 80], ["entityId", 80], ["label", 80], ["sectionLabel", 60], ["postId", 60], ["postSlug", 80]]) { const c = cap(f[k], n); if (c) focus[k] = c; }
    if (Object.keys(focus).length) out.focus = focus;
  }
  const sections = Array.isArray(dims.surfaceSections) ? dims.surfaceSections.map((s) => cap(s?.label, 40)).filter(Boolean).slice(0, 6) : [];
  if (sections.length) out.sections = sections;
  const findings = Array.isArray(dims.surfaceFindings) ? dims.surfaceFindings.map((s) => cap(s?.label, 50)).filter(Boolean).slice(0, 4) : [];
  if (findings.length) out.findings = findings;
  return Object.keys(out).length ? out : null;
}
