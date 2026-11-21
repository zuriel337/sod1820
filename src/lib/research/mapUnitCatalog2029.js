import { publicPostUnitHref } from "../publicPostUrls.js";
import { canonicalPostCategories } from "../postCategoryIdentity.js";
import { contentSeriesKeysForPost } from "./contentSeries2029Identity.js";
import { mapLeadId, mapTimelinePostIds, mapUnitReading } from "./mapUnitReading2029.js";
import { sharsharId, sharsharSourceIds } from "./electionsUnitTimelinePreview2029.js";
import { orderedSourceUpdates, PROVEN_POST_SOURCE_UPDATES } from "./postSourceUpdates2029.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";
import { getPublicResearchClient } from "./researchViewMode.js";

const fields = "id,title,slug,tags,categories,source,link,wp_id,image_url,thumb_url";

function mapRow(post, proof) {
  if (!post || proof.sourceSlug !== post.slug || hasSuppressedPublicPostTag(post)
    || ["gpt-draft", "web"].includes(post.source) || !contentSeriesKeysForPost(post).includes("reality-map")) return null;
  const unit = mapUnitReading(post.id, proof.targetId);
  const href = publicPostUnitHref(post, proof.targetId);
  return href && { ...proof, ...unit, key: proof.targetId, label: unit?.label || proof.label, href,
    postId: Number(post.id), postTitle: post.title, categories: canonicalPostCategories(post.categories),
    cover: post.image_url || post.thumb_url || null };
}

// Home and the post rail need only the reviewed pair. Reserve the bounded source-body read for the full World timeline.
export async function readMapTimeline(signal, { all = false } = {}) {
  const client = getPublicResearchClient();
  const entries = await Promise.all((all ? Object.keys(PROVEN_POST_SOURCE_UPDATES) : mapTimelinePostIds).map(async id => {
    const proofs = PROVEN_POST_SOURCE_UPDATES[id];
    const editorial = mapUnitReading(id);
    const slug = editorial?.slug || proofs[0]?.sourceSlug;
    if (!slug) return [];
    const query = client.from("posts").select(all ? fields + ",content" : fields)
      .eq("id", id).eq("slug", slug).eq("home_hidden", false).or(publicPostOnlyFilter());
    if (!all) query.like("content", '%id="' + editorial.key + '"%');
    const { data, error } = await query.abortSignal(signal).maybeSingle();
    if (error) throw error;
    if (!data) return [];
    if (!all) return proofs.filter(proof => proof.targetId === editorial.key).map(proof => mapRow(data, proof));

    const source = new DOMParser().parseFromString(data.content || "", "text/html");
    const counts = new Map();
    for (const node of source.querySelectorAll("[id]")) counts.set(node.id, (counts.get(node.id) || 0) + 1);
    const aliases = Number(id) === mapLeadId && counts.get(sharsharId) === 1 ? sharsharSourceIds : [];
    return proofs.filter(proof => counts.get(proof.targetId) === 1 && !aliases.includes(proof.targetId)).map(proof => mapRow(data, proof));
  }));
  return orderedSourceUpdates(entries.flat().filter(Boolean));
}
