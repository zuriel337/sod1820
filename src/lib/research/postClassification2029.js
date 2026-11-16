// The classification of a Post (series, editorial choice, media type, source categories, credit), moved unchanged out of
// postsCatalog2029Projection.js (OLD_POST_ARTICLE_FIRST, 16.11.2026) so that the first-document article on the server shows exactly the page's
// chips without loading the research client. A leaf module: no Supabase client. postsCatalog2029Projection.js re-exports it.
import { canonicalPostCategories } from "../postCategoryIdentity.js";
import { contentSeriesByKey, contentSeriesKeysForPost, seriesShadowedCategories } from "./contentSeries2029Identity.js";
import { hasSuppressedPublicPostTag } from "./publicPostBoundary.js";

const categoryHref = name => `/2029/posts?category=${encodeURIComponent(name)}`;
const seriesHref = key => `/2029/posts?series=${encodeURIComponent(key)}`;

// Post-only presentation of already admitted sources, not a category→Topic map.
// PLAN37 DEC-CONTENT-001/DEC-VIDEO-001 and the existing exact series descriptors
// distinguish these roles. Unresolved labels remain source classifications. In
// particular, an old video label is neither an admitted asset nor a media filter.
// The media type is read from the MEDIA ITSELF, never from the legacy "וידאו" category or a manual tag: the same playable-media patterns the public view
// `video_media_placements_v1` uses (a self-hosted mp4/webm/m4v address, a YouTube embed/watch/short link, a Vimeo link).
const VIDEO_MEDIA_PATTERNS = [/https?:\/\/[^"'\s<>]+\.(?:mp4|webm|m4v)(?:\?[^"'\s<>]*)?/i, /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)[A-Za-z0-9_-]{11}/i, /vimeo\.com\/(?:video\/)?[0-9]{5,}/i];
export const postHasVideoMedia2029 = (post) => typeof post?.content === "string" && post.content.length > 0 && VIDEO_MEDIA_PATTERNS.some(pattern => pattern.test(post.content));
const MEDIA_VIDEO_HREF = "/2029/posts?media=video";

export function postClassification2029(post) {
  if (!post || hasSuppressedPublicPostTag(post)) return { items: [], series: [], sourceCategories: [], legacyMediaLabels: [] };
  const series = contentSeriesKeysForPost(post).map(key => {
    const spec = contentSeriesByKey(key);
    return { role: "series", name: spec.label, prefix: "סדרה", href: seriesHref(key), key, decisionId: spec.decisionId };
  });
  const resolvedSeriesCategories = new Set(series.flatMap(item => [...seriesShadowedCategories(contentSeriesByKey(item.key)), ...contentSeriesByKey(item.key).membership
    .filter(member => member.field === "categories").map(member => member.value)]));
  const categories = canonicalPostCategories(post.categories).filter(name => !resolvedSeriesCategories.has(name));
  const editorial = categories.filter(name => name === "רמזים חזקים" || name === "תיעוד אירועים")
    .map(name => ({ role: name === "רמזים חזקים" ? "editorial" : "content-family", name,
      prefix: name === "רמזים חזקים" ? "בחירת עריכה" : "תחום", href: categoryHref(name) }));
  const legacyMediaLabels = categories.filter(name => name === "וידאו")
    .map(name => ({ role: "legacy-media-label", name, prefix: "סיווג ישן", href: categoryHref(name) }));
  const sourceCategories = categories.filter(name => name !== "וידאו" && name !== "רמזים חזקים" && name !== "תיעוד אירועים")
    .map(name => ({ role: "source-category", name, prefix: "סיווג במקור", href: categoryHref(name) }));
  const author = typeof post.author === "string" ? post.author.trim() : "";
  const publisher = series.some(item => contentSeriesByKey(item.key).publisherLabel === post.author);
  const media = postHasVideoMedia2029(post) ? [{ role: "media-type", name: "וידאו", prefix: "מדיה", href: MEDIA_VIDEO_HREF }] : [];
  return { items: [...series, ...editorial, ...media, ...sourceCategories, ...legacyMediaLabels], series, sourceCategories, legacyMediaLabels, media,
    credit: author ? { name: author, prefix: publisher ? "מפרסם" : "ייחוס במקור" } : null };
}
