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
  const rf = isObj(dims.readingFocus) ? dims.readingFocus : null;
  if (rf) {
    const reading = {};
    for (const [k, n] of [["id", 80], ["label", 80], ["primary", 80], ["sourceLabel", 60], ["postId", 60], ["postSlug", 80], ["locator", 80]]) { const c = cap(rf[k], n); if (c) reading[k] = c; }
    if (typeof rf.number === "number" && Number.isFinite(rf.number)) reading.number = rf.number;
    const signals = Array.isArray(rf.signals) ? rf.signals.map((x) => cap(x, 40)).filter(Boolean).slice(0, 3) : [];
    if (signals.length) reading.signals = signals;
    if (Object.keys(reading).length) out.reading = reading;
  }
  const nav = {};
  for (const [k, n] of [["entrySource", 40], ["sourceRef", 80], ["journeySemanticId", 60], ["journeyRoot", 60]]) { const c = cap(dims[k], n); if (c) nav[k] = c; }
  const visited = Array.isArray(dims.journeyVisitedValues) ? dims.journeyVisitedValues.filter((x) => Number.isSafeInteger(x)).slice(0, 6) : [];
  if (visited.length) nav.journeyVisitedValues = visited;
  const sel = isObj(context.selection) ? context.selection : null;
  if (sel) {
    const s = {};
    for (const [k, n] of [["entityType", 30], ["entityId", 80], ["findingId", 60], ["sourceRef", 80], ["locator", 80]]) { const c = cap(sel[k], n); if (c) s[k] = c; }
    if (Object.keys(s).length) nav.selection = s;
  }
  const rt = isObj(context.returnTo) ? context.returnTo : null;
  if (rt) {
    const r = {};
    const label = cap(rt.label, 60);
    if (label) r.label = label;
    if (isObj(rt.subject)) { for (const [k, n] of [["type", 30], ["id", 80], ["label", 80]]) { const c = cap(rt.subject[k], n); if (c) r[`subject${k[0].toUpperCase()}${k.slice(1)}`] = c; } }
    if (Object.keys(r).length) nav.returnTo = r;
  }
  if (Object.keys(nav).length) out.navigation = nav;
  const sections = Array.isArray(dims.surfaceSections) ? dims.surfaceSections.map((s) => cap(s?.label, 40)).filter(Boolean).slice(0, 6) : [];
  if (sections.length) out.sections = sections;
  const findings = Array.isArray(dims.surfaceFindings) ? dims.surfaceFindings.map((s) => cap(s?.label, 50)).filter(Boolean).slice(0, 4) : [];
  if (findings.length) out.findings = findings;
  return Object.keys(out).length ? out : null;
}
