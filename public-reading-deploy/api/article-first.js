// The first-document article of a Post (OLD_POST_ARTICLE_FIRST and NEW_POST_ARTICLE_FIRST, ZURIEL 16.11.2026) — server side of the document handler.
// The handler gives it the row the metadata reader already admitted (no second read). The article is added only when:
//   - the answer is a 200 for the Post's own public address (an imported Post's original address, a site Post's /post/ address), no query;
//   - the Post is on the proven list for its exact stored source (postArticleFirstPolicy2029.js), or it is a Post written on the site after the
//     list was made and its article names nothing that a first-paint rule left out of this build depends on (the build's guard);
//   - the server DOM is already loaded in this instance: a cold instance answers exactly as today and loads it in the background, so a cold
//     start never delays a document.
// Any failure leaves the document exactly as today. The page adopts the article's nodes (Post2029Page) and never renders it twice.
import { POST_ARTICLE_DOCUMENT_STYLE, POST_ARTICLE_THEME_SCRIPT, postArticleDocumentHtml2029 } from "../../src/lib/research/postArticleDocument2029.js";
import { postArticleFirstProven2029, postArticleFirstNewPost2029 } from "../../src/lib/research/postArticleFirstPolicy2029.js";
import { readFile } from "node:fs/promises";
import { publicPostUrl } from "../../src/lib/publicPostUrls.js";

import provenList from "../article-first-proven.json" with { type: "json" };
import imageFacts from "../article-image-facts.json" with { type: "json" };
const PROVEN = provenList.posts;
// The real widths of the proven Posts' original images (scripts/scan-article-image-facts.mjs): copies only where they are smaller than the original.
const IMAGE_FACTS = imageFacts.images || {};

let loading = null, renderer = null, loadedGuard = null;
// The names that the first-paint rules left out of this build depend on (scripts/build-public-reading-production.mjs writes it with the template).
const readBuildGuard = () => readFile(new URL("../.generated/article-first-guard.json", import.meta.url), "utf8").then(JSON.parse);
export const articleFirstGuardFromJson = json => json && typeof json === "object"
  ? Object.fromEntries(["tags", "classes", "ids", "attributes", "attributeValues"].map(key => [key, new Set(Array.isArray(json[key]) ? json[key] : [])])) : null;
// One server DOM per instance. Rendering is synchronous, so installing its document as the global for one call cannot interleave.
export function loadArticleFirstRenderer({ importDom = () => import("jsdom"), readGuard = readBuildGuard } = {}) {
  if (renderer) return Promise.resolve(renderer);
  return loading ??= (async () => {
    // Without its guard file this instance gives no new Post its article; proven Posts are unaffected.
    loadedGuard = await Promise.resolve().then(readGuard).then(articleFirstGuardFromJson).catch(() => null);
    const { JSDOM } = await importDom();
    const { window } = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://sod1820.co.il/" });
    renderer = {
      render(post, path, facts = IMAGE_FACTS) {
        const saved = { document: globalThis.document, CSSStyleSheet: globalThis.CSSStyleSheet };
        globalThis.document = window.document; globalThis.CSSStyleSheet = window.CSSStyleSheet;
        try { return postArticleDocumentHtml2029(post, { document: window.document, path, facts }); }
        finally { globalThis.document = saved.document; globalThis.CSSStyleSheet = saved.CSSStyleSheet; }
      },
      // Does the article name a tag, class, id, attribute or attribute value that a left-out first-paint rule depends on?
      namesGuarded(html, guard) {
        const template = window.document.createElement("template"); template.innerHTML = html;
        for (const element of template.content.querySelectorAll("*")) {
          if (guard.tags.has(element.localName.toLowerCase()) || (element.id && guard.ids.has(element.id))) return true;
          for (const name of element.classList) if (guard.classes.has(name)) return true;
          for (const attribute of element.attributes) {
            const name = attribute.name.toLowerCase();
            if (guard.attributes.has(name) || guard.attributeValues.has(`${name}=${attribute.value}`)) return true;
          }
        }
        return false;
      },
    };
    return renderer;
  })().catch(error => { loading = null; throw error; });
}
export function _resetArticleFirstForTests() { loading = null; renderer = null; loadedGuard = null; }

function ownOriginalAddress(post, path) {
  let canonical;
  try { canonical = new URL(publicPostUrl(post), "https://sod1820.co.il").pathname; } catch { return false; }
  const normal = value => { try { return decodeURIComponent(value).replace(/\/+$/, "").toLowerCase(); } catch { return null; } };
  return normal(canonical) !== null && normal(canonical) === normal(path);
}

// → { html, state }: state is "served" | "served-new" | "not-eligible" | "off" | "not-proven" | "new-guarded" | "warming" | "failed" (the
// X-Sod-Article-First response header,
// so the share of documents that really carry the article can be counted). Every document that does not carry the article loses the build's
// inert template (it is useful only to an article-first document).
const TEMPLATE = /<template id="sod29-article-first-css">([\s\S]*?)<\/template>/;
export function withArticleFirst2029(html, options) {
  const plain = typeof html === "string" ? html.replace(TEMPLATE, "") : html;
  // Never throws: whatever goes wrong here, the answer is today's document (the handler would otherwise turn an error into a 503).
  try { const out = articleFirstDocument(html, options); return out.state === "served" || out.state === "served-new" ? out : { html: plain, state: out.state }; } catch { return { html: plain, state: "failed" }; }
}
// A cold instance loads the server DOM after it has answered. On Vercel a promise handed to the request context's waitUntil (the contract the
// @vercel/functions helper reads) keeps the function alive until it settles; elsewhere the load simply continues in the process. Whether the
// load completes after the response on Vercel is checked on a protected Preview (scripts/check-article-first-cold.mjs), not assumed.
function keepAlive(promise) {
  try { globalThis[Symbol.for("@vercel/request-context")]?.get?.()?.waitUntil?.(promise); } catch { /* no request context: plain process */ }
  return promise;
}
function articleFirstDocument(html, { path, search = "", status, post, proven = PROVEN, facts = IMAGE_FACTS, load = loadArticleFirstRenderer, guard }) {
  if (status !== 200 || !post || search || !ownOriginalAddress(post, path)) return { html, state: "not-eligible" };
  // No template: this build was made without a fresh proof (or without the article path); nothing is loaded.
  const template = TEMPLATE.exec(html);
  if (!template) return { html, state: "off" };
  const newPost = postArticleFirstNewPost2029(post, proven);
  if (!newPost && !postArticleFirstProven2029(post, proven)) return { html, state: "not-proven" };
  if (!renderer) { keepAlive(load().catch(() => {})); return { html, state: "warming" }; }
  const newGuard = guard === undefined ? loadedGuard : articleFirstGuardFromJson(guard);
  if (newPost && !newGuard) return { html, state: "not-proven" };
  let article;
  try { article = renderer.render(post, path, facts); } catch { return { html, state: "failed" }; }
  // A Post without a proof: only when no left-out first-paint rule could apply to it (the page still adopts it only if it is exactly its own).
  if (newPost && renderer.namesGuarded(article, newGuard)) return { html, state: "new-guarded" };
  const critical = (/<style data-sod-article-first-critical>[\s\S]*?<\/style>/.exec(template[1]) || [""])[0];
  const links = template[1].match(/<link rel="stylesheet" href="\/assets\/[^"]+\.css">/g) || [];
  if (!critical || !links.length) return { html, state: "failed" };
  let document = html.replace(TEMPLATE, "");
  const headEnd = document.search(/<\/head>/i), bodyEnd = document.search(/<\/body>/i);
  if (headEnd < 0 || bodyEnd < 0) return { html, state: "failed" };
  // The head's render-blocking stylesheets (the build's entry stylesheet) are among the full stylesheets: they move after the article, and the
  // first-paint stylesheet takes their place, in the same order relative to the head's own inline styles. The reader's theme preset is set on
  // <html> first (the frame around the article follows it).
  const head = document.slice(0, headEnd).replace(/<link rel="stylesheet"(?: crossorigin)? href="\/assets\/[^"]+\.css">/g, "")
    .replace(/<head(\s[^>]*)?>/i, match => `${match}${POST_ARTICLE_THEME_SCRIPT}`)
    // the first-paint rules apply under this class until every full stylesheet has arrived (scripts/lib/article-first-critical-css.mjs)
    .replace(/<html(\s[^>]*)?>/i, match => /\sclass="/i.test(match) ? match.replace(/\sclass="/i, ' class="sod-af-first ') : match.replace(/^<html/i, '<html class="sod-af-first"'));
  const full = links.map(link => link.replace(/^<link /, "<link data-sod-article-first-full ")).join("")
    + '<script data-sod-article-first-done>document.documentElement.classList.remove("sod-af-first")</script>';
  document = `${head}${critical}${document.slice(headEnd, document.search(/<\/body>/i))}${POST_ARTICLE_DOCUMENT_STYLE}${article}${full}${document.slice(document.search(/<\/body>/i))}`;
  return { html: document, state: newPost ? "served-new" : "served" };
}
