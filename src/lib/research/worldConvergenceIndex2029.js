import { supabase } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();
const asArray = (value) => Array.isArray(value) ? value : [];
const finite = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const WORLD_CONVERGENCE_LAYERS_2029 = Object.freeze({
  all: { label: "הכול" },
  topic: { label: "מאושרות / היסטוריות" },
  research: { label: "Research Relations" },
  candidate: { label: "מועמדות להחלטה" },
});

export const WORLD_CONVERGENCE_STATES_2029 = Object.freeze({
  all: { label: "כל המצבים" },
  pass: { label: "PASS" },
  mixed: { label: "MIXED" },
  needs_check: { label: "דורש בדיקה" },
  unverified: { label: "טרם אומת" },
});

export const WORLD_CONVERGENCE_SORTS_2029 = Object.freeze({
  recommended: { label: "מומלץ למחקר" },
  review: { label: "מה דורש החלטה" },
  strength: { label: "חוזק מחקר" },
  curation: { label: "אוצרות / אישור" },
  newest: { label: "חדש קודם" },
  number: { label: "מספר עולה" },
});

function verificationStateFromResearch(row) {
  const explicit = clean(row?.verification).toLowerCase();
  if (explicit === "match") return "pass";
  if (explicit.includes("mismatch") || explicit.includes("partial") || explicit.includes("mixed")) return "mixed";
  if (row?.engineVerified === true) return "pass";
  return "unverified";
}

function candidateState(row) {
  const recommendation = clean(row?.recommendation).toLowerCase();
  if (recommendation === "needs_check") return "needs_check";
  if (recommendation === "strong") return "pass";
  if (recommendation === "duplicate") return "needs_check";
  return "unverified";
}

function topicState(row, repairBySlug) {
  return repairBySlug.has(clean(row?.slug)) ? "needs_check" : "pass";
}

function sourceRefCount(row) {
  const refs = [
    row?.sourceRef,
    ...asArray(row?.sourceRefs),
    ...asArray(row?.meta?.source_refs),
  ].map(clean).filter(Boolean);
  return new Set(refs).size;
}

function profileFor(row) {
  const state = row.state;
  const verificationClass = state === "pass" ? 0 : state === "mixed" ? 1 : state === "needs_check" ? 2 : 3;
  const reviewClass = state === "mixed" || state === "needs_check" ? 0 : state === "unverified" ? 1 : 2;
  const curationClass = row.layer === "topic" ? 0 : row.layer === "candidate" && row.recommendation === "strong" ? 1 : 2;
  const provenanceClass = row.provenanceCount > 0 ? 0 : 1;
  const independentEvidence = finite(row.independentEvidence);
  return Object.freeze({
    reviewClass,
    verificationClass,
    curationClass,
    provenanceClass,
    independentEvidence,
    verification: state,
    curation: row.layer === "topic" ? "approved_editorial" : row.layer === "candidate" ? row.recommendation : null,
    provenanceCount: row.provenanceCount,
    contradiction: state === "mixed" || state === "needs_check",
    signalOnly: Object.freeze({
      meter: finite(row.meter),
      quality: finite(row.quality),
      confidence: finite(row.confidence),
    }),
  });
}

function explainRow(row) {
  const reasons = [];
  if (row.state === "mixed") reasons.push("יש התאמה חלקית לצד אי־התאמה שיכולה לשנות מסקנה.");
  else if (row.state === "needs_check") reasons.push("יש החלטת Human Gate או תיקון legacy שממתינים לבדיקה.");
  else if (row.state === "pass") reasons.push("החומר עבר את שכבת האימות הזמינה לו.");
  else reasons.push("החומר קיים במחקר אך טרם קיבל אימות מספיק.");

  if (row.layer === "topic") reasons.push("זהו Topic מאושר/היסטורי; 2029 מפנה אליו ואינו מעתיק אותו כאמת חדשה.");
  if (row.layer === "research") reasons.push("זהו Research Relation עם provenance למקור המחקר.");
  if (row.layer === "candidate") reasons.push("זהו Research Candidate — המלצה להחלטה, לא Truth state.");
  if (row.provenanceCount) reasons.push(`${row.provenanceCount} הפניות provenance זמינות.`);
  if (Number.isFinite(row.independentEvidence)) reasons.push(`${row.independentEvidence} קבוצות ראיה עצמאיות דווחו במקור המועמד.`);

  return Object.freeze(reasons);
}

export function normalizeWorldConvergenceTopic2029(row, repairBySlug = new Map()) {
  if (!row?.id) return null;
  const numbers = (asArray(row.highlight_numbers).length ? row.highlight_numbers : asArray(row.numbers))
    .map(Number).filter(Number.isFinite);
  const repair = repairBySlug.get(clean(row.slug)) || null;
  const item = {
    id: `topic:${row.id}`,
    sourceId: String(row.id),
    layer: "topic",
    state: topicState(row, repairBySlug),
    label: clean(row.title) || clean(row.slug) || "Topic",
    summary: repair
      ? "Topic מאושר עם mismatch מנועי שהועבר לבדיקת Human Gate."
      : clean(row.subtitle) || "התכנסות מאושרת היסטורית.",
    numbers,
    value: numbers.length === 1 ? numbers[0] : null,
    contributor: clean(row.created_by) || null,
    createdAt: row.approved_at || row.created_at || null,
    href: row.slug ? `/topic/${encodeURIComponent(row.slug)}` : null,
    recommendation: repair ? "needs_check" : null,
    confidence: repair?.confidence ?? null,
    meter: row.meter_score,
    quality: row.quality,
    independentEvidence: repair?.independentEvidence ?? null,
    provenanceCount: 1 + (repair ? 1 : 0),
    sourceRef: row.slug ? `topic:${row.slug}` : `topic_cards:${row.id}`,
    sourceRefs: repair ? [`research_candidates:${repair.id}`] : [],
    repair,
  };
  item.profile = profileFor(item);
  item.explainWhy = explainRow(item);
  return Object.freeze(item);
}

export function normalizeWorldConvergenceResearch2029(row) {
  if (!row?.sourceId || row?.family !== "research_object" || row?.kind !== "relation") return null;
  const item = {
    id: `research:${row.sourceId}`,
    sourceId: String(row.sourceId),
    layer: "research",
    state: verificationStateFromResearch(row),
    label: clean(row.statement) || "Research Relation",
    summary: clean(row.secondary) || null,
    numbers: asArray(row.values).map(Number).filter(Number.isFinite),
    value: finite(row.value),
    contributor: clean(row.contributor) || null,
    createdAt: row.createdAt || null,
    href: finite(row.value) != null ? `/number/${Number(row.value)}` : null,
    recommendation: null,
    confidence: row.confidence,
    meter: null,
    quality: null,
    independentEvidence: finite(row?.engineDetail?.independent_group_count),
    provenanceCount: sourceRefCount(row),
    sourceRef: clean(row.sourceRef) || `research_objects:${row.sourceId}`,
    sourceRefs: asArray(row?.meta?.source_refs),
  };
  item.profile = profileFor(item);
  item.explainWhy = explainRow(item);
  return Object.freeze(item);
}

export function normalizeWorldConvergenceCandidate2029(row) {
  if (!row?.id) return null;
  const why = row.why && typeof row.why === "object" ? row.why : {};
  const value = finite(row.subject_ref);
  const topicSlug = clean(why.topic_slug) || null;
  const item = {
    id: `candidate:${row.id}`,
    sourceId: String(row.id),
    layer: "candidate",
    state: candidateState(row),
    label: clean(why.topic_title)
      || (value != null ? `מועמד התכנסות · ${value}` : "Research Candidate"),
    summary: clean(why.reason) || clean(row.recommendation) || "מועמד להחלטת Human Gate.",
    numbers: value == null ? [] : [value],
    value,
    contributor: clean(why.contributor) || null,
    createdAt: row.created_at || null,
    href: topicSlug ? `/topic/${encodeURIComponent(topicSlug)}` : value != null ? `/number/${value}` : null,
    recommendation: clean(row.recommendation) || null,
    confidence: finite(row.confidence ?? row.conf),
    meter: null,
    quality: null,
    independentEvidence: finite(why.independent_group_count),
    provenanceCount: asArray(row.evidence_refs).length,
    sourceRef: `research_candidates:${row.id}`,
    sourceRefs: asArray(row.evidence_refs),
    why,
  };
  item.profile = profileFor(item);
  item.explainWhy = explainRow(item);
  return Object.freeze(item);
}

function compareNullableDesc(a, b) {
  const av = finite(a);
  const bv = finite(b);
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return bv - av;
}

function compareProfile(a, b, sort) {
  if (sort === "newest") {
    return clean(b.createdAt).localeCompare(clean(a.createdAt)) || a.id.localeCompare(b.id);
  }
  if (sort === "number") {
    const av = finite(a.value), bv = finite(b.value);
    if (av == null && bv == null) return a.id.localeCompare(b.id);
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv || a.id.localeCompare(b.id);
  }

  const ap = a.profile || profileFor(a);
  const bp = b.profile || profileFor(b);
  const dimensions = sort === "review"
    ? ["reviewClass", "verificationClass", "curationClass", "provenanceClass"]
    : sort === "curation"
      ? ["curationClass", "reviewClass", "verificationClass", "provenanceClass"]
      : sort === "strength"
        ? ["verificationClass", "provenanceClass", "reviewClass", "curationClass"]
        : ["reviewClass", "verificationClass", "curationClass", "provenanceClass"];

  for (const key of dimensions) {
    if (ap[key] !== bp[key]) return ap[key] - bp[key];
  }
  const independent = compareNullableDesc(ap.independentEvidence, bp.independentEvidence);
  if (independent) return independent;

  // Existing family-native values are transparent, late tie-breakers only.
  if (a.layer === b.layer) {
    for (const key of ["meter", "quality", "confidence"]) {
      const compared = compareNullableDesc(a[key], b[key]);
      if (compared) return compared;
    }
  }
  return clean(b.createdAt).localeCompare(clean(a.createdAt)) || a.id.localeCompare(b.id);
}

export function filterWorldConvergenceIndex2029(rows = [], filters = {}) {
  const query = clean(filters.query).toLowerCase();
  const layer = clean(filters.layer) || "all";
  const state = clean(filters.state) || "all";
  const contributor = clean(filters.contributor) || "all";
  const value = clean(filters.value);

  return asArray(rows).filter((row) => {
    if (layer !== "all" && row.layer !== layer) return false;
    if (state !== "all" && row.state !== state) return false;
    if (contributor !== "all" && (row.contributor || "לא צוין") !== contributor) return false;
    if (value) {
      const target = Number(value);
      if (!Number.isFinite(target) || !asArray(row.numbers).includes(target)) return false;
    }
    if (!query) return true;
    const haystack = [
      row.label,row.summary,row.contributor,row.state,row.layer,row.recommendation,row.sourceRef,
      ...asArray(row.numbers),...asArray(row.sourceRefs),...asArray(row.explainWhy),
    ].filter((v) => v != null).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function sortWorldConvergenceIndex2029(rows = [], sort = "recommended") {
  return [...asArray(rows)].sort((a, b) => compareProfile(a, b, sort));
}

export function buildWorldConvergenceIndex2029({ topics = [], candidatePayload = {}, researchProjection = null } = {}) {
  const candidateRows = asArray(candidatePayload?.candidates);
  const candidates = candidateRows.map(normalizeWorldConvergenceCandidate2029).filter(Boolean);
  const repairBySlug = new Map(
    candidates
      .filter((row) => row.recommendation === "needs_check" && clean(row?.why?.topic_slug))
      .map((row) => [clean(row.why.topic_slug), row])
  );
  const topicRows = asArray(topics).map((row) => normalizeWorldConvergenceTopic2029(row, repairBySlug)).filter(Boolean);
  const researchRows = asArray(researchProjection?.rows)
    .map(normalizeWorldConvergenceResearch2029).filter(Boolean);

  const rows = [...topicRows, ...researchRows, ...candidates];
  const counts = {};
  const states = {};
  const contributors = {};
  for (const row of rows) {
    counts[row.layer] = (counts[row.layer] || 0) + 1;
    states[row.state] = (states[row.state] || 0) + 1;
    const c = row.contributor || "לא צוין";
    contributors[c] = (contributors[c] || 0) + 1;
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    total: rows.length,
    byLayer: Object.freeze(counts),
    byState: Object.freeze(states),
    byContributor: Object.freeze(contributors),
    openContradictions: finite(candidatePayload?.open_contradictions),
    truthBoundary: "Rank Profile is contextual presentation. It does not change Truth, verification, governance, canonicality, publication or access.",
    rawBoundary: "Legacy equality buckets are internal discovery material. They are not Research Convergences and are loaded only for an explicit numeric anchor.",
  });
}

async function fetchApprovedTopics() {
  const { data, error } = await supabase
    .from("topic_cards_public")
    .select("id,slug,title,subtitle,numbers,highlight_numbers,status,quality,created_by,created_at,approved_at,meter_score")
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error) throw error;
  return asArray(data);
}

async function fetchPendingCandidates(limit = 250) {
  const { data, error } = await supabase.rpc("admin_convergence_candidates", { p_limit: Math.max(1, Math.min(Number(limit) || 250, 500)) });
  if (error) throw error;
  return data && typeof data === "object" ? data : { candidates: [] };
}

export async function fetchWorldConvergenceIndex2029({ researchProjection = null } = {}) {
  const [topics, candidatePayload] = await Promise.all([
    fetchApprovedTopics(),
    fetchPendingCandidates(),
  ]);
  return buildWorldConvergenceIndex2029({ topics, candidatePayload, researchProjection });
}

export async function fetchWorldConvergenceRawDetail2029(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) return null;
  const { data, error } = await supabase.rpc("admin_convergence_detail", { p_value: n });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  return Object.freeze({
    value: n,
    anchor: data.anchor ?? null,
    methods: Object.freeze(asArray(data.methods)),
    evidence: Object.freeze(asArray(data.evidence)),
    cards: Object.freeze(asArray(data.cards)),
    boundary: "Legacy/raw discovery support for this explicit anchor only. Group size and raw match count are Signal, not Research Strength.",
  });
}

export default fetchWorldConvergenceIndex2029;
