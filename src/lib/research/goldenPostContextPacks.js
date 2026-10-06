// Golden Post Context Packs v1 (GOLDEN_POST_CONTEXT_PACKS_V1) — pure, bounded projection for the
// two Golden pilot Posts into the EXISTING Post `surfaceFindings` path (surfaceFindingsAdapter).
//
// No DB access, no new store/engine/registry, no Finding/Contributor minting. The Post stays the
// Source Representation; the event, the calculations and the site interpretation are separate rows
// of separate kinds. Calculations are admitted ONLY from live canonical Gematria Method Trace
// responses (parity=true) whose expression is declared by the pack — a raw textual occurrence
// (e.g. 604 / 730 in the prose) can never become a calculation row. Same value/expression/event
// appears once; every other mention is a relation/reference in `reason`.
//
// Rows use only keys the Research Context normalizer already carries (summary-only).

import { gematriaTraceToFinding } from "./gematriaTrace.js";
import { buildSourceBundles } from "./sourceBundleProjection.js";

export const GOLDEN_CONTEXT_PACK_METHOD = "רגיל";
export const GOLDEN_CONTEXT_PACK_MAX_ROWS = 8;

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

const SITE_INTERPRETATION = "פרשנות האתר (SOD1820)";

// Declarative packs: typed, non-numeric context + the calculation expressions the pack may cite.
const PACKS = Object.freeze({
  "5112": {
    packId: "golden-fz1073",
    expressions: ["אשר בשמים ממעל", "ולמות לא נתנני", "חכמה"],
    rows: {
      event: {
        id: "pack:event",
        label: "אירוע טיסת FZ1073",
        kind: "event_fact",
        reason: "עובדת האירוע כפי שמתועדת במקור הפוסט; נפרדת מהחישובים ומהפרשנות.",
        sourceLabel: "FZ1073",
      },
      relation: {
        id: "pack:relation:1073-73",
        label: "1073 → 73 ← 730",
        kind: "typed_relation",
        reason: "גזירה/התכנסות מוקלדת בלבד — לא שוויון ולא ראיה בלתי־תלויה. 730 אינו חישוב מנוע.",
        sourceLabel: SITE_INTERPRETATION,
      },
      interpretation: {
        id: "pack:interpretation",
        label: "פרשנות האתר",
        kind: "interpretation",
        reason: "הקריאה של האתר לאירוע; אינה חלק מדברי המקור ואינה ציון אמת.",
        sourceLabel: SITE_INTERPRETATION,
      },
    },
    order: ["event", "calculations", "sourceBundles", "relation", "interpretation"],
  },
  "92": {
    packId: "golden-nasrallah",
    expressions: ["משיח", "יבא שילה", "משיח בן דוד", "שבעים וחמש", "ביאת המשיח"],
    rows: {
      source: {
        id: "pack:source-representation",
        label: "הפוסט כייצוג מקור",
        kind: "source_representation",
        reason: "הפוסט מייצג את המקור (סוד החשמל + מסמכי האירוע); זהות האירוע נפרדת מזהות הפוסט.",
        sourceLabel: "סוד החשמל",
      },
      event: {
        id: "pack:event-clock",
        label: "אירוע · יום · שעה 18:20",
        kind: "typed_event",
        reason: "18:20 = תצפית שעה מוקלדת (CLOCK_24H_CONCAT=1820); מספר היום 358 = תצפית מקור מוקלדת, לא גימטריה. מקור 18:20/18:21 סותר ולא נפתר.",
        sourceLabel: "מקור הפוסט",
      },
      attribution: {
        id: "pack:source-work",
        label: "סוד החשמל · יצירת מקור",
        kind: "source_work",
        reason: "שיוך ליצירת המקור בלבד — לא Contributor, והעלאה אינה חיבור.",
        sourceLabel: "סוד החשמל",
      },
      interpretation: {
        id: "pack:interpretation",
        label: "פרשנות האתר",
        kind: "interpretation",
        reason: "„כי לה׳ המלוכה” — קריאה של האתר; אינה חלק מדברי המקור ואינה ציון אמת.",
        sourceLabel: SITE_INTERPRETATION,
      },
    },
    order: ["source", "event", "calculations", "attribution", "interpretation"],
  },
});

export function goldenContextPackFor(postId) {
  return PACKS[clean(postId)] || null;
}

export function goldenContextPackExpressions(postId) {
  return goldenContextPackFor(postId)?.expressions || [];
}

// Calculation rows: one per distinct canonical value; same-value expressions are listed, not duplicated.
function calculationRows(pack, traces) {
  const allowed = new Set(pack.expressions);
  const byValue = new Map();
  for (const trace of Array.isArray(traces) ? traces : []) {
    if (!trace || trace.status === "error" || trace.verification?.parity !== true) continue;
    if (clean(trace.method_key) !== GOLDEN_CONTEXT_PACK_METHOD) continue;
    const finding = gematriaTraceToFinding(trace);
    const expression = clean(trace.input);
    if (!finding || !allowed.has(expression)) continue;
    const value = Number(trace.result);
    const entry = byValue.get(value) || { value, expressions: [] };
    if (!entry.expressions.includes(expression)) entry.expressions.push(expression);
    byValue.set(value, entry);
  }
  return [...byValue.values()].sort((a, b) => a.value - b.value).map(({ value, expressions }) => ({
    id: `pack:calc:${value}`,
    label: expressions.join(" = "),
    value: String(value),
    kind: "calculation",
    reason: "חישוב קנוני (Gematria Method Trace, רגיל v1, parity=true).",
    sourceLabel: "מנוע גימטריה",
  }));
}

// Source bundles: only from ALREADY access-filtered findings; a bundle is presentation grouping,
// never independence. Only multi-member bundles surface (singletons stay in their own surface).
function sourceBundleRows(findings, occurrences) {
  return buildSourceBundles(findings, { occurrences })
    .filter((b) => !b.isSingleton)
    .slice(0, 1)
    .map((b) => ({
      id: `pack:bundle:${b.id}`,
      label: clean(b.header?.label) || "מקור משותף",
      kind: "source_bundle",
      reason: `${b.count} ממצאים מאותו מקור · קיבוץ הצגה בלבד, לא ראיה בלתי־תלויה.`,
      sourceLabel: clean(b.header?.label) || undefined,
      sourceRef: clean(b.sourceRef) || undefined,
      bundleCount: b.count,
    }));
}

/**
 * @param {object} input
 * @param {string|number} input.postId
 * @param {Array} [input.traces] live canonical gematria_method_trace responses
 * @param {Array} [input.findings] already access-filtered Universal Findings (source bundles)
 * @param {Record<string,object>} [input.occurrences]
 * @returns {null | {packId:string, rows:Array}} null for any non-pilot post (fail-closed)
 */
export function buildGoldenPostContextPack({ postId, traces = [], findings = [], occurrences = {} } = {}) {
  const pack = goldenContextPackFor(postId);
  if (!pack) return null;
  const parts = {
    ...Object.fromEntries(Object.entries(pack.rows).map(([k, v]) => [k, [v]])),
    calculations: calculationRows(pack, traces),
    sourceBundles: pack.order.includes("sourceBundles") ? sourceBundleRows(findings, occurrences) : [],
  };
  const rows = pack.order.flatMap((k) => parts[k] || []);
  const seen = new Set();
  return {
    packId: pack.packId,
    rows: rows.filter((r) => !seen.has(r.id) && seen.add(r.id)).slice(0, GOLDEN_CONTEXT_PACK_MAX_ROWS),
  };
}

// Pack rows lead; an existing connection that merely repeats a pack value is a reference, so it is
// dropped from the list (the number stays reachable from the calculation row).
export function mergeContextPackWithConnections(pack, connections = []) {
  if (!pack) return Array.isArray(connections) ? connections : [];
  const packValues = new Set(pack.rows.map((r) => r.value).filter(Boolean));
  const rest = (Array.isArray(connections) ? connections : [])
    .filter((c) => !(c?.value != null && packValues.has(String(c.value))));
  return [...pack.rows, ...rest];
}
