import { supabase } from "../supabase.js";

// Convergence 2029 catalog is a read-only projection under research_gold_hints_law v3
// + cross_vs_convergence_criteria v4. It DOES NOT create a convergence store, ranking
// truth, lifecycle, canonicality, publication state, or universal scalar score.
//
// Current global layers intentionally stop at readers that are bounded and governed:
// - approved Topic/Convergence projections (topic_cards_public)
// - Research Relations visible to the current admin session (research_objects)
// - pending Human-Gate convergence candidates (existing admin RPC)
// Cross/Core-Axis global browsing remains an explicit MISSING_ADAPTER until the
// dependency-aware view has a bounded acceleration projection; the live aggregate is
// intentionally not called here because it currently exceeds the interactive budget.
// Raw legacy equality buckets remain internal/off by default.

const clean = (value) => value == null ? "" : String(value).trim();
const asArray = (value) => Array.isArray(value) ? value : [];
const finite = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const TOPIC_FIELDS =
  "id,slug,title,subtitle,numbers,highlight_numbers,quality,meter_score,created_by,created_at,approved_at,occurred_at";
const RESEARCH_FIELDS =
  "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,privacy_scope,parent_id,owner_person_id,meta";

export const WORLD_CONVERGENCE_LAYERS = Object.freeze({
  curated: { label: "מאושרות / Human-curated", short: "מאושרות" },
  candidate: { label: "מועמדות להכרעה", short: "מועמדות" },
  research: { label: "Research Relations", short: "מחקר" },
  cross_core: { label: "Cross / Core-Axis", short: "Cross" },
  raw: { label: "Raw Discovery · פנימי", short: "Raw" },
});

export const WORLD_CONVERGENCE_SORTS = Object.freeze({
  attention: "מה דורש תשומת לב",
  strength: "חוזק מחקרי",
  curated: "אוצרות / מאושר",
  newest: "חדש קודם",
  value: "מספר עולה",
});

function explicitVerificationState(row) {
  return clean(row?.engine_detail?.verification_state).toLowerCase() || null;
}

function topicFocus(row) {
  const slug = clean(row?.slug);
  return slug ? `topic:${slug}` : `topic-id:${row?.id || "unknown"}`;
}

function topicRefFromResearch(row) {
  for (const value of asArray(row?.relates)) {
    const text = clean(value);
    if (text.startsWith("topic:") && text.length > 6) return text;
  }
  const context = row?.meta?.topic_context;
  if (typeof context === "string" && /^[a-z0-9א-ת][a-z0-9א-ת_-]*$/iu.test(context.trim())) {
    return `topic:${context.trim()}`;
  }
  return null;
}

function candidateFocus(row) {
  const slug = clean(row?.why?.topic_slug);
  if (slug) return `topic:${slug}`;
  const type = clean(row?.subject_type) || "subject";
  const ref = clean(row?.subject_ref) || clean(row?.id);
  return `${type}:${ref || "unknown"}`;
}

function researchFocus(row) {
  const topic = topicRefFromResearch(row);
  if (topic) return topic;
  const value = finite(row?.value);
  if (value != null) return `number:${value}`;
  return `research:${row?.id || clean(row?.source_ref) || "unknown"}`;
}

function topicMember(row) {
  const values = (asArray(row?.highlight_numbers).length ? row.highlight_numbers : asArray(row?.numbers))
    .map(Number).filter(Number.isFinite);
  return {
    id: `topic:${row.id}`,
    memberType: "curated",
    focusKey: topicFocus(row),
    label: clean(row.title) || clean(row.slug) || "התכנסות",
    summary: clean(row.subtitle) || null,
    value: values.length === 1 ? values[0] : null,
    values,
    href: row.slug ? `/topic/${encodeURIComponent(row.slug)}` : null,
    contributor: clean(row.created_by) || null,
    verificationState: null,
    decisionChanging: false,
    reviewReason: null,
    provenanceRefs: row.slug ? [`topic:${row.slug}`] : [`topic_cards:${row.id}`],
    independentEvidenceGroups: null,
    curation: "approved",
    recommendation: null,
    sourceSignals: {
      meter: finite(row.meter_score),
      quality: finite(row.quality),
      confidence: null,
    },
    dates: {
      createdAt: row.created_at || null,
      approvedAt: row.approved_at || null,
      occurredAt: row.occurred_at || null,
    },
    raw: row,
  };
}

function researchMember(row) {
  const verificationState = explicitVerificationState(row);
  const detail = row?.engine_detail && typeof row.engine_detail === "object" ? row.engine_detail : {};
  const detailText = [
    detail.status, detail.classification, detail.result_state, detail.outcome,
  ].map(clean).join(" ").toUpperCase();
  const decisionChanging = verificationState === "mismatch"
    || ["MISMATCH", "NEGATIVE", "NOT_REPRODUCED", "FAILED", "UNRESOLVED"].some((token) => detailText.includes(token));
  const refs = [
    clean(row.source_ref),
    ...asArray(row?.meta?.source_refs).map(clean),
  ].filter(Boolean);
  const value = finite(row.value);
  return {
    id: `research:${row.id}`,
    memberType: "research",
    focusKey: researchFocus(row),
    label: clean(row.statement) || "Research Relation",
    summary: clean(row.evidence) || null,
    value,
    values: value == null ? [] : [value],
    href: value != null ? `/number/${value}` : null,
    contributor: clean(row.contributor) || null,
    verificationState,
    // Compatibility engine_verified is shown only as a source-native signal; it is not
    // promoted into the Verification axis when engine_detail.verification_state is absent.
    legacyEngineVerified: row.engine_verified === true ? true : row.engine_verified === false ? false : null,
    decisionChanging,
    reviewReason: decisionChanging ? (verificationState || clean(detail.status) || "negative_or_open") : null,
    provenanceRefs: [...new Set(refs)],
    independentEvidenceGroups: finite(row?.meta?.independent_group_count),
    curation: null,
    recommendation: null,
    sourceSignals: {
      meter: null,
      quality: null,
      confidence: finite(row.confidence),
    },
    dates: {
      createdAt: row.created_at || null,
      approvedAt: null,
      occurredAt: null,
    },
    parentId: clean(row.parent_id) || null,
    raw: row,
  };
}

function candidateMember(row) {
  const why = row?.why && typeof row.why === "object" ? row.why : {};
  const mismatches = asArray(why.mismatches);
  const reason = clean(why.reason);
  const recommendation = clean(row.recommendation);
  const decisionChanging = mismatches.length > 0
    || recommendation === "needs_check"
    || /mismatch|contradiction|repair|supersede/i.test(reason);
  const value = clean(row.subject_type) === "number" ? finite(row.subject_ref) : null;
  const refs = asArray(row.evidence_refs).map(clean).filter(Boolean);
  const topicSlug = clean(why.topic_slug);
  const title = clean(why.topic_title)
    || clean(why.anchor)
    || (value != null ? `התכנסות ${value}` : clean(row.subject_ref))
    || "מועמד להתכנסות";
  return {
    id: `candidate:${row.id}`,
    memberType: "candidate",
    focusKey: candidateFocus(row),
    label: title,
    summary: reason || clean(why.uncertainty) || null,
    value,
    values: value == null ? [] : [value],
    href: topicSlug ? `/topic/${encodeURIComponent(topicSlug)}` : value != null ? `/number/${value}` : null,
    contributor: clean(row.created_by_agent) || null,
    verificationState: mismatches.length ? "mismatch" : null,
    decisionChanging,
    reviewReason: reason || recommendation || null,
    provenanceRefs: [...new Set(refs)],
    independentEvidenceGroups: finite(why.independent_group_count),
    curation: clean(why.topic_status) === "approved" ? "approved-context" : null,
    recommendation,
    sourceSignals: {
      meter: null,
      quality: null,
      confidence: finite(row.confidence ?? row.conf),
    },
    dates: {
      createdAt: row.created_at || null,
      approvedAt: null,
      occurredAt: null,
    },
    mismatches,
    raw: row,
  };
}

function newestDate(member) {
  return member?.dates?.approvedAt || member?.dates?.createdAt || member?.dates?.occurredAt || null;
}

function maxFinite(values) {
  const nums = values.map(finite).filter((value) => value != null);
  return nums.length ? Math.max(...nums) : null;
}

function groupMembers(members) {
  const groups = new Map();
  for (const member of members) {
    const key = member.focusKey || member.id;
    const prior = groups.get(key);
    if (!prior) groups.set(key, []);
    groups.get(key).push(member);
  }
  return groups;
}

function canonicalTitle(members, focusKey) {
  const curated = members.find((row) => row.memberType === "curated");
  if (curated?.label) return curated.label;
  const candidate = members.find((row) => row.memberType === "candidate" && row.label);
  if (candidate?.label) return candidate.label;
  const research = members.find((row) => row.memberType === "research" && row.label);
  if (research?.label) return research.label;
  return focusKey;
}

function profileFor(members) {
  const verificationStates = members.map((row) => row.verificationState).filter(Boolean);
  const hasMismatch = verificationStates.includes("mismatch") || members.some((row) => row.decisionChanging);
  const hasMatch = verificationStates.includes("match");
  const independentEvidenceGroups = maxFinite(members.map((row) => row.independentEvidenceGroups));
  const provenanceRefs = [...new Set(members.flatMap((row) => row.provenanceRefs || []))];
  const curated = members.some((row) => row.curation === "approved");
  const approvedContext = members.some((row) => row.curation === "approved-context");
  const verifiedMembers = members.filter((row) => row.verificationState === "match").length;
  const recommendations = [...new Set(members.map((row) => row.recommendation).filter(Boolean))];
  const latest = members.map(newestDate).filter(Boolean).sort().at(-1) || null;

  let prominenceBand = "R3 · בפיתוח";
  if (hasMismatch) prominenceBand = "R0 · דורש הכרעה";
  else if (curated && hasMatch) prominenceBand = "R1 · מאושר + מאומת";
  else if (hasMatch && (independentEvidenceGroups || 0) >= 3) prominenceBand = "R1 · חזק מחקרית";
  else if (curated || hasMatch) prominenceBand = "R2 · מבוסס חלקית";

  return {
    prominenceBand,
    decisionChanging: hasMismatch,
    verification: hasMismatch ? "mismatch" : hasMatch ? "match" : verificationStates[0] || "not_tested",
    verifiedMembers,
    independentEvidenceGroups,
    provenanceCount: provenanceRefs.length,
    provenanceRefs,
    humanCuration: curated ? "approved" : approvedContext ? "approved-context" : null,
    recommendations,
    latest,
    sourceNative: {
      meter: maxFinite(members.map((row) => row.sourceSignals?.meter)),
      quality: maxFinite(members.map((row) => row.sourceSignals?.quality)),
      confidence: maxFinite(members.map((row) => row.sourceSignals?.confidence)),
    },
  };
}

function itemFromGroup(focusKey, members) {
  const profile = profileFor(members);
  const values = [...new Set(members.flatMap((row) => row.values || []).map(Number).filter(Number.isFinite))];
  const layers = [...new Set(members.map((row) => row.memberType))];
  const href = members.find((row) => row.memberType === "curated" && row.href)?.href
    || members.find((row) => row.memberType === "candidate" && row.href)?.href
    || members.find((row) => row.href)?.href
    || null;
  const contributors = [...new Set(members.map((row) => row.contributor).filter(Boolean))];
  const reviewReasons = [...new Set(members.map((row) => row.reviewReason).filter(Boolean))];
  return {
    id: focusKey,
    focusKey,
    title: canonicalTitle(members, focusKey),
    summary: members.find((row) => row.memberType === "curated" && row.summary)?.summary
      || members.find((row) => row.summary)?.summary
      || null,
    value: values.length === 1 ? values[0] : null,
    values,
    href,
    layers,
    contributors,
    members,
    profile,
    reviewReasons,
    searchText: [
      focusKey,
      canonicalTitle(members, focusKey),
      ...contributors,
      ...reviewReasons,
      ...values,
      ...members.flatMap((row) => [row.label, row.summary, ...(row.provenanceRefs || [])]),
    ].filter(Boolean).join(" ").toLowerCase(),
  };
}

function verificationRank(value) {
  // Strength lens: a reproduced match outranks an unresolved/mismatching claim.
  // Attention lens separately lifts decision-changing negatives BEFORE this dimension.
  if (value === "match") return 0;
  if (value === "mismatch") return 1;
  if (value === "method_unknown") return 3;
  return 2;
}

function curationRank(value) {
  if (value === "approved") return 0;
  if (value === "approved-context") return 1;
  return 2;
}

function latestMillis(value) {
  const n = value ? Date.parse(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export function compareWorldConvergenceItems(a, b, sort = "attention") {
  const ap = a.profile || {};
  const bp = b.profile || {};

  if (sort === "newest") return latestMillis(bp.latest) - latestMillis(ap.latest) || String(a.id).localeCompare(String(b.id));
  if (sort === "value") {
    const av = a.value == null ? Number.POSITIVE_INFINITY : Number(a.value);
    const bv = b.value == null ? Number.POSITIVE_INFINITY : Number(b.value);
    return av - bv || String(a.id).localeCompare(String(b.id));
  }
  if (sort === "curated") {
    const c = curationRank(ap.humanCuration) - curationRank(bp.humanCuration);
    if (c) return c;
  }
  if (sort === "attention") {
    if (Boolean(ap.decisionChanging) !== Boolean(bp.decisionChanging)) return ap.decisionChanging ? -1 : 1;
  }

  // Research Strength profile — lexicographic, inspectable, never collapsed into one truth score.
  const v = verificationRank(ap.verification) - verificationRank(bp.verification);
  if (v) return v;
  const ai = finite(ap.independentEvidenceGroups) ?? -1;
  const bi = finite(bp.independentEvidenceGroups) ?? -1;
  if (ai !== bi) return bi - ai;
  if ((ap.verifiedMembers || 0) !== (bp.verifiedMembers || 0)) return (bp.verifiedMembers || 0) - (ap.verifiedMembers || 0);
  if ((ap.provenanceCount || 0) !== (bp.provenanceCount || 0)) return (bp.provenanceCount || 0) - (ap.provenanceCount || 0);
  const c = curationRank(ap.humanCuration) - curationRank(bp.humanCuration);
  if (c) return c;

  // Source-native signals are only late tie-breakers; never cross-family truth weights.
  for (const key of ["meter", "quality", "confidence"]) {
    const av = finite(ap.sourceNative?.[key]);
    const bv = finite(bp.sourceNative?.[key]);
    if (av == null && bv == null) continue;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av !== bv) return bv - av;
  }
  return latestMillis(bp.latest) - latestMillis(ap.latest) || String(a.id).localeCompare(String(b.id));
}

export function buildWorldConvergenceCatalog({
  topics = [],
  researchRelations = [],
  candidates = [],
  capabilities = {},
} = {}) {
  const members = [
    ...asArray(topics).map(topicMember),
    ...asArray(researchRelations).map(researchMember),
    ...asArray(candidates).map(candidateMember),
  ];
  const groups = groupMembers(members);
  const items = [...groups.entries()].map(([focusKey, rows]) => itemFromGroup(focusKey, rows));
  items.sort((a, b) => compareWorldConvergenceItems(a, b, "attention"));

  const byLayer = {};
  const byVerification = {};
  const byBand = {};
  const contributors = new Set();
  for (const item of items) {
    for (const layer of item.layers) byLayer[layer] = (byLayer[layer] || 0) + 1;
    const verification = item.profile.verification || "not_tested";
    byVerification[verification] = (byVerification[verification] || 0) + 1;
    const band = item.profile.prominenceBand;
    byBand[band] = (byBand[band] || 0) + 1;
    item.contributors.forEach((value) => contributors.add(value));
  }

  return {
    items,
    total: items.length,
    memberCount: members.length,
    byLayer,
    byVerification,
    byBand,
    contributors: [...contributors].sort((a, b) => a.localeCompare(b, "he")),
    capabilities: {
      curated: capabilities.curated !== false,
      research: capabilities.research !== false,
      candidates: capabilities.candidates !== false,
      crossCore: Boolean(capabilities.crossCore),
      rawLegacy: Boolean(capabilities.rawLegacy),
    },
    missing: asArray(capabilities.missing),
    truthBoundary: "Rank/Prominence orders attention only. It does not create Truth, verification, canonicality, publication, or a new convergence identity.",
  };
}

export function filterWorldConvergenceCatalogItems(items = [], filters = {}) {
  const query = clean(filters.query).toLowerCase();
  const layer = clean(filters.layer) || "all";
  const verification = clean(filters.verification) || "all";
  const contributor = clean(filters.contributor) || "all";
  const attention = clean(filters.attention) || "all";
  const numberRaw = clean(filters.number);
  const number = numberRaw ? finite(numberRaw) : null;

  return asArray(items).filter((item) => {
    if (layer !== "all" && !item.layers.includes(layer)) return false;
    if (verification !== "all" && item.profile.verification !== verification) return false;
    if (contributor !== "all" && !item.contributors.includes(contributor)) return false;
    if (attention === "review" && !item.profile.decisionChanging) return false;
    if (attention === "verified" && item.profile.verification !== "match") return false;
    if (attention === "curated" && item.profile.humanCuration !== "approved") return false;
    if (numberRaw && (number == null || !item.values.includes(number))) return false;
    if (query && !item.searchText.includes(query)) return false;
    return true;
  });
}

async function fetchApprovedTopics() {
  const { data, error } = await supabase
    .from("topic_cards_public")
    .select(TOPIC_FIELDS)
    .order("meter_score", { ascending: false, nullsFirst: false })
    .order("approved_at", { ascending: false, nullsFirst: false })
    .range(0, 999);
  if (error) throw error;
  return asArray(data);
}

async function fetchResearchRelations() {
  const { data, error } = await supabase
    .from("research_objects")
    .select(RESEARCH_FIELDS)
    .eq("kind", "relation")
    .order("created_at", { ascending: false })
    .range(0, 1999);
  if (error) throw error;
  return asArray(data);
}

async function fetchPendingCandidates() {
  const { data, error } = await supabase.rpc("admin_convergence_candidates", { p_limit: 250 });
  if (error) throw error;
  return asArray(data?.candidates).map((row) => ({
    ...row,
    confidence: row.confidence ?? row.conf ?? null,
    status: row.status || "pending",
  }));
}

export async function fetchWorldConvergenceCatalog() {
  const settled = await Promise.allSettled([
    fetchApprovedTopics(),
    fetchResearchRelations(),
    fetchPendingCandidates(),
  ]);

  const topics = settled[0].status === "fulfilled" ? settled[0].value : [];
  const researchRelations = settled[1].status === "fulfilled" ? settled[1].value : [];
  const candidates = settled[2].status === "fulfilled" ? settled[2].value : [];
  const missing = [];
  if (settled[0].status === "rejected") missing.push("CURATED_TOPIC_ADAPTER_FAILED");
  if (settled[1].status === "rejected") missing.push("RESEARCH_RELATION_ADAPTER_FAILED");
  if (settled[2].status === "rejected") missing.push("CANDIDATE_ADAPTER_FAILED");

  // Explicit 2029 seams. Never silently query the >15s global aggregate or widen the raw
  // legacy table to the client. These become true only when a bounded governed adapter exists.
  missing.push("CROSS_CORE_GLOBAL_ADAPTER_PENDING");
  missing.push("RAW_LEGACY_INTERNAL_OFF_BY_DEFAULT");

  return buildWorldConvergenceCatalog({
    topics,
    researchRelations,
    candidates,
    capabilities: {
      curated: settled[0].status === "fulfilled",
      research: settled[1].status === "fulfilled",
      candidates: settled[2].status === "fulfilled",
      crossCore: false,
      rawLegacy: false,
      missing,
    },
  });
}

export default fetchWorldConvergenceCatalog;
