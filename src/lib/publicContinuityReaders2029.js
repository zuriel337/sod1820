// Continuations of existing public readers, not a second route/publication registry.
// Server callers inject readRows; no browser client is imported at module scope.
import { stripHtml } from "./format.js";
import { publicPageShareUrl, publicPostHref } from "./publicPostUrls.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./research/publicPostBoundary.js";
import { publicVideoSourceQuery2029 } from "./research/publicVideo2029Reading.js";
import { publicChannelToSystemItem, publicNowMediaHref } from "./research/systemFeedPublicSources2029.js";
import { redactGroupText } from "./research/worldGroupSource.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = value => String(value ?? "").trim();
const publicText = value => redactGroupText(stripHtml(clean(value)));
const canceled = signal => { if (signal?.aborted) throw new DOMException("Public continuation reading canceled", "AbortError"); };
export const OR_GEULA_CONTINUITY_PAGE_SIZE = 18;

export function publicContinuityPage2029(value) {
  if (value == null) return 1;
  if (Array.isArray(value)) return value.length === 1 ? publicContinuityPage2029(value[0]) : null;
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= 1000 ? page : null;
}

export function publicContinuityHttpStatus2029(result) {
  if (result?.status === "failed") return 503;
  return ["ready", "empty", "gated", "scoped"].includes(result?.status) ? 200 : 404;
}

// The same anonymous client used by the existing World/public video readers.
// No session client, writes, RPCs, subscriptions or auth operation is used here.
export async function readPublicContinuityRows2029(table, params, { signal } = {}) {
  canceled(signal);
  if (!["channel_updates", "research_contributions", "posts"].includes(table)) throw new Error("unsupported_public_continuation_table");
  const { getPublicResearchClient } = await import("./research/researchViewMode.js");
  canceled(signal);
  let query = getPublicResearchClient().from(table).select(params.select);
  for (const [key, value] of Object.entries(params)) {
    if (["select", "limit", "offset", "order"].includes(key)) continue;
    if (key === "or") query = query.or(String(value).slice(1, -1));
    else if (String(value).startsWith("eq.")) {
      const raw = String(value).slice(3);
      query = query.eq(key, raw === "true" ? true : raw === "false" ? false : raw);
    } else throw new Error("unsupported_public_continuation_filter");
  }
  for (const entry of String(params.order || "").split(",").filter(Boolean)) {
    const [column, direction] = entry.split(".");
    query = query.order(column, { ascending: direction !== "desc" });
  }
  const limit = Number(params.limit), offset = Number(params.offset || 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 19 || !Number.isInteger(offset) || offset < 0) throw new Error("invalid_public_continuation_window");
  query = query.range(offset, offset + limit - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  canceled(signal);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("invalid_public_continuation_response");
  return data;
}

async function read(table, params, { readRows, signal }) {
  canceled(signal);
  const rows = await readRows(table, params, { signal });
  canceled(signal);
  if (!Array.isArray(rows)) throw new Error("invalid_public_continuation_response");
  return rows;
}

export function publicOrGeulaItem2029(row, { now = Date.now() } = {}) {
  if (row?.channel !== "or-geula") return null;
  const admitted = publicChannelToSystemItem(row, { now });
  if (!admitted) return null;
  const id = clean(row.id).toLowerCase();
  return {
    id, title: publicText(row.seo_title) || admitted.label,
    text: admitted.fullText, textTruncated: admitted.fullTextTruncated,
    sourceRef: admitted.sourceRef, occurrenceRef: admitted.sourceRef,
    sourceLabel: admitted.sourceLabel, at: admitted.at,
    credit: publicText(row.credit) || null, speaker: publicText(row.speaker) || null,
    mediaHref: admitted.mediaHref,
    mediaKind: admitted.mediaHref ? /\.(?:mp4|webm|mov|m4v|avi|mkv)$/i.test(admitted.mediaHref) ? "video" : "image" : null,
    posterHref: publicNowMediaHref(row.thumb_url),
    href: `/or-geula/video/${id}`,
  };
}

export async function loadPublicOrGeulaOccurrence2029(id, { readRows = readPublicContinuityRows2029, signal, now = Date.now() } = {}) {
  canceled(signal);
  if (!UUID.test(clean(id))) return { status: "not-found", item: null };
  const occurrenceId = clean(id).toLowerCase();
  const spec = publicVideoSourceQuery2029("channel_update", occurrenceId, now);
  const rows = await read(spec.table, { ...spec.params, channel: "eq.or-geula", limit: "1" }, { readRows, signal });
  const row = rows.find(entry => clean(entry?.id).toLowerCase() === occurrenceId);
  const item = publicOrGeulaItem2029(row, { now });
  return { status: item ? "ready" : "not-found", item };
}

export async function loadPublicOrGeulaCollection2029({ page = 1, readRows = readPublicContinuityRows2029, signal, now = Date.now() } = {}) {
  canceled(signal);
  // null can be the parser's explicit invalid result; only an omitted argument
  // takes the default page. Never turn that invalid result back into page one.
  const currentPage = page === null ? null : publicContinuityPage2029(page);
  if (currentPage === null) return { status: "not-found", items: [], page: null, hasMore: false };
  const spec = publicVideoSourceQuery2029("channel_update", "", now);
  const { id: omittedId, ...params } = spec.params;
  const rows = await read(spec.table, { ...params, channel: "eq.or-geula", order: "created_at.desc,id.desc",
    offset: String((currentPage - 1) * OR_GEULA_CONTINUITY_PAGE_SIZE), limit: String(OR_GEULA_CONTINUITY_PAGE_SIZE + 1) }, { readRows, signal });
  const items = rows.slice(0, OR_GEULA_CONTINUITY_PAGE_SIZE).map(row => publicOrGeulaItem2029(row, { now })).filter(Boolean);
  return { status: items.length ? "ready" : currentPage === 1 ? "empty" : "not-found", items, page: currentPage,
    hasMore: currentPage < 1000 && rows.length > OR_GEULA_CONTINUITY_PAGE_SIZE };
}

export async function loadPublicPeopleContinuation2029({ peopleReader, signal } = {}) {
  canceled(signal);
  const reader = peopleReader || (await import("./research/worldPublicPeopleIndex.js")).fetchWorldPublicPeopleIndex;
  canceled(signal);
  const index = await reader({ signal });
  canceled(signal);
  if (!index || !Array.isArray(index.people)) throw new Error("invalid_public_people_response");
  return { status: index.people.length ? "ready" : "empty", people: index.people, total: index.total };
}

// ForumPage's existing account gate remains in force. Existence is checked only
// through anonymous approved admission; no contribution body or user ID is read.
export async function loadPublicForumContinuation2029(id = null, { readRows = readPublicContinuityRows2029, signal } = {}) {
  canceled(signal);
  if (id == null) return { status: "gated", exists: null };
  if (!UUID.test(clean(id))) return { status: "not-found", exists: false };
  const occurrenceId = clean(id).toLowerCase();
  const rows = await read("research_contributions", { select: "id,status", id: `eq.${occurrenceId}`, status: "eq.approved", limit: "1" }, { readRows, signal });
  const exists = rows.some(row => clean(row?.id).toLowerCase() === occurrenceId && row.status === "approved");
  return { status: exists ? "gated" : "not-found", exists };
}

// The comments catalogue was closed; the public comments already live under
// their admitted Post. Continue there without downloading a global archive.
export async function loadPublicCommentPostContinuation2029(wpId = null, { readRows = readPublicContinuityRows2029, signal } = {}) {
  canceled(signal);
  if (wpId == null) return { status: "scoped", post: null };
  if (!/^[1-9]\d*$/.test(clean(wpId)) || !Number.isSafeInteger(Number(wpId))) return { status: "not-found", post: null };
  const rows = await read("posts", { select: "id,wp_id,slug,title,tags,source,link", wp_id: `eq.${wpId}`,
    or: `(${publicPostOnlyFilter()})`, limit: "1" }, { readRows, signal });
  const row = rows.find(entry => Number(entry?.wp_id) === Number(wpId));
  if (!row || hasSuppressedPublicPostTag(row) || !clean(row.slug)) return { status: "not-found", post: null };
  const href = publicPostHref(row, { hash: "post-comments" });
  if (!href) return { status: "not-found", post: null };
  return { status: "ready", post: { title: stripHtml(clean(row.title)) || "קריאת הפוסט", href } };
}

export function publicOrGeulaOccurrenceHref2029(id, location = {}) {
  if (!UUID.test(clean(id))) return null;
  const params = new URLSearchParams(location.search || "");
  params.delete("v");
  const canonical = `https://sod1820.co.il/or-geula/video/${clean(id).toLowerCase()}`;
  const href = publicPageShareUrl({ ...location, pathname: new URL(canonical).pathname, search: params.toString() }, canonical);
  return href ? href.slice("https://sod1820.co.il".length) : null;
}

export function publicContinuityPlaybackTime2029(search = "", hash = "") {
  const params = new URLSearchParams(search);
  const value = params.get("t") ?? params.get("time") ?? params.get("start") ?? new URLSearchParams(String(hash).replace(/^#/, "")).get("t");
  if (value == null || value === "") return 0;
  if (/^\d+(?:\.\d+)?$/.test(value)) return Math.min(Number(value), 86400);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return match && match.slice(1).some(Boolean) ? Math.min(Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0), 86400) : 0;
}
