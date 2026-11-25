// The article transforms of a Post, moved unchanged out of post2029ReadingProjection.js (OLD_POST_ARTICLE_FIRST, 16.11.2026) so that the page
// and the server document run the SAME code. A leaf module: no Supabase client, no research system. Needs a DOM (the browser's, or one
// the caller installs for the duration of a synchronous call). Three property writes became the equivalent attribute writes.

import { annotateLegacyColors2029, legacyColorRules2029 } from "./postLegacyColor2029.js";
import { thumb } from "../img.js";

export const clean = (value) => value == null ? "" : String(value).trim();

// The plain text of stored HTML (the reading projection's excerpt fallback), moved unchanged out of post2029ReadingProjection.js (stripTags).
export function postPlainText2029(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function postCssSelectors(selector) {
  const selectors = []; let start = 0, depth = 0, quote = null, escaped = false;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === "," && !depth) { selectors.push(selector.slice(start, index)); start = index + 1; }
  }
  selectors.push(selector.slice(start));
  return selectors.map(value => value.trim()).filter(Boolean);
}

// The scoping of an authored <style> block, as text: the same result in every DOM (no CSSOM). Style rules are scoped to the reading source;
// @media and @supports keep their scoped rules; everything else (@import, @font-face, @keyframes, @page, @layer ...) belongs to the existing
// 2029 owners and is dropped, as before. Nested rules inside a style rule are not kept.
const STRING_OR_ESCAPE = (css, index, state) => {
  const char = css[index];
  if (state.quote) { if (char === "\\") return 2; if (char === state.quote) state.quote = null; return 1; }
  if (char === '"' || char === "'") { state.quote = char; return 1; }
  return 0;
};
function withoutNestedBlocks(body) {
  let out = "", depth = 0; const state = { quote: null };
  for (let index = 0; index < body.length; index += 1) {
    const skip = STRING_OR_ESCAPE(body, index, state);
    if (skip) { if (!depth) out += body.slice(index, index + skip); index += skip - 1; continue; }
    const char = body[index];
    if (char === "{") { if (!depth) out = out.slice(0, out.lastIndexOf(";") + 1); depth += 1; continue; }
    if (char === "}") { depth = Math.max(0, depth - 1); continue; }
    if (!depth) out += char;
  }
  return out;
}
function scopeCssBlock(css, scope) {
  const out = []; let index = 0;
  while (index < css.length) {
    const state = { quote: null }; let end = index, paren = 0;
    for (; end < css.length; end += 1) {
      const skip = STRING_OR_ESCAPE(css, end, state); if (skip) { end += skip - 1; continue; }
      const char = css[end];
      if (char === "(") paren += 1; else if (char === ")") paren = Math.max(0, paren - 1);
      else if (!paren && (char === "{" || char === ";" || char === "}")) break;
    }
    if (end >= css.length) break;
    const prelude = css.slice(index, end).trim();
    if (css[end] !== "{") { index = end + 1; continue; }            // a statement at-rule (@import ...;) or a stray brace
    let close = end + 1, depth = 1; state.quote = null;
    for (; close < css.length && depth; close += 1) {
      const skip = STRING_OR_ESCAPE(css, close, state); if (skip) { close += skip - 1; continue; }
      if (css[close] === "{") depth += 1; else if (css[close] === "}") depth -= 1;
    }
    const body = css.slice(end + 1, depth ? close : close - 1);
    index = close;
    if (!prelude) continue;
    if (prelude[0] === "@") {
      const name = (/^@([-\w]+)/.exec(prelude) || [])[1]?.toLowerCase();
      if (name === "media" || name === "supports") { const inner = scopeCssBlock(body, scope); if (inner.length) out.push(`${prelude.replace(/\s+/g, " ")} {${inner.join("\n")}}`); }
      continue;
    }
    const declarations = withoutNestedBlocks(body).trim();
    const selectors = postCssSelectors(prelude).map(selector => `${scope} ${selector.replace(/\s+/g, " ")}`);
    if (selectors.length && declarations) out.push(`${selectors.join(",")} {${declarations}}`, ...legacyColorRules2029(selectors, declarations));
  }
  return out;
}
export function scopePostStyleText2029(text, scope = ".sod29-reading-source") {
  const css = String(text || "").replace(/\/\*[\s\S]*?(?:\*\/|$)/g, "").replace(/<!--|-->/g, "");
  return scopeCssBlock(css, scope).join("\n");
}

// Presentation containment over the authored source, not an HTML sanitizer or
// a source rewrite. Legacy plugin resources never become 2029 global styles.
export function postReadingHtml2029(html) {
  if (!globalThis.document?.createElement) return String(html || "");
  const template = document.createElement("template"); template.innerHTML = String(html || "");
  for (const iframe of template.content.querySelectorAll("iframe[src]")) {
    try { const u=new URL(iframe.getAttribute("src"),"https://sod1820.co.il");
      if(["sod1820.co.il","www.sod1820.co.il","sod1820.vercel.app"].includes(u.hostname) && /^\/[^/]+\/embed\/?$/.test(u.pathname)) {
        const link=document.createElement("a");link.setAttribute("href",u.pathname.replace(/\/embed\/?$/,"/")+u.search+u.hash);
        link.textContent=iframe.getAttribute("title")||"לקריאת הפוסט המקושר במלואו ←";iframe.replaceWith(link);
      }
    } catch { /* malformed embeds do not supply identity */ }
  }
  for (const dependency of template.content.querySelectorAll('script,link[rel~="stylesheet"],link[rel="preload"][as="style"]')) dependency.remove();
  // Comments and <noscript> fallbacks (old gallery plugins) are never shown to a reader of this page, whose scripting is on. They are
  // dropped from the displayed copy, so that every DOM (the browser's, the server's) parses the copy the same way: comments that hold
  // markup and noscript text are where HTML parsers differ. The stored source keeps them (OLD_POST_ARTICLE_FIRST, 16.11.2026).
  for (const fallback of template.content.querySelectorAll("noscript")) fallback.remove();
  const comments = []; const walker = document.createTreeWalker(template.content, 128 /* NodeFilter.SHOW_COMMENT */);
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach(comment => comment.remove());
  for (const icon of template.content.querySelectorAll('img[src*="/wp-content/plugins/gallery-images/"]')) {
    // WordPress plugin arrows/spinners are UI assets, not the authored gallery
    // images. Keep the raw source witness and all actual media URLs unchanged.
    const loader = icon.closest(".loading");
    if (loader && !clean(loader.textContent) && loader.querySelectorAll("img").length === 1) loader.remove();
    else icon.remove();
  }
  // Authored <style> blocks keep their rules, scoped to the reading source, by a portable scoping of the text (below): the same text in every
  // DOM. The browser's CSSOM parses and serializes differently from a server DOM, which removed these blocks on the server (16.11.2026).
  for (const style of template.content.querySelectorAll("style")) {
    const scoped = scopePostStyleText2029(style.textContent || "");
    if (scoped) { style.textContent = scoped; style.setAttribute("data-post-scoped-style", "true"); } else style.remove();
  }
  // Authored colours readable in every theme, the source untouched (postLegacyColor2029.js).
  annotateLegacyColors2029(template.content);
  for (const frame of template.content.querySelectorAll("iframe")) {
    // Attribute writes: what the browser's reflected properties write, so a server DOM produces the same markup.
    frame.setAttribute("loading", "lazy");
    if (!clean(frame.getAttribute("title"))) frame.setAttribute("title", "מדיה מוטמעת מתוך הפוסט");
  }
  return template.innerHTML;
}

// Some WordPress Posts authored equalities as plain text with a colored value,
// before data-gem existed. Decorate only complete, explicit equality lines.
// Preserve their wording, colors and media; no association is engine-verified
// here. Each operand opens its own canonical Number calculation.
export function markLegacyEqualityLines(content = "") {
  const operand = (text, numeric = false) => `<button type="button" class="${numeric ? "sod29-gematria-value" : "sod29-gematria-expression"}" data-post-equality-operand="true" data-gem="${text.trim().replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">${text.trim()}</button>`;
  const hebrew = '[א-ת][א-ת\\u0591-\\u05C7 ״׳"\\x27-]{0,70}';
  const forward = new RegExp('(^|>|\\n)(' + hebrew + ')\\s*=\\s*(<span\\b[^>]*>)?(\\d{1,9})(<\\/span>)?(?:\\s*=\\s*(' + hebrew + '))?(?=\\s*(?:<br\\b|<\\/(?:p|h[1-6]|div)>|$))', 'g');
  const reverse = new RegExp('(^|>|\\n)(\\d{1,9})\\s*=\\s*(' + hebrew + ')(?=\\s*(?:<br\\b|<\\/(?:p|h[1-6]|div)>|$))', 'g');
  return String(content).split(/(<(?:a|button|script|style|pre|code)\b[^>]*>[\s\S]*?<\/(?:a|button|script|style|pre|code)>)/gi).map((part, index) => index % 2 ? part : part
    .replace(forward, (match, start, phrase, span, number, endSpan, other) => `${start}${operand(phrase)} = ${span || ""}${operand(number, true)}${endSpan || ""}${other ? ` = ${operand(other)}` : ""}`)
    .replace(reverse, (match, start, number, phrase) => `${start}${operand(number, true)} = ${operand(phrase)}`)).join("");
}

// Smaller images for the article (ZURIEL 16.11.2026: "גרסאות קטנות ורספונסיביות, עם מקור שמור וטקסט ותרשימים שנשארים ברורים"). The stored
// source is the original and stays the image's src (and what the image viewer opens); the browser is offered width-bounded copies of the SAME
// image from the Storage render endpoint (resize=contain: never cropped, never enlarged past the original; img.js), and picks the one that
// covers its displayed size at the screen's density, so letters and diagrams are as sharp as they are drawn. Only images whose size the markup
// already reserves (width and height) get copies, so the choice of file never changes the layout; GIF and SVG keep the original.
export const POST_IMAGE_RENDITION_WIDTHS = Object.freeze([480, 768, 1080, 1600]);
export const POST_IMAGE_QUALITY = 80;
// With the original's real width known (facts: { [original url]: width }, read from the files by scripts/scan-article-image-facts.mjs and
// carried to the page by the first document), a copy is offered only where it is clearly smaller (at most 85% of the original's width) and the
// original itself is the widest candidate, at its real width: a copy is never the original re-encoded at its own size, which can be heavier
// than the original (16.11.2026: a 1,024 px cover's "1080" copy was 157 KB against 151 KB). An original too small for any copy keeps no set.
// Without facts: the four widths, as before.
export const POST_IMAGE_COPY_SHARE = 0.85;
const factWidth = (facts, url) => { const value = facts?.[url]; const width = Number(Array.isArray(value) ? value[0] : value); return Number.isFinite(width) && width > 0 ? Math.round(width) : 0; };
export function postImageRenditionSet2029(src, facts = null) {
  const url = clean(src);
  const first = thumb(url, POST_IMAGE_RENDITION_WIDTHS[0], POST_IMAGE_QUALITY);
  if (!url || first === url || url.includes("?")) return "";
  const original = factWidth(facts, url);
  if (!original) return POST_IMAGE_RENDITION_WIDTHS.map(width => `${thumb(url, width, POST_IMAGE_QUALITY)} ${width}w`).join(", ");
  const copies = POST_IMAGE_RENDITION_WIDTHS.filter(width => width <= original * POST_IMAGE_COPY_SHARE);
  return copies.length ? [...copies.map(width => `${thumb(url, width, POST_IMAGE_QUALITY)} ${width}w`), `${url} ${original}w`].join(", ") : "";
}
// The column the article's images are drawn in (post2029-reading.css: the reading source on a phone, the reading column on a wider screen).
export const POST_COVER_IMAGE_SIZES = "(max-width: 760px) calc(100vw - 36px), 560px";

// A Post whose body carries its own video opens with the video, not with a separate cover image above it (ZURIEL 20.11.2026: "לא מתאים
// לי שבכל פוסט רואים תמונה קטנה כזאת ואז וידאו ... צריך להיות קודם כל את הפרטים של הפוסט"). The cover stays the Post's image for cards and
// sharing (image_url is unchanged); only the reading cover figure yields. One rule for the page and the first-document article.
export function postReadingCoverYieldsToVideo2029(post) {
  return typeof post?.content === "string" && /<video[\s>]/i.test(post.content);
}
const bodyImageSizes = width => `(max-width: 760px) min(calc(100vw - 68px), ${width}px), min(680px, ${width}px)`;

// The article's own images: copies offered as above; images below the opening screen load when the reader approaches them (when the Post has
// a cover, every body image is below it; without one, the first body image keeps its authored loading), off the main thread.
export function postArticleImages2029(html, { cover = "", facts = null } = {}) {
  if (!globalThis.document?.createElement) return String(html || "");
  const template = document.createElement("template"); template.innerHTML = String(html || "");
  const images = [...template.content.querySelectorAll("img[src]")];
  images.forEach((image, index) => {
    if (!copiesApply(image)) return;
    const set = postImageRenditionSet2029(image.getAttribute("src"), facts);
    if (set) { image.setAttribute("srcset", set); image.setAttribute("sizes", bodyImageSizes(Math.round(Number(image.getAttribute("width"))))); }
    else { image.removeAttribute("srcset"); image.removeAttribute("sizes"); }   // an original too small for copies: it alone, as authored
    image.setAttribute("decoding", "async");
    if (clean(cover) || index > 0) image.setAttribute("loading", "lazy");
  });
  markPostMediaRows2029(template.content);
  return template.innerHTML;
}
// Centred media (ZURIEL 25.11.2026: "אם בדפים האלו יש תמונות תמרכז אותם"). A WordPress paragraph or block that holds only media (images,
// video, embedded frames, their links, with no words) is a media row: post2029-reading.css centres it. Images side by side stay side by side,
// a paragraph with words keeps its alignment, floated images (alignleft/alignright) keep their wrap. An attribute write, so the server DOM and the
// browser produce the same markup.
const MEDIA_ROW_BLOCKS = "p,div,figure,center,li,td,h1,h2,h3,h4,h5,h6";
export function markPostMediaRows2029(root) {
  for (const media of root.querySelectorAll("img,video,iframe")) {
    // No block around it: the media (or its link) stands at the top of the article and is its own row.
    let top = media; while (top.parentElement) top = top.parentElement;
    const block = media.parentElement?.closest(MEDIA_ROW_BLOCKS);
    const wordNext = node => node && node.nodeType === 3 && node.textContent.replace(/[\s\u00a0\u200b-\u200f]+/g, "");
    if (!block && (wordNext(top.previousSibling) || wordNext(top.nextSibling))) continue;   // words beside it: it stays in their line
    const row = block || top;
    if (row.hasAttribute("data-post-media-row") || row.querySelector("table,ul,ol,p,blockquote,h1,h2,h3,h4,h5,h6")) continue;
    if (row.textContent.replace(/[\s\u00a0\u200b-\u200f]+/g, "")) continue;
    row.setAttribute("data-post-media-row", "true");
  }
}
// An image of the article that copies apply to: its size is reserved by the markup and its file is a Storage original.
function copiesApply(image) {
  const width = Number(image.getAttribute("width")), height = Number(image.getAttribute("height"));
  return width > 0 && height > 0 && Boolean(postImageRenditionSet2029(image.getAttribute("src")));
}
// The originals that copies apply to in an article (its html, from the pipeline) and its cover: what scripts/scan-article-image-facts.mjs measures,
// what the first document carries the facts of, and what the release warm-up asks copies of.
export function postArticleImageOriginals2029(html, cover = "") {
  const out = new Set();
  if (postImageRenditionSet2029(cover)) out.add(clean(cover));
  if (globalThis.document?.createElement) {
    const template = document.createElement("template"); template.innerHTML = String(html || "");
    for (const image of template.content.querySelectorAll("img[src]")) if (copiesApply(image)) out.add(clean(image.getAttribute("src")));
  }
  return [...out];
}
// The facts of exactly these originals (what a first document carries): { url: width }.
export function postImageFactsFor2029(urls, facts) {
  const out = {};
  for (const url of urls) { const width = factWidth(facts, url); if (width) out[url] = width; }
  return out;
}
