// One bounded public *presentation* of two EXISTING readers.
// An approved Topic is distinct from a public post/source subject. No new Topic/graph
// identity, research permission, publication, store or background watcher is created.
import { fetchTopicCardList } from "./topicConvergence.js";
import { fetchCorpusPage, WORLD_SOURCE_CORPORA } from "./worldSourceCorpus.js";

const ZVI_CREATOR = "צבי (OPOC)";
const HASHMAL = WORLD_SOURCE_CORPORA.find((item) => item.key === "sod-hashmal");
const TOPIC_BATCH = 60;
const MAX_TOPIC_ROWS = 1000;
const MAX_CORPUS_PAGES = 40;

const clean = (s) => String(s ?? "").trim();
const unique = (items) => [...new Set(items.filter(Boolean))];

export function canonicalSourceSubjectCards({ zviTopics = [], hashmalPosts = [] } = {}) {
  const topicCards = [];
  const topicSeen = new Set();
  for (const row of zviTopics) {
    const slug = clean(row?.slug), id = clean(row?.id);
    if (!slug || !id || topicSeen.has(id)) continue;
    topicSeen.add(id);
    topicCards.push({
      id: `topic:${id}`,
      type: "approved_topic", origin: "zvi",
      title: clean(row.title) || slug,
      description: clean(row.subtitle),
      categories: [],
      at: row.approved_at || row.created_at || null,
      href: `/topic/${encodeURIComponent(slug)}`,
    });
  }
  const postCards = [];
  const sourceSeen = new Set();
  for (const row of hashmalPosts) {
    const id = clean(row?.id), slug = clean(row?.slug), title = clean(row?.title);
    if (!id || !slug || !title || sourceSeen.has(id)) continue;
    sourceSeen.add(id);
    postCards.push({
      id: `posts:${id}`,
      type: "source_post", origin: "hashmal",
      title, description: clean(row.excerpt),
      categories: unique((row.categories || []).map(clean).filter((c) => c !== "סוד החשמל")),
      at: row.date || null,
      href: `/post/${encodeURIComponent(slug)}`,
    });
  }
  return [...topicCards, ...postCards];
}

export function filterPublicSourceSubjects(cards, { origin = "all", category = "all", query = "" } = {}) {
  const q = clean(query).toLocaleLowerCase("he");
  return (Array.isArray(cards) ? cards : []).filter((card) => {
    if (origin !== "all" && card.origin !== origin) return false;
    if (category !== "all" && !card.categories.includes(category)) return false;
    if (!q) return true;
    return [card.title, card.description, ...(card.categories || [])]
      .join(" ").toLocaleLowerCase("he").includes(q);
  });
}

export function publicSourceSubjectCategories(cards = []) {
  const counts = new Map();
  for (const card of cards) {
    if (card.origin !== "hashmal") continue;
    for (const c of card.categories || []) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts].sort(([a, na], [b, nb]) => nb - na || a.localeCompare(b, "he"))
    .map(([name, count]) => ({ name, count }));
}

export async function fetchPublicSourceSubjectIndex({
  topicReader = fetchTopicCardList,
  corpusReader = fetchCorpusPage,
} = {}) {
  if (!HASHMAL) throw new Error("source_corpus_missing");
  const topics = [];
  let topicTotal = null, topicHasMore = true;
  for (let offset = 0; offset < MAX_TOPIC_ROWS && topicHasMore; offset += TOPIC_BATCH) {
    const page = await topicReader({
      creator: ZVI_CREATOR, limit: TOPIC_BATCH, offset, includeTotal: true,
    });
    if (!page || !Array.isArray(page.rows)) throw new Error("topic_index_unavailable");
    topics.push(...page.rows);
    if (Number.isFinite(page.total)) topicTotal = page.total;
    topicHasMore = Boolean(page.hasMore);
  }

  const posts = [];
  let postTotal = null, corpusHasMore = true;
  for (let page = 0; page < MAX_CORPUS_PAGES && corpusHasMore; page++) {
    const result = await corpusReader(HASHMAL, page);
    if (!result || !Array.isArray(result.items)) throw new Error("source_index_unavailable");
    posts.push(...result.items);
    if (Number.isFinite(result.total)) postTotal = result.total;
    corpusHasMore = Boolean(result.hasMore);
  }
  return {
    cards: canonicalSourceSubjectCards({ zviTopics: topics, hashmalPosts: posts }),
    totals: {
      zvi: topicTotal ?? topics.length,
      hashmal: postTotal ?? posts.length,
    },
    incomplete: topicHasMore || corpusHasMore,
  };
}
