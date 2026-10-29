import { channelUpdateOccurrenceId, contributorSourceLocator } from "./worldContributorSourceLocator.js";
import { worldPreviewMaterialExclusion } from "./worldPreviewMaterialScope.js";

// This reader is bounded to the existing public contributor view. The source
// contributor is provenance, not a claim that the source owner authored a row.
export const ZVI_SOURCE_CONTRIBUTOR_ID = "c66f0464-0928-490e-be9b-66d8a87e7fc8";
export const ZVI_APPROVED_PAGE_SIZE = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/;
const text = (value) => value == null ? "" : String(value).replace(/\s+/g, " ").trim();
const mentionsOwner = (value) => text(value).normalize("NFKD").replace(/[\u0591-\u05c7\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "").includes("צוריאל");

function personalOnly(meta) {
  const scope = meta?.ext?.personal_scope ?? meta?.personal_scope;
  return text(typeof scope === "object" ? scope?.scope : scope).toLowerCase() === "person_only";
}

function project(row) {
  if (!UUID.test(text(row?.id)) || text(row?.source_contributor_id) !== ZVI_SOURCE_CONTRIBUTOR_ID
    || text(row?.privacy_scope).toLowerCase() !== "public"
    || !["approved", "canonical"].includes(text(row?.status).toLowerCase()) || personalOnly(row?.meta)
    || row?.meta?.ext?.presentation?.statement_role !== "research_statement"
    || mentionsOwner(row?.statement) || mentionsOwner(row?.contributor)) return null;
  const source = contributorSourceLocator(row.source_ref, { slug: "tzvi-opoc" });
  const ocrFlag = row?.meta?.ext?.wa_channel_intake?.ocr_used ?? row?.meta?.ext?.presentation?.ocr_used
    ?? row?.meta?.ext?.ocr_used ?? row?.meta?.ocr_used;
  return Object.freeze({
    id: text(row.id),
    title: text(row.statement).slice(0, 240) || "ממצא ציבורי מאושר",
    contributor: text(row.contributor) || null,
    ocrNeedsReview: /^ocr\b/i.test(text(row.statement)) || ocrFlag === true || text(ocrFlag).toLowerCase() === "true",
    findingHref: `/world?${new URLSearchParams({ finding: text(row.id) })}`,
    sourceHref: source.exact ? source.href : null,
  });
}

/** One page, requested by the visitor; no writes, model calls or graph changes. */
export async function fetchZviApprovedFindingsPage({ client, cursor = null, pageSize = ZVI_APPROVED_PAGE_SIZE } = {}) {
  if (!client || (cursor && (!UUID.test(text(cursor.id)) || !TIMESTAMP.test(text(cursor.createdAt))))
      || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new Error("invalid_public_findings_page");
  let query = client.from("world_contributor_research_v1")
    .select("id,created_at,statement,contributor,source,source_ref,source_contributor_id,status,privacy_scope,meta")
    .eq("source_contributor_id", ZVI_SOURCE_CONTRIBUTOR_ID)
    .eq("privacy_scope", "public").in("status", ["approved", "canonical"])
    .eq("meta->ext->presentation->>statement_role", "research_statement")
    .not("statement", "ilike", "%צוריאל%")
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (cursor) query = query.or(`created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`);
  const { data, error } = await query.limit(pageSize + 1);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("public_findings_unavailable");
  const page = data.slice(0, pageSize);
  // An approved research object is not sufficient to make its source public.
  // Confirm the exact source through the anonymous client before exposing text.
  const sourceIds = [...new Set(page.map((row) => channelUpdateOccurrenceId(row?.source_ref)).filter(Boolean))];
  let liveIds = new Set();
  if (sourceIds.length) {
    const sourceResult = await client.from("channel_updates").select("id,status,channel")
      .in("id", sourceIds).eq("status", "live");
    if (sourceResult.error || !Array.isArray(sourceResult.data)) throw sourceResult.error || new Error("public_sources_unavailable");
    liveIds = new Set(sourceResult.data.filter((source) => text(source?.status) === "live"
      && !worldPreviewMaterialExclusion(source, "source_message")).map((source) => text(source?.id)));
  }
  const eligible = page.filter((row) => liveIds.has(channelUpdateOccurrenceId(row?.source_ref))
    && !worldPreviewMaterialExclusion(row, "research_object"));
  const last = page.at(-1);
  const nextCursor = data.length > pageSize ? { id: text(last?.id), createdAt: text(last?.created_at) } : null;
  if (nextCursor && (!UUID.test(nextCursor.id) || !TIMESTAMP.test(nextCursor.createdAt))) throw new Error("public_findings_cursor_unavailable");
  return Object.freeze({
    rows: eligible.map(project).filter(Boolean),
    hasMore: data.length > pageSize,
    nextCursor,
    omittedUnavailable: eligible.length < page.length,
  });
}
