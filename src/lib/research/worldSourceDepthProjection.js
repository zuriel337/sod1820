// World source/subject depth projection.
// READ-ONLY composition over existing owners: posts.categories (editorial category facet),
// topic_cards_public (admitted Topic) and Reality Graph `source` edges (the only attested
// Topic -> post relation). It creates no store, taxonomy, registry or relation.
//
// Truth discipline (reality_graph_law / publishing_conventions POST CATEGORY SEMANTIC GUIDANCE):
//   - Category != Topic. A Topic is linked to a category ONLY when an attested graph edge
//     connects that Topic to a post that carries the category. No inference, no promotion.
//   - Counts are scoped (distinct posts per category) and say whether the read was complete.
//   - Topics without an attested link stay in a separate directory, never sampled as "related".

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE = 1000;
const MAX_PAGES = 12;

// posts: [{id, slug, categories}] -> [{category, count}] distinct by post id, de-duplicated within a post.
export function buildCategoryCounts(posts = []) {
  const seenByCategory = new Map();
  for (const post of Array.isArray(posts) ? posts : []) {
    const id = clean(post?.id) || clean(post?.slug);
    if (!id) continue;
    const cats = Array.isArray(post?.categories) ? post.categories : [];
    for (const raw of cats) {
      const category = clean(raw);
      if (!category) continue;
      if (!seenByCategory.has(category)) seenByCategory.set(category, new Set());
      seenByCategory.get(category).add(id);
    }
  }
  return [...seenByCategory.entries()]
    .map(([category, ids]) => ({ category, count: ids.size }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, "he"));
}

// attestedLinks: [{topicSlug, postSlug}] from graph `source` edges only.
export function buildSourceDepth({ posts = [], topics = [], attestedLinks = [], complete = true } = {}) {
  const categories = buildCategoryCounts(posts);
  const postCats = new Map();
  for (const post of posts) postCats.set(clean(post?.slug), (Array.isArray(post?.categories) ? post.categories : []).map(clean).filter(Boolean));
  const topicBySlug = new Map((topics || []).map((t) => [clean(t?.slug), t]).filter(([s]) => s));

  const linksByCategory = new Map();
  const linkedTopicSlugs = new Set();
  for (const link of attestedLinks || []) {
    const topic = topicBySlug.get(clean(link?.topicSlug));
    const cats = postCats.get(clean(link?.postSlug));
    if (!topic || !cats) continue; // fail closed: unknown topic/post -> no link shown
    linkedTopicSlugs.add(clean(topic.slug));
    for (const category of cats) {
      if (!linksByCategory.has(category)) linksByCategory.set(category, new Map());
      linksByCategory.get(category).set(clean(topic.slug), { topic, viaPostSlug: clean(link.postSlug) });
    }
  }

  const rows = categories.map(({ category, count }) => {
    const linked = [...(linksByCategory.get(category)?.values() || [])];
    return {
      category,
      count,
      linkState: linked.length ? "attested" : "no_attested_link",
      linkedTopics: linked,
    };
  });
  const unlinkedTopics = [...topicBySlug.values()]
    .filter((t) => !linkedTopicSlugs.has(clean(t.slug)))
    .sort((a, b) => clean(a.title).localeCompare(clean(b.title), "he"));

  return Object.freeze({
    complete: Boolean(complete),
    postsRead: posts.length,
    categories: rows,
    topicsTotal: topicBySlug.size,
    topicsLinked: linkedTopicSlugs.size,
    unlinkedTopics, // full directory, not a sampled head
  });
}
