import { getPublicResearchClient } from "./researchViewMode.js";
import { canonicalPostCategories, postCategoryFilterNames } from "../postCategoryIdentity.js";
import { CONTENT_SERIES_2029, contentSeriesByKey, contentSeriesKeysForPost, contentSeriesMembershipFilter, hasExactMembership } from "./contentSeries2029Identity.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";

// A bounded anonymous projection for the existing 2029 posts surface. No new content
// store, inferred membership, follow, or permission decision is made by a URL filter.
const categoryHref = name => `/2029/posts?category=${encodeURIComponent(name)}`;
const seriesHref = key => `/2029/posts?series=${encodeURIComponent(key)}`;

// Post-only presentation of already admitted sources, not a category→Topic map.
// PLAN37 DEC-CONTENT-001/DEC-VIDEO-001 and the existing exact series descriptors
// distinguish these roles. Unresolved labels remain source classifications. In
// particular, an old video label is neither an admitted asset nor a media filter.
export function postClassification2029(post) {
  if (!post || hasSuppressedPublicPostTag(post)) return { items: [], series: [], sourceCategories: [], legacyMediaLabels: [] };
  const series = contentSeriesKeysForPost(post).map(key => {
    const spec = contentSeriesByKey(key);
    return { role: "series", name: spec.label, prefix: "סדרה", href: seriesHref(key), key, decisionId: spec.decisionId };
  });
  const resolvedSeriesCategories = new Set(series.flatMap(item => contentSeriesByKey(item.key).membership
    .filter(member => member.field === "categories").map(member => member.value)));
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
  return { items: [...series, ...editorial, ...sourceCategories, ...legacyMediaLabels], series, sourceCategories, legacyMediaLabels,
    credit: author ? { name: author, prefix: publisher ? "מפרסם" : "ייחוס במקור" } : null };
}

export function postsCatalogScope2029(search = "") {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const categories = params.getAll("category"), series = params.getAll("series");
  if (categories.length + series.length > 1) return { kind: "invalid", key: "", label: "בחירה לא תקינה" };
  if (series.length) {
    const spec = contentSeriesByKey(series[0]);
    return spec ? { kind: "series", key: spec.key, label: spec.label, spec }
      : { kind: "invalid", key: series[0], label: "סדרה לא מוכרת" };
  }
  if (categories.length) {
    const value = categories[0].trim();
    if (!value || value.length > 160 || /[\u0000-\u001f\u007f]/.test(value)) return { kind: "invalid", key: "", label: "קטגוריה לא תקינה" };
    const name = canonicalPostCategories([value])[0];
    const seriesSpec = CONTENT_SERIES_2029.find(spec => spec.membership.some(member => member.field === "categories" && member.value === name));
    const legacyVideo = name === "וידאו";
    return { kind: "category", key: name,
      label: legacyVideo ? "וידאו — סיווג ישן" : seriesSpec ? `${name} — סיווג במקור` : name,
      compatibilityNote: legacyVideo
        ? "כאן מופיעים פוסטים שסווגו בעבר כווידאו. זו אינה ספריית כל הסרטונים; סוג המדיה נקבע מהמדיה עצמה."
        : seriesSpec ? "זהו הסיווג השמור בפוסטים. רשימת הסדרה מציגה רק פריטים ששיוכם לסדרה הוגדר."
          : null,
      seriesLink: seriesSpec ? { href: seriesHref(seriesSpec.key), label: `לסדרת ${seriesSpec.label}` } : null };
  }
  return { kind: "all", key: "", label: "הפוסטים" };
}

export async function fetchPostsCatalog2029({ scope = postsCatalogScope2029(), page = 1, client = getPublicResearchClient() } = {}) {
  if (!client || scope.kind === "invalid" || !["all", "category", "series"].includes(scope.kind)) throw new Error("בחירת התוכן אינה זמינה.");
  // Re-resolve a series by its owned key, never trust a caller-supplied spec/author/filter.
  const spec = scope.kind === "series" ? contentSeriesByKey(scope.key) : null;
  if (scope.kind === "series" && !spec) throw new Error("הסדרה אינה זמינה.");
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("עמוד לא תקין.");
  let query = client.from("posts")
    .select("id,slug,title,excerpt,author,categories,tags,image_url,thumb_url,date,modified", { count: "exact" })
    .or(publicPostOnlyFilter());
  if (scope.kind === "category") {
    const names = postCategoryFilterNames(scope.key);
    if (!names.length) throw new Error("הקטגוריה אינה זמינה.");
    query = query.overlaps("categories", names);
  }
  if (spec) {
    query = query.or(contentSeriesMembershipFilter(spec));
    if (spec.exactAuthor) query = query.eq("author", spec.exactAuthor);
  }
  const { data, error, count } = await query.order("modified", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true }).range((page - 1) * 24, page * 24 - 1);
  if (error) throw error;
  if (!Array.isArray(data) || !Number.isSafeInteger(count) || count < 0) throw new Error("לא ניתן לאמת את רשימת התוכן.");
  if (data.some(row => hasSuppressedPublicPostTag(row) || spec && (!hasExactMembership(row, spec) || spec.exactAuthor && row.author !== spec.exactAuthor))) {
    throw new Error("לא ניתן לאמת את שיוך התוכן.");
  }
  return { posts: data, total: count };
}
