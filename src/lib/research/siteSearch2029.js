import { CONTENT_SERIES_2029 } from "./contentSeries2029Identity.js";
import { publicPostHref } from "../publicPostUrls.js";
import { stripHtml } from "../format.js";
import { contributorSourceLibraryHref } from "./worldContributorSourceLocator.js";

// A bounded presentation of existing public readers, not a search index, store
// or research operation. Reader modules are loaded only after an actual query.
export const SITE_SEARCH_GROUPS = Object.freeze([
  { key: "posts", label: "פוסטים" }, { key: "topics", label: "נושאים" },
  { key: "series", label: "סדרות" }, { key: "sources", label: "כותבים ומקורות" },
]);
const plain = value => stripHtml(String(value || "")).trim();
export function siteSearchTerm(value) {
  const term = String(value || "").trim().replace(/\s+/g, " ");
  if (term.length > 120 || /[\u0000-\u001f\u007f]/.test(term)) throw new Error("החיפוש ארוך מדי או מכיל תווים לא נתמכים.");
  return term;
}
export function siteSearchEligible(term) {
  return (String(term).match(/[\p{L}\p{N}]/gu) || []).length >= 2;
}
function internalHref(href) {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//")
    && !/[\\\u0000-\u0020]/.test(href);
}
function suggestion(id, kind, title, href, detail = "") {
  return id && plain(title) && internalHref(href)
    ? { id, kind, title: plain(title), href, detail: plain(detail) } : null;
}
export function siteSearchSeries(query = "") {
  const term = siteSearchTerm(query).toLocaleLowerCase("he");
  return CONTENT_SERIES_2029.filter(row => row.label.toLocaleLowerCase("he").includes(term))
    .map(row => suggestion(`series:${row.key}`, "series", row.label, `/2029/posts?series=${encodeURIComponent(row.key)}`));
}
export function siteSearchMoreHref(kind, query) {
  const q = encodeURIComponent(siteSearchTerm(query));
  return kind === "posts" ? `/2029/posts?q=${q}` : `/world?view=sources&q=${q}#world-public-content-map`;
}

const defaultReaders = {
  posts: async (term, options) => {
    const { fetchPostSearchSuggestions2029 } = await import("./postsCatalog2029Projection.js");
    const result = await fetchPostSearchSuggestions2029({ search: term, ...options });
    return { ...result, items: result.posts.map(row => suggestion(`posts:${row.id}`, "posts", row.title, publicPostHref(row), row.author || "")) };
  },
  topics: async (term, options) => {
    const [{ fetchTopicCardList }, { getPublicResearchClient }] = await Promise.all([
      import("./topicConvergence.js"), import("./researchViewMode.js"),
    ]);
    const result = await fetchTopicCardList({ q: term, ...options, literalTitleSearch: true, client: getPublicResearchClient() });
    return { ...result, items: result.rows.map(row => row.slug && suggestion(`topic:${row.id}`, "topics", row.title,
      `/topic/${encodeURIComponent(row.slug)}`, row.subtitle || "")) };
  },
  sources: async (term, options) => {
    const { fetchWorldPublicPeopleIndex } = await import("./worldPublicPeopleIndex.js");
    const result = await fetchWorldPublicPeopleIndex({ search: term, ...options });
    return { ...result, items: result.people.map(row => suggestion(`writer:${row.id}`, "sources", row.displayName,
      contributorSourceLibraryHref(row.slug), "כותב · ספריית מקורות")) };
  },
};

export async function fetchSiteSearch2029(query, { signal, onGroup = () => {}, readers = defaultReaders } = {}) {
  const term = siteSearchTerm(query);
  const canceled = () => { if (signal?.aborted) throw new DOMException("Search canceled", "AbortError"); };
  canceled();
  if (!siteSearchEligible(term)) return [];
  const series = { key: "series", state: "ready", items: siteSearchSeries(term), hasMore: false };
  onGroup(series);
  const groups = await Promise.all(["posts", "topics", "sources"].map(async key => {
    let group;
    try {
      const result = await readers[key](term, { signal, limit: 4 });
      canceled();
      group = { key, state: "ready", items: result.items.filter(Boolean).slice(0, 4), hasMore: result.hasMore === true };
    } catch (error) {
      canceled();
      if (error?.name === "AbortError") throw error;
      group = { key, state: "failed", items: [], hasMore: false };
    }
    onGroup(group);
    return group;
  }));
  canceled();
  return [series, ...groups];
}

export function siteSearchItems(groups, filter = "all", limit = 10) {
  const lists = SITE_SEARCH_GROUPS.filter(g => filter === "all" || g.key === filter)
    .map(g => groups[g.key]?.items || []);
  const result = [], seen = new Set();
  // Interleave types rather than invent popularity or truth scores.
  for (let index = 0; index < 4 && result.length < limit; index++) {
    for (const list of lists) {
      const item = list[index];
      if (!item || seen.has(item.id) || !internalHref(item.href)) continue;
      seen.add(item.id); result.push(item);
      if (result.length === limit) break;
    }
  }
  return result;
}
