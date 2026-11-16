// Which Posts may carry their article in the first document (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026; NEW_POST_ARTICLE_FIRST, ZURIEL 16.11.2026:
// "צריך להגדיר גם ... לפוסטים חדשים ... שיהיה מהיר"). An ordinary Post at its own public address, read through the existing publication rules
// (the document handler's own admitted row), with the plain reading, imported or written on the site. Its stored source is on the proven list
// when the server built exactly the browser's article from that very source (keyed by source and voice: an edited Post leaves the list until it
// is proven again). A Post written on the site after the list was made has no proof yet: it may carry its article only on the guarded path of
// the document handler (postArticleFirstNewPost2029), and the page still adopts it only when it is exactly its own article.
import { hasSuppressedPublicPostTag } from "./publicPostBoundary.js";
import { postCharacterFor } from "../postCharacters2029.js";
import { contentSeriesKeysForPost } from "./contentSeries2029Identity.js";
import { REALITY_MAP_KEY } from "./realityMap2029.js";
import { PROVEN_POST_SOURCE_UPDATES } from "./postSourceUpdates2029.js";
import { SPECIAL_READING_SLUGS } from "./postSpecialReadings2029.js";
import { postArticleProofKey2029 } from "./postArticlePipeline2029.js";

// Candidate: before the proof. Same shape for the server path and the proof script.
export function postArticleFirstCandidate2029(post) {
  if (!post || typeof post.content !== "string" || !post.content.trim()) return false;
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

// A Post written on the site (not imported) that is not on the proven list: published or edited after the list was made. The document handler
// may still give it its article when no first-paint rule that was left out could apply to it (article-first.js); imported Posts are proven at
// every build, so one that is not on the list stays on the existing path.
export function postArticleFirstNewPost2029(post, proven) {
  return postArticleFirstCandidate2029(post) && post.source !== "wordpress" && !postArticleFirstProven2029(post, proven);
}
