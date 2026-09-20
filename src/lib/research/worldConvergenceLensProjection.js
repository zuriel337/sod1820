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

import { normalizeWorldNumber, classifyWorldVerificationStrength } from "./worldContextualProminence.js";

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
  attention: "דורש תשומת לב · סקירת קטלוג",
  human_curated: "אוצרות / Human Gate",
  newest: "חדש קודם",
  provenance: "יותר הפניות מקור",
  value_asc: "מספר עולה",
  value_desc: "מספר יורד",
});

export const WORLD_CONVERGENCE_ATTENTION = Object.freeze({
  all: "הכול",
  needs_decision: "דורש החלטה",
  verified: "מאומת",
  multi_source: "כמה הפניות מקור",
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

const finite = normalizeWorldNumber;

function negativeOperationalState(row) {
  const state = clean(row?.operationalState).toUpperCase();
  return NEGATIVE_TOKENS.some((token) => state.includes(token)) ? state : null;
}

function isDecisionChanging(row) {
  const verification = clean(row?.verification).toUpperCase();
  const negativeVerification = NEGATIVE_TOKENS.some((token) => verification.includes(token));
  return negativeVerification || Boolean(negativeOperationalState(row));
}

// EXTEND_EXISTING: reuses worldContextualProminence's shared strength classifier so
// Research Strength and the contextual-prominence widget never disagree on what
// "match" vs "mismatch" means. A row already being decision-changing does NOT get
// classifyWorldVerificationStrength short-circuited to 0 here — that would tie mismatch
// with match again, the exact bug this fix removes.
function verificationClass(row) {
  return classifyWorldVerificationStrength(clean(row?.verification).toLowerCase() || null);
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

// Exact base source identity only — a fragment such as
// "channel_updates:<uuid>#semantic/batch" always resolves to the base occurrence
// "channel_updates:<uuid>". No fuzzy text matching is ever used to bridge a relation's
// sourceRef to the raw source_message/contribution row it came from.
function baseSourceIdentity(ref) {
  const text = clean(ref);
  if (!text) return "";
  const hash = text.indexOf("#");
  return hash === -1 ? text : text.slice(0, hash);
}

// Exact source lookup built once from the already-authorized allResearchProjection
// source_message/contribution rows. No second network/DB read is ever performed here.
function buildSourceIndex(allResearchProjection) {
  const index = new Map();
  for (const row of asArray(allResearchProjection?.rows)) {
    if (row?.family !== "source_message" && row?.family !== "contribution") continue;
    const ref = clean(row.sourceRef);
    if (ref && !index.has(ref)) index.set(ref, row);
  }
  return index;
}

// Resolves every sourceRef on a row to its base source occurrence (deduped by base
// identity). An unresolved base identity is still reported (resolved:false) rather than
// silently dropped, so a missing/late source stays inspectable instead of disappearing.
function resolveSourceOccurrences(refs, sourceIndex) {
  const seen = new Set();
  const out = [];
  for (const ref of asArray(refs)) {
    const base = baseSourceIdentity(ref);
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const source = sourceIndex.get(base) || null;
    out.push(Object.freeze({
      ref, baseRef: base, resolved: Boolean(source), family: source?.family || null,
      statement: source ? clean(source.statement) : null,
      contributor: source ? clean(source.contributor) || null : null,
      createdAt: source?.createdAt || null,
      mediaUrl: source?.mediaUrl || null, mediaClass: source?.mediaClass || null,
      href: source?.href || null,
    }));
  }
  return out;
}

function classificationLabel(row) {
  if (isDecisionChanging(row)) return "דורש החלטה";
  if (row.layer === "topic_history" && clean(row.status).toLowerCase() === "approved") return "Human approved";
  // Raw references never become "רב־מקור" (independent multi-source) proof, whatever
  // provenanceCount is — a shared/dependent source counted twice is still one source_ref.
  // provenanceCount is surfaced as-is ("הפניות מקור") in explainRow, not folded into this label.
  if (row.verification === "match") return "מאומת";
  if (row.verification === "review_required") return "ממתין לבדיקה";
  if (clean(row.status).toLowerCase() === "candidate") return "מועמד מחקר";
  return "לבדיקה";
}

function explainRow(row) {
  const lines = [];
  if (row.decisionChanging) lines.push("סתירה, mismatch או מצב פתוח שיכול לשנות החלטה.");
  if (row.verification === "match") lines.push("יש אימות מנוע מפורש.");
  if (row.humanApproved) lines.push("קיימת החלטת Human Gate/Topic מאושרת; זהו אות אוצרות, לא ציון אמת.");
  if (row.provenanceCount > 1) lines.push(`${row.provenanceCount} הפניות מקור מתועדות; הן אינן נחשבות עצמאיות בלי dependency evidence.`);
  else if (row.provenanceCount === 1) lines.push("יש הפניית מקור מתועדת.");
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

// Source-owned contributor only: why.paths[].contributor (each path is a source-owned
// provenance hop) or an exact linked-Topic contributor carried on the why payload itself.
// why.generated_by/why.source name the AGENT that produced the candidate, never a human
// author — they must never leak into `contributor` (kept separately as `generatedBy`).
function candidateContributor(why, topicTitle) {
  for (const path of asArray(why?.paths)) {
    const contributor = clean(path?.contributor);
    if (contributor) return contributor;
  }
  if (topicTitle) {
    const topicContributor = clean(why?.topic_contributor);
    if (topicContributor) return topicContributor;
  }
  return null;
}

function makeCandidateRow(row) {
  const why = row?.why && typeof row.why === "object" ? row.why : {};
  const recommendation = clean(row?.recommendation) || "needs_check";
  const subjectRef = clean(row?.subject_ref);
  const mismatches = asArray(why?.mismatches);
  const reason = clean(why?.reason);
  const confidence = finite(row?.conf ?? row?.confidence);
  const value = /^-?\d+$/.test(subjectRef) ? Number(subjectRef) : null;
  const topicSlug = clean(why?.topic_slug);
  const topicTitle = clean(why?.topic_title);
  const anchor = clean(why?.anchor);
  // needs_check alone means review-required, NOT proof of a mismatch. Only an explicit
  // mismatch/contradiction outcome is decision-changing.
  const hasExplicitMismatch = mismatches.length > 0 || /mismatch|contradiction/i.test(reason);
  const decisionChanging = hasExplicitMismatch;
  const verification = hasExplicitMismatch ? "mismatch" : recommendation === "needs_check" ? "review_required" : "not_tested";
  const sharedSources = unique(asArray(why?.shared_sources));
  const warnings = asArray(why?.warnings).map(clean).filter(Boolean);
  const sourceRefs = unique([
    "research_candidates:" + row.id,
    ...asArray(row?.evidence_refs),
    ...asArray(why?.evidence_refs),
    ...sharedSources,
  ]);
  const classification = decisionChanging
    ? "דורש החלטה"
    : recommendation === "needs_check"
      ? "ממתין לבדיקה"
      : recommendation === "strong"
        ? "מועמד חזק"
        : recommendation === "duplicate"
          ? "מועמד לאיחוד"
          : "מועמד מחקר";
  const out = {
    id: "candidate:" + row.id,
    sourceId: String(row.id),
    layer: "research_candidate",
    family: "research_candidate",
    createdAt: row.created_at || null,
    label: topicTitle || anchor || (subjectRef ? "מועמד " + subjectRef : "Research Candidate"),
    summary: reason || clean(why?.uncertainty) || null,
    value,
    values: value == null ? [] : [value],
    terms: topicTitle ? [topicTitle] : [],
    relates: unique([subjectRef, topicSlug, clean(row?.node_id)]),
    status: "pending",
    verification,
    contributor: candidateContributor(why, topicTitle),
    generatedBy: clean(why?.generated_by) || null,
    sourceRef: "research_candidates:" + row.id,
    sourceRefs,
    provenanceCount: sourceRefs.length,
    sharedSources,
    warnings,
    meterScore: null,
    quality: null,
    confidence,
    batchKey: null,
    parentId: null,
    operationalState: recommendation,
    recommendation,
    decisionChanging,
    affectsApproved: decisionChanging && clean(why?.topic_status) === "approved",
    humanApproved: false,
    classification,
    href: topicSlug
      ? "/topic/" + encodeURIComponent(topicSlug)
      : value != null ? "/number/" + value : null,
  };
  out.explainWhy = [];
  if (decisionChanging) out.explainWhy.push("מועמד עם mismatch/contradiction מפורש שיכול לשנות החלטה קיימת.");
  else if (recommendation === "needs_check") out.explainWhy.push("מסומן needs_check — דורש בדיקה, זו אינה הוכחת mismatch.");
  if (mismatches.length) out.explainWhy.push(mismatches.length + " אי־התאמות מנוע מתועדות ב־candidate.");
  if (recommendation === "strong") out.explainWhy.push("ה־Research Candidate מסומן strong; זהו אות תיעדוף, לא Truth.");
  if (recommendation === "duplicate") out.explainWhy.push("המערכת חושדת בכפילות/איחוד; אין ליצור Convergence חדש לפני reconciliation.");
  const independent = finite(why?.independent_group_count);
  if (independent != null) out.explainWhy.push(independent + " קבוצות ראיה עצמאיות מדווחות במועמד.");
  else out.explainWhy.push("עצמאות הראיות אינה ידועה (independence=null); הפניות המקור אינן נחשבות עצמאיות כברירת מחדל.");
  if (sharedSources.length) out.explainWhy.push(sharedSources.length + " מקורות משותפים (shared_sources) מתועדים; הם אינם עדות עצמאית.");
  if (warnings.length) out.explainWhy.push(warnings.length + " אזהרות מתועדות במועמד — נשמרות, לא נמחקות.");
  if (confidence != null) out.explainWhy.push("confidence=" + confidence + " הוא מדד candidate-native בלבד, לא ציון אמת.");
  if (topicTitle && clean(why?.topic_status) === "approved") out.explainWhy.push("המועמד נוגע ב־Topic מאושר; האישור ההיסטורי נשמר ואינו נכתב מחדש.");
  if (!out.explainWhy.length) out.explainWhy.push("מועמד מחקר פתוח שממתין ל־Human Gate.");
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
    // Never flatten a local mismatch behind a top-level "match": the raw engine state and
    // every raw per-scope state survive verbatim for inspection alongside the composed
    // `verification` field above.
    engineVerificationStateRaw: clean(row.engineVerificationStateRaw) || null,
    scopeVerificationStates: asArray(row.scopeVerificationStates),
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

// Research Strength: verification strength alone decides this dimension, so an explicit
// match always precedes a mismatch/open state. Decision-changing status is surfaced
// through the `decisionChanging`/`needs_decision` filter and classification label, not by
// hoisting mismatches ahead of matches here — that is catalog-review/attention ordering,
// kept separate in compareCatalogAttention below.
function compareResearchStrength(a, b) {
  // Lexicographic dimensions only. Never collapse to one opaque "truth score".
  const semanticA = [verificationClass(a), governanceClass(a)];
  const semanticB = [verificationClass(b), governanceClass(b)];
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

// Catalog-review / attention ordering: a decision-changing negative — especially one
// touching an already-approved Topic — is surfaced first so Human Gate reviews it before
// anything else. This is the "mismatch may precede in attention" counterpart to Research
// Strength above; the two orderings intentionally disagree on where a mismatch belongs.
export function compareCatalogAttention(a, b) {
  const semanticA = [a.decisionChanging && a.affectsApproved ? 0 : 1, a.decisionChanging ? 0 : 1, verificationClass(a), governanceClass(a)];
  const semanticB = [b.decisionChanging && b.affectsApproved ? 0 : 1, b.decisionChanging ? 0 : 1, verificationClass(b), governanceClass(b)];
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
  if (sort === "attention") return compareCatalogAttention(a, b);
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
  if (text === "📷 עדכון" && media) return "MEDIA_LINEAGE_BACKLOG";
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
    const key = normalizeText(row.statement).replace(/\s+/g, "") + "\u001f" + clean(row.mediaUrl);
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
    rule: "Compound source identity = text + media. Same placeholder text with different media is never deduped; true repeats are collapsed only for attention/rank, never deleted.",
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
    ...asArray(allResearchProjection?.convergenceCandidates).map(makeCandidateRow),
  ];

  // Exact source lookup, reused for every row below — no second network/DB read.
  const sourceIndex = buildSourceIndex(allResearchProjection);
  for (const row of rows) {
    row.resolvedSources = resolveSourceOccurrences(row.sourceRefs, sourceIndex);
  }

  const relationRows = rows.filter((row) => row.layer === "research_relation");
  const dependencies = dependencyRoots(relationRows);
  const membersByRoot = new Map();
  for (const row of relationRows) {
    const root = dependencies.roots.get(row.id) || row.sourceId;
    const list = membersByRoot.get(root) || [];
    list.push(row);
    membersByRoot.set(root, list);
  }
  for (const row of relationRows) {
    const root = dependencies.roots.get(row.id) || row.sourceId;
    const members = membersByRoot.get(root) || [row];
    // Each member exposes its OWN verification/state — a member never borrows verification
    // from a sibling just because they share a dependency root.
    const memberSummaries = Object.freeze(members.map((member) => Object.freeze({
      id: member.id, label: member.label, verification: member.verification,
      engineVerificationStateRaw: member.engineVerificationStateRaw || null,
      sourceRefs: member.sourceRefs, contributor: member.contributor, status: member.status,
      scopeVerificationStates: member.scopeVerificationStates,
    })));
    row.dependency = Object.freeze({ rootId: root, memberCount: members.length, members: memberSummaries });
    if (row.dependency.memberCount > 1) row.explainWhy = [...row.explainWhy, `${row.dependency.memberCount} אובייקטים תלויים קובצו לאותה משפחת dependency.`];
  }
  const ordered = orderWorldConvergenceRows(rows, "research_strength");
  const zviCoverage = buildZviCoverage(allResearchProjection);
  return Object.freeze({
    rows: Object.freeze(ordered), total: ordered.length,
    approvedTopics: ordered.filter((row) => row.layer === "topic_history" && row.humanApproved).length,
    researchRelations: ordered.filter((row) => row.layer === "research_relation").length,
    pendingCandidates: ordered.filter((row) => row.layer === "research_candidate").length,
    verifiedRelations: ordered.filter((row) => row.layer === "research_relation" && row.verification === "match").length,
    decisionChanging: ordered.filter((row) => row.decisionChanging).length,
    multiTrace: ordered.filter((row) => row.provenanceCount > 1).length,
    byLayer: Object.freeze(countBy(ordered, "layer")), byVerification: Object.freeze(countBy(ordered, "verification")),
    byStatus: Object.freeze(countBy(ordered, "status")), byContributor: Object.freeze(countBy(ordered, "contributor")),
    byBatch: Object.freeze(countBy(ordered, "batchKey")), zviCoverage,
    candidateError: clean(allResearchProjection?.convergenceCandidateError) || null,
    candidateMeta: allResearchProjection?.convergenceCandidateMeta || {},
    capabilities: Object.freeze({ globalResearchConvergenceIndex: true, contextualCrossMethod: true, globalCrossMethodFeed: false, rawLegacyDiscoveryIncluded: false }),
    truthBoundary: "Contextual order is a presentation projection. It never changes verification, governance, canonicality, publication or access.",
    rawDiscoveryBoundary: "Legacy equality buckets, raw match volume and repeated source refs stay outside Research Strength until dependency/independence is explicit.",
  });
}

export default buildWorldConvergenceLensProjection;
