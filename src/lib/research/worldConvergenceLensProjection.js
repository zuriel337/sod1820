// World 2029 · Human-Gate Convergence Lens
// EXTEND_EXISTING under research_gold_hints_law v3 + cross_vs_convergence_criteria v4.
// Pure projection over already-authorized World material. No truth score/store/lifecycle is created.

const NEGATIVE_TOKENS = [
  "MISMATCH",
  "NEGATIVE",
  "NOT_REPRODUCED",
  "NOT_FOUND",
  "HELD",
  "UNRESOLVED",
  "MISSING_ADAPTER",
  "FAILED",
];

const clean = (value) => value == null ? "" : String(value).trim();
const asArray = (value) => Array.isArray(value) ? value : [];

export const WORLD_CONVERGENCE_FILTER_DEFAULTS = Object.freeze({
  query: "",
  layer: "all",
  verification: "all",
  status: "all",
  contributor: "all",
  attention: "all",
  batch: "all",
  sort: "research_strength",
});

export const WORLD_CONVERGENCE_SORTS = Object.freeze({
  research_strength: "חוזק מחקר",
  human_curated: "אוצרות / Human Gate",
  newest: "חדש קודם",
  provenance: "יותר מקורות",
  value_asc: "מספר עולה",
  value_desc: "מספר יורד",
});

export const WORLD_CONVERGENCE_ATTENTION = Object.freeze({
  all: "הכול",
  needs_decision: "דורש החלטה",
  verified: "מאומת",
  multi_source: "כמה מקורות",
  approved: "מאושר",
  zvi: "צבי",
  unverified: "טרם אומת",
});

function normalizeText(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(asArray(values).map(clean).filter(Boolean))];
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function negativeOperationalState(row) {
  const state = clean(row?.operationalState).toUpperCase();
  return NEGATIVE_TOKENS.some((token) => state.includes(token)) ? state : null;
}

function isDecisionChanging(row) {
  const verification = clean(row?.verification).toLowerCase();
  return verification === "mismatch" || Boolean(negativeOperationalState(row));
}

function verificationClass(row) {
  if (isDecisionChanging(row)) return 0;
  const value = clean(row?.verification).toLowerCase();
  if (value === "match") return 0;
  if (value === "not_tested" || !value) return 1;
  if (value === "method_unknown") return 2;
  if (value === "not_applicable") return 3;
  return 2;
}

function governanceClass(row) {
  const status = clean(row?.status).toLowerCase();
  if (status === "canonical") return 0;
  if (status === "approved") return 1;
  if (status === "candidate") return 2;
  return 3;
}

function sourceRefs(row) {
  return unique([row?.sourceRef, ...asArray(row?.sourceRefs)]);
}

function classificationLabel(row) {
  if (isDecisionChanging(row)) return "דורש החלטה";
  if (row.layer === "topic_history" && clean(row.status).toLowerCase() === "approved") return "Human approved";
  if (row.verification === "match" && row.provenanceCount >= 2) return "מאומת · רב־מקור";
  if (row.verification === "match") return "מאומת";
  if (clean(row.status).toLowerCase() === "candidate") return "מועמד מחקר";
  return "לבדיקה";
}

function explainRow(row) {
  const lines = [];
  if (row.decisionChanging) lines.push("סתירה, mismatch או מצב פתוח שיכול לשנות החלטה.");
  if (row.verification === "match") lines.push("יש אימות מנוע מפורש.");
  if (row.humanApproved) lines.push("קיימת החלטת Human Gate/Topic מאושרת; זהו אות אוצרות, לא ציון אמת.");
  if (row.provenanceCount > 1) lines.push(`${row.provenanceCount} הפניות provenance קובצו לפני הסדר.`);
  else if (row.provenanceCount === 1) lines.push("יש provenance מתועד.");
  if (row.batchKey) lines.push(`עבר סינון מחקרי: ${row.batchKey}.`);
  if (!lines.length) lines.push("נמצא במסלול המחקר אך עדיין חסר אות אימות/אוצרות חזק.");
  return lines;
}

function makeTopicRow(row) {
  const refs = sourceRefs(row);
  const values = asArray(row.values).map(Number).filter(Number.isFinite);
  const value = finite(row.value) ?? (values.length === 1 ? values[0] : null);
  const out = {
    id: row.id, sourceId: row.sourceId, layer: "topic_history", family: row.family,
    createdAt: row.approvedAt || row.createdAt || null,
    label: clean(row.statement) || "Topic", summary: clean(row.secondary) || null,
    value, values, terms: asArray(row.terms), relates: asArray(row.relates),
    status: clean(row.status) || "לא צוין", verification: clean(row.verification) || "not_applicable",
    contributor: clean(row.contributor) || null, sourceRef: clean(row.sourceRef) || null,
    sourceRefs: refs, provenanceCount: refs.length, meterScore: finite(row.meterScore),
    quality: finite(row.quality), confidence: null, batchKey: null, parentId: null,
    operationalState: null, href: row.href || null,
  };
  out.decisionChanging = isDecisionChanging(out);
  out.humanApproved = out.status.toLowerCase() === "approved";
  out.classification = classificationLabel(out);
  out.explainWhy = explainRow(out);
  return out;
}

function makeRelationRow(row) {
  const refs = sourceRefs(row);
  const out = {
    id: row.id, sourceId: row.sourceId, layer: "research_relation", family: row.family,
    createdAt: row.createdAt || null, label: clean(row.statement) || "Relation",
    summary: clean(row.secondary) || null, value: finite(row.value),
    values: asArray(row.values).map(Number).filter(Number.isFinite), terms: asArray(row.terms),
    relates: asArray(row.relates), status: clean(row.status) || "לא צוין",
    verification: clean(row.verification) || "not_tested", contributor: clean(row.contributor) || null,
    sourceRef: clean(row.sourceRef) || null, sourceRefs: refs, provenanceCount: refs.length,
    meterScore: null, quality: null, confidence: finite(row.confidence), batchKey: clean(row.batchKey) || null,
    parentId: clean(row.parentId) || null, operationalState: clean(row.operationalState) || null,
    href: row.href || null,
  };
  out.decisionChanging = isDecisionChanging(out);
  out.humanApproved = ["approved", "canonical"].includes(out.status.toLowerCase());
  out.classification = classificationLabel(out);
  out.explainWhy = explainRow(out);
  return out;
}

function dependencyRoots(rows) {
  const bySourceId = new Map(rows.filter((row) => row?.sourceId).map((row) => [String(row.sourceId), row]));
  const cache = new Map();
  const resolve = (row) => {
    const start = String(row.sourceId || row.id);
    if (cache.has(start)) return cache.get(start);
    let current = row;
    const seen = new Set([start]);
    while (current?.parentId) {
      const parent = String(current.parentId);
      if (seen.has(parent)) break;
      seen.add(parent);
      const parentRow = bySourceId.get(parent);
      if (!parentRow) { cache.set(start, parent); return parent; }
      current = parentRow;
    }
    const root = String(current?.sourceId || start);
    cache.set(start, root);
    return root;
  };
  const roots = new Map();
  const counts = new Map();
  for (const row of rows) {
    const root = resolve(row);
    roots.set(row.id, root);
    counts.set(root, (counts.get(root) || 0) + 1);
  }
  return { roots, counts };
}

function compareNullableDesc(a, b) {
  const av = finite(a), bv = finite(b);
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return bv - av;
}

function compareResearchStrength(a, b) {
  // Lexicographic dimensions only. Never collapse to one opaque "truth score".
  const semanticA = [a.decisionChanging ? 0 : 1, verificationClass(a), governanceClass(a), a.provenanceCount > 1 ? 0 : a.provenanceCount === 1 ? 1 : 2];
  const semanticB = [b.decisionChanging ? 0 : 1, verificationClass(b), governanceClass(b), b.provenanceCount > 1 ? 0 : b.provenanceCount === 1 ? 1 : 2];
  for (let i = 0; i < semanticA.length; i += 1) if (semanticA[i] !== semanticB[i]) return semanticA[i] - semanticB[i];
  if (a.layer === b.layer) {
    for (const key of ["meterScore", "quality", "confidence"]) {
      const compared = compareNullableDesc(a[key], b[key]);
      if (compared) return compared;
    }
  }
  const dateCompared = clean(b.createdAt).localeCompare(clean(a.createdAt));
  return dateCompared || String(a.id).localeCompare(String(b.id));
}

function compareRows(a, b, sort) {
  if (sort === "newest") return clean(b.createdAt).localeCompare(clean(a.createdAt)) || String(a.id).localeCompare(String(b.id));
  if (sort === "provenance") return (b.provenanceCount - a.provenanceCount) || compareResearchStrength(a, b);
  if (sort === "human_curated") return (a.humanApproved ? 0 : 1) - (b.humanApproved ? 0 : 1) || compareResearchStrength(a, b);
  if (sort === "value_asc" || sort === "value_desc") {
    const av = finite(a.value), bv = finite(b.value);
    if (av == null && bv == null) return compareResearchStrength(a, b);
    if (av == null) return 1;
    if (bv == null) return -1;
    const delta = sort === "value_asc" ? av - bv : bv - av;
    return delta || compareResearchStrength(a, b);
  }
  return compareResearchStrength(a, b);
}

function contributorLooksLikeZvi(value) {
  const text = clean(value);
  return text.includes("צבי") || /\bzvi\b/i.test(text);
}

function classifySourceForTriage(row) {
  const text = clean(row?.statement);
  const numeric = /(גימטר|=|שווה|מילוי|אתב.?ש|אי.?ק|קדמי|מסתתר|ריבוע|×| כפול )/i.test(text);
  const corpus = /(דילוג|\bels\b|ראשי תיבות|סופי תיבות|נוטריקון|רק .*פעמים|מופיע.*פעמים|מופיעה.*פעמים|סה.?כ .*פעמים)/i.test(text);
  const spatial = /(תלת[ ־-]?(ממד|מימד)|גת["״']?מ|קוביי?ה|עשרימון|פאות|ציור מימדי)/i.test(text);
  const media = Boolean(row?.mediaUrl) || /\[Image [^\]]+\]/.test(text);
  if (spatial && media) return "SPATIAL_MEDIA";
  if (corpus && numeric) return "CORPUS_PLUS_NUMERIC";
  if (corpus) return "CORPUS_CLAIM";
  if (numeric && media) return "NUMERIC_MEDIA";
  if (numeric) return "NUMERIC";
  if (media) return "MEDIA_SOURCE";
  if (text.length >= 700) return "LONG_INTERPRETIVE";
  return "GENERAL_SOURCE";
}

function numberMentions(text) {
  return [...clean(text).matchAll(/(?<![0-9])([0-9]{2,4})(?![0-9])/g)].map((match) => Number(match[1])).filter((value) => value >= 10 && value <= 9999);
}

export function buildZviCoverage(allResearchProjection) {
  const rows = asArray(allResearchProjection?.rows);
  const sources = rows.filter((row) => row.family === "source_message" && contributorLooksLikeZvi(row.contributor));
  const research = rows.filter((row) => row.family === "research_object");
  const linkedSourceIds = new Set();
  for (const row of research) {
    for (const ref of sourceRefs(row)) {
      const match = ref.match(/channel_updates:([0-9a-fA-F-]{36})/);
      if (match) linkedSourceIds.add(match[1]);
    }
  }
  const topicValues = new Set(rows.filter((row) => row.family === "topic").flatMap((row) => asArray(row.values)).map(Number).filter(Number.isFinite));
  const unlinked = sources.filter((row) => !linkedSourceIds.has(String(row.sourceId)));
  const byNorm = new Map();
  for (const row of unlinked) {
    const key = normalizeText(row.statement).replace(/\s+/g, "");
    const list = byNorm.get(key) || [];
    list.push(row);
    byNorm.set(key, list);
  }
  let exactDuplicateOccurrences = 0, topicAnchoredUnique = 0, uniqueUnlinked = 0;
  const bucketCounts = {};
  for (const list of byNorm.values()) {
    if (!list.length) continue;
    uniqueUnlinked += 1;
    exactDuplicateOccurrences += Math.max(0, list.length - 1);
    const representative = list.find((row) => row.mediaUrl) || list[0];
    const bucket = classifySourceForTriage(representative);
    bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
    if (numberMentions(representative.statement).some((value) => topicValues.has(value))) topicAnchoredUnique += 1;
  }
  return Object.freeze({
    totalSources: sources.length, linkedSources: sources.length - unlinked.length, unlinkedSources: unlinked.length,
    uniqueUnlinked, exactDuplicateOccurrences, topicAnchoredUnique, buckets: Object.freeze(bucketCounts),
    rule: "Source occurrences are preserved; exact repeats are deduped only for attention/rank, never deleted.",
  });
}

export function orderWorldConvergenceRows(rows = [], sort = "research_strength") {
  return [...asArray(rows)].sort((a, b) => compareRows(a, b, sort));
}

export function filterWorldConvergenceRows(rows = [], filters = {}) {
  const f = { ...WORLD_CONVERGENCE_FILTER_DEFAULTS, ...(filters || {}) };
  const query = normalizeText(f.query);
  return asArray(rows).filter((row) => {
    if (f.layer !== "all" && row.layer !== f.layer) return false;
    if (f.verification !== "all" && row.verification !== f.verification) return false;
    if (f.status !== "all" && row.status !== f.status) return false;
    if (f.contributor !== "all" && (row.contributor || "לא צוין") !== f.contributor) return false;
    if (f.batch !== "all" && (row.batchKey || "ללא Batch") !== f.batch) return false;
    if (f.attention === "needs_decision" && !row.decisionChanging) return false;
    if (f.attention === "verified" && row.verification !== "match") return false;
    if (f.attention === "multi_source" && row.provenanceCount < 2) return false;
    if (f.attention === "approved" && !row.humanApproved) return false;
    if (f.attention === "zvi" && !contributorLooksLikeZvi(row.contributor)) return false;
    if (f.attention === "unverified" && ["match", "not_applicable"].includes(row.verification)) return false;
    if (!query) return true;
    const haystack = normalizeText([row.label,row.summary,row.value,...asArray(row.values),...asArray(row.terms),...asArray(row.relates),row.contributor,row.status,row.verification,row.batchKey,row.sourceRef,row.classification].filter((value) => value != null).join(" "));
    return haystack.includes(query);
  });
}

function countBy(rows, key) {
  const out = {};
  for (const row of rows) {
    const value = clean(row?.[key]) || "לא צוין";
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

export function buildWorldConvergenceLensProjection(allResearchProjection) {
  const material = asArray(allResearchProjection?.rows);
  const rows = [
    ...material.filter((row) => row.family === "topic").map(makeTopicRow),
    ...material.filter((row) => row.family === "research_object" && row.kind === "relation").map(makeRelationRow),
  ];
  const dependencies = dependencyRoots(rows.filter((row) => row.layer === "research_relation"));
  for (const row of rows) {
    if (row.layer !== "research_relation") continue;
    const root = dependencies.roots.get(row.id) || row.sourceId;
    row.dependency = Object.freeze({ rootId: root, memberCount: dependencies.counts.get(root) || 1 });
    if (row.dependency.memberCount > 1) row.explainWhy = [...row.explainWhy, `${row.dependency.memberCount} אובייקטים תלויים קובצו לאותה משפחת dependency.`];
  }
  const ordered = orderWorldConvergenceRows(rows, "research_strength");
  const zviCoverage = buildZviCoverage(allResearchProjection);
  return Object.freeze({
    rows: Object.freeze(ordered), total: ordered.length,
    approvedTopics: ordered.filter((row) => row.layer === "topic_history" && row.humanApproved).length,
    researchRelations: ordered.filter((row) => row.layer === "research_relation").length,
    verifiedRelations: ordered.filter((row) => row.layer === "research_relation" && row.verification === "match").length,
    decisionChanging: ordered.filter((row) => row.decisionChanging).length,
    multiSource: ordered.filter((row) => row.provenanceCount > 1).length,
    byLayer: Object.freeze(countBy(ordered, "layer")), byVerification: Object.freeze(countBy(ordered, "verification")),
    byStatus: Object.freeze(countBy(ordered, "status")), byContributor: Object.freeze(countBy(ordered, "contributor")),
    byBatch: Object.freeze(countBy(ordered, "batchKey")), zviCoverage,
    capabilities: Object.freeze({ globalResearchConvergenceIndex: true, contextualCrossMethod: true, globalCrossMethodFeed: false, rawLegacyDiscoveryIncluded: false }),
    truthBoundary: "Contextual order is a presentation projection. It never changes verification, governance, canonicality, publication or access.",
    rawDiscoveryBoundary: "Legacy equality buckets and raw match volume stay internal discovery; they do not enter Research Strength before dependency/verification/curation.",
  });
}

export default buildWorldConvergenceLensProjection;
