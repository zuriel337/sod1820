// Golden Projector presentation modes (GOLDEN_POSTS_POST_ONLY_RECONCILE_V2 refinement).
//
// ONE Projector, two presentation modes over the SAME candidate identities / truth / provenance:
//   ADMIN_ALL   ("מנהל / הכל") — every candidate the CURRENT SESSION is authorized to read for the
//               active Golden context, each with explicit type / state / reason / provenance.
//   PUBLIC_VIEW ("ציבור")      — exactly the public layer an ordinary visitor sees.
//
// Access is never decided here. The admin layer reads research_objects ONLY through the existing
// RLS-enforced reader (fetchResearchObjectsForEntity) with the viewer's own session; `ro_admin_read`
// (users.role='admin') is the canonical boundary. A non-admin session that somehow requested ADMIN_ALL
// would receive only what RLS already allows the public. PUBLIC_VIEW performs no admin read at all,
// so no private payload ever reaches the client in that mode (no client-side hiding).
//
// SMART ordering reuses the explainable lexicographic pattern of worldContextualProminence (no scalar,
// no 0-100 score, raw occurrence count never decides). It is presentation order only: it never
// changes admission, truth, access, canonicality or publication.

import { classifyWorldVerificationStrength } from "./worldContextualProminence.js";
import { readVideoSemanticMap } from "./videoSemanticMap.js";

export const PROJECTOR_MODE = Object.freeze({ ADMIN_ALL: "admin_all", PUBLIC_VIEW: "public_view" });

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const cap = (v, n) => clean(v).slice(0, n);

/** Admin is the default for an authorized admin; anything else is PUBLIC_VIEW (fail closed). */
export function resolveProjectorMode({ isAdmin = false, requested = null } = {}) {
  if (!isAdmin) return PROJECTOR_MODE.PUBLIC_VIEW;
  return requested === PROJECTOR_MODE.PUBLIC_VIEW ? PROJECTOR_MODE.PUBLIC_VIEW : PROJECTOR_MODE.ADMIN_ALL;
}

// ── SMART prominence ──────────────────────────────────────────────────────────────────────────
// Axis order is the decided PROJECTOR_SMART_PROMINENCE_GOLDEN_V1 order. Lower = earlier.
export const PROMINENCE_AXES = Object.freeze([
  ["contextRelevance", "רלוונטיות להקשר"],
  ["claimDirectness", "ישירות הטענה"],
  ["sourceIndependence", "עצמאות מקורות"],
  ["provenance", "מקוריות/מקור"],
  ["reproducibility", "שחזור/Trace"],
  ["identitySafety", "בטיחות זהות"],
  ["informationGain", "תוספת מידע"],
  ["variantRobustness", "עמידות וריאנטים"],
  ["negativeControl", "ביקורת/שלילה"],
  ["humanCuration", "אוצרות אנושית"],
]);

// Kind -> directness of the claim relative to the active source (presentation axis only).
const DIRECTNESS = Object.freeze({
  event_fact: 0, typed_observation: 0, typed_derivation: 0, source_representation: 0,
  calculation: 0, typed_relation: 1, source_work: 1, interpretation: 2, source_bundle: 2,
});

function axesForPublicRow(row) {
  const directness = DIRECTNESS[row.kind];
  const governed = directness != null;
  return {
    contextRelevance: governed ? 0 : 1,
    claimDirectness: directness ?? 2,
    // Every public pack row is one occurrence (the post itself); independence is never inflated.
    sourceIndependence: -1,
    provenance: row.sourceLabel ? 0 : 1,
    reproducibility: row.kind === "calculation" || row.kind === "typed_derivation" ? 0 : governed ? 1 : 2,
    identitySafety: governed ? 0 : 1,
    informationGain: 0,
    variantRobustness: 0,
    negativeControl: 1,
    humanCuration: row.kind === "interpretation" ? 0 : 1,
  };
}

function compareAxes(a, b) {
  for (const [key] of PROMINENCE_AXES) {
    const d = (a?.[key] ?? 0) - (b?.[key] ?? 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Order rows by the lexicographic axes. Rows sharing one occurrence collapse to ONE group
 * (its best row is the group head; the rest are dependent children listed after ALL heads), so ten
 * rows from one occurrence never outrank two independent occurrences. Stable for equal axes.
 */
export function orderBySmartProminence(rows, { axesOf = (r) => r.axes || axesForPublicRow(r), occurrenceOf = (r) => r.occurrenceKey || r.id } = {}) {
  const list = (Array.isArray(rows) ? rows : []).map((row, index) => ({ row, index, axes: axesOf(row), occ: occurrenceOf(row) }));
  const groups = new Map();
  for (const item of list) {
    const g = groups.get(item.occ) || [];
    g.push(item);
    groups.set(item.occ, g);
  }
  const byAxes = (x, y) => compareAxes(x.axes, y.axes) || x.index - y.index;
  const ordered = [...groups.values()].map((g) => g.sort(byAxes)).sort((g1, g2) => byAxes(g1[0], g2[0]));
  // Heads first: one representative per occurrence, then dependent children. Repetition inside one
  // occurrence therefore never pushes an independent occurrence down (or out of a bounded list).
  return [...ordered.map((g) => g[0].row), ...ordered.flatMap((g) => g.slice(1).map((item) => item.row))];
}

export function explainProminence(axes) {
  return PROMINENCE_AXES.map(([key, label]) => `${label}:${axes?.[key] ?? "-"}`).join(" · ");
}

// ── Public layer (both modes render it; it is the ONLY layer in PUBLIC_VIEW) ──────────────────
// Maps pack rows + existing connections into the existing surfaceFindings shape (strings only,
// bounded by researchContext normalization). No private data can enter: pack rows derive from the
// public post + public Trace RPC, and experience connections are the existing public projection.
export function goldenPublicSurfaceFindings({ rows = [], exclude = null, limit = 8 } = {}) {
  const seen = new Set();
  const mapped = (Array.isArray(rows) ? rows : [])
    .filter((r) => r && r.id && clean(r.label) && !seen.has(r.id) && seen.add(r.id))
    .filter((r) => !(typeof exclude === "function" && exclude(r)))
    .map((r) => ({
      id: String(r.id),
      label: cap(r.label, 120),
      value: r.value != null && r.value !== "" ? String(r.value) : undefined,
      kind: clean(r.kind) || undefined,
      reason: cap(r.reason, 240) || undefined,
      href: clean(r.href) || undefined,
      sourceLabel: clean(r.sourceLabel || r.provenanceLabel || r.kind) || undefined,
    }));
  return orderBySmartProminence(mapped)
    .slice(0, limit)
    .map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)));
}

// ── Admin layer ───────────────────────────────────────────────────────────────────────────────
export const ADMIN_LAYER = Object.freeze({
  PUBLIC: "public_layer",
  GOVERNED: "governed",
  TRACE: "trace",
  RESEARCH: "research_objects",
});

const CLAIM_OUTCOME_LABEL = Object.freeze({
  match: ["ADMITTED", "Trace parity=true והערך תואם לטענת המקור"],
  trace_unavailable: ["UNKNOWN_VERIFICATION", "אין Trace חי — לא הוכנס כחישוב (fail-closed)"],
  trace_error: ["FAILED_VERIFICATION", "ה-Trace החזיר שגיאה — לא הוכנס כחישוב"],
  parity_failed: ["FAILED_VERIFICATION", "parity≠true — לא הוכנס כחישוב"],
  value_mismatch: ["REJECT", "תוצאת המנוע שונה מהערך שהמקור טוען — נדחה"],
});

/** Context numbers of the active Golden pack, taken only from governed outputs + source claims. */
export function goldenContextNumbers(pack) {
  const out = new Set();
  const add = (v) => { const n = Number(v); if (Number.isSafeInteger(n) && n > 0) out.add(n); };
  for (const r of pack?.rows || []) add(r.value);
  for (const f of pack?.audit?.findings || []) add(f.value);
  for (const c of pack?.audit?.claims || []) add(c.claimed_value);
  return [...out].sort((a, b) => a - b);
}

function researchRowState(row) {
  const states = [];
  const tier = clean(row.privacy_scope);
  states.push(tier === "private" ? "PRIVATE" : tier === "public_candidate" ? "PUBLIC_CANDIDATE (לא Published)" : tier ? tier.toUpperCase() : "ACCESS_UNSPECIFIED");
  const status = clean(row.status).toLowerCase();
  if (status === "candidate") states.push("HOLD / CANDIDATE");
  else if (status === "rejected" || status === "reject") states.push("REJECT");
  else if (status) states.push(status.toUpperCase());
  const v = clean(row.engine_detail?.verification_state).toLowerCase();
  states.push(v ? `VERIFICATION:${v}` : "VERIFICATION:unknown");
  if (!clean(row.source_ref)) states.push("SOURCE_UNLOCATED");
  return states;
}

/**
 * Assemble the ADMIN_ALL universe. Pure. Every input item stays reachable (no ranking-based hiding);
 * order inside each layer is SMART prominence. `researchRows` must already be RLS-filtered for the
 * current session (caller's responsibility; see fetchGoldenAdminUniverse).
 */
export function buildGoldenAdminUniverse({ pack = null, researchRowsByNumber = {}, researchAccess = null, truncatedNumbers = [] } = {}) {
  const publicIds = new Set((pack?.rows || []).map((r) => r.id));
  const layers = { [ADMIN_LAYER.PUBLIC]: [], [ADMIN_LAYER.GOVERNED]: [], [ADMIN_LAYER.TRACE]: [], [ADMIN_LAYER.RESEARCH]: [] };

  for (const r of pack?.rows || []) {
    layers[ADMIN_LAYER.PUBLIC].push({
      id: `pub:${r.id}`, type: r.kind, label: r.label, value: r.value ?? null,
      states: ["ADMITTED", "PUBLIC_LAYER"], reason: r.reason || "", provenance: r.sourceLabel || "", occurrenceKey: "post",
    });
  }
  for (const f of pack?.audit?.findings || []) {
    if (publicIds.has(f.id)) continue;
    const states = [f.inContextRail ? "GOVERNED_NOT_IN_PUBLIC_LAYER (bounded/capacity)" : "GOVERNED_NOT_SURFACED"];
    if (f.status) states.push(String(f.status).toUpperCase());
    if (f.verificationState) states.push(`VERIFICATION:${f.verificationState}`);
    if (f.accessTier) states.push(`ACCESS:${f.accessTier}`);
    if (/interpretation/.test(f.kind)) states.push("INTERPRETATION");
    layers[ADMIN_LAYER.GOVERNED].push({
      id: `gov:${f.id}`, type: f.kind, label: f.label, value: f.value, states,
      reason: f.boundary || "פלט owner מנוהל; לא נבחר לשכבה הציבורית.", provenance: f.sourceRef || "owner", occurrenceKey: f.sourceRef || "post",
    });
  }
  for (const c of pack?.audit?.claims || []) {
    const [state, why] = CLAIM_OUTCOME_LABEL[c.outcome] || ["UNKNOWN_VERIFICATION", c.outcome];
    layers[ADMIN_LAYER.TRACE].push({
      id: `claim:${c.method_key}:${c.expression}`, type: "source_claim", label: `${c.expression} (${c.method_key})`,
      value: String(c.claimed_value),
      states: [state, `engine=${c.engine_result ?? "—"}`, `parity=${c.parity ?? "—"}`],
      reason: why, provenance: "טענת מקור בפוסט · gematria_method_trace", occurrenceKey: "post",
    });
  }

  // research_objects linked to a context number: linked by VALUE ONLY. Same value != same identity;
  // each row keeps its own id; same source_ref = same occurrence (children / duplicates grouped).
  const seen = new Map();
  for (const [number, rows] of Object.entries(researchRowsByNumber || {})) {
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row?.id) continue;
      const prev = seen.get(row.id);
      if (prev) { prev.linkedNumbers.add(String(number)); continue; }
      seen.set(row.id, { row, linkedNumbers: new Set([String(number)]) });
    }
  }
  const occCount = new Map();
  const dupKey = new Map();
  const researchItems = [...seen.values()].map(({ row, linkedNumbers }) => {
    const occ = clean(row.source_ref) || `ro:${row.id}`;
    occCount.set(occ, (occCount.get(occ) || 0) + 1);
    const dk = `${occ}\u0000${clean(row.statement)}\u0000${row.value}`;
    const dupOf = dupKey.get(dk) || null;
    if (!dupOf) dupKey.set(dk, row.id);
    const states = researchRowState(row);
    if (dupOf) states.push(`DUPLICATE_OF:${dupOf}`);
    const vstate = clean(row.engine_detail?.verification_state).toLowerCase() || null;
    const directExpr = clean(row.engine_detail?.claimed_expression);
    const directMethod = clean(row.engine_detail?.claimed_method || row.engine_detail?.engine_method_tested);
    return {
      identityKey: directExpr ? `expr:${directMethod}\u0000${directExpr}` : `ro:${row.id}`,
      id: `ro:${row.id}`,
      researchObjectId: String(row.id),
      type: `research_object:${clean(row.kind) || "unknown"}`,
      label: cap(row.statement, 200) || `research_object ${row.id}`,
      value: row.value != null ? String(row.value) : null,
      states,
      reason: `מקושר לפי ערך בלבד (${[...linkedNumbers].join(", ")}) — אותו ערך ≠ אותה זהות; זה מועמד/הקשר, לא ראיה.`,
      provenance: [clean(row.source) && `source=${clean(row.source)}`, clean(row.source_ref) && `ref=${clean(row.source_ref)}`, clean(row.contributor) && `contributor=${clean(row.contributor)}`, clean(row.created_at).slice(0, 10)].filter(Boolean).join(" · "),
      occurrenceKey: occ,
      axes: {
        contextRelevance: 1,
        claimDirectness: directExpr ? 1 : 2,
        sourceIndependence: 0,
        provenance: clean(row.source_ref) ? 0 : 1,
        reproducibility: classifyWorldVerificationStrength(vstate),
        identitySafety: directExpr ? 0 : 1,
        informationGain: dupOf ? 1 : 0,
        variantRobustness: 0,
        negativeControl: vstate && classifyWorldVerificationStrength(vstate) === 4 ? 0 : 1,
        humanCuration: clean(row.status).toLowerCase() === "approved" ? 0 : 1,
      },
    };
  });
  // Source independence counts DISTINCT occurrences per typed identity (claimed expression + method).
  // A row without a typed identity is its own identity: value alone never merges identities.
  const identityOccurrences = new Map();
  for (const item of researchItems) {
    const set = identityOccurrences.get(item.identityKey) || new Set();
    set.add(item.occurrenceKey);
    identityOccurrences.set(item.identityKey, set);
  }
  for (const item of researchItems) {
    const n = occCount.get(item.occurrenceKey) || 1;
    if (n > 1) item.states.push(`SAME_OCCURRENCE_GROUP:${n}`);
    const independent = identityOccurrences.get(item.identityKey)?.size || 1;
    item.axes.sourceIndependence = -independent;
    if (independent > 1) item.states.push(`INDEPENDENT_OCCURRENCES:${independent}`);
  }
  layers[ADMIN_LAYER.RESEARCH] = orderBySmartProminence(researchItems, { axesOf: (r) => r.axes });

  // Video maps are representation metadata only. Keep the raw research row out of the
  // component state; pass only the normalized bounded map. Access was already enforced by
  // the RLS-backed research reader used above.
  const videoMaps = [...seen.values()]
    .map(({ row }) => {
      const map = readVideoSemanticMap(row);
      return map ? {
        ...map,
        researchStatus: clean(row.status) || null,
        privacyScope: clean(row.privacy_scope) || null,
      } : null;
    })
    .filter(Boolean);

  const total = Object.values(layers).reduce((n, l) => n + l.length, 0);
  return {
    mode: PROJECTOR_MODE.ADMIN_ALL,
    layers,
    total,
    videoMaps,
    researchAccess: researchAccess || { available: true, reason: null },
    // A reader page limit was reached for these numbers: more rows exist and must be paged, never assumed absent.
    truncatedNumbers: Array.isArray(truncatedNumbers) ? truncatedNumbers : [],
  };
}

/**
 * ADMIN_ALL fetch. Uses ONLY existing readers with the viewer's own session:
 *  - the Golden pack via the existing Post projection path (public Trace RPC, governed owners);
 *  - research_objects via fetchResearchObjectsForEntity (RLS: ro_admin_read).
 * Dependencies are injected for tests; nothing is written anywhere.
 */
export async function fetchGoldenAdminUniverse({ postSlug, loadPack, readResearchObjects, limitPerNumber = 120 } = {}) {
  const pack = typeof loadPack === "function" ? await loadPack(postSlug) : null;
  if (!pack) return null;
  const numbers = goldenContextNumbers(pack);
  const researchRowsByNumber = {};
  let researchAccess = { available: true, reason: null };
  const truncatedNumbers = [];
  if (typeof readResearchObjects === "function") {
    const results = await Promise.all(numbers.map(async (n) => {
      try {
        return [n, await readResearchObjects({ id: `number:${n}`, type: "number", label: String(n) }, { limit: limitPerNumber })];
      } catch {
        return [n, { rows: [], access: { available: false, reason: "research_objects_read_failed" } }];
      }
    }));
    for (const [n, res] of results) {
      researchRowsByNumber[n] = Array.isArray(res?.rows) ? res.rows : [];
      if (researchRowsByNumber[n].length >= limitPerNumber) truncatedNumbers.push(n);
      if (res?.access && res.access.available === false) researchAccess = res.access;
    }
  }
  return buildGoldenAdminUniverse({ pack, researchRowsByNumber, researchAccess, truncatedNumbers });
}
