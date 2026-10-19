// Small Context Map — display projection over EXISTING owners.
//
// Reads nothing and stores nothing: it turns relation Findings already produced by
// `entityGraphFinding` (Reality Graph, one tree) and engine results already produced by
// `canonicalGematria` into at most five neighbours of the active focus.
// It owns no graph, ranking, journey, approval status or 0–100 score (DEC-GRAPH-001,
// DEC-METER-001). Order is a fixed category order, never a computed strength.

export const CONTEXT_MAP_LIMIT = 5;

export const TIER = Object.freeze({ DIRECT: "direct", SECONDARY: "secondary", FAR: "far" });
export const BASIS = Object.freeze({
  VERIFIED_CALCULATION: "verified_calculation",
  DOCUMENTED_SOURCE: "documented_source",
  MENTION: "mention",
  SUGGESTED: "suggested",
});

const TIER_ORDER = [TIER.DIRECT, TIER.SECONDARY, TIER.FAR];
const BASIS_ORDER = [BASIS.VERIFIED_CALCULATION, BASIS.DOCUMENTED_SOURCE, BASIS.MENTION, BASIS.SUGGESTED];

export const TIER_LABEL = Object.freeze({ direct: "קשר ישיר", secondary: "קשר משני", far: "קשר רחוק" });
export const BASIS_LABEL = Object.freeze({
  verified_calculation: "חישוב מאומת",
  documented_source: "מקור מתועד",
  mention: "אזכור",
  suggested: "קשר מוצע",
});
// Admin-only wording for a link nobody has approved. No approval state is created in the DB.
export const PENDING_LABEL = "ממתין לחיבור";

// Basis comes only from what the existing graph edge says. `equals` is promoted to a
// verified calculation solely when the canonical engine confirmed it for this neighbour.
const BASIS_BY_RELATION = Object.freeze({ documents: BASIS.DOCUMENTED_SOURCE, mentions: BASIS.MENTION });
const PUBLIC_BASES = new Set([BASIS.VERIFIED_CALCULATION, BASIS.DOCUMENTED_SOURCE]);

const clean = (value) => (value == null ? "" : String(value).trim());
// Quotes / gershayim are presentation only, so a phrase compares equal to its stored node label.
export const phraseKey = (value) => clean(value).replace(/["'׳״“”‘’־-]/g, "").replace(/\s+/g, " ");

function relationOf(finding) {
  const relation = finding?.projection?.relations?.[0];
  return relation?.fromNodeId && relation?.toNodeId ? relation : null;
}

function whyText({ basis, tier, relationType, focusLabel, neighbor, calculation }) {
  const name = neighbor.label;
  if (basis === BASIS.VERIFIED_CALCULATION) {
    return `מנוע הגימטריה אישר ש״${name}״ שווה ${calculation.value} ב${calculation.methodLabel}. זה אימות חישוב בלבד; הוא אינו מעיד על קשר מחקרי.`;
  }
  if (basis === BASIS.DOCUMENTED_SOURCE) {
    return `המקור מתעד את הקשר בין ${tier === TIER.DIRECT ? `״${focusLabel}״ ל` : ""}״${name}״. תיעוד אינו אישור עריכתי של הממצא.`;
  }
  if (basis === BASIS.MENTION) return `״${name}״ מזכיר את הנקודה הזו. אזכור אינו הוכחה שמדובר באותו עניין.`;
  return `קשר מסוג ${relationType || "לא מוגדר"} שהוצע בגרף ועדיין לא אושר עריכתית.`;
}

/**
 * @param {object}   input
 * @param {{id:string,label:string,type?:string,href?:string|null}} input.focus  active focus node
 * @param {object[]} input.findings       relation Findings (graph-relation) around the focus
 * @param {Array<{label:string,value:number,methodLabel:string,verified:true}>} [input.calculations]
 *        engine-confirmed values, matched to neighbours by phrase label only
 * @param {"public"|"admin"} [input.audience="public"]
 */
export function buildContextMap({ focus, findings = [], calculations = [], audience = "public", limit = CONTEXT_MAP_LIMIT } = {}) {
  const focusId = clean(focus?.id);
  if (!focusId) return { focus: null, neighbours: [], total: 0, empty: "no_focus" };
  const admin = audience === "admin";
  const calcByLabel = new Map(calculations.filter((c) => c?.verified === true && Number.isFinite(Number(c.value)))
    .map((c) => [phraseKey(c.label), c]));

  // Breadth-first over the supplied edges only; depth 1 = direct, 2 = secondary, 3+ = far.
  const edges = findings.map(relationOf).filter(Boolean);
  const depth = new Map([[focusId, 0]]);
  const via = new Map();
  let frontier = [focusId];
  for (let level = 1; level <= 3 && frontier.length; level++) {
    const next = [];
    for (const id of frontier) {
      for (const edge of edges) {
        const other = edge.fromNodeId === id ? edge.toNodeId : edge.toNodeId === id ? edge.fromNodeId : null;
        if (!other || depth.has(other)) continue;
        depth.set(other, level);
        via.set(other, edge);
        next.push(other);
      }
    }
    frontier = next;
  }

  const candidates = [];
  for (const [id, level] of depth) {
    if (id === focusId) continue;
    const edge = via.get(id);
    const side = edge.fromNodeId === id ? edge.from : edge.to;
    const neighbour = { id, label: clean(side?.label) || id, type: side?.type || "entity", href: side?.href || null };
    const tier = TIER_ORDER[Math.min(level, 3) - 1];
    const calc = calcByLabel.get(phraseKey(neighbour.label)) || null;
    const verified = edge.relationType === "equals" && calc;
    const basis = verified ? BASIS.VERIFIED_CALCULATION : BASIS_BY_RELATION[edge.relationType] || BASIS.SUGGESTED;
    const pending = !PUBLIC_BASES.has(basis);
    if (pending && !admin) continue;
    candidates.push({
      ...neighbour, tier, basis, pending,
      basisLabel: pending ? PENDING_LABEL : BASIS_LABEL[basis],
      tierLabel: TIER_LABEL[tier],
      relationType: edge.relationType,
      // Calculation status is reported on its own axis, never folded into the link basis.
      calculation: calc ? { value: Number(calc.value), methodLabel: calc.methodLabel, verified: true, extra: calc.extra || [] } : null,
      why: whyText({ basis, tier, relationType: edge.relationType, focusLabel: clean(focus.label) || focusId, neighbor: neighbour, calculation: calc }),
    });
  }

  candidates.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
    || BASIS_ORDER.indexOf(a.basis) - BASIS_ORDER.indexOf(b.basis)
    || a.label.localeCompare(b.label, "he"));
  const neighbours = candidates.slice(0, Math.max(1, Math.min(Number(limit) || CONTEXT_MAP_LIMIT, CONTEXT_MAP_LIMIT)));
  return {
    focus: { id: focusId, label: clean(focus.label) || focusId, type: focus.type || "entity", href: focus.href || null },
    neighbours,
    total: candidates.length,
    empty: neighbours.length ? null : edges.length && !admin ? "no_approved" : "no_links",
  };
}
