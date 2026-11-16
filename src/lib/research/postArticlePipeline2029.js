// The ONE article pipeline of an imported Post, used by the page (Post2029Page) and by the first document (public-document article-first):
// postReadingHtml2029 (scoping, removal of scripts/stylesheets, WordPress clean-up) -> hardenPassiveMediaHtml -> annotatePostSource (the
// semantic layer, on unless ?proto=0). The input is the projected content: for an ordinary imported Post, markLegacyEqualityLines(raw).
import { postReadingHtml2029, markLegacyEqualityLines } from "./postArticleCore2029.js";
import { hardenPassiveMediaHtml } from "../mediaEgressGuard.js";
import { annotatePostSource } from "./postSemanticDesign2029.js";
import { postVoiceFor } from "../postVoice2029.js";

export function postArticleSourceHtml2029(projectedContent, { postId = null, voice = "unspecified", annotate = true } = {}) {
  const hardened = hardenPassiveMediaHtml(postReadingHtml2029(projectedContent || ""));
  return annotate ? annotatePostSource(hardened, { postId, voice }) : hardened;
}

// The same, from a stored row of an ordinary imported Post (what the projection would project).
export function postArticleSourceHtmlFromRow2029(row) {
  return postArticleSourceHtml2029(markLegacyEqualityLines(row?.content || ""), { postId: row?.id ?? null, voice: postVoiceFor(row).voice });
}

// The identity of the stored source an article was built from: FNV-1a over the raw content, plus its length.
export function postArticleSourceKey2029(content) {
  let hash = 0x811c9dc5; const text = String(content || "");
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `${hash.toString(16).padStart(8, "0")}:${text.length}`;
}
