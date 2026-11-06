import { getPublicResearchClient } from "./researchViewMode.js";
import { publicPostOnlyFilter, hasSuppressedPublicPostTag } from "./publicPostBoundary.js";
import { CONTENT_SERIES_2029, hasExactMembership } from "./contentSeries2029Identity.js";
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
