// The page side of the first-document article (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026). The page adopts the document article's body nodes
// only when they are exactly what it would render; the reader's place is kept: the address's own target when there is one, otherwise the block
// at the reading line, measured before and after and compensated by one scroll. Anything that does not match is replaced in place, once.
export const POST_ARTICLE_DOCUMENT_ID = "sod29-ssr-article";

export function documentArticleFor(postId) {
  const node = typeof document === "undefined" ? null : document.getElementById(POST_ARTICLE_DOCUMENT_ID);
  return node && node.dataset.ssrPost === String(postId) ? node : null;
}

// The real widths of the Post's original images that the first document was built with ({ url: width }; postImageRenditionSet2029), so the
// page offers exactly the same copies. Kept per Post once read: the document article is removed when the page adopts it.
const imageFactsByPost = new Map();
export function documentImageFactsFor(postId) {
  const key = postId == null ? "" : String(postId);
  if (!key) return null;
  if (imageFactsByPost.has(key)) return imageFactsByPost.get(key);
  const node = documentArticleFor(key);
  if (!node) return null;
  let facts = null;
  try { facts = node.dataset.ssrImageFacts ? JSON.parse(node.dataset.ssrImageFacts) : null; } catch { facts = null; }
  imageFactsByPost.set(key, facts);
  return facts;
}

// Exactly the page's own article? The document marks the duplicate cover itself; the page marks it after rendering, so that mark is not compared.
export function documentArticleBodyMatches(body, html) {
  if (!body) return false;
  const theirs = body.cloneNode(true);
  theirs.querySelectorAll("[data-duplicate-cover]").forEach(node => node.removeAttribute("data-duplicate-cover"));
  const mine = document.createElement("template"); mine.innerHTML = String(html || "");
  const a = [...mine.content.childNodes], b = [...theirs.childNodes];
  return a.length === b.length && a.every((node, index) => node.isEqualNode(b[index]));
}

const READING_LINE = () => Math.min(window.innerHeight * 0.33, 220);

// What the reader is on, in the document article: { kind, node, index, top }.
export function readingPlace2029(article, hash = "") {
  const body = article.querySelector('[data-ssr-body="true"]');
  if (hash && hash.length > 1) {
    let id = hash.slice(1); try { id = decodeURIComponent(id); } catch { /* raw */ }
    const target = [...article.querySelectorAll("[id],a[name]")].find(node => node.id === id || node.getAttribute("name") === id);
    if (target) return { kind: "target", node: target, top: target.getBoundingClientRect().top };
  }
  const line = READING_LINE();
  const head = [["title", article.querySelector("h1")], ["byline", article.querySelector(".sod29-reading-byline")], ["cover", article.querySelector("[data-ssr-cover]")]];
  for (const [kind, node] of head) {
    const box = node?.getBoundingClientRect();
    if (box && box.height > 0 && box.bottom > line) return { kind, node, top: box.top };
  }
  const blocks = [...(body?.children || [])];
  for (let index = 0; index < blocks.length; index += 1) {
    const box = blocks[index].getBoundingClientRect();
    if (box.height > 0 && box.bottom > line) return { kind: "block", node: blocks[index], index, top: box.top };
  }
  return null;
}

// Where the same place is in the page's article (after adoption the body nodes are the same nodes).
export function samePlaceInPage2029(place, pageArticle, pageBody) {
  if (!place || !pageArticle) return null;
  if (place.kind === "target" || place.kind === "block") {
    if (pageBody?.contains(place.node)) return place.node;
    return place.kind === "block" ? pageBody?.children[place.index] || null : null;
  }
  if (place.kind === "title") return pageArticle.querySelector("h1");
  if (place.kind === "byline") return pageArticle.querySelector(".sod29-reading-byline") || pageArticle.querySelector("h1");
  if (place.kind === "cover") return pageArticle.querySelector(".sod29-reading-cover");
  return null;
}

// The browser's own scroll anchoring would also react to the swap (it picks its own anchor and adjusts after layout), and the two corrections
// add up. It is switched off for the swap and the next two frames, while this keeps the reader's place.
export function suspendScrollAnchoring2029() {
  const targets = [document.documentElement, document.body].filter(Boolean);
  const saved = targets.map(node => node.style.overflowAnchor);
  targets.forEach(node => { node.style.overflowAnchor = "none"; });
  return () => targets.forEach((node, index) => { node.style.overflowAnchor = saved[index]; });
}
// The correction is measured in the next frames, before they are painted, never in the adoption itself: in that instant the System Frame has not
// yet finished its own update (it portals its orientation mark into the page's header in the same commit), so the page's article can sit
// elsewhere for a moment; a correction measured then is undone by the frame and paints as a jump (measured in the lab: 48 px for one frame).
// With the page's own frame and header in the first document, the settled difference is normally zero and nothing scrolls.
export function keepReaderInPlace2029(place, counterpart, { resume = () => {}, settled = () => {} } = {}) {
  if (!place || !counterpart) { resume(); settled(0); return; }
  let total = 0;
  const correct = () => { const delta = counterpart.getBoundingClientRect().top - place.top; if (Math.abs(delta) > 0.5) { window.scrollBy({ top: delta, left: 0, behavior: "instant" }); total += delta; } };
  requestAnimationFrame(() => { correct(); requestAnimationFrame(() => { correct(); resume(); settled(Math.round(total)); }); });
}
