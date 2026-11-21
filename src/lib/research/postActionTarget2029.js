import { publicPostHref, publicPostUnitHref, publicPostUrl } from "../publicPostUrls.js";
import { entityFromPost, makeEntity } from "./entity.js";
import { registeredUnitIds } from "./postSourceUpdates2029.js";

// An authored unit or a registered update must resolve to one real anchor in
// this article. Generated preview units and repeated HTML ids are ineligible.
export function postActionUnits2029(post, root) {
  if (!root || !post) return [];
  const registered = new Set(registeredUnitIds(post.id));
  const anchors = [...root.querySelectorAll("[id]")];
  const counts = new Map();
  for (const node of anchors) counts.set(node.id, (counts.get(node.id) || 0) + 1);
  return anchors.filter(node => counts.get(node.id) === 1
    && !node.closest("[data-preview-unit]")
    && (registered.has(node.id) || node.getAttribute("data-sod-unit") === node.id)
    && publicPostUnitHref(post, node.id))
    .map(node => ({
      postId: String(post.id),
      id: node.id,
      title: (node.querySelector("[data-sod-role='title'],h2,h3,h4")?.textContent || node.getAttribute("aria-label") || "")
        .replace(/\s+/g, " ").trim().slice(0, 140),
    }));
}

// Consumers pass the units of this public post, never an unchecked URL hash.
export function postActionTarget2029(projection, units = [], unitId = "") {
  if (!projection?.post || projection.draft || projection.privateStage || projection.previewSnapshot) return null;
  const { post } = projection;
  const href = publicPostHref(post);
  const url = publicPostUrl(post);
  if (!href || !url || !/^[1-9]\d*$/.test(String(post.id)) || !Number.isSafeInteger(Number(post.id))) return null;
  const postRef = `posts:${post.id}`;
  if (!unitId) {
    return { postId: post.id, unitId: null, ref: postRef, href, url, title: post.title,
      entity: { ...entityFromPost(post), link: href } };
  }
  const unit = units.find(item => item.postId === String(post.id) && item.id === unitId);
  const unitHref = unit && publicPostUnitHref(post, unit.id);
  if (!unitHref) return null;
  const ref = `${postRef}#${unit.id}`;
  const title = unit.title ? `${post.title} · ${unit.title}` : `${post.title} · ${unit.id}`;
  return { postId: post.id, unitId: unit.id, ref, href: unitHref, url: new URL(unitHref, url).href, title,
    entity: makeEntity({ type: "post_unit", ref, title, link: unitHref, metadata: { postId: post.id, unitId: unit.id } }) };
}
