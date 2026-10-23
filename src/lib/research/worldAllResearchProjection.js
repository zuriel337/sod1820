import { supabase } from "../supabase.js";
import {
  classifyWorldVerificationStrength,
  normalizeWorldNumber,
  resolveExplicitVerificationState,
} from "./worldContextualProminence.js";
import { resolveResearchObjectPresentation, humanizeResearchSource } from "./researchObjectPresentation.js";
import { isGeneralResearchProjectionEligible } from "./researchObjectFinding.js";
import { clusterWorldResearchRows } from "./worldFindingClusters.js";
import { scopeWorldPreviewMaterial } from "./worldPreviewMaterialScope.js";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE_SIZE = 500;
const MAX_ROWS_PER_SOURCE = 20000;
const PUBLIC_RESEARCH_STATUSES = Object.freeze(["approved", "canonical"]);

const finite = normalizeWorldNumber;

function hasHebrew(value) {
  return /[א-ת]/.test(clean(value));
}

function isUrl(value) {
  return /^https?:\/\//i.test(clean(value));
}

function verifiedWebUrl(value) {
  const text = clean(value);
  if (!isUrl(text)) return null;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function publicFindingHref(sourceId) {
  const id = encodeURIComponent(clean(sourceId));
  return id ? `/world?finding=${id}#finding-${id}` : "/world";
}

function humanContributor(value) {
  const text = clean(value);
  if (!text) return null;
  if (/[א-ת]/.test(text)) return text;
  if (/^ZURIEL$/i.test(text)) return "צוריאל";
  if (/^(?:GPT|CLAUDE)$/i.test(text)) return "מערכת המחקר";
  return "תווית ייחוס לא פתורה";
}

function sourceMessageTitle(row) {
  const text = clean(row?.text);
  const contributor = humanContributor(row?.credit || row?.speaker);
  if (text && hasHebrew(text)) return text;
  if (isUrl(text)) return contributor ? `קישור מקור שהתקבל מ${contributor}` : "הודעת מקור עם קישור";
  if (text) return contributor ? `הודעת מקור שהתקבלה מ${contributor}` : "הודעת מקור";
  return row?.image_url ? "הודעת מקור עם מדיה" : "הודעת מקור ללא טקסט";
}

function sourceMessageSummary(row) {
  const text = clean(row?.text);
  if (!text || hasHebrew(text)) return null;
  if (isUrl(text)) return "הקישור המקורי נשמר כמקום המקור; זהות מחבר התוכן אינה מוסקת מעצם שם השולח.";
  return "הטקסט המקורי נשמר במקור. שכבת התצוגה בעברית אינה משנה את תוכן המקור או את מעמדו.";
}

function safeContributionTitle(row) {
  const raw = clean(row?.title || row?.body);
  if (raw && hasHebrew(raw)) return raw;
  const value = finite(row?.gematria_claim?.value);
  return value != null ? `תרומת מחקר סביב ${value}` : "תרומת מחקר";
}

// Structured (never text-scanned) per-scope verification carrier: known source metadata
// keeps its own scoped state, e.g. meta.ext.batch_001b.notarikon_verification_state or
// meta.ext.<batch>.source_claim_46_exact_phrase, alongside a top-level engine_detail
// state. This walks meta.ext by KEY NAME only (never row.statement/free text) and never
// discards a raw scoped field — every one is returned for the caller to carry through.
function collectScopedVerificationStates(row) {
  const ext = row?.meta?.ext;
  const out = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === "object") {
        visit(value);
        continue;
      }
      if (/verification_state$/i.test(key) || /_exact_phrase$/i.test(key)) {
        const state = clean(value).toLowerCase();
        if (state) out.push({ key, state });
      }
    }
  };
  visit(ext);
  return out;
}

// Truth Axes v3: only engine_detail.verification_state is verification authority.
// research_objects.engine_verified is a compatibility/derived signal and must never be
// promoted to "match" on its own — absent an explicit state it stays a legacy signal.
// A top-level explicit "match" never overrides a known per-scope mismatch: the exact raw
// scope fields are preserved (see scopeVerificationStates below) and the composed state
// exposes partial/needs-review instead of certifying a full match.
function verificationState(row) {
  const explicit = resolveExplicitVerificationState(row);
  const scoped = collectScopedVerificationStates(row);
  const scopedMismatch = scoped.some((entry) => entry.state === "mismatch");
  if (explicit === "match" && scopedMismatch) return "partial_needs_review";
  if (explicit) return explicit;
  if (scopedMismatch) return "mismatch";
  return row?.engine_verified === true ? "legacy_signal" : "not_tested";
}

function countBy(rows, key) {
  const out = {};
  for (const row of rows) {
    const value = clean(row?.[key]) || "לא צוין";
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

function countByMany(rows, key, fallbackKey) {
  const out = {};
  for (const row of rows) {
    const values = Array.isArray(row?.[key]) && row[key].length
      ? row[key]
      : [row?.[fallbackKey]];
    for (const value of new Set(values.map((item) => clean(item) || "לא צוין"))) {
      out[value] = (out[value] || 0) + 1;
    }
  }
  return out;
}

function normalizeTreeMatches(row) {
  const matches = row?.meta?.ext?.wa_channel_intake?.tree_matches;
  if (!Array.isArray(matches)) return [];
  const seen = new Set();
  const out = [];
  for (const match of matches) {
    if (!match || typeof match !== "object" || Array.isArray(match)) continue;
    const type = clean(match.type).toLowerCase();
    const key = clean(match.key);
    if (!type || !key) continue;
    const identity = `${type}:${key}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push({
      type,
      key,
      label: clean(match.label) || null,
      match: clean(match.match) || null,
    });
  }
  return out;
}

function topicRating(row) {
  if (!row?.id) return null;
  const slug = clean(row.slug);
  const numbers = (Array.isArray(row.numbers) ? row.numbers : [])
    .map(Number).filter(Number.isFinite);
  const highlightNumbers = (Array.isArray(row.highlight_numbers) ? row.highlight_numbers : [])
    .map(Number).filter(Number.isFinite);
  return {
    topicId: String(row.id),
    nodeId: clean(row.node_id) || null,
    slug: slug || null,
    title: clean(row.title) || slug || "נושא",
    status: clean(row.status) || "לא צוין",
    quality: finite(row.quality),
    meterScore: finite(row.meter_score),
    numbers,
    highlightNumbers,
    href: slug ? `/topic/${encodeURIComponent(slug)}` : null,
  };
}

function topicRatingIndex(topicRows = []) {
  const byKey = new Map();
  for (const row of Array.isArray(topicRows) ? topicRows : []) {
    const rating = topicRating(row);
    if (!rating) continue;
    for (const key of [
      rating.slug ? `topic:${rating.slug}` : null,
      `topic_id:${rating.topicId}`,
      rating.nodeId ? `node:${rating.nodeId}` : null,
    ].filter(Boolean)) {
      if (!byKey.has(key)) byKey.set(key, rating);
    }
  }
  return byKey;
}

function compareNullableDesc(left, right) {
  const a = finite(left);
  const b = finite(right);
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

function compareTopicRatings(left, right) {
  return compareNullableDesc(left?.meterScore, right?.meterScore)
    || compareNullableDesc(left?.quality, right?.quality)
    || clean(left?.slug || left?.topicId).localeCompare(clean(right?.slug || right?.topicId));
}

function attachLinkedTopicRatings(rows, topicRows) {
  const index = topicRatingIndex(topicRows);
  return rows.map((row) => {
    if (row.family !== "research_object") return row;
    const ratings = [];
    const seen = new Set();
    const add = (rating) => {
      if (!rating || seen.has(rating.topicId)) return;
      seen.add(rating.topicId);
      ratings.push(rating);
    };
    for (const match of row.treeMatches || []) {
      if (match.type === "topic") add(index.get(`topic:${match.key}`) || index.get(`topic_id:${match.key}`));
      if (match.type === "entity" || match.type === "number") add(index.get(`node:${match.key}`));
    }
    if (row.promotedNodeId) add(index.get(`node:${row.promotedNodeId}`));
    ratings.sort(compareTopicRatings);
    return {
      ...row,
      linkedTopicRatings: ratings,
      linkedTopicRating: ratings[0] || null,
    };
  });
}

function researchStrengthPresentation(row) {
  const verification = clean(row?.verification).toLowerCase() || "not_tested";
  const explicitMatch = verification === "match";
  const treeMatched = Array.isArray(row?.treeMatches) && row.treeMatches.length > 0;
  const rating = row?.linkedTopicRating || null;
  const reasons = [];
  if (explicitMatch) reasons.push("אימות מנוע מפורש תואם");
  else reasons.push("אין עדיין אימות מנוע מפורש תואם");
  if (treeMatched) reasons.push(`${row.treeMatches.length} יעדים קיימים בעץ`);
  else reasons.push("עדיין אין חיבור מתועד ליעד קיים בעץ");
  if (rating?.meterScore != null) reasons.push(`מד ההתכנסות של היעד: ${rating.meterScore}`);
  else reasons.push("ליעד אין עדיין מד התכנסות זמין");
  return {
    explicitMatch,
    treeMatched,
    hasLinkedMeter: rating?.meterScore != null,
    label: explicitMatch && treeMatched
      ? "מאומת · מחובר לעץ"
      : explicitMatch
        ? "מאומת · טרם חובר לעץ"
        : treeMatched
          ? "מחובר לעץ · דורש אימות"
          : "דורש סקירה",
    reasons,
  };
}

/**
 * Review ordering only. It keeps the existing truth axes separate: explicit verification
 * first, then an exact stored tree match, then the linked Topic's existing meter/quality.
 * It never writes a score, changes access/status, or treats the Topic meter as proof.
 */
export function compareWorldResearchStrength(left, right) {
  const verification = classifyWorldVerificationStrength(left?.verification)
    - classifyWorldVerificationStrength(right?.verification);
  if (verification) return verification;
  const tree = (left?.treeMatches?.length ? 0 : 1) - (right?.treeMatches?.length ? 0 : 1);
  if (tree) return tree;
  const meter = compareNullableDesc(left?.linkedTopicRating?.meterScore, right?.linkedTopicRating?.meterScore);
  if (meter) return meter;
  const quality = compareNullableDesc(left?.linkedTopicRating?.quality, right?.linkedTopicRating?.quality);
  if (quality) return quality;
  return clean(left?.id).localeCompare(clean(right?.id));
}

export function orderWorldAllResearchRows(rows = []) {
  const familyRank = { research_object: 0, topic: 1, contribution: 2, source_message: 3 };
  return [...(Array.isArray(rows) ? rows : [])].sort((left, right) => {
    const family = (familyRank[left?.family] ?? 9) - (familyRank[right?.family] ?? 9);
    if (family) return family;
    if (left?.family === "research_object") return compareWorldResearchStrength(left, right);
    if (left?.family === "topic") {
      return compareNullableDesc(left?.meterScore, right?.meterScore)
        || compareNullableDesc(left?.quality, right?.quality)
        || clean(left?.id).localeCompare(clean(right?.id));
    }
    return clean(right?.createdAt).localeCompare(clean(left?.createdAt))
      || clean(left?.id).localeCompare(clean(right?.id));
  });
}

async function fetchAllRows(table, fields, refine = (query) => query) {
  const rows = [];
  let total = null;
  let offset = 0;

  while (offset < MAX_ROWS_PER_SOURCE) {
    const end = Math.min(offset + PAGE_SIZE - 1, MAX_ROWS_PER_SOURCE - 1);
    let query = supabase
      .from(table)
      .select(fields, offset === 0 ? { count: "exact" } : undefined)
      .order("created_at", { ascending: false })
      .range(offset, end);
    query = refine(query);
    const { data, error, count } = await query;
    if (error) throw error;
    if (offset === 0 && count != null) total = Number(count);
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const knownTotal = Number.isFinite(total) ? total : rows.length;
  return { rows, total: knownTotal, truncated: knownTotal > rows.length };
}

export function normalizeWorldAllResearchRow(row, family = "research_object") {
  if (!row?.id) return null;

  if (family === "source_message") {
    const sourceRef = "channel_updates:" + row.id;
    const rawText = clean(row.text) || null;
    return {
      id: "source:" + row.id,
      sourceId: String(row.id),
      family,
      createdAt: row.created_at || null,
      kind: "source_message",
      statement: sourceMessageTitle(row),
      secondary: sourceMessageSummary(row),
      originalStatement: rawText,
      terms: [],
      value: null,
      values: [],
      relates: [],
      source: clean(row.channel || row.source) || "channel_updates",
      sourceLabel: "הודעות מקור",
      sourceRef,
      sourceRefs: [sourceRef],
      contributor: clean(row.credit || row.speaker) || null,
      attributionLabel: clean(row.credit || row.speaker)
        ? `תווית שולח במקור: ${humanContributor(row.credit || row.speaker)} · זהות מחבר התוכן לא הוכרעה`
        : "זהות השולח לא צוינה",
      status: clean(row.status) || "לא צוין",
      access: null,
      verification: "not_applicable",
      engineVerified: false,
      mediaUrl: clean(row.image_url) || null,
      mediaClass: row.image_url ? "image" : null,
      spatialCluster: null,
      sourceHref: verifiedWebUrl(row.link_url) || verifiedWebUrl(rawText),
      href: verifiedWebUrl(row.link_url) || verifiedWebUrl(rawText),
      presentation: {
        typeLabel: "הודעת מקור",
        sourceLabel: "הודעות מקור",
        contextLine: ["הודעת מקור", clean(row.channel), row.created_at ? new Date(row.created_at).toLocaleDateString("he-IL") : null].filter(Boolean).join(" · "),
      },
    };
  }

  if (family === "contribution") {
    const claimValue = finite(row?.gematria_claim?.value);
    const statement = safeContributionTitle(row);
    const rawContribution = clean(row.title || row.body) || null;
    const secondary = rawContribution && hasHebrew(rawContribution) ? (row.title ? clean(row.body) : null) : null;
    const mediaUrl = clean(row.image_url) || (
      Array.isArray(row.media) ? clean(row.media[0]?.url || row.media[0]) : clean(row?.media?.url)
    );
    return {
      id: "contribution:" + row.id,
      sourceId: String(row.id),
      family,
      createdAt: row.created_at || null,
      kind: clean(row.intent) || "contribution",
      statement,
      secondary,
      terms: [],
      value: claimValue,
      values: claimValue == null ? [] : [claimValue],
      relates: [clean(row.target_id), clean(row.convergence_slug)].filter(Boolean),
      source: clean(row.origin) || "research_contributions",
      sourceLabel: "תרומת מחקר",
      sourceRef: "research_contributions:" + row.id,
      sourceRefs: ["research_contributions:" + row.id],
      contributor: clean(row.author_name) || null,
      status: clean(row.status || row.research_state) || "לא צוין",
      access: null,
      verification: "not_tested",
      engineVerified: false,
      mediaUrl: mediaUrl || null,
      mediaClass: mediaUrl ? "media" : null,
      spatialCluster: null,
      href: row.convergence_slug ? "/topic/" + encodeURIComponent(row.convergence_slug) : null,
    };
  }

  if (family === "topic") {
    const values = (Array.isArray(row.highlight_numbers) && row.highlight_numbers.length
      ? row.highlight_numbers
      : Array.isArray(row.numbers) ? row.numbers : [])
      .map(Number).filter(Number.isFinite);
    return {
      id: "topic:" + row.id,
      sourceId: String(row.id),
      family,
      createdAt: row.created_at || null,
      kind: "topic",
      statement: clean(row.title) || "נושא",
      secondary: clean(row.subtitle) || null,
      terms: Array.isArray(row.search_terms) ? row.search_terms.map(String) : [],
      value: values.length === 1 ? values[0] : null,
      values,
      relates: [],
      source: "topic_cards",
      sourceLabel: "נושא",
      sourceRef: "topic_cards:" + row.id,
      sourceRefs: ["topic_cards:" + row.id],
      contributor: clean(row.created_by) || null,
      status: clean(row.status) || "לא צוין",
      approvedAt: row.approved_at || null,
      meterScore: finite(row.meter_score),
      quality: finite(row.quality),
      access: null,
      verification: "not_applicable",
      engineVerified: false,
      mediaUrl: null,
      mediaClass: Array.isArray(row.image_ids) && row.image_ids.length ? "linked_media" : null,
      spatialCluster: null,
      href: row.slug ? "/topic/" + encodeURIComponent(row.slug) : null,
    };
  }

  const value = finite(row.value);
  const metaSourceRefs = Array.isArray(row?.meta?.source_refs) ? row.meta.source_refs.map(String) : [];
  const sourceRef = clean(row.source_ref) || ("research_objects:" + row.id);
  const presentation = resolveResearchObjectPresentation(row, { locale: "he" });
  const operationalState = clean(
    row?.engine_detail?.status
    || row?.engine_detail?.classification
    || row?.engine_detail?.result_state
    || row?.engine_detail?.outcome
  ) || null;
  const treeMatches = normalizeTreeMatches(row);
  return {
    id: "research:" + row.id,
    sourceId: String(row.id),
    family: "research_object",
    createdAt: row.created_at || null,
    kind: clean(row.kind) || "observation",
    statement: presentation.title || "ממצא מחקר",
    secondary: presentation.summary || null,
    originalStatement: clean(row.statement) || null,
    presentation,
    typeLabel: presentation.typeLabel,
    contextLine: presentation.contextLine,
    attributionLabel: presentation.attributionLabel,
    terms: Array.isArray(row.terms) ? row.terms.map(String) : [],
    value,
    values: value == null ? [] : [value],
    relates: Array.isArray(row.relates) ? row.relates.map(String) : [],
    source: clean(row.source) || null,
    sourceLabel: presentation.sourceLabel || humanizeResearchSource(row.source, sourceRef),
    sourceRef,
    sourceRefs: [...new Set([sourceRef, ...metaSourceRefs].filter(Boolean))],
    contributor: clean(row.contributor) || null,
    sourceContributorId: clean(row.source_contributor_id) || null,
    confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : null,
    status: clean(row.status) || "לא צוין",
    access: clean(row.privacy_scope) || "לא צוין",
    promotedNodeId: clean(row.promoted_node_id) || null,
    parentId: clean(row.parent_id) || null,
    batchKey: clean(row?.meta?.batch_key) || null,
    operationalState,
    engineVerified: row.engine_verified === true,
    verification: verificationState(row),
    // Raw per-scope states, preserved verbatim for inspection — never collapsed away by
    // the composed `verification` field above.
    engineVerificationStateRaw: resolveExplicitVerificationState(row),
    scopeVerificationStates: collectScopedVerificationStates(row),
    mediaUrl: clean(row?.meta?.ext?.wa_channel_intake?.media_ref) || null,
    mediaClass: clean(row?.meta?.ext?.source_media_profile?.class) || null,
    spatialCluster: clean(row?.meta?.ext?.spatial_research?.cluster) || null,
    treeMatches,
    treeMatchState: clean(row?.meta?.ext?.wa_channel_intake?.tree_match_state) || null,
    sourceHref: [sourceRef, ...metaSourceRefs, row.source].map(verifiedWebUrl).find(Boolean) || null,
    canonicalFindingHref: publicFindingHref(row.id),
    href: value != null ? "/2029/number/" + value : null,
  };
}

export function buildWorldAllResearchProjection(familyRows = {}, totals = {}) {
  const scoped = scopeWorldPreviewMaterial(familyRows);
  const researchRows = scoped.researchObjects;
  const generalResearchRows = researchRows.filter(isGeneralResearchProjectionEligible);
  const excludedPersonOnlyResearch = researchRows.length - generalResearchRows.length;
  const normalizedResearchRows = generalResearchRows
    .map((row) => normalizeWorldAllResearchRow(row, "research_object"))
    .filter(Boolean);
  const ratedResearchOccurrences = attachLinkedTopicRatings(normalizedResearchRows, scoped.topics);
  const duplicateProjection = clusterWorldResearchRows(normalizedResearchRows);
  const ratedResearchRows = attachLinkedTopicRatings(duplicateProjection.rows, scoped.topics)
    .map((row) => ({ ...row, researchStrength: researchStrengthPresentation(row) }));
  const rows = [
    ...ratedResearchRows,
    ...scoped.contributions.map((row) => normalizeWorldAllResearchRow(row, "contribution")),
    ...scoped.sourceMessages.map((row) => normalizeWorldAllResearchRow(row, "source_message")),
    ...scoped.topics.map((row) => normalizeWorldAllResearchRow(row, "topic")),
  ].filter(Boolean);
  const orderedRows = orderWorldAllResearchRows(rows);

  const rawLoaded = normalizedResearchRows.length
    + scoped.contributions.length
    + scoped.sourceMessages.length
    + scoped.topics.length;

  const sourceTotals = {
    research_object: Number(totals.researchObjects ?? scoped.researchObjects.length),
    contribution: Number(totals.contributions ?? scoped.contributions.length),
    source_message: Number(totals.sourceMessages ?? scoped.sourceMessages.length),
    topic: Number(totals.topics ?? scoped.topics.length),
  };

  return {
    rows: orderedRows,
    total: Object.values(sourceTotals).reduce((sum, value) => sum + value, 0),
    convergenceCandidates: scoped.convergenceCandidates,
    convergenceCandidateError: clean(totals.convergenceCandidateError) || null,
    convergenceCandidateMeta: totals.convergenceCandidateMeta || {},
    loaded: orderedRows.length,
    rawLoaded,
    truncated: Boolean(totals.truncated),
    sourceTotals,
    duplicateProjection: {
      mode: duplicateProjection.mode,
      nonDestructive: duplicateProjection.nonDestructive,
      groups: duplicateProjection.duplicateGroups,
      occurrencesCombined: duplicateProjection.duplicateOccurrences,
      rawResearchRows: duplicateProjection.rawCount,
      clusteredResearchRows: duplicateProjection.clusteredCount,
      canonicalSelection: "longest_original_statement",
    },
    byFamily: countBy(orderedRows, "family"),
    byKind: countBy(orderedRows, "kind"),
    byAccess: countBy(orderedRows.filter((row) => row.family === "research_object"), "access"),
    byStatus: countBy(orderedRows, "status"),
    byVerification: countBy(orderedRows, "verification"),
    byContributor: countByMany(orderedRows, "contributors", "contributor"),
    treeMatchedResearch: ratedResearchRows.filter((row) => row.treeMatches?.length).length,
    meteredResearch: ratedResearchRows.filter((row) => row.linkedTopicRating?.meterScore != null).length,
    treeMatchedResearchOccurrences: ratedResearchOccurrences.filter((row) => row.treeMatches?.length).length,
    meteredResearchOccurrences: ratedResearchOccurrences.filter((row) => row.linkedTopicRating?.meterScore != null).length,
    excludedMaterial: scoped.excluded,
    excludedPersonOnlyResearch,
    truthBoundary: "ההקרנה אינה משנה גישה, ממשל, אימות, קנוניות או פרסום. הקורא הציבורי מעביר רק חומר ציבורי במצב מאושר או קנוני; קורא הביקורת המנהלי נשאר מאחורי אימות והרשאות קיימים. כפילויות ודאיות מאוגדות בתצוגה בלבד; כל רשומת מקור נשמרת וניתנת למעקב. מחקר שסומן במפורש person_only נשאר בעדשת האדם ואינו נכנס לעץ הכללי.",
  };
}

export function filterWorldAllResearchRows(rows = [], filters = {}) {
  const query = clean(filters.query).toLowerCase();
  const family = clean(filters.family) || "all";
  const kind = clean(filters.kind) || "all";
  const access = clean(filters.access) || "all";
  const status = clean(filters.status) || "all";
  const verification = clean(filters.verification) || "all";
  const contributor = clean(filters.contributor) || "all";
  const contributorId = clean(filters.contributorId) || "all";
  const contributorAliases = new Set((Array.isArray(filters.contributorAliases) ? filters.contributorAliases : [])
    .map(clean).filter(Boolean));
  const tree = clean(filters.tree) || "all";
  const meter = clean(filters.meter) || "all";

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (family !== "all" && row.family !== family) return false;
    if (kind !== "all" && row.kind !== kind) return false;
    if (access !== "all" && row.access !== access) return false;
    if (status !== "all" && row.status !== status) return false;
    if (verification !== "all" && row.verification !== verification) return false;
    if (tree === "matched" && !(row.family === "research_object" && row.treeMatches?.length)) return false;
    if (tree === "unmatched" && !(row.family === "research_object" && !row.treeMatches?.length)) return false;
    if (meter === "metered" && !(row.family === "research_object" && row.linkedTopicRating?.meterScore != null)) return false;
    if (meter === "unmetered" && !(row.family === "research_object" && row.linkedTopicRating?.meterScore == null)) return false;
    const contributors = Array.isArray(row.contributors) && row.contributors.length
      ? row.contributors
      : [row.contributor || "לא צוין"];
    if (contributor !== "all" && !contributors.includes(contributor)) return false;
    if (contributorId !== "all") {
      const contributorIds = Array.isArray(row.sourceContributorIds) && row.sourceContributorIds.length
        ? row.sourceContributorIds
        : [row.sourceContributorId].filter(Boolean);
      const exactIdentity = contributorIds.includes(contributorId);
      const registeredAlias = contributors.some((value) => contributorAliases.has(clean(value)));
      if (!exactIdentity && !registeredAlias) return false;
    }
    if (!query) return true;
    const haystack = [
      row.family,
      row.statement,
      row.secondary,
      row.originalStatement,
      row.contextLine,
      row.attributionLabel,
      row.sourceLabel,
      row.contributor,
      row.source,
      row.sourceRef,
      ...(row.sourceRefs || []),
      ...(row.sourceLabels || []),
      ...(row.sources || []),
      ...(row.contributors || []),
      row.value,
      ...(row.values || []),
      row.kind,
      row.status,
      row.access,
      row.mediaClass,
      row.spatialCluster,
      row.linkedTopicRating?.title,
      row.linkedTopicRating?.slug,
      row.linkedTopicRating?.meterScore,
      ...(row.treeMatches || []).flatMap((match) => [match.type, match.key, match.label]),
      ...(row.terms || []),
      ...(row.relates || []),
    ].filter((value) => value != null).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function publicOccurrenceDto(occurrence = {}) {
  const {
    sourceContributorId: _sourceContributorId,
    ...publicOccurrence
  } = occurrence;
  return publicOccurrence;
}

function isWorldPublicProjectionRow(row) {
  const status = clean(row?.status).toLowerCase();
  if (row?.family === "research_object") {
    return clean(row?.access).toLowerCase() === "public"
      && PUBLIC_RESEARCH_STATUSES.includes(status);
  }
  if (row?.family === "contribution" || row?.family === "topic") return status === "approved";
  if (row?.family === "source_message") return status === "live";
  return false;
}

/**
 * Public DTO boundary for the existing World projection. The database query is
 * already narrowed before transport; this final serializer prevents internal
 * ranking, review and search carriers from becoming part of the public contract.
 */
export function worldPublicResearchDto(projection = {}) {
  const {
    convergenceCandidates: _convergenceCandidates,
    convergenceCandidateError: _convergenceCandidateError,
    convergenceCandidateMeta: _convergenceCandidateMeta,
    excludedMaterial: _excludedMaterial,
    excludedPersonOnlyResearch: _excludedPersonOnlyResearch,
    ...publicProjection
  } = projection || {};

  const rows = (Array.isArray(projection?.rows) ? projection.rows : [])
    .filter(isWorldPublicProjectionRow)
    .map((row) => {
      const {
        terms: _terms,
        triage: _triage,
        rank: _rank,
        strength: _strength,
        recommendation: _recommendation,
        evidenceReason: _evidenceReason,
        proposedTreeTarget: _proposedTreeTarget,
        recommendedKeepId: _recommendedKeepId,
        duplicateIds: _duplicateIds,
        researchStrength: _researchStrength,
        engineVerificationStateRaw: _engineVerificationStateRaw,
        scopeVerificationStates: _scopeVerificationStates,
        sourceContributorId: _sourceContributorId,
        sourceContributorIds: _sourceContributorIds,
        promotedNodeId: _promotedNodeId,
        parentId: _parentId,
        treeMatchState: _treeMatchState,
        batchKey: _batchKey,
        operationalState: _operationalState,
        duplicateClusterKey: _duplicateClusterKey,
        ...publicRow
      } = row || {};
      return {
        ...publicRow,
        sourceHref: verifiedWebUrl(publicRow.sourceHref),
        ...(publicRow.family === "research_object"
          ? { canonicalFindingHref: publicFindingHref(publicRow.sourceId) }
          : {}),
        ...(Array.isArray(publicRow.occurrences)
          ? { occurrences: publicRow.occurrences.map(publicOccurrenceDto) }
          : {}),
      };
    });
  const sourceTotals = {
    research_object: rows.filter((row) => row.family === "research_object")
      .reduce((sum, row) => sum + Math.max(1, finite(row.occurrenceCount) || 1), 0),
    contribution: rows.filter((row) => row.family === "contribution").length,
    source_message: rows.filter((row) => row.family === "source_message").length,
    topic: rows.filter((row) => row.family === "topic").length,
  };
  const researchRows = rows.filter((row) => row.family === "research_object");
  const duplicateGroups = researchRows.filter((row) => (finite(row.occurrenceCount) || 1) > 1).length;
  const duplicateOccurrences = researchRows.reduce(
    (sum, row) => sum + Math.max(0, (finite(row.occurrenceCount) || 1) - 1),
    0,
  );

  return {
    ...publicProjection,
    rows,
    total: Object.values(sourceTotals).reduce((sum, value) => sum + value, 0),
    loaded: rows.length,
    rawLoaded: Object.values(sourceTotals).reduce((sum, value) => sum + value, 0),
    sourceTotals,
    duplicateProjection: {
      mode: "exact-safe-projection",
      nonDestructive: true,
      groups: duplicateGroups,
      occurrencesCombined: duplicateOccurrences,
      rawResearchRows: sourceTotals.research_object,
      clusteredResearchRows: researchRows.length,
      canonicalSelection: "longest_original_statement",
    },
    byFamily: countBy(rows, "family"),
    byKind: countBy(rows, "kind"),
    byAccess: countBy(researchRows, "access"),
    byStatus: countBy(rows, "status"),
    byVerification: countBy(rows, "verification"),
    byContributor: countByMany(rows, "contributors", "contributor"),
    treeMatchedResearch: researchRows.filter((row) => row.treeMatches?.length).length,
    meteredResearch: researchRows.filter((row) => row.linkedTopicRating?.meterScore != null).length,
    treeMatchedResearchOccurrences: researchRows.reduce(
      (sum, row) => sum + (row.treeMatches?.length ? Math.max(1, finite(row.occurrenceCount) || 1) : 0),
      0,
    ),
    meteredResearchOccurrences: researchRows.reduce(
      (sum, row) => sum + (row.linkedTopicRating?.meterScore != null ? Math.max(1, finite(row.occurrenceCount) || 1) : 0),
      0,
    ),
  };
}

export async function fetchWorldAllResearchProjection() {
  const excludedChannelRows = await fetchAllRows(
    "channel_updates",
    "id,created_at",
    (query) => query.eq("channel", "or-geula").eq("status", "live"),
  );
  const excludedChannelSourceRefs = excludedChannelRows.rows.map((row) => `channel_updates:${row.id}`);

  const [research, contributions, sources, topics] = await Promise.all([
    fetchAllRows(
      "research_objects",
      "id,created_at,kind,statement,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,meta",
      (query) => query.eq("privacy_scope", "public").in("status", PUBLIC_RESEARCH_STATUSES),
    ),
    fetchAllRows(
      "research_contributions",
      "id,created_at,author_name,intent,origin,research_state,status,target_type,target_id,title,body,gematria_claim,image_url,media,convergence_slug",
      (query) => query.eq("status", "approved").or("origin.is.null,origin.neq.openweb"),
    ),
    fetchAllRows(
      "channel_updates",
      "id,created_at,text,image_url,source,status,credit,channel,link_url,speaker",
      (query) => query.eq("status", "live").or("channel.is.null,channel.neq.or-geula"),
    ),
    fetchAllRows(
      "topic_cards",
      "id,created_at,approved_at,slug,title,subtitle,image_ids,numbers,highlight_numbers,status,quality,meter_score,created_by,node_id",
      (query) => query.eq("status", "approved"),
    ),
  ]);
  const scopedResearch = scopeWorldPreviewMaterial({
    researchObjects: research.rows,
    excludedChannelSourceRefs,
  });

  return worldPublicResearchDto(buildWorldAllResearchProjection(
    {
      researchObjects: research.rows,
      contributions: contributions.rows,
      sourceMessages: sources.rows,
      topics: topics.rows,
      excludedChannelSourceRefs,
    },
    {
      researchObjects: Math.max(
        0,
        research.total - scopedResearch.excluded.old_chat - scopedResearch.excluded.or_geula,
      ),
      contributions: contributions.total,
      sourceMessages: sources.total,
      topics: topics.total,
      truncated: research.truncated || contributions.truncated || sources.truncated || topics.truncated,
    }
  ));
}

/**
 * Bounded owner review reader for the World findings queue. Unlike the broader archive view,
 * it fetches only research findings and their exact Topic targets, so opening the review queue
 * does not also transfer every source message and contribution to the browser. Current-session
 * RLS remains the access authority; this helper does not widen visibility.
 */
export async function fetchWorldFindingReviewProjection() {
  const [excludedChannelRows, research, topics] = await Promise.all([
    fetchAllRows(
      "channel_updates",
      "id,created_at",
      (query) => query.eq("channel", "or-geula"),
    ),
    fetchAllRows(
      "research_objects",
      "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,privacy_scope,promoted_node_id,parent_id,meta",
    ),
    fetchAllRows(
      "topic_cards",
      "id,created_at,approved_at,slug,title,subtitle,search_terms,image_ids,numbers,highlight_numbers,status,quality,meter_score,created_by,node_id",
    ),
  ]);
  const excludedChannelSourceRefs = excludedChannelRows.rows.map((row) => `channel_updates:${row.id}`);
  const scopedResearch = scopeWorldPreviewMaterial({
    researchObjects: research.rows,
    excludedChannelSourceRefs,
  });

  return buildWorldAllResearchProjection(
    {
      researchObjects: research.rows,
      contributions: [],
      sourceMessages: [],
      topics: topics.rows,
      convergenceCandidates: [],
      excludedChannelSourceRefs,
    },
    {
      researchObjects: Math.max(
        0,
        research.total - scopedResearch.excluded.old_chat - scopedResearch.excluded.or_geula,
      ),
      contributions: 0,
      sourceMessages: 0,
      topics: topics.total,
      truncated: research.truncated || topics.truncated,
    },
  );
}
