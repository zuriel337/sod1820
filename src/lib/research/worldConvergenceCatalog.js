import { supabase } from "../supabase.js";

export const WORLD_CONVERGENCE_LENSES = Object.freeze([
  { key: "balanced", label: "מאוזן" },
  { key: "evidence", label: "חוזק מחקר" },
  { key: "curated", label: "אוצרות / מאושר" },
  { key: "review", label: "דורש בדיקה" },
  { key: "newest", label: "חדש" },
]);

export const WORLD_CONVERGENCE_LANES = Object.freeze([
  { key: "all", label: "הכול" },
  { key: "approved", label: "מאושר / אוצרות" },
  { key: "candidate", label: "מועמדים" },
  { key: "research", label: "מחקר" },
  { key: "raw", label: "חומר גלם" },
]);

const NEGATIVE_TOKENS = [
  "mismatch", "negative", "not_reproduced", "not_found", "held",
  "unresolved", "missing_adapter", "failed", "partial",
];

const clean = (value) => value == null ? "" : String(value).trim();
const asArray = (value) => Array.isArray(value) ? value : [];
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const obj = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

function verificationFromRelation(row) {
  const detail = obj(row?.engine_detail);
  const explicit = clean(detail.verification_state).toLowerCase();
  if (explicit) return explicit;
  return row?.engine_verified === true ? "legacy_verified_only" : "not_tested";
}

function negativeState(state, detail = {}) {
  const haystack = [
    state, detail.status, detail.classification, detail.result_state, detail.outcome,
  ].map(clean).join(" ").toLowerCase();
  return NEGATIVE_TOKENS.some((token) => haystack.includes(token));
}

function topicValues(row) {
  const raw = asArray(row?.highlight_numbers).length ? row.highlight_numbers : row?.numbers;
  return asArray(raw).map(Number).filter(Number.isFinite);
}

function candidateValues(row) {
  const direct = finite(row?.subject_ref);
  if (direct != null && clean(row?.subject_type).toLowerCase() === "number") return [direct];
  const refs = JSON.stringify(row?.evidence_refs || "");
  return [...new Set((refs.match(/\b\d{2,5}\b/g) || []).map(Number).filter(Number.isFinite))].slice(0, 8);
}

function topicRow(row) {
  const values = topicValues(row);
  const refs = [row?.slug ? `topic:${row.slug}` : null].filter(Boolean);
  return {
    id: `topic:${row.id}`,
    sourceIdentity: { owner: "topic_cards", id: String(row.id) },
    lane: "approved",
    familyKey: "convergence",
    label: clean(row.title) || clean(row.slug) || "התכנסות",
    summary: clean(row.subtitle) || null,
    values,
    href: row.slug ? `/topic/${encodeURIComponent(row.slug)}` : null,
    status: clean(row.status) || null,
    contributor: clean(row.created_by) || null,
    verificationState: "not_applicable",
    decisionChangingNegative: false,
    curation: { role: "approved-editorial", tier: null },
    independence: { groups: null, dependencyKnown: false },
    provenance: { refs, present: refs.length > 0 },
    signals: {
      meter: finite(row.meter_score),
      quality: finite(row.quality),
      confidence: null,
      rawDensity: null,
    },
    temporal: {
      occurredAt: row.occurred_at || null,
      addedAt: row.approved_at || row.created_at || null,
    },
    explainWhy: [],
  };
}

function candidateRow(row) {
  const why = obj(row?.why);
  const independentGroups = finite(
    why.independent_group_count ?? why.independentGroupCount ?? why.effective_independent_group_count
  );
  const refs = asArray(row?.evidence_refs).map(clean).filter(Boolean);
  return {
    id: `candidate:${row.id}`,
    sourceIdentity: { owner: "research_candidates", id: String(row.id) },
    lane: "candidate",
    familyKey: "research-candidate",
    label: clean(row.subject_ref) || clean(row.candidate_type) || "מועמד מחקר",
    summary: clean(row.recommendation) || null,
    values: candidateValues(row),
    href: clean(row.subject_type).toLowerCase() === "number" && finite(row.subject_ref) != null
      ? `/number/${Number(row.subject_ref)}`
      : null,
    status: clean(row.status) || "pending",
    contributor: clean(row.created_by_agent) || null,
    verificationState: clean(why.verification_state).toLowerCase() || "not_tested",
    decisionChangingNegative: negativeState(why.verification_state, why),
    curation: { role: "human-gate-pending", tier: null },
    independence: { groups: independentGroups, dependencyKnown: independentGroups != null },
    provenance: { refs, present: refs.length > 0 },
    signals: {
      meter: null,
      quality: null,
      confidence: finite(row.confidence),
      rawDensity: null,
    },
    temporal: { occurredAt: null, addedAt: row.created_at || null },
    explainWhy: [],
  };
}

function researchRow(row) {
  const verificationState = verificationFromRelation(row);
  const detail = obj(row?.engine_detail);
  const meta = obj(row?.meta);
  const sourceRefs = [
    clean(row?.source_ref),
    ...asArray(meta.source_refs).map(clean),
  ].filter(Boolean);
  const dependencyGroups = finite(
    detail?.engine_signal_components?.effective_independent_group_count
      ?? detail?.effective_independent_group_count
      ?? meta?.independent_group_count
  );
  return {
    id: `research:${row.id}`,
    sourceIdentity: { owner: "research_objects", id: String(row.id) },
    lane: "research",
    familyKey: negativeState(verificationState, detail) ? "negative-control" : "research",
    label: clean(row.statement) || "יחס מחקר",
    summary: clean(row.evidence) || null,
    values: finite(row.value) == null ? [] : [Number(row.value)],
    href: finite(row.value) == null ? null : `/number/${Number(row.value)}`,
    status: clean(row.status) || null,
    contributor: clean(row.contributor) || null,
    verificationState,
    decisionChangingNegative: negativeState(verificationState, detail),
    curation: { role: row.status === "approved" || row.status === "canonical" ? row.status : null, tier: null },
    independence: { groups: dependencyGroups, dependencyKnown: dependencyGroups != null },
    provenance: { refs: [...new Set(sourceRefs)], present: sourceRefs.length > 0 },
    signals: {
      meter: null,
      quality: null,
      confidence: finite(row.confidence),
      rawDensity: null,
      legacyEngineVerified: row.engine_verified === true ? true : row.engine_verified === false ? false : null,
    },
    temporal: { occurredAt: null, addedAt: row.created_at || null },
    parentId: clean(row.parent_id) || null,
    explainWhy: [],
  };
}

function rawRow(row) {
  const phrases = asArray(row.phrases).map(String);
  const value = finite(row.value);
  return {
    id: `raw:${row.id}`,
    sourceIdentity: { owner: "convergences", id: String(row.id) },
    lane: "raw",
    familyKey: "raw-discovery",
    label: value == null ? "חומר גלם חישובי" : `${value} · ${clean(row.method) || "שיטה"}`,
    summary: phrases.slice(0, 4).join(" · ") || "Legacy equality bucket",
    values: value == null ? [] : [value],
    href: value == null ? null : `/number/${value}`,
    status: clean(row.status) || null,
    contributor: null,
    verificationState: "raw_signal_only",
    decisionChangingNegative: false,
    curation: { role: null, tier: null },
    independence: { groups: null, dependencyKnown: false },
    provenance: { refs: [`convergences:${row.id}`], present: true },
    signals: {
      meter: null,
      quality: null,
      confidence: null,
      rawDensity: {
        legacyBucketScore: finite(row.score),
        groupSize: finite(row.group_size),
        method: clean(row.method) || null,
      },
    },
    temporal: { occurredAt: null, addedAt: row.last_seen || row.first_seen || null },
    explainWhy: [],
  };
}

function dependencyRoot(rows) {
  const byId = new Map(rows.filter((row) => row.sourceIdentity?.owner === "research_objects")
    .map((row) => [row.sourceIdentity.id, row]));
  const rootOf = (row) => {
    if (row.sourceIdentity?.owner !== "research_objects") return row.id;
    const seen = new Set([row.sourceIdentity.id]);
    let current = row;
    while (current.parentId) {
      if (seen.has(current.parentId)) return [...seen, current.parentId].sort()[0];
      seen.add(current.parentId);
      const parent = byId.get(current.parentId);
      if (!parent) return current.parentId;
      current = parent;
    }
    return current.sourceIdentity.id;
  };
  return new Map(rows.map((row) => [row.id, rootOf(row)]));
}

function verificationClass(row) {
  if (row.decisionChangingNegative) return 0;
  if (row.verificationState === "match") return 0;
  if (row.verificationState === "legacy_verified_only") return 1;
  if (row.verificationState === "not_applicable") return 2;
  return 3;
}

function governanceClass(row) {
  if (row.lane === "approved") return 0;
  if (row.curation?.role === "approved" || row.curation?.role === "canonical") return 1;
  if (row.lane === "candidate") return 2;
  if (row.lane === "research") return 3;
  return 9;
}

function evidenceClass(row) {
  if (row.decisionChangingNegative) return 0;
  if (row.verificationState === "match" && row.provenance?.present && Number(row.independence?.groups || 0) >= 2) return 1;
  if (row.verificationState === "match" && row.provenance?.present) return 2;
  if (row.provenance?.present) return 3;
  return 4;
}

function compareNullableDesc(a, b) {
  const av = finite(a);
  const bv = finite(b);
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return bv - av;
}

export function compareWorldConvergenceRows(a, b, lens = "balanced") {
  if (a.lane === "raw" || b.lane === "raw") {
    if (a.lane !== b.lane) return a.lane === "raw" ? 1 : -1;
  }

  if (lens === "newest") {
    return clean(b.temporal?.addedAt).localeCompare(clean(a.temporal?.addedAt)) || String(a.id).localeCompare(String(b.id));
  }
  if (lens === "review") {
    const av = a.decisionChangingNegative ? 0 : a.verificationState === "not_tested" ? 1 : 2;
    const bv = b.decisionChangingNegative ? 0 : b.verificationState === "not_tested" ? 1 : 2;
    return av - bv
      || evidenceClass(a) - evidenceClass(b)
      || String(a.id).localeCompare(String(b.id));
  }
  if (lens === "curated") {
    return governanceClass(a) - governanceClass(b)
      || verificationClass(a) - verificationClass(b)
      || compareNullableDesc(a.signals?.meter, b.signals?.meter)
      || compareNullableDesc(a.signals?.quality, b.signals?.quality)
      || String(a.id).localeCompare(String(b.id));
  }
  if (lens === "evidence") {
    return evidenceClass(a) - evidenceClass(b)
      || compareNullableDesc(a.independence?.groups, b.independence?.groups)
      || verificationClass(a) - verificationClass(b)
      || governanceClass(a) - governanceClass(b)
      || String(a.id).localeCompare(String(b.id));
  }

  // Balanced Human-Gate attention. This is a lexicographic display order, not a score.
  // Decision-changing contradictions are preserved near the top instead of being optimized away.
  return (a.decisionChangingNegative ? 0 : 1) - (b.decisionChangingNegative ? 0 : 1)
    || governanceClass(a) - governanceClass(b)
    || verificationClass(a) - verificationClass(b)
    || evidenceClass(a) - evidenceClass(b)
    || compareNullableDesc(a.independence?.groups, b.independence?.groups)
    || compareNullableDesc(a.signals?.meter, b.signals?.meter)
    || compareNullableDesc(a.signals?.quality, b.signals?.quality)
    || String(a.id).localeCompare(String(b.id));
}

function explain(row) {
  const out = [];
  if (row.decisionChangingNegative) out.push("סתירה / אי־התאמה יכולה לשנות החלטה ולכן אינה מוסתרת.");
  if (row.verificationState === "match") out.push("קיימת בדיקת מנוע מפורשת שתואמת.");
  else if (row.verificationState === "legacy_verified_only") out.push("יש אות אימות legacy; מצב האימות המפורש חסר.");
  else if (row.verificationState === "not_tested") out.push("עדיין אין בדיקת מנוע מפורשת.");
  if (row.provenance?.present) out.push("יש provenance / מקור addressable.");
  if (Number(row.independence?.groups || 0) > 1) out.push(`${row.independence.groups} קבוצות ראיה עצמאיות דווחו במקור.`);
  if (row.lane === "approved") out.push("התכנסות ציבורית שאושרה Human-Gate/Editorial; אישור אינו דירוג אמת.");
  if (row.lane === "candidate") out.push("מועמד שממתין להחלטת Human Gate.");
  if (row.lane === "raw") out.push("חומר גילוי פנימי בלבד: צפיפות חישובית אינה Research Strength.");
  if (row.signals?.meter != null) out.push(`meter_score legacy: ${row.signals.meter} — אות תצוגה בלבד.`);
  return out;
}

export function normalizeWorldConvergenceCatalog(payload = {}) {
  const layers = obj(payload.layers);
  const rows = [
    ...asArray(layers.topics).map(topicRow),
    ...asArray(layers.candidates).map(candidateRow),
    ...asArray(layers.relations).map(researchRow),
    ...asArray(layers.raw).map(rawRow),
  ];

  const roots = dependencyRoot(rows);
  const dependencyCounts = new Map();
  for (const row of rows) {
    const root = roots.get(row.id);
    dependencyCounts.set(root, (dependencyCounts.get(root) || 0) + 1);
  }

  const grouped = new Map();
  for (const row of rows) {
    const root = roots.get(row.id);
    const key = row.sourceIdentity?.owner === "research_objects" ? `research-dependency:${root}` : row.id;
    const prior = grouped.get(key);
    const enriched = {
      ...row,
      dependency: {
        rootId: root,
        memberCount: dependencyCounts.get(root) || 1,
      },
    };
    if (!prior || compareWorldConvergenceRows(enriched, prior, "balanced") < 0) grouped.set(key, enriched);
  }

  const normalized = [...grouped.values()].map((row) => ({ ...row, explainWhy: explain(row) }));
  return {
    rows: normalized,
    totals: payload.totals || {},
    raw: payload.raw || { included: false, hasMore: false },
    boundaries: payload.boundaries || {},
  };
}

export function filterWorldConvergenceCatalog(rows = [], filters = {}) {
  const query = clean(filters.query).toLowerCase();
  const lane = clean(filters.lane) || "all";
  const verification = clean(filters.verification) || "all";
  const contributor = clean(filters.contributor) || "all";
  const value = finite(filters.value);
  const includeRaw = filters.includeRaw === true;

  return asArray(rows).filter((row) => {
    if (row.lane === "raw" && !includeRaw) return false;
    if (lane !== "all" && row.lane !== lane) return false;
    if (verification !== "all" && row.verificationState !== verification) return false;
    if (contributor !== "all" && (row.contributor || "לא צוין") !== contributor) return false;
    if (value != null && !row.values.includes(value)) return false;
    if (!query) return true;
    const haystack = [
      row.label, row.summary, row.contributor, row.status, row.verificationState,
      ...row.values, ...row.provenance.refs,
    ].filter((x) => x != null).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function buildWorldConvergenceCatalog(payload = {}, options = {}) {
  const projection = normalizeWorldConvergenceCatalog(payload);
  const lens = clean(options.lens) || "balanced";
  const filtered = filterWorldConvergenceCatalog(projection.rows, options.filters || {});
  const sorted = [...filtered].sort((a, b) => compareWorldConvergenceRows(a, b, lens));
  return {
    ...projection,
    lens,
    rows: sorted.map((row, index) => ({ ...row, displayRank: index + 1 })),
    filteredCount: sorted.length,
    disclaimer: "המספר הוא מיקום בעדשת התצוגה הנוכחית בלבד — לא אמת, אימות, קנוניות או פרסום.",
  };
}

export async function fetchWorldConvergenceCatalog({ includeRaw = false, rawLimit = 120, rawOffset = 0 } = {}) {
  const { data, error } = await supabase.functions.invoke("world-convergence-catalog", {
    body: { includeRaw, rawLimit, rawOffset },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data || {};
}
