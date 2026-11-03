import { publicPostHref } from "../publicPostUrls.js";
import { getPublicResearchClient } from "./researchViewMode.js";
import { canonicalPostCategories, postCategoryFilterNames } from "../postCategoryIdentity.js";
import { CONTENT_SERIES_2029, contentSeriesByKey, contentSeriesKeysForPost, contentSeriesMembershipFilter, hasExactMembership } from "./contentSeries2029Identity.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";
import { publicWriterFollowLinks } from "../userCenter/writerPersonal2029.js";

// A bounded anonymous projection for the existing 2029 posts surface. No new content
// store, inferred membership, follow, or permission decision is made by a URL filter.
const categoryHref = name => `/2029/posts?category=${encodeURIComponent(name)}`;
const seriesHref = key => `/2029/posts?series=${encodeURIComponent(key)}`;

// Public content context for the EXISTING track()/events pipeline. An open is
// an observed route entry, never a confirmed read, Follow, preference or person
// label. DIM5 is the already approved content-world key (story taxonomy v1).
// Other admitted series keep their own keys; no world is guessed from a tag.
export function postContentEntry2029({ post = null, scope = null } = {}) {
  if (post && scope) return null;
  let series, section, slug, surface, entry, sourceRef;
  if (post) {
    if (hasSuppressedPublicPostTag(post) || !/^\d+$/.test(String(post.id))
      || !Number.isSafeInteger(Number(post.id)) || Number(post.id) <= 0
      || typeof post.slug !== "string" || !post.slug || post.slug.length > 200 || /[/?#\u0000-\u001f]/.test(post.slug)) return null;
    series = contentSeriesKeysForPost(post).map(contentSeriesByKey);
    section = "post"; slug = post.slug; surface = "POST_PAGE"; entry = "reading";
    sourceRef = `posts:${post.id}`;
  } else {
    const spec = scope?.kind === "series" ? contentSeriesByKey(scope.key) : null;
    if (!spec) return null;
    series = [spec]; section = "posts"; slug = `series:${spec.key}`;
    surface = "POSTS_INDEX"; entry = "series_catalog"; sourceRef = null;
  }
  return {
    section, slug, eventType: "open",
    meta: {
      surface, entry, confirmed_read: false,
      ...(sourceRef ? { source_ref: sourceRef } : {}),
      content_series: series.map(spec => spec.key),
      classification_basis: series.map(spec => spec.decisionId),
      ...(series.some(spec => spec.key === "dimension-five") ? { content_world: "DIM5" } : {}),
    },
  };
}

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
  const resolvedSeriesCategories = new Set(series.flatMap(item => [item.name, ...contentSeriesByKey(item.key).membership
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
  const id = String(post.id), href = publicPostHref(post), locator = "#post-classification";
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
  // The modern entry offers one series target. Old category choices stay
  // readable/cancellable in the center; they are never silently converted.
  for (const name of [...new Set(categories)].filter(name => !CONTENT_SERIES_2029.some(spec => spec.label === name)).slice(0, 16)) candidates.push({ entityType: "category", stableId: name, topic: `cat:${name}`, label: name, kind: "סיווג במקור", icon: "layers" });
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

const CATALOG_COLUMNS = "id,wp_id,source,link,slug,title,excerpt,author,categories,tags,image_url,thumb_url,date,modified";
function publicCatalogQuery({ scope, search, client, head = false, includeTotal = true }) {
  if (!client || scope.kind === "invalid" || !["all", "category", "series"].includes(scope.kind)) throw new Error("בחירת התוכן אינה זמינה.");
  // Re-resolve a series by its owned key, never trust a caller-supplied spec/author/filter.
  const spec = scope.kind === "series" ? contentSeriesByKey(scope.key) : null;
  if (scope.kind === "series" && !spec) throw new Error("הסדרה אינה זמינה.");
  let query = client.from("posts")
    .select(head ? "id" : CATALOG_COLUMNS, { ...(includeTotal ? { count: "exact" } : {}), ...(head ? { head: true } : {}) })
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
  const term = postsSearch2029(search);
  // One escaped column filter on the existing public catalog, not a second search index.
  if (term) query = query.ilike("title", `%${term.replace(/[\\%_*]/g, "\\$&")}%`);
  return { query, spec, term };
}

function validatePage(page) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("עמוד לא תקין.");
}
function cancelCatalog(signal) {
  if (signal?.aborted) throw new DOMException("Catalog reading canceled", "AbortError");
}
function validatePostRows(data, spec) {
  if (!Array.isArray(data) || data.some(row => hasSuppressedPublicPostTag(row) || spec && (!hasExactMembership(row, spec) || spec.exactAuthor && row.author !== spec.exactAuthor))) {
    throw new Error("לא ניתן לאמת את שיוך התוכן.");
  }
}

// Top-frame suggestions use the SAME public catalog/filter and URL policy,
// without a count query or loading an entire catalog page on every keystroke.
export async function fetchPostSearchSuggestions2029({ search = "", limit = 4, client = getPublicResearchClient(), signal } = {}) {
  const term = postsSearch2029(search);
  cancelCatalog(signal);
  if (term.length < 2) return { posts: [], hasMore: false };
  const cap = Number.isInteger(limit) ? Math.max(1, Math.min(8, limit)) : 4;
  const { query } = publicCatalogQuery({ scope: postsCatalogScope2029(), search: term, client, includeTotal: false });
  const ordered = query.order("modified", { ascending: false, nullsFirst: false }).order("id", { ascending: true }).range(0, cap);
  if (signal) ordered.abortSignal(signal);
  const { data, error } = await ordered;
  cancelCatalog(signal);
  if (error) throw error;
  validatePostRows(data, null);
  return { posts: data.slice(0, cap), hasMore: data.length > cap };
}

export async function fetchPostsCatalog2029({ scope = postsCatalogScope2029(), page = 1, search = "", client = getPublicResearchClient(), signal, allowApprovedSourcePage = false } = {}) {
  validatePage(page); cancelCatalog(signal);
  const { query, spec } = publicCatalogQuery({ scope, search, client });
  const ordered = query.order(spec ? "date" : "modified", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true }).range((page - 1) * 24, page * 24 - 1);
  if (signal) ordered.abortSignal(signal);
  const { data, error, count } = await ordered;
  cancelCatalog(signal);
  // One admitted source may create a last page after the final Post. Verify the
  // Post count rather than treating a 416 response as an invented empty page.
  if (error?.code === "PGRST103" && allowApprovedSourcePage && spec?.approvedSources?.length === 1) {
    let countQuery = publicCatalogQuery({ scope, search, client, head: true }).query;
    if (signal) countQuery = countQuery.abortSignal(signal);
    const counted = await countQuery;
    cancelCatalog(signal);
    if (!counted.error && Number.isSafeInteger(counted.count) && counted.count === (page - 1) * 24) return { posts: [], total: counted.count };
  }
  if (error) throw error;
  if (!Array.isArray(data) || !Number.isSafeInteger(count) || count < 0) throw new Error("לא ניתן לאמת את רשימת התוכן.");
  validatePostRows(data, spec);
  return { posts: data, total: count };
}

// Complete the already-readable bounded Post page with the ONE admitted source.
// The exact count and optional predecessor reuse the same public/membership/search
// filters. No full-catalog scan, body, persistent cache or new RPC is involved.
export async function completeMixedSeriesPostsPage2029({ scope, page = 1, search = "", postResult,
  sourceItems = [], client = getPublicResearchClient(), signal } = {}) {
  validatePage(page); cancelCatalog(signal);
  const spec = scope?.kind === "series" ? contentSeriesByKey(scope.key) : null;
  if (!spec || !Array.isArray(postResult?.posts) || !Number.isSafeInteger(postResult.total) || postResult.total < 0) throw new Error("לא ניתן לאמת את עמוד הסדרה.");
  validatePostRows(postResult.posts, spec);
  const term = postsSearch2029(search);
  const sources = sourceItems.filter(item => item?.kind === "channel_update"
    && spec.approvedSources?.some(approval => approval.sourceRef === item.sourceRef && approval.decisionRef === item.decisionRef
      && item.href === `/video/${approval.publicAssetId}`)
    && Number.isFinite(Date.parse(item.publishedAt || ""))
    && (!term || String(item.title).toLocaleLowerCase().includes(term.toLocaleLowerCase())));
  if (sources.length > 1) throw new Error("נדרש אימות של עימוד המקורות.");
  const base = { posts: postResult.posts, postTotal: postResult.total, sourceItems: [], sourceTotal: sources.length,
    total: postResult.total + sources.length };
  if (!sources.length) return base;
  const source = sources[0], offset = (page - 1) * 24;
  let rankQuery = publicCatalogQuery({ scope, search, client, head: true }).query.gte("date", source.publishedAt);
  if (signal) rankQuery = rankQuery.abortSignal(signal);
  const ranked = await rankQuery;
  cancelCatalog(signal);
  if (ranked.error) throw ranked.error;
  if (!Number.isSafeInteger(ranked.count) || ranked.count < 0 || ranked.count > postResult.total) throw new Error("לא ניתן לאמת את סדר הפריטים.");
  // date DESC, then all Posts before the source at the same publication time.
  const rank = ranked.count;
  if (rank >= offset && rank < offset + 24) {
    const localIndex = rank - offset;
    if (localIndex > postResult.posts.length) throw new Error("עמוד הסדרה השתנה; יש לטעון מחדש.");
    return { ...base, posts: postResult.posts.slice(0, 23), sourceItems: [source] };
  }
  if (rank < offset) {
    let predecessorQuery = publicCatalogQuery({ scope, search, client }).query
      .order("date", { ascending: false, nullsFirst: false }).order("id", { ascending: true }).range(offset - 1, offset - 1);
    if (signal) predecessorQuery = predecessorQuery.abortSignal(signal);
    const previous = await predecessorQuery;
    cancelCatalog(signal);
    if (previous.error) throw previous.error;
    validatePostRows(previous.data, spec);
    if (previous.data.length !== 1 || previous.count !== postResult.total) throw new Error("עמוד הסדרה השתנה; יש לטעון מחדש.");
    return { ...base, posts: [...previous.data, ...postResult.posts].slice(0, 24) };
  }
  return base;
}
