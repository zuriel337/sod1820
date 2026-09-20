import { supabase } from "../supabase.js";
import { compareWorldProminenceProfiles } from "./worldContextualProminence.js";

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
  if (value == null || typeof value === "boolean") return null;
  if (typeof value === "string" && value.trim() === "") return null;
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

function verificationBucket(value) {
  const state = clean(value).toLowerCase();
  if (!state) return "not_tested";
  if (state.includes("mismatch") || state.includes("negative") || state.includes("failed")) return "mismatch";
  if (state === "match") return "match";
  if (state.includes("partial") || state.includes("mixed") || state.includes("numeric_only") || state.includes("source_only")) return "partial";
  if (state.includes("method_unknown")) return "method_unknown";
  return "not_tested";
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

function explicitCompositionRef(row) {
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : {};
  for (const value of [
    meta.convergence_ref,
    meta.convergenceRef,
    meta.composition_ref,
    meta.compositionRef,
    meta.convergence_id,
    meta.convergenceId,
  ]) {
    const ref = clean(value);
    if (ref) return `composition:${ref}`;
  }
  return null;
}

function candidateFocus(row) {
  const why = row?.why && typeof row.why === "object" ? row.why : {};
  const slug = clean(why.topic_slug);
  if (slug) return `topic:${slug}`;
  for (const value of [why.convergence_ref, why.composition_ref, row?.node_id]) {
    const ref = clean(value);
    if (ref) return `composition:${ref}`;
  }
  // A numeric subject is a filter/context facet, never universal Convergence identity.
  return `candidate:${row?.id || "unknown"}`;
}

function researchFocus(row) {
  const topic = topicRefFromResearch(row);
  if (topic) return topic;
  const composition = explicitCompositionRef(row);
  if (composition) return composition;
  const parentId = clean(row?.parent_id);
  if (parentId) return `research-dependency:${parentId}`;
  // Keep unrelated same-number claims separate unless an owner-backed composition/dependency says otherwise.
  return `research:${row?.id || clean(row?.source_ref) || "unknown"}`;
}

function normalizedClaimText(value) {
  return clean(value).replace(/\s+/g, " ");
}

function researchIdentityKey(row) {
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : {};
  const identity = meta.identity && typeof meta.identity === "object" ? meta.identity : {};
  const sourceUid = clean(meta.source_uid || meta.sourceUid || identity.source_uid || identity.sourceUid);
  const claimUid = clean(meta.claim_uid || meta.claimUid || identity.claim_uid || identity.claimUid);
  if (sourceUid && claimUid) return `source-claim:${sourceUid}:${claimUid}`;
  return `source-claim:${clean(row?.source_ref)}:${normalizedClaimText(row?.statement)}`;
}

function uniqueMembersByIdentity(members) {
  const seen = new Set();
  return members.filter((member) => {
    const key = member.identityKey || member.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function topicMember(row) {
  const values = (asArray(row?.highlight_numbers).length ? row.highlight_numbers : asArray(row?.numbers))
    .map(Number).filter(Number.isFinite);
  return {
    id: `topic:${row.id}`,
    identityKey: `topic:${row.id}`,
    memberType: "curated",
    focusKey: topicFocus(row),
    label: clean(row.title) || clean(row.slug) || "התכנסות",
    summary: clean(row.subtitle) || null,
    value: values.length === 1 ? values[0] : null,
    values,
    href: row.slug ? `/topic/${encodeURIComponent(row.slug)}` : null,
    contributor: clean(row.created_by) || null,
    verificationState: null,
    verificationClass: "not_tested",
    decisionChanging: false,
    reviewReason: null,
    provenanceRefs: row.slug ? [`topic:${row.slug}`] : [`topic_cards:${row.id}`],
    independentEvidenceGroups: null,
    declaredEvidenceGroups: null,
    independenceState: "not_asserted",
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
  const verificationClass = verificationBucket(verificationState);
  const decisionChanging = verificationClass === "mismatch"
    || ["MISMATCH", "NEGATIVE", "NOT_REPRODUCED", "FAILED", "UNRESOLVED"].some((token) => detailText.includes(token));
  const refs = [
    clean(row.source_ref),
    ...asArray(row?.meta?.source_refs).map(clean),
  ].filter(Boolean);
  const value = finite(row.value);
  return {
    id: `research:${row.id}`,
    identityKey: researchIdentityKey(row),
    memberType: "research",
    focusKey: researchFocus(row),
    label: clean(row.statement) || "Research Relation",
    summary: clean(row.evidence) || null,
    value,
    values: value == null ? [] : [value],
    href: value != null ? `/number/${value}` : null,
    contributor: clean(row.contributor) || null,
    verificationState,
    verificationClass,
    // Compatibility engine_verified is shown only as a source-native signal; it is not
    // promoted into the Verification axis when engine_detail.verification_state is absent.
    legacyEngineVerified: row.engine_verified === true ? true : row.engine_verified === false ? false : null,
    decisionChanging,
    reviewReason: decisionChanging ? (verificationState || clean(detail.status) || "negative_or_open") : null,
    provenanceRefs: [...new Set(refs)],
    independentEvidenceGroups: row?.meta?.independence_verified === true
      ? finite(row?.meta?.independent_group_count)
      : null,
    declaredEvidenceGroups: finite(row?.meta?.independent_group_count),
    independenceState: row?.meta?.independence_verified === true ? "verified" : "unknown",
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
  const value = finite(row.subject_ref);
  const refs = [
    ...asArray(row.evidence_refs).map(clean),
    ...asArray(why.evidence_ids).map(clean),
    ...asArray(why.paths).flatMap((path) => [clean(path?.research_object_id), clean(path?.source_ref)]),
  ].filter(Boolean);
  const topicSlug = clean(why.topic_slug);
  const title = clean(why.topic_title)
    || clean(why.anchor)
    || (value != null ? `התכנסות ${value}` : clean(row.subject_ref))
    || "מועמד להתכנסות";
  return {
    id: `candidate:${row.id}`,
    identityKey: `candidate:${row.id}`,
    memberType: "candidate",
    focusKey: candidateFocus(row),
    label: title,
    summary: reason || clean(why.uncertainty) || null,
    value,
    values: value == null ? [] : [value],
    href: topicSlug ? `/topic/${encodeURIComponent(topicSlug)}` : value != null ? `/number/${value}` : null,
    contributor: clean(row.created_by_agent) || null,
    verificationState: mismatches.length ? "mismatch" : null,
    verificationClass: mismatches.length ? "mismatch" : "not_tested",
    decisionChanging,
    reviewReason: reason || recommendation || null,
    provenanceRefs: [...new Set(refs)],
    independentEvidenceGroups: why.independence_verified === true
      ? finite(why.independent_group_count)
      : null,
    declaredEvidenceGroups: finite(why.independent_group_count),
    independenceState: why.independence_verified === true
      ? "verified"
      : (asArray(why.shared_sources).length || clean(why.dependency_warning) || clean(why.warning))
        ? "declared_with_caveat"
        : "unknown",
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
  const uniqueMembers = uniqueMembersByIdentity(members);
  const claimMembers = uniqueMembers.filter((row) => row.memberType !== "curated");
  const verificationStates = claimMembers.map((row) => row.verificationState).filter(Boolean);
  const verificationClasses = claimMembers.map((row) => row.verificationClass || verificationBucket(row.verificationState));
  const decisionChanging = uniqueMembers.some((row) => row.decisionChanging);
  const hasMismatch = verificationClasses.includes("mismatch");
  const allMatch = verificationClasses.length > 0 && verificationClasses.every((state) => state === "match");
  const hasAnyMatch = verificationClasses.includes("match");
  const hasOpenComponent = verificationClasses.some((state) => state !== "match");
  const verification = hasMismatch
    ? "mismatch"
    : allMatch
      ? "match"
      : hasAnyMatch && hasOpenComponent
        ? "partial"
        : verificationClasses.includes("partial")
          ? "partial"
          : verificationClasses.includes("method_unknown")
            ? "method_unknown"
            : "not_tested";
  const independentEvidenceGroups = maxFinite(uniqueMembers.map((row) => row.independentEvidenceGroups));
  const declaredEvidenceGroups = maxFinite(uniqueMembers.map((row) => row.declaredEvidenceGroups));
  const provenanceRefs = [...new Set(uniqueMembers.flatMap((row) => row.provenanceRefs || []))];
  const curated = uniqueMembers.some((row) => row.curation === "approved");
  const approvedContext = uniqueMembers.some((row) => row.curation === "approved-context");
  const verifiedMembers = uniqueMembers.filter((row) => (row.verificationClass || verificationBucket(row.verificationState)) === "match").length;
  const recommendations = [...new Set(uniqueMembers.map((row) => row.recommendation).filter(Boolean))];
  const latest = uniqueMembers.map(newestDate).filter(Boolean).sort().at(-1) || null;

  let prominenceBand = "R3 · בפיתוח";
  if (decisionChanging) prominenceBand = "R0 · דורש הכרעה";
  else if (curated && verification === "match") prominenceBand = "R1 · מאושר + מאומת";
  else if (verification === "match" && (independentEvidenceGroups || 0) >= 3) prominenceBand = "R1 · חזק מחקרית";
  else if (curated || verification === "match" || verification === "partial") prominenceBand = "R2 · מבוסס חלקית";

  return {
    prominenceBand,
    decisionChanging,
    verification,
    verifiedMembers,
    independentEvidenceGroups,
    declaredEvidenceGroups,
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

function curationRank(value) {
  if (value === "approved") return 0;
  if (value === "approved-context") return 1;
  return 2;
}

function latestMillis(value) {
  const n = value ? Date.parse(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function sharedProminenceCandidate(item) {
  const profile = item?.profile || {};
  return {
    stableKey: item?.id || item?.focusKey || "",
    familyKey: item?.focusKey || item?.id || "",
    decisionChangingNegative: Boolean(profile.decisionChanging),
    directnessRank: 0,
    verificationState: profile.verification || null,
    curation: { tier: null, role: profile.humanCuration || null },
    temporal: { occurredAt: profile.latest || null },
    signals: {},
  };
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

  // Core World ranking semantics come from the ONE existing prominence owner.
  // Catalog-specific evidence/provenance dimensions below are tie-breakers only.
  const shared = compareWorldProminenceProfiles(
    sharedProminenceCandidate(a),
    sharedProminenceCandidate(b),
    { attentionFirst: sort === "attention", timeAware: sort === "newest" },
  );
  if (shared) return shared;

  // Only independently-verified evidence-group counts may extend the shared strength ordering.
  // Member count, raw provenance count, meter/quality/confidence and popularity never inflate Research Strength.
  const ai = finite(ap.independentEvidenceGroups);
  const bi = finite(bp.independentEvidenceGroups);
  if (ai != null || bi != null) {
    if (ai == null) return 1;
    if (bi == null) return -1;
    if (ai !== bi) return bi - ai;
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
    coverage: capabilities.coverage || {},
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

const PAGE_SIZE = 500;
const MAX_ROWS_PER_LAYER = 10000;

async function fetchPagedRows(makeQuery) {
  const rows = [];
  let offset = 0;
  let truncated = false;
  while (offset < MAX_ROWS_PER_LAYER) {
    const end = Math.min(offset + PAGE_SIZE, MAX_ROWS_PER_LAYER) - 1;
    const { data, error } = await makeQuery(offset, end);
    if (error) throw error;
    const page = asArray(data);
    rows.push(...page);
    if (page.length < (end - offset + 1)) return { rows, truncated: false };
    offset = end + 1;
  }
  truncated = true;
  return { rows, truncated };
}

async function fetchApprovedTopics() {
  return fetchPagedRows((offset, end) => supabase
    .from("topic_cards_public")
    .select(TOPIC_FIELDS)
    .order("approved_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(offset, end));
}

function researchOperationallyRelevant(row) {
  if (clean(row?.kind) === "relation") return true;
  if (topicRefFromResearch(row) || explicitCompositionRef(row)) return true;
  const bucket = verificationBucket(explicitVerificationState(row));
  if (bucket === "mismatch" || bucket === "partial" || bucket === "method_unknown") return true;
  const detail = row?.engine_detail && typeof row.engine_detail === "object" ? row.engine_detail : {};
  const operational = [detail.status, detail.classification, detail.result_state, detail.outcome]
    .map(clean).join(" ").toUpperCase();
  if (["NEGATIVE", "NOT_REPRODUCED", "FAILED", "UNRESOLVED", "MISSING_ADAPTER"].some((token) => operational.includes(token))) return true;
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : {};
  return Boolean(clean(meta.media_lineage_state) || clean(meta.next_action));
}

async function fetchResearchMembers() {
  const result = await fetchPagedRows((offset, end) => supabase
    .from("research_objects")
    .select(RESEARCH_FIELDS)
    .in("kind", ["relation", "observation", "hypothesis"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, end));
  return { ...result, rows: result.rows.filter(researchOperationallyRelevant) };
}

const CANDIDATE_LIMIT = 5000;

async function fetchPendingCandidates() {
  const { data, error } = await supabase.rpc("admin_convergence_candidates", { p_limit: CANDIDATE_LIMIT });
  if (error) throw error;
  const rows = asArray(data?.candidates).map((row) => ({
    ...row,
    // Do not invent candidate_type/subject_type/status omitted by the legacy governed RPC.
    confidence: row.confidence ?? row.conf ?? null,
  }));
  return {
    rows,
    truncated: rows.length >= CANDIDATE_LIMIT,
    adapter: "admin_convergence_candidates",
    adapterLimit: CANDIDATE_LIMIT,
  };
}

export async function fetchWorldConvergenceCatalog() {
  const settled = await Promise.allSettled([
    fetchApprovedTopics(),
    fetchResearchMembers(),
    fetchPendingCandidates(),
  ]);

  const topicResult = settled[0].status === "fulfilled" ? settled[0].value : { rows: [], truncated: true };
  const researchResult = settled[1].status === "fulfilled" ? settled[1].value : { rows: [], truncated: true };
  const candidateResult = settled[2].status === "fulfilled" ? settled[2].value : { rows: [], truncated: true };
  const missing = [];
  if (settled[0].status === "rejected") missing.push("CURATED_TOPIC_ADAPTER_FAILED");
  if (settled[1].status === "rejected") missing.push("RESEARCH_MEMBER_ADAPTER_FAILED");
  if (settled[2].status === "rejected") missing.push("CANDIDATE_ADAPTER_FAILED");

  // Explicit 2029 seams. Never silently query the >15s global aggregate or widen the raw
  // legacy table to the client. These become true only when a bounded governed adapter exists.
  missing.push("CROSS_CORE_GLOBAL_ADAPTER_PENDING");
  missing.push("RAW_LEGACY_INTERNAL_OFF_BY_DEFAULT");

  return buildWorldConvergenceCatalog({
    topics: topicResult.rows,
    researchRelations: researchResult.rows,
    candidates: candidateResult.rows,
    capabilities: {
      curated: settled[0].status === "fulfilled",
      research: settled[1].status === "fulfilled",
      candidates: settled[2].status === "fulfilled",
      crossCore: false,
      rawLegacy: false,
      missing,
      coverage: {
        curatedTruncated: Boolean(topicResult.truncated),
        researchTruncated: Boolean(researchResult.truncated),
        candidatesTruncated: Boolean(candidateResult.truncated),
        candidateAdapterLimit: candidateResult.adapterLimit || CANDIDATE_LIMIT,
      },
    },
  });
}

export default fetchWorldConvergenceCatalog;
