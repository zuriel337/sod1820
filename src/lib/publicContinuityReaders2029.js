// Continuations of existing public readers, not a second route/publication registry.
// Server callers inject readRows; no browser client is imported at module scope.
import { stripHtml } from "./format.js";
import { publicPageShareUrl, publicPostHref } from "./publicPostUrls.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./research/publicPostBoundary.js";
import { publicVideoSourceQuery2029 } from "./research/publicVideo2029Reading.js";
import { publicChannelToSystemItem, publicNowMediaHref, publicNowMediaKind } from "./research/systemFeedPublicSources2029.js";
import { redactGroupText } from "./research/worldGroupSource.js";
import historicalLecturePages from "../data/publicLegacyLecturePages2029.json" with { type: "json" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = value => String(value ?? "").trim();
const publicText = value => redactGroupText(stripHtml(clean(value)));
const canceled = signal => { if (signal?.aborted) throw new DOMException("Public continuation reading canceled", "AbortError"); };

export function publicHistoricalLecturePage2029(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.startsWith("//")) return null;
  try {
    const path = decodeURIComponent(pathname).replace(/\/+$/, "");
    const page = historicalLecturePages.find(page => page.path.replace(/\/+$/, "") === path);
    return page ? { ...page, canonicalPath: page.path.replace(/\/+$/, "") } : null;
  } catch { return null; }
}

// Presentation adapter over the preserved historical bytes. All text and video
// identities survive; a playable provider is never inferred from its URL.
export function historicalLectureHtml2029(page, sourceDocument = globalThis.document) {
  if (!page || !sourceDocument?.createElement) return "";
  const template = sourceDocument.createElement("template"); template.innerHTML = page.html;
  for (const unsafe of template.content.querySelectorAll("script,style,object,embed,form,base,link,meta")) unsafe.remove();
  for (const node of template.content.querySelectorAll("*")) for (const attr of [...node.attributes]) {
    if (/^on/i.test(attr.name) || attr.name === "srcdoc") node.removeAttribute(attr.name);
  }
  const sourceLink = (href, label) => {
    const link = sourceDocument.createElement("a"); link.href = href; link.textContent = label;
    link.target = "_blank"; link.rel = "noopener noreferrer"; link.style.overflowWrap = "anywhere";
    link.dataset.historicalVideoSource = "true"; return link;
  };
  const video = value => {
    try { const u = new URL(value); if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : ["www.youtube.com","youtube.com"].includes(u.hostname)
        ? u.pathname.startsWith("/embed/") ? u.pathname.slice(7) : u.pathname === "/watch" ? u.searchParams.get("v") : null : null;
      return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? {u,id} : null;
    } catch { return null; }
  };
  for (const frame of template.content.querySelectorAll("iframe")) {
    const item = video(frame.getAttribute("src")); if (!item) { frame.remove(); continue; }
    const width = Number(frame.getAttribute("width")), height = Number(frame.getAttribute("height"));
    const figure = sourceDocument.createElement("figure"); frame.replaceWith(figure);
    const watch = new URL("https://www.youtube.com/watch"); watch.searchParams.set("v",item.id);
    for (const [key,value] of item.u.searchParams) if (key !== "autoplay") watch.searchParams.append(key,value);
    const title = frame.getAttribute("title") || "הרצאת המקור";
    const details = sourceDocument.createElement("details"),summary = sourceDocument.createElement("summary");
    summary.textContent = `נגן: ${title}`;details.append(summary);
    frame.setAttribute("loading","lazy");frame.setAttribute("referrerpolicy","no-referrer");
    frame.setAttribute("allow","encrypted-media; picture-in-picture");
    frame.setAttribute("sandbox","allow-scripts allow-same-origin allow-presentation");
    frame.removeAttribute("width");frame.removeAttribute("height");frame.style.width="100%";
    frame.style.aspectRatio=width>0&&height>0?`${width} / ${height}`:"16 / 9";
    const embed = new URL(item.u);embed.searchParams.delete("autoplay");frame.removeAttribute("src"); frame.dataset.videoSrc=embed.href;
    details.append(frame);figure.append(details,sourceLink(watch.href,`לצפייה במקור: ${title} ↗`));
    frame.dataset.originalVideoUrl=item.u.href;details.dataset.videoSource=item.id;
  }
  for (const link of template.content.querySelectorAll("a[href]")) {
    try {
      const url = new URL(link.getAttribute("href"), "https://sod1820.co.il");
      if (url.origin === "https://sod1820.co.il") link.setAttribute("href", url.pathname + url.search + url.hash);
      else if (!/^https?:$/.test(url.protocol) || url.username || url.password) link.removeAttribute("href");
      if (link.target === "_blank") link.rel = "noopener noreferrer";
    } catch { link.removeAttribute("href"); }
  }
  // Convert plain source URLs, including HTTP youtu.be, without altering text,
  // ordering, playlist parameters or unrelated source links.
  const walker = sourceDocument.createTreeWalker(template.content,4),texts=[];
  while(walker.nextNode()) if(!walker.currentNode.parentElement?.closest("a,iframe,summary")) texts.push(walker.currentNode);
  for(const text of texts){const matches=[...text.textContent.matchAll(/https?:\/\/[^\s<>]+/g)].filter(match=>video(match[0]));if(!matches.length)continue;
    const fragment=sourceDocument.createDocumentFragment();let offset=0;
    for(const match of matches){fragment.append(text.textContent.slice(offset,match.index),sourceLink(match[0],match[0]));offset=match.index+match[0].length;}
    fragment.append(text.textContent.slice(offset));text.replaceWith(fragment);
  }
  return template.innerHTML;
}
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
    mediaKind: admitted.mediaHref ? ["video", "audio"].includes(publicNowMediaKind(admitted.mediaHref)) ? publicNowMediaKind(admitted.mediaHref) : "image" : null,
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

// User-approved continuation to the existing chat, not a claim that a Forum
// source is the same chat thread. Only the caller's already-admitted identity
// can select this destination; raw query bytes and browser anchors survive.
export function publicForumChatHref2029(search = "", hash = "") {
  return "/community/chat" + (search ? search.startsWith("?") ? search : `?${search}` : "")
    + (hash ? hash.startsWith("#") ? hash : `#${hash}` : "");
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
