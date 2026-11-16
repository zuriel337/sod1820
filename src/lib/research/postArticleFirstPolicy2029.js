// Which Posts may carry their article in the first document (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026). Only an ordinary imported Post at its
// original address, read through the existing publication rules (the document handler's own admitted row), with the plain reading, and only
// when its stored source is on the proven list: the server built exactly the browser's article from that very source. Everything else keeps
// the existing path. The proven list is keyed by the source and voice (postArticleProofKey2029), so an edited Post leaves the list until it is proven again.
import { hasSuppressedPublicPostTag } from "./publicPostBoundary.js";
import { postCharacterFor } from "../postCharacters2029.js";
import { contentSeriesKeysForPost } from "./contentSeries2029Identity.js";
import { REALITY_MAP_KEY } from "./realityMap2029.js";
import { PROVEN_POST_SOURCE_UPDATES } from "./postSourceUpdates2029.js";
import { SPECIAL_READING_SLUGS } from "./postSpecialReadings2029.js";
import { postArticleProofKey2029 } from "./postArticlePipeline2029.js";

// Candidate: before the proof. Same shape for the server path and the proof script.
export function postArticleFirstCandidate2029(post) {
  if (!post || post.source !== "wordpress" || typeof post.content !== "string" || !post.content.trim()) return false;
  if (hasSuppressedPublicPostTag(post)) return false;
  if (postCharacterFor(post) !== "plain") return false;
  if (contentSeriesKeysForPost(post).includes(REALITY_MAP_KEY)) return false;
  if ((PROVEN_POST_SOURCE_UPDATES[Number(post.id)] || []).length) return false;
  if (SPECIAL_READING_SLUGS.includes(String(post.slug || ""))) return false;
  return true;
}

// Proven: a candidate whose exact stored source and voice are on the list (postArticleProofKey2029).
export function postArticleFirstProven2029(post, proven) {
  return postArticleFirstCandidate2029(post) && Boolean(proven) && proven[String(post.id)] === postArticleProofKey2029(post);
}
