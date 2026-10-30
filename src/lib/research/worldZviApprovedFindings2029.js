import { channelUpdateOccurrenceId, contributorSourceLocator } from "./worldContributorSourceLocator.js";
import { worldPreviewMaterialExclusion } from "./worldPreviewMaterialScope.js";
import { ZVI_REVIEWED_FINDINGS } from "./zviReviewedFindings2029.js";
import { universalFindingId } from "./universalFinding.js";

// This reader is bounded to the existing public contributor view. The source
// contributor is provenance, not a claim that the source owner authored a row.
export const ZVI_SOURCE_CONTRIBUTOR_ID = "c66f0464-0928-490e-be9b-66d8a87e7fc8";
export const ZVI_APPROVED_PAGE_SIZE = 25;
export const ZVI_REVIEWED_PAGE_SIZE = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/;
const text = (value) => value == null ? "" : String(value).replace(/\s+/g, " ").trim();
const mentionsOwner = (value) => text(value).normalize("NFKD").replace(/[\u0591-\u05c7\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "").includes("צוריאל");
// Public research should not become a contact directory. Do not alter the
// stored record; keep it out of this public list pending review.
const hasContactDetails = (value) => {
  const valueText = text(value);
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(valueText)
    || /(?:^|[^\d])(?:\+972[\s().\-\u2010-\u2015]*|0)(?:5\d|[23489])(?:[\s().\-\u2010-\u2015]*\d){7}(?!\d)/.test(valueText)
    || /(?:^|[^\d])\+[1-9]\d{0,2}(?:[\s().\-\u2010-\u2015]*\d){7,14}(?!\d)/.test(valueText);
};
const RESEARCH_ROLES = Object.freeze(["research_statement", "research_analysis", "extraction_observation"]);
const KIND_LABELS = Object.freeze({
  question: "שאלת מחקר", hypothesis: "השערה", observation: "תצפית",
  relation: "קשר לבדיקה", fact: "טענת מחקר", equality: "חישוב",
});
const ROLE_LABELS = Object.freeze({
  research_analysis: "ניתוח מחקרי",
  extraction_observation: "חילוץ מחקרי · לבדיקה מול המקור",
  source_material: "חומר מקור · לבדיקה",
});
const researchRole = (row) => text(row?.meta?.ext?.presentation?.statement_role);
const isExactCanonicalMatch = (row) => text(row?.status).toLowerCase() === "canonical"
  && Boolean(text(row?.promoted_node_id)) && row?.engine_verified === true
  && text(row?.engine_detail?.verification_state).toLowerCase() === "match";
const acceptedResearch = (row) => RESEARCH_ROLES.includes(researchRole(row)) || isExactCanonicalMatch(row);

function personalOnly(meta) {
  const scope = meta?.ext?.personal_scope ?? meta?.personal_scope;
  return text(typeof scope === "object" ? scope?.scope : scope).toLowerCase() === "person_only";
}

function project(row, { reviewed = false } = {}) {
  if (!UUID.test(text(row?.id)) || text(row?.source_contributor_id) !== ZVI_SOURCE_CONTRIBUTOR_ID
    || text(row?.privacy_scope).toLowerCase() !== "public"
    || !["approved", "canonical"].includes(text(row?.status).toLowerCase()) || personalOnly(row?.meta)
    || (!reviewed && !acceptedResearch(row))
    || mentionsOwner(row?.statement) || mentionsOwner(row?.contributor)
    || hasContactDetails(row?.statement) || hasContactDetails(row?.contributor)) return null;
  const source = contributorSourceLocator(row.source_ref, { slug: "tzvi-opoc" });
  const sourceId = channelUpdateOccurrenceId(row.source_ref);
  const ocrFlags = [row?.meta?.ext?.wa_channel_intake?.ocr_used, row?.meta?.ext?.presentation?.ocr_used,
    row?.meta?.ext?.ocr_used, row?.meta?.ocr_used];
  const statement = text(row.statement);
  const chars = Array.from(statement);
  return Object.freeze({
    id: text(row.id),
    sourceRef: sourceId && source.exact ? `channel_updates:${sourceId}` : null,
    findingRef: universalFindingId({
      kind: "research-object",
      sourceIdentity: { researchObjectId: text(row.id) },
      subjectKey: text(row.id),
    }),
    href: `/world?${new URLSearchParams({ finding: text(row.id) })}`,
    publicationState: text(row.status).toLowerCase(),
    // This DTO does not carry enough scoped truth evidence to certify a state.
    verificationState: null,
    title: chars.slice(0, 240).join("") || "ממצא ציבורי מאושר",
    summaryTruncated: chars.length > 240,
    contributor: text(row.contributor) || null,
    kindLabel: KIND_LABELS[text(row.kind).toLowerCase()] || "ממצא מחקר",
    roleLabel: ROLE_LABELS[researchRole(row)] || null,
    status: text(row.status).toLowerCase(),
    createdAt: TIMESTAMP.test(text(row.created_at)) ? text(row.created_at) : null,
    ocrNeedsReview: /ocr/i.test(text(row.statement))
      || ocrFlags.some((flag) => flag === true || text(flag).toLowerCase() === "true"),
    findingHref: `/world?${new URLSearchParams({ finding: text(row.id) })}`,
    sourceHref: source.exact ? source.href : null,
  });
}

async function livePublicSourceIds(client, rows) {
  const ids = [...new Set(rows.map((row) => channelUpdateOccurrenceId(row?.source_ref)).filter(Boolean))];
  if (!ids.length) return new Set();
  const result = await client.from("channel_updates").select("id,status,channel").in("id", ids).eq("status", "live");
  if (result.error || !Array.isArray(result.data)) throw result.error || new Error("public_sources_unavailable");
  return new Set(result.data.filter((source) => text(source?.status) === "live"
    && !worldPreviewMaterialExclusion(source, "source_message")).map((source) => text(source?.id)));
}

async function reviewedFingerprint(row, subtle) {
  if (!subtle || typeof subtle.digest !== "function" || typeof TextEncoder === "undefined") {
    throw new Error("review_digest_unavailable");
  }
  const source = JSON.stringify([row.id, row.kind, row.statement, row.contributor, row.source_ref]);
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

/**
 * Independently reviewed exact findings. The manifest is metadata only; each
 * record is fetched anonymously and pinned to its precise source and text.
 * The injected manifest/subtle options exist to verify this boundary in tests.
 */
export async function fetchZviReviewedFindingsPage({
  client, cursor = null, pageSize = ZVI_REVIEWED_PAGE_SIZE,
  manifest = ZVI_REVIEWED_FINDINGS, subtle = globalThis.crypto?.subtle,
} = {}) {
  const index = cursor == null ? 0 : cursor.index;
  if (!client || !Array.isArray(manifest) || !Number.isSafeInteger(index) || index < 0 || index > manifest.length
    || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > ZVI_REVIEWED_PAGE_SIZE) {
    throw new Error("invalid_reviewed_findings_page");
  }
  if (!subtle || typeof subtle.digest !== "function" || typeof TextEncoder === "undefined") throw new Error("review_digest_unavailable");
  const entries = manifest.slice(index, index + pageSize);
  const ids = entries.map((entry) => text(entry?.id));
  if (entries.some((entry) => !UUID.test(text(entry?.id)) || !/^[a-f0-9]{64}$/.test(text(entry?.fingerprint)))
    || new Set(ids).size !== ids.length) throw new Error("invalid_review_manifest");
  if (!entries.length) return Object.freeze({ rows: [], nextCursor: null, hasMore: false, omittedUnavailable: false, omittedForReview: false });
  const result = await client.from("world_contributor_research_v1")
    .select("id,created_at,kind,statement,contributor,source,source_ref,source_contributor_id,status,privacy_scope,meta,engine_verified,engine_detail,promoted_node_id")
    .in("id", ids).eq("source_contributor_id", ZVI_SOURCE_CONTRIBUTOR_ID)
    .eq("privacy_scope", "public").in("status", ["approved", "canonical"]);
  if (result.error || !Array.isArray(result.data)) throw result.error || new Error("reviewed_findings_unavailable");
  const byId = new Map(result.data.map((row) => [text(row?.id), row]));
  const foundCount = entries.filter((entry) => byId.has(entry.id)).length;
  const checked = (await Promise.all(entries.map(async (entry) => {
    const row = byId.get(entry.id);
    if (!row || (await reviewedFingerprint(row, subtle)) !== entry.fingerprint) return null;
    return !worldPreviewMaterialExclusion(row, "research_object") && project(row, { reviewed: true }) ? row : null;
  }))).filter(Boolean);
  const liveIds = await livePublicSourceIds(client, checked);
  const available = checked.filter((row) => liveIds.has(channelUpdateOccurrenceId(row.source_ref)));
  const nextIndex = index + entries.length;
  const hasMore = nextIndex < manifest.length;
  return Object.freeze({
    rows: available.map((row) => project(row, { reviewed: true })).filter(Boolean),
    nextCursor: hasMore ? { index: nextIndex } : null,
    hasMore,
    omittedUnavailable: foundCount < entries.length || available.length < checked.length,
    omittedForReview: checked.length < foundCount,
  });
}

/** One page, requested by the visitor; no writes, model calls or graph changes. */
export async function fetchZviApprovedFindingsPage({ client, cursor = null, pageSize = ZVI_APPROVED_PAGE_SIZE } = {}) {
  if (!client || (cursor && (!UUID.test(text(cursor.id)) || !TIMESTAMP.test(text(cursor.createdAt))))
      || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new Error("invalid_public_findings_page");
  let query = client.from("world_contributor_research_v1")
    .select("id,created_at,kind,statement,contributor,source,source_ref,source_contributor_id,status,privacy_scope,meta,engine_verified,engine_detail,promoted_node_id")
    .eq("source_contributor_id", ZVI_SOURCE_CONTRIBUTOR_ID)
    .eq("privacy_scope", "public").in("status", ["approved", "canonical"])
    .or("meta->ext->presentation->>statement_role.in.(research_statement,research_analysis,extraction_observation),and(status.eq.canonical,promoted_node_id.not.is.null,engine_verified.eq.true,engine_detail->>verification_state.eq.match)")
    .not("statement", "ilike", "%צוריאל%")
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (cursor) query = query.or(`created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`);
  const { data, error } = await query.limit(pageSize + 1);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("public_findings_unavailable");
  const page = data.slice(0, pageSize);
  // An approved research object is not sufficient to make its source public.
  // Confirm the exact source through the anonymous client before exposing text.
  const vetted = page.filter((row) => project(row) && !worldPreviewMaterialExclusion(row, "research_object"));
  const liveIds = await livePublicSourceIds(client, vetted);
  const eligible = vetted.filter((row) => liveIds.has(channelUpdateOccurrenceId(row?.source_ref)));
  const visible = eligible.map(project).filter(Boolean);
  const last = page.at(-1);
  const nextCursor = data.length > pageSize ? { id: text(last?.id), createdAt: text(last?.created_at) } : null;
  if (nextCursor && (!UUID.test(nextCursor.id) || !TIMESTAMP.test(nextCursor.createdAt))) throw new Error("public_findings_cursor_unavailable");
  return Object.freeze({
    rows: visible,
    hasMore: data.length > pageSize,
    nextCursor,
    omittedUnavailable: eligible.length < vetted.length,
    omittedForReview: vetted.length < page.length,
  });
}

// Shared, bounded reader for exact structured value or exact source occurrence.
// Results still pass the same public, identity, review and live-source guards.
async function fetchZviExactFindingsPage({ client, cursor, pageSize, manifest, subtle, filter }) {
  const reviewedById = new Map(manifest.map((entry) => [text(entry?.id), text(entry?.fingerprint)]));
  let query = client.from("world_contributor_research_v1")
    .select("id,created_at,kind,statement,contributor,source,source_ref,source_contributor_id,status,privacy_scope,meta,engine_verified,engine_detail,promoted_node_id,value")
    .eq("source_contributor_id", ZVI_SOURCE_CONTRIBUTOR_ID)
    .eq("privacy_scope", "public").in("status", ["approved", "canonical"])
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (filter.type === "number") query = query.eq("value", filter.value);
  else query = query.or(`source_ref.eq.${filter.sourceRef},source_ref.like.${filter.sourceRef}#%`);
  if (cursor) query = query.or(`created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`);
  const { data, error } = await query.limit(pageSize + 1);
  if (error || !Array.isArray(data)) throw error || new Error("zvi_exact_findings_unavailable");
  const page = data.slice(0, pageSize);
  const checks = await Promise.all(page.map(async (row) => {
    if (filter.type === "number" && (
      // Do not coerce missing, blank or boolean values to zero.
      row?.value == null || !["number", "string"].includes(typeof row.value)
      || (typeof row.value === "string" && !row.value.trim())
      || !Number.isSafeInteger(Number(row.value)) || Number(row.value) !== filter.value
    )) return null;
    const rowSourceRef = text(row?.source_ref);
    if (filter.type === "source" && rowSourceRef !== filter.sourceRef
      && !rowSourceRef.startsWith(`${filter.sourceRef}#`)) return null;
    if (worldPreviewMaterialExclusion(row, "research_object") || !project(row, { reviewed: true })) return null;
    if (acceptedResearch(row)) return row;
    const fingerprint = reviewedById.get(text(row.id));
    if (!/^[a-f0-9]{64}$/.test(fingerprint || "")) return null;
    return await reviewedFingerprint(row, subtle) === fingerprint ? row : null;
  }));
  const vetted = checks.filter(Boolean);
  const liveIds = await livePublicSourceIds(client, vetted);
  const eligible = vetted.filter((row) => liveIds.has(channelUpdateOccurrenceId(row?.source_ref)));
  const last = page.at(-1);
  const nextCursor = data.length > pageSize ? { id: text(last?.id), createdAt: text(last?.created_at) } : null;
  if (nextCursor && (!UUID.test(nextCursor.id) || !TIMESTAMP.test(nextCursor.createdAt))) {
    throw new Error("zvi_exact_findings_cursor_unavailable");
  }
  return Object.freeze({
    rows: eligible.map((row) => filter.type === "number"
      ? Object.freeze({ ...project(row, { reviewed: true }), claimedNumber: filter.value })
      : project(row, { reviewed: true })),
    hasMore: data.length > pageSize,
    nextCursor,
    omittedUnavailable: eligible.length < vetted.length,
    omittedForReview: vetted.length < page.length,
  });
}

/**
 * Lookup by a structured value; it is a claim, not a verified calculation or
 * graph relation. An unclassified record requires its reviewed fingerprint.
 */
export async function fetchZviNumberFindingsPage({
  client, value, cursor = null, pageSize = ZVI_APPROVED_PAGE_SIZE,
  manifest = ZVI_REVIEWED_FINDINGS, subtle = globalThis.crypto?.subtle,
} = {}) {
  if (!client || !Number.isSafeInteger(value) || !Array.isArray(manifest)
    || (cursor && (!UUID.test(text(cursor.id)) || !TIMESTAMP.test(text(cursor.createdAt))))
    || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new Error("invalid_zvi_number_findings_page");
  }
  return fetchZviExactFindingsPage({ client, cursor, pageSize, manifest, subtle, filter: { type: "number", value } });
}

/**
 * Lookup of one exact public channel occurrence, including anchored claims
 * under that same source_ref. Text, another source prefix and arbitrary
 * caller-provided PostgREST fragments are never used to select a source.
 */
export async function fetchZviSourceFindingsPage({
  client, sourceRef, cursor = null, pageSize = ZVI_APPROVED_PAGE_SIZE,
  manifest = ZVI_REVIEWED_FINDINGS, subtle = globalThis.crypto?.subtle,
} = {}) {
  const sourceId = typeof sourceRef === "string" ? channelUpdateOccurrenceId(sourceRef) : null;
  if (!client || !sourceId || sourceRef !== `channel_updates:${sourceId}` || !Array.isArray(manifest)
    || (cursor && (!UUID.test(text(cursor.id)) || !TIMESTAMP.test(text(cursor.createdAt))))
    || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new Error("invalid_zvi_source_findings_page");
  }
  return fetchZviExactFindingsPage({ client, cursor, pageSize, manifest, subtle, filter: { type: "source", sourceRef } });
}
