// Event sequence ("רצף האירועים") for the Post context rail: where a post comes from, what continues from it and
// where inside the tree something was added. It is a TREE view only: a mark here is never a system update and does
// not feed Home / World / the updates feed. Relations are declared per existing post identity (same declaration
// level as the Post experience trail); unit marks come from the proven source-unit registry.
import { PROVEN_POST_SOURCE_UPDATES, orderedSourceUpdates } from "./postSourceUpdates2029.js";

const POSTS = Object.freeze({
  5107: Object.freeze({ slug: "sharshar-elections-redemption-hints-draft", label: "פוסט הבחירות", parent: null, via: null, origins: [] }),
  5113: Object.freeze({
    slug: "bennett-melach-631-78",
    label: "פוסט בנט",
    parent: 5107,
    via: "ציר 631 נפתח בפוסט הבחירות",
    origins: Object.freeze([
      Object.freeze({ id: "yam-hamelach", slug: "yam-hamelach-tiferet-geula", label: "פוסט ים המלח", at: "2026-09-22", note: "פורסם יומיים לפני האירוע" }),
    ]),
  }),
});

const childrenOf = (postId) => Object.entries(POSTS).filter(([, post]) => post.parent === Number(postId)).map(([id]) => Number(id));
const time = (iso) => Date.parse(iso) || 0;

function ownUnits(postId, presentIds) {
  const entries = PROVEN_POST_SOURCE_UPDATES[Number(postId)] || [];
  return orderedSourceUpdates(entries.filter((entry) => !presentIds || presentIds.has(entry.targetId)));
}

// Newest addition inside this post or any post that continues from it (parent is marked when a child changes).
function changedAt(postId, presentIds) {
  let best = 0;
  for (const entry of ownUnits(postId, presentIds)) best = Math.max(best, time(entry.updatedAt));
  for (const child of childrenOf(postId)) best = Math.max(best, time(changedAt(child)));
  return best ? new Date(best).toISOString() : null;
}

/** presentIds: ids of this post's source units that exist in the loaded source (stale guard); null = no guard. */
export function buildPostTree(postId, presentIds = null) {
  const id = Number(postId);
  const post = POSTS[id];
  if (!post) return null;
  const node = (nodeId) => ({
    id: nodeId,
    label: POSTS[nodeId].label,
    href: `/post/${POSTS[nodeId].slug}`,
    changedAt: changedAt(nodeId, nodeId === id ? presentIds : null),
  });
  const parent = post.parent ? { ...node(post.parent), via: post.via } : null;
  const siblings = parent ? childrenOf(post.parent).filter((childId) => childId !== id).map(node) : [];
  const children = childrenOf(id).map((childId) => ({ ...node(childId), note: "המשך מכאן" }));
  const units = ownUnits(id, presentIds);
  if (!parent && !children.length && !units.length && !post.origins.length) return null;
  return {
    current: { ...node(id), here: true },
    parent,
    siblings,
    origins: post.origins.map((origin) => ({ ...origin, href: `/post/${origin.slug}` })),
    children,
    units,
  };
}
