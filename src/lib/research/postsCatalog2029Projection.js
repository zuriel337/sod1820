import { getPublicResearchClient } from "./researchViewMode.js";
import { canonicalPostCategories, postCategoryFilterNames } from "../postCategoryIdentity.js";
import { CONTENT_SERIES_2029, contentSeriesByKey, contentSeriesKeysForPost, contentSeriesMembershipFilter, hasExactMembership, hasExactSeriesPublisher2029, seriesPublisherFilter2029 } from "./contentSeries2029Identity.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";
import { publicWriterFollowLinks } from "../userCenter/writerPersonal2029.js";

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

// Explicit reading focus in the SAME Research Context / Raziel session. PLAN37
// ENTITY_SERIES and ENTITY_CHANNEL describe different roles, not a parent-child
// tree. The comparison with Or Geula never asserts this post belongs to it.
// This is surface context, not a new entity, edge, permission or Follow command.
export function postHierarchyContext2029(post, { seriesKey = null } = {}) {
  if (!post || hasSuppressedPublicPostTag(post)
    || !/^\d+$/.test(String(post.id)) || !Number.isSafeInteger(Number(post.id)) || Number(post.id) <= 0
    || typeof post.slug !== "string" || !post.slug || post.slug.length > 200 || /[/?#\u0000-\u001f]/.test(post.slug)) return null;
  const classification = postClassification2029(post);
  const selected = seriesKey == null ? null : classification.series.find(item => item.key === seriesKey);
  if (seriesKey != null && !selected) return null;
  const spec = selected ? contentSeriesByKey(selected.key) : null;
  const primary = spec
    ? `${spec.label}: סדרת תוכן.${spec.writerLabel ? ` ${spec.writerLabel}: כתב.` : spec.publisherLabel && post.author === spec.publisherLabel ? ` ${spec.publisherLabel}: מפרסם.` : " ייחוס המחבר נשאר כפי שנרשם במקור."}`
    : classification.series.length ? "הפוסט הוא סיפור; שיוכיו לסדרות מוצגים בנפרד בפרטי הפוסט."
      : "בהיטל הנוכחי לא אומת שיוך לסדרה; סיווג שמור אינו חברות בסדרה.";
  const id = String(post.id), href = `/post/${post.slug}`, locator = "#post-classification";
  const subject = { type: "post", id, label: post.title, href };
  const selection = { entityType: "post_classification", entityId: selected?.key || id, sourceRef: `posts:${id}`, locator };
  const readingFocus = {
    id: "post-classification", label: "הפוסט, הסדרה והערוץ", primary,
    signals: ["אור הגאולה: ערוץ/בית פרסום", "ההשוואה אינה ראיית חברות בערוץ", "מעקב מפורש ≠ רלוונטיות או המלצה"],
    sourceLabel: `PLAN37 ${spec?.decisionId || "ENTITY_SERIES/CHANNEL"} · posts:${id}`,
    postId: id, postSlug: post.slug, locator,
  };
  return {
    subject, selection, lens: "reading",
    returnTo: { href: href + locator, label: "חזרה לשיוך הפוסט", subject, selection, lens: "reading" },
    dimensions: {
      entrySource: "post_classification_2029", sourceRef: `posts:${id}`,
      surfaceFocus: { type: "post_classification", id: selection.entityId, label: readingFocus.label, postId: id, postSlug: post.slug },
      readingFocus, numberCoreFocus: null, postClaimBinding: null, postClaimResultMatch: null,
    },
  };
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

export function postsSearch2029(value = "") {
  const text = String(value).trim().replace(/\s+/g, " ");
  if (text.length > 120 || /[\u0000-\u001f\u007f]/.test(text)) throw new Error("החיפוש ארוך מדי או מכיל תווים לא נתמכים.");
  return text;
}

// Presentation candidates only. The existing server resolver admits identity;
// unsupported series never fall back to a category, author or post:<id>.
export function postFollowCandidates2029({ post = null, scope = null } = {}) {
  if (post && hasSuppressedPublicPostTag(post)) return [];
  const candidates = [];
  const series = post ? postClassification2029(post).series
    : scope?.kind === "series" && contentSeriesByKey(scope.key)
      ? [{ key: scope.key, name: contentSeriesByKey(scope.key).label }] : [];
  for (const item of series) candidates.push({ entityType: "series", stableId: item.key, topic: `series:${item.key}`, label: item.name, kind: "סדרה", icon: "layers" });
  const categories = post ? postClassification2029(post).items.filter(item => item.role !== "series" && item.role !== "legacy-media-label").map(item => item.name)
    : scope?.kind === "category" && scope.key !== "וידאו" ? [scope.key] : [];
  for (const name of [...new Set(categories)].slice(0, 16)) candidates.push({ entityType: "category", stableId: name, topic: `cat:${name}`, label: name, kind: "סיווג במקור", icon: "layers" });
  const author = typeof post?.author === "string" ? post.author : "";
  const publisher = series.some(item => contentSeriesByKey(item.key)?.publisherLabel === author);
  if (author && author === author.trim() && author !== "המערכת" && !publisher) candidates.push({ entityType: "author", stableId: author, topic: `author:${author}`, label: author, kind: "ייחוס במקור", icon: "posts" });
  return candidates;
}

export async function fetchPostFollowTargets2029({ post = null, scope = null, client = getPublicResearchClient(), writerLinks = publicWriterFollowLinks } = {}) {
  const candidates = postFollowCandidates2029({ post, scope });
  const authors = candidates.filter(item => item.entityType === "author").map(item => item.topic);
  const links = authors.length ? Promise.resolve().then(() => writerLinks(authors, { client })) : Promise.resolve({});
  return Promise.all(candidates.map(async item => {
    try {
      if (item.entityType === "author" && !(await links)?.[item.topic]) return { ...item, state: "unavailable" };
      if (!client) throw new Error("Reader unavailable");
      // Public IMMUTABLE identity resolver; resolve_topics is server-only live.
      const { data, error } = await client.rpc("canonical_follow_subject", { p_entity_type: item.entityType, p_stable_id: item.stableId }, { get: true });
      if (error || typeof data !== "string") throw error || new Error("Invalid resolver result");
      return { ...item, ...(item.entityType === "author" ? { kind: "כתב", icon: "personal" } : {}), state: data === item.topic ? "ready" : data ? "unavailable" : "unsupported" };
    } catch { return { ...item, state: "unavailable" }; }
  }));
}

export async function fetchPostsCatalog2029({ scope = postsCatalogScope2029(), page = 1, search = "", client = getPublicResearchClient() } = {}) {
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
    if (spec.exactAuthor) {
      const publisherFilter = seriesPublisherFilter2029(spec);
      query = publisherFilter ? query.or(publisherFilter) : query.eq("author", spec.exactAuthor);
    }
  }
  const term = postsSearch2029(search);
  // One escaped column filter on the existing public catalog, not a second search index.
  if (term) query = query.ilike("title", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error, count } = await query.order("modified", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true }).range((page - 1) * 24, page * 24 - 1);
  if (error) throw error;
  if (!Array.isArray(data) || !Number.isSafeInteger(count) || count < 0) throw new Error("לא ניתן לאמת את רשימת התוכן.");
  if (data.some(row => hasSuppressedPublicPostTag(row) || spec && (!hasExactMembership(row, spec) || !hasExactSeriesPublisher2029(row, spec)))) {
    throw new Error("לא ניתן לאמת את שיוך התוכן.");
  }
  return { posts: data, total: count };
}
