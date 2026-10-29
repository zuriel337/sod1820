// Pure composition of already-public World post updates and canonical graph findings.
// No reads, writes, publication decisions, inferred story-to-story edges or UI.
const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const edgeRef = value => /^edge:[0-9a-f-]{36}$/i.test(clean(value)) ? clean(value) : null;
function postPath(value) {
  const path = clean(value).split(/[?#]/, 1)[0];
  if (!path.startsWith("/post/") || path.length <= 6) return null;
  try { return decodeURIComponent(path); } catch { return null; }
}

/**
 * Caller supplies findings from fetchCanonicalGraphEntityFindings(anchorNodeId)
 * and post update projections from the existing public World source reader.
 * Paths only corroborate a graph endpoint against an independently admitted source;
 * they do not authorize a post, prove a claim, or create a relation between stories.
 * Input order is preserved as presentation order, not chronology or relevance.
 */
export function buildStoryTreeSequence2029({ anchorNodeId, graphFindings, publicPostUpdates, currentSourceRef = null } = {}) {
  const anchor = clean(anchorNodeId);
  const publicPosts = new Map();
  for (const post of list(publicPostUpdates)) {
    const path = postPath(post?.href);
    const ref = clean(post?.sourceRef);
    if (post?.kind !== "source" || post?.sourceKind !== "post" || post?.publicState !== "published_source_representation" || !/^posts:\d+$/.test(ref) || !path || !clean(post.label)) continue;
    const existing = publicPosts.get(path);
    // Ambiguous path never becomes permission or source identity.
    if (existing && existing.sourceRef !== ref) { publicPosts.set(path, null); continue; }
    if (!publicPosts.has(path)) publicPosts.set(path, post);
  }
  if (!anchor) return { anchorNodeId: null, stories: [], currentIndex: -1, previous: null, next: null, ordering: "input_not_chronology" };
  const stories = [];
  const seen = new Set();
  for (const finding of list(graphFindings)) {
    if (finding?.kind !== "graph-relation") continue;
    const ref = edgeRef(finding?.identity?.relationRef);
    if (!ref || ref !== edgeRef(finding?.source?.sourceRef)) continue;
    for (const relation of list(finding?.projection?.relations)) {
      if (`edge:${clean(relation?.id)}` !== ref) continue;
      const from = clean(relation.fromNodeId), to = clean(relation.toNodeId);
      if (from !== anchor && to !== anchor) continue;
      const endpoint = from === anchor ? relation.to : relation.from;
      const endpointId = from === anchor ? to : from;
      if (!endpointId || endpointId === anchor || clean(endpoint?.id) !== endpointId || endpoint?.type !== "post") continue;
      const post = publicPosts.get(postPath(endpoint.href));
      if (!post || seen.has(post.sourceRef)) continue;
      seen.add(post.sourceRef);
      stories.push({ sourceRef: post.sourceRef, nodeRef: `node:${endpointId}`, href: post.href,
        title: clean(post.label), summary: clean(post.summary) || null, creator: clean(post.creator) || null,
        publishedAt: post.sourcePublishedAt || null, relation: { edgeRef: ref, type: clean(relation.relationType) || "related", anchorNodeId: anchor },
        relationshipMeaning: "shared_anchor_not_story_to_story_edge" });
    }
  }
  const currentIndex = stories.findIndex(story => story.sourceRef === clean(currentSourceRef));
  return { anchorNodeId: anchor, stories, currentIndex,
    previous: currentIndex > 0 ? stories[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < stories.length - 1 ? stories[currentIndex + 1] : null,
    ordering: "input_not_chronology" };
}
