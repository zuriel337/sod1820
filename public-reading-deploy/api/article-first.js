// The first-document article of an imported Post (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026) — server side of the document handler.
// The handler gives it the row the metadata reader already admitted (no second read). The article is added only when:
//   - the answer is a 200 for the Post's own original address, with no query string;
//   - the Post is on the proven list for its exact stored source (postArticleFirstPolicy2029.js);
//   - the server DOM is already loaded in this instance: a cold instance answers exactly as today and loads it in the background, so a cold
//     start never delays a document.
// Any failure leaves the document exactly as today. The page adopts the article's nodes (Post2029Page) and never renders it twice.
import { POST_ARTICLE_DOCUMENT_STYLE, POST_ARTICLE_THEME_SCRIPT, postArticleDocumentHtml2029 } from "../../src/lib/research/postArticleDocument2029.js";
import { postArticleFirstProven2029 } from "../../src/lib/research/postArticleFirstPolicy2029.js";
import { publicPostUrl } from "../../src/lib/publicPostUrls.js";

import provenList from "../article-first-proven.json" with { type: "json" };
const PROVEN = provenList.posts;

let loading = null, renderer = null;
// One server DOM per instance. Rendering is synchronous, so installing its document as the global for one call cannot interleave.
export function loadArticleFirstRenderer({ importDom = () => import("jsdom") } = {}) {
  if (renderer) return Promise.resolve(renderer);
  return loading ??= (async () => {
    const { JSDOM } = await importDom();
    const { window } = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://sod1820.co.il/" });
    renderer = {
      render(post, path) {
        const saved = { document: globalThis.document, CSSStyleSheet: globalThis.CSSStyleSheet };
        globalThis.document = window.document; globalThis.CSSStyleSheet = window.CSSStyleSheet;
        try { return postArticleDocumentHtml2029(post, { document: window.document, path }); }
        finally { globalThis.document = saved.document; globalThis.CSSStyleSheet = saved.CSSStyleSheet; }
      },
    };
    return renderer;
  })().catch(error => { loading = null; throw error; });
}
export function _resetArticleFirstForTests() { loading = null; renderer = null; }

function ownOriginalAddress(post, path) {
  let canonical;
  try { canonical = new URL(publicPostUrl(post), "https://sod1820.co.il").pathname; } catch { return false; }
  const normal = value => { try { return decodeURIComponent(value).replace(/\/+$/, "").toLowerCase(); } catch { return null; } };
  return !canonical.startsWith("/post/") && normal(canonical) !== null && normal(canonical) === normal(path);
}

// → { html, state }: state is "served" | "not-eligible" | "off" | "not-proven" | "warming" | "failed" (the X-Sod-Article-First response header,
// so the share of documents that really carry the article can be counted).
export function withArticleFirst2029(html, options) {
  // Never throws: whatever goes wrong here, the answer is today's document (the handler would otherwise turn an error into a 503).
  try { return articleFirstDocument(html, options); } catch { return { html, state: "failed" }; }
}
// A cold instance loads the server DOM after it has answered. On Vercel a promise handed to the request context's waitUntil (the contract the
// @vercel/functions helper reads) keeps the function alive until it settles; elsewhere the load simply continues in the process. Whether the
// load completes after the response on Vercel is checked on a protected Preview (scripts/check-article-first-cold.mjs), not assumed.
function keepAlive(promise) {
  try { globalThis[Symbol.for("@vercel/request-context")]?.get?.()?.waitUntil?.(promise); } catch { /* no request context: plain process */ }
  return promise;
}
function articleFirstDocument(html, { path, search = "", status, post, proven = PROVEN, load = loadArticleFirstRenderer }) {
  if (status !== 200 || !post || search || !ownOriginalAddress(post, path)) return { html, state: "not-eligible" };
  // No template: this build was made without a fresh proof (or without the article path); nothing is loaded.
  if (!html.includes('<template id="sod29-article-first-css">')) return { html, state: "off" };
  if (!postArticleFirstProven2029(post, proven)) return { html, state: "not-proven" };
  if (!renderer) { keepAlive(load().catch(() => {})); return { html, state: "warming" }; }
  let article;
  try { article = renderer.render(post, path); } catch { return { html, state: "failed" }; }
  // The page's own stylesheets, listed by the build in an inert template, become real stylesheets for this document only.
  const withStyles = html.replace(/<template id="sod29-article-first-css">([\s\S]*?)<\/template>/, "$1");
  if (withStyles === html || !/<\/body>/i.test(withStyles)) return { html, state: "failed" };
  // The reader's theme preset is set on <html> before the first paint (the frame around the article follows it), then the article.
  const themed = withStyles.replace(/<head(\s[^>]*)?>/i, match => `${match}${POST_ARTICLE_THEME_SCRIPT}`);
  return { html: themed.replace(/<\/body>/i, `${POST_ARTICLE_DOCUMENT_STYLE}${article}</body>`), state: "served" };
}
