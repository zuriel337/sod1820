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

const AXES = Object.freeze({
  631: Object.freeze({ id: "axis-631", label: "ציר 631", href: "/number/631", opensIn: 5107, continuesIn: 5113 }),
});

const rootOf = (postId) => { let id = Number(postId); while (POSTS[id]?.parent) id = POSTS[id].parent; return id; };

/**
 * The whole declared tree around a post, always rooted at the first post, so the reader sees where everything comes
 * from and where they are: Elections post -> its source units + axis 631 -> Bennett post -> its source units.
 * presentIds guards only the CURRENT post's units against the loaded source (other posts' units are certified proof).
 */
export function buildPostTree(postId, presentIds = null) {
  const here = Number(postId);
  if (!POSTS[here]) return null;
  const unitNodes = (ownerId) => ownUnits(ownerId, ownerId === here ? presentIds : null).map((entry) => ({
    kind: "unit",
    id: entry.id,
    label: entry.label,
    href: `/post/${POSTS[ownerId].slug}#${encodeURIComponent(entry.targetId)}`,
    addedAt: entry.updatedAt,
    here: false,
  }));
  const postNode = (id) => {
    const post = POSTS[id];
    const kids = childrenOf(id);
    const axis = kids.length ? AXES[631] : null;
    const children = [
      ...unitNodes(id),
      ...(axis && axis.opensIn === id ? [{
        kind: "axis", id: axis.id, label: axis.label, href: axis.href, here: false,
        changedAt: changedAt(axis.continuesIn),
        children: [postNode(axis.continuesIn)],
      }] : kids.map(postNode)),
    ];
    return {
      kind: "post", id, label: post.label, href: `/post/${post.slug}`, here: id === here,
      changedAt: changedAt(id, id === here ? presentIds : null),
      via: post.via,
      origins: post.origins.map((origin) => ({ ...origin, href: `/post/${origin.slug}` })),
      children,
    };
  };
  const root = postNode(rootOf(here));
  const hasMore = root.children.length || root.origins.length || JSON.stringify(root).includes('"origins":[{');
  return hasMore ? { root, hereId: here } : null;
}
