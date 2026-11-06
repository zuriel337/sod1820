import { getPublicResearchClient } from "./researchViewMode.js";
import { publicPostOnlyFilter, hasSuppressedPublicPostTag } from "./publicPostBoundary.js";
import { CONTENT_SERIES_2029, contentSeriesKeysForPost, hasExactMembership } from "./contentSeries2029Identity.js";
import { canonicalPostCategories } from "../postCategoryIdentity.js";
import { stripHtml } from "../format.js";

// Doc37 HOME-01: existing editorial classification, never recency alone.
// A named external writer or a series remains secondary even when categorized
// as event documentation. Missing attribution is preserved, never invented.
export function isHomeDocumentationPost(row) {
  const categories = canonicalPostCategories(row?.categories);
  return row?.home_hidden !== true && !hasSuppressedPublicPostTag(row)
    && categories.some(value => value === "תיעוד אירועים" || value === "רמזים חזקים")
    && !CONTENT_SERIES_2029.some(spec => hasExactMembership(row, spec))
    && ["", "המערכת"].includes(String(row?.author || "").trim());
}

export function projectHomeDocumentationPosts(rows, limit = 4) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter(row => {
    if (!row.slug || !isHomeDocumentationPost(row) || seen.has(String(row.id))) return false;
    seen.add(String(row.id)); return true;
  }).sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
    .slice(0, limit).map(row => ({
      id: row.id, slug: row.slug, source: row.source, link: row.link, wp_id: row.wp_id,
      title: stripHtml(row.title || ""), poster: row.thumb_url || row.image_url || null,
      modified: row.modified || row.date || null, publishedAt: row.date || null,
      sourcePost: row,
    }));
}

export async function getHomeLaunchPostCards({ client = getPublicResearchClient(), limit = 4, signal } = {}) {
  if (!client) throw new Error("public_posts_unavailable");
  const seriesCategories = [...new Set(CONTENT_SERIES_2029.flatMap(spec => spec.membership.filter(member => member.field === "categories").map(member => member.value)))];
  const seriesTags = [...new Set(CONTENT_SERIES_2029.flatMap(spec => spec.membership.filter(member => member.field === "tags").map(member => member.value)))];
  let query = client.from("posts")
    .select("id,slug,title,image_url,thumb_url,date,modified,tags,categories,author,source,link,wp_id,home_hidden")
    .or(publicPostOnlyFilter()).eq("home_hidden", false)
    .overlaps("categories", ["תיעוד אירועים", "רמזים חזקים", "רמזי הגאולה"])
    .or('author.is.null,author.eq."",author.eq."המערכת"')
    .not("categories", "ov", `{${seriesCategories.map(value => `"${value}"`).join(",")}}`)
    .or(`tags.is.null,tags.not.ov.{${seriesTags.map(value => `"${value}"`).join(",")}}`)
    .not("slug", "is", null).order("date", { ascending: false, nullsFirst: false }).limit(Math.max(1, Math.min(4, Number(limit) || 4)));
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return projectHomeDocumentationPosts(data, Math.max(1, Math.min(4, Number(limit) || 4)));
}

// "מחקרים ותוכן נוסף" (series & Home plan, stage 2): public Posts that are in NO series and NOT in the documentation pool above.
// It is the exact complement of the two other Home Post sources, computed with their own predicates, so a Post can never
// appear in two of them. Presentation only: it assigns nothing to a series, category, tag or family, and it neither reads
// nor changes the reality stream, event documentation or the "עכשיו" pool.
export const HOME_STANDALONE_WINDOW_DAYS = 120;
export const HOME_STANDALONE_LIMIT = 4;
const HOME_STANDALONE_READ_LIMIT = 60;

export function isHomeStandalonePost(row) {
  return Boolean(row?.slug) && stripHtml(row?.title || "").trim() !== ""
    && row?.home_hidden !== true && !hasSuppressedPublicPostTag(row)
    && contentSeriesKeysForPost(row).length === 0
    && !isHomeDocumentationPost(row);
}

// `exclude` holds slugs or ids already shown by another Home source (for example the videos and cipher strips).
export function projectHomeStandalonePosts(rows, { limit = HOME_STANDALONE_LIMIT, exclude = [], now = Date.now() } = {}) {
  const blocked = new Set([...exclude].map(String));
  const since = now - HOME_STANDALONE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter(row => {
    const published = Date.parse(row?.date);
    if (!isHomeStandalonePost(row) || !Number.isFinite(published) || published < since || published > now + 24 * 60 * 60 * 1000) return false;
    if (blocked.has(String(row.id)) || blocked.has(String(row.slug)) || seen.has(String(row.id))) return false;
    seen.add(String(row.id));
    return true;
  }).sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0) || Number(b.id) - Number(a.id))
    .slice(0, Math.max(1, Math.min(HOME_STANDALONE_READ_LIMIT, Number(limit) || HOME_STANDALONE_LIMIT))).map(row => ({
      id: row.id, slug: row.slug, source: row.source, link: row.link, wp_id: row.wp_id,
      title: stripHtml(row.title || ""), poster: row.thumb_url || row.image_url || null,
      author: stripHtml(row.author || "").trim() || null, publishedAt: row.date || null, sourcePost: row,
    }));
}

export async function getHomeStandalonePostCards({ client = getPublicResearchClient(), limit = HOME_STANDALONE_LIMIT, signal, now = Date.now(), exclude = [] } = {}) {
  if (!client) throw new Error("public_posts_unavailable");
  const since = new Date(now - HOME_STANDALONE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  // One bounded read of recent public Posts; series/pool membership is decided by the shared predicates, not re-expressed in SQL.
  let query = client.from("posts")
    .select("id,slug,title,image_url,thumb_url,date,modified,tags,categories,author,source,link,wp_id,home_hidden")
    .or(publicPostOnlyFilter()).eq("home_hidden", false).not("slug", "is", null).gte("date", since)
    .order("date", { ascending: false, nullsFirst: false }).limit(HOME_STANDALONE_READ_LIMIT);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return projectHomeStandalonePosts(data, { limit, exclude, now });
}
