// Pure composition of already-public World post updates and canonical graph findings.
// No reads, writes, publication decisions, inferred story-to-story edges or UI.
import { normalizeOpenedRelations } from "./worldGraphRelationOpener2029.js";
import { normalizeMediaPostSlug } from "./galleryMediaEnvelope.js";
const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
function postPath(value) {
  const path = clean(value).split(/[?#]/, 1)[0];
  if (!/^\/post\/[^/]+$/.test(path)) return null;
  const slug = normalizeMediaPostSlug(path.slice(6));
  return slug && !/[/?#\\]/.test(slug) ? `/post/${slug}` : null;
}

// These are already-documented graph endpoints, NOT publicly admitted stories.
// The existing source reader must independently admit each exact post before UI.
export function storyTreePostTargets2029({ anchorNodeId, graphFindings } = {}) {
  const anchor = clean(anchorNodeId);
  if (!anchor) return [];
  const findings = list(graphFindings);
  const opened = normalizeOpenedRelations(findings, { anchorNodeId: anchor }).relations;
  return opened.flatMap(row => {
    const finding = findings.find(f => f?.identity?.relationRef === row.edgeRef);
    const relation = list(finding?.projection?.relations).find(r => r?.id === row.edgeRef.slice(5)
      && r.fromNodeId === row.fromNodeId && r.toNodeId === row.toNodeId);
    const endpoint = row.fromNodeId === anchor ? relation?.to : relation?.from;
    const nodeId = row.fromNodeId === anchor ? row.toNodeId : row.fromNodeId;
    const href = clean(endpoint?.href);
    const path = postPath(href);
    if (!endpoint || endpoint.id !== nodeId || nodeId === anchor || endpoint.type !== "post"
        || !path || /[?#]/.test(href)) return [];
    return [{ nodeId, href, slug: path.slice(6), path,
      relation: { edgeRef: row.edgeRef, type: row.relationType, anchorNodeId: anchor,
        fromNodeRef: `node:${row.fromNodeId}`, toNodeRef: `node:${row.toNodeId}` } }];
  });
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
  for (const target of storyTreePostTargets2029({ anchorNodeId: anchor, graphFindings })) {
    const post = publicPosts.get(target.path);
    if (!post || seen.has(post.sourceRef)) continue;
    seen.add(post.sourceRef);
    stories.push({ sourceRef: post.sourceRef, nodeRef: `node:${target.nodeId}`, href: post.href,
      title: clean(post.label), summary: clean(post.summary) || null, creator: clean(post.creator) || null,
      publishedAt: post.sourcePublishedAt || null, relation: target.relation,
      relationshipMeaning: "shared_anchor_not_story_to_story_edge" });
  }
  const currentIndex = stories.findIndex(story => story.sourceRef === clean(currentSourceRef));
  return { anchorNodeId: anchor, stories, currentIndex,
    previous: currentIndex > 0 ? stories[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < stories.length - 1 ? stories[currentIndex + 1] : null,
    ordering: "input_not_chronology" };
}
