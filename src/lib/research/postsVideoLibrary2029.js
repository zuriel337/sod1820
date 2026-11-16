// The REAL media classification for posts (PLAN37 §32.2 — ZURIEL, 18.10.2026): "posts that contain video" and "all videos", read from the media itself, never from the
// legacy "וידאו" category or a manual tag. It consumes the EXISTING public read views `video_media_placements_v1` / `video_media_assets_v1` (one asset identity, its
// appearances) — no new store, no new vocabulary, no copy of any video. Every post that surfaces here is RE-ADMITTED through the same public post boundary the posts list
// uses (`publicPostOnlyFilter` + the suppressed-tag check), so nothing private is exposed through an option, a count or a card.
//
// Scope, stated to the reader: this library holds the videos that appear in PUBLIC POSTS (playable kinds: self-hosted, YouTube, Vimeo). Videos that live only in a channel
// (e.g. Or HaGeula) or on the home page are reached through their own existing public readers; they are not listed here until they pass the same public gate.
import { getPublicResearchClient } from "./researchViewMode.js";
import { publicPostOnlyFilter, hasSuppressedPublicPostTag } from "./publicPostBoundary.js";

export const VIDEO_PAGE_SIZE = 24;
export const PLAYABLE_KINDS = Object.freeze(["selfhost", "youtube", "vimeo"]);
const POST_COLUMNS = "id,wp_id,source,link,slug,title,excerpt,author,categories,tags,image_url,thumb_url,date,modified";
const PLACEMENT_COLUMNS = "source_id,asset_key,video_kind,updated_at";
const PAGE_ROWS = 1000;
const TTL_MS = 5 * 60 * 1000;
const canceled = (signal) => { if (signal?.aborted) throw new DOMException("Video library reading canceled", "AbortError"); };

// ?media=video  → "posts that contain video" (default view) ; &view=videos → "all videos". Anything else is not a media view (the posts list ignores it).
export function postsMediaScope2029(search = "") {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const media = params.getAll("media");
  if (media.length !== 1 || media[0] !== "video") return { active: false, view: null };
  const view = params.get("view");
  return { active: true, view: view === "videos" ? "videos" : "posts" };
}
export const postsMediaHref = (view = "posts") => (view === "videos" ? "/2029/posts?media=video&view=videos" : "/2029/posts?media=video");

const numericId = (value) => /^\d{1,12}$/.test(String(value)) ? String(value) : null;

// unique post ids that have a PLAYABLE video, newest placement first (pure)
export function orderPostsWithVideo(rows = []) {
  const latest = new Map();
  for (const row of rows) {
    const id = numericId(row?.source_id);
    if (!id || !PLAYABLE_KINDS.includes(row?.video_kind)) continue;
    const at = Date.parse(row.updated_at || "") || 0;
    if (!latest.has(id) || at > latest.get(id)) latest.set(id, at);
  }
  return [...latest.entries()].sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0])).map(([id]) => id);
}

// one card per ASSET (the same video in several posts is shown once, with its appearances), newest first (pure). Input: placement rows (asset_key, source_id, video_kind, updated_at).
export function groupVideoAssets(rows = []) {
  const byKey = new Map();
  for (const row of rows) {
    const id = numericId(row?.source_id);
    if (!row?.asset_key || !id || !PLAYABLE_KINDS.includes(row.video_kind)) continue;
    const entry = byKey.get(row.asset_key) || { assetKey: row.asset_key, kind: row.video_kind, postIds: new Set(), seenAt: 0 };
    entry.postIds.add(id);
    entry.seenAt = Math.max(entry.seenAt, Date.parse(row.updated_at || "") || 0);
    byKey.set(row.asset_key, entry);
  }
  return [...byKey.values()].map((e) => ({ ...e, postIds: [...e.postIds] })).sort((a, b) => b.seenAt - a.seenAt || a.assetKey.localeCompare(b.assetKey));
}

let placementCache = { at: 0, rows: null, client: null };
async function readAllPostPlacements({ client, signal }) {
  const rows = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    canceled(signal);
    let query = client.from("video_media_placements_v1").select(PLACEMENT_COLUMNS).eq("source_type", "post").in("video_kind", [...PLAYABLE_KINDS])   // only playable kinds: one request instead of three
      .order("updated_at", { ascending: false, nullsFirst: false }).order("source_id", { ascending: true }).range(from, from + PAGE_ROWS - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    canceled(signal);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("לא ניתן לאמת את רשימת הווידאו.");
    rows.push(...data);
    if (data.length < PAGE_ROWS || from > 20 * PAGE_ROWS) break;
  }
  return rows;
}
export const resetPostsVideoLibraryCache2029 = () => { placementCache = { at: 0, rows: null, client: null }; };

// The public gate applied to the WHOLE candidate set, before any count, page or asset card is derived from it: one light read (id + tags, chunked) per cache fill,
// never one read per card. A placement whose post is not public now (draft, forum tag, unpublished since the placements were cached) is dropped here, so the total,
// the number of pages and the fill of every page come from the same admitted set that the cards come from.
const ADMISSION_CHUNK = 150;
async function admitPostIds({ ids, client, signal }) {
  const admitted = new Set();
  for (let from = 0; from < ids.length; from += ADMISSION_CHUNK) {
    const chunk = ids.slice(from, from + ADMISSION_CHUNK);
    canceled(signal);
    let query = client.from("posts").select("id,tags").or(publicPostOnlyFilter()).in("id", chunk);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    canceled(signal);
    if (error) throw error;
    // fail closed, as the page read does: the server filter already excludes suppressed tags, so a returned row that carries one (or that was not asked for) means the boundary did not hold
    if (!Array.isArray(data) || data.some((row) => hasSuppressedPublicPostTag(row) || !chunk.includes(numericId(row?.id)))) throw new Error("לא ניתן לאמת את שיוך התוכן.");
    for (const row of data) admitted.add(numericId(row.id));
  }
  return admitted;
}
async function admittedPlacementRows({ client, signal, now }) {
  if (!placementCache.rows || placementCache.client !== client || now - placementCache.at > TTL_MS) {
    const rows = await readAllPostPlacements({ client, signal });
    const candidates = [...new Set(rows.map((row) => numericId(row?.source_id)).filter(Boolean))];
    const admitted = await admitPostIds({ ids: candidates, client, signal });
    placementCache = { at: now, client, rows: rows.filter((row) => admitted.has(numericId(row?.source_id))) };
  }
  return placementCache.rows;
}

// re-admit posts by id through the public post boundary (the same filter the posts list uses)
async function readPublicPosts({ ids, client, signal }) {
  if (!ids.length) return [];
  canceled(signal);
  let query = client.from("posts").select(POST_COLUMNS).or(publicPostOnlyFilter()).in("id", ids);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  canceled(signal);
  if (error) throw error;
  if (!Array.isArray(data) || data.some((row) => hasSuppressedPublicPostTag(row) || !ids.includes(String(row.id)))) throw new Error("לא ניתן לאמת את שיוך התוכן.");
  return data;
}

// "Posts that contain video": exact count of distinct PUBLIC posts with a playable video (admitted before counting), 24 per page, each page re-read as public posts.
export async function fetchPostsWithVideoPage2029({ page = 1, client = getPublicResearchClient(), signal, now = Date.now() } = {}) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("עמוד לא תקין.");
  if (!client) throw new Error("בחירת התוכן אינה זמינה.");
  const ids = orderPostsWithVideo(await admittedPlacementRows({ client, signal, now }));
  const pageIds = ids.slice((page - 1) * VIDEO_PAGE_SIZE, page * VIDEO_PAGE_SIZE);
  const rows = await readPublicPosts({ ids: pageIds, client, signal });
  const byId = new Map(rows.map((row) => [String(row.id), row]));
  return { posts: pageIds.map((id) => byId.get(id)).filter(Boolean), total: ids.length };
}

// "All videos" (from public posts): one card per asset, with its appearances; every appearance re-admitted as a public post. It is derived from the SAME single read of the
// placements view (cheap); the heavy assets view is asked only for the identity pages of the 24 assets on screen, afterwards, and a failure there never blocks the list.
export async function fetchVideoLibraryPage2029({ page = 1, client = getPublicResearchClient(), signal, now = Date.now() } = {}) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("עמוד לא תקין.");
  if (!client) throw new Error("בחירת התוכן אינה זמינה.");
  const assets = groupVideoAssets(await admittedPlacementRows({ client, signal, now }));   // only appearances in public posts: the count and the pages never include a withdrawn post
  const pageAssets = assets.slice((page - 1) * VIDEO_PAGE_SIZE, page * VIDEO_PAGE_SIZE);
  const ids = [...new Set(pageAssets.flatMap((a) => a.postIds))];
  const posts = await readPublicPosts({ ids, client, signal });
  const byId = new Map(posts.map((p) => [String(p.id), p]));
  const items = pageAssets.map((asset) => ({ ...asset, appearances: asset.postIds.map((id) => byId.get(id)).filter(Boolean) })).filter((asset) => asset.appearances.length);
  return { items: items.map((item) => ({ ...item, publicId: null })), total: assets.length };   // the identity pages arrive separately (fetchVideoPublicIds2029) so the list never waits for them
}

// the identity page (/video/<public_id>) of the assets on screen: asked AFTER the list is shown and best effort — the library stays complete without it
export async function fetchVideoPublicIds2029({ keys = [], client = getPublicResearchClient(), signal } = {}) {
  const out = new Map();
  if (!keys.length) return out;
  try {
    canceled(signal);
    let query = client.from("video_media_assets_v1").select("public_id,asset_key").in("asset_key", keys);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return out;
    for (const row of data) if (row?.asset_key && /^[0-9a-f]{32}$/i.test(row.public_id || "")) out.set(row.asset_key, row.public_id);
  } catch (error) { if (error?.name === "AbortError") throw error; }
  return out;
}
