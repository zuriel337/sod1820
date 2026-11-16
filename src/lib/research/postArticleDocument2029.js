// The article of an imported Post in the FIRST document (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026): title, credit, date, cover and body, before
// any script, built by the page's own article pipeline (postArticlePipeline2029.js) and with the page's own class names, so the page's own
// stylesheets lay it out exactly as they lay out the page's article. Post2029Page adopts the body nodes (it never renders them a second time);
// anything that does not match exactly is replaced by the page in place. Needs a DOM: the browser's, or a server DOM installed by the caller.
import { postArticleSourceHtmlFromRow2029, postArticleSourceKey2029 } from "./postArticlePipeline2029.js";
import { humanContentTitle } from "../presentation/contentTitle.js";
import { bilingualDateLabel } from "../relativeTime2029.js";
import { postBackground2029 } from "./postBackground2029.js";
import { contentSeriesByKey, contentSeriesKeysForPost } from "./contentSeries2029Identity.js";

import { POST_ARTICLE_DOCUMENT_ID } from "./postArticleAdoption2029.js";
export { POST_ARTICLE_DOCUMENT_ID };
export { postArticleSourceKey2029 };

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// The credit and the date the article shows under its title (the page shows the same line, postArticleByline2029).
export function postArticleByline2029(post) {
  // The credit rule of postClassification2029: a series' own publisher is "מפרסם", anyone else "ייחוס במקור".
  const author = typeof post?.author === "string" ? post.author.trim() : "";
  const publisher = author && contentSeriesKeysForPost(post).some(key => contentSeriesByKey(key)?.publisherLabel === post.author);
  const date = String(post?.date || post?.modified || "").slice(0, 10);
  return { credit: author ? `${publisher ? "מפרסם" : "ייחוס במקור"}: ${author}` : "", date, dateLabel: date ? bilingualDateLabel(date, date) : "" };
}

// The page's duplicate-cover rule (Post2029Page effect), applied to the same body.
function markDuplicateCover(root, imageUrl) {
  const cover = String(imageUrl || "").trim().split("?")[0];
  if (!cover) return;
  const first = root.querySelector("img");
  if (!first || (first.getAttribute("src") || "").trim().split("?")[0] !== cover) return;
  const parent = first.parentElement;
  const wrap = parent && parent.children.length === 1 && !parent.textContent.trim() ? parent : first;
  wrap.setAttribute("data-duplicate-cover", "true");
}

export function postArticleDocumentHtml2029(post, { document = globalThis.document, path = "" } = {}) {
  const template = document.createElement("template");
  template.innerHTML = postArticleSourceHtmlFromRow2029(post);
  markDuplicateCover(template.content, post.image_url);
  const title = humanContentTitle(post.title, { max: 0 });
  const byline = postArticleByline2029(post);
  const cover = typeof post.image_url === "string" ? post.image_url.trim() : "";
  const background = postBackground2029(post);
  return `<article id="${POST_ARTICLE_DOCUMENT_ID}" class="sod29-reading-post" dir="rtl" data-ssr-post="${escapeHtml(post.id)}" data-ssr-source="${postArticleSourceKey2029(post.content)}" data-ssr-path="${escapeHtml(path)}"`
    + ` data-experience-surface="post-reading" data-post-character="plain" data-post-background="${escapeHtml(background.key)}"`
    + ` style="--post-background-desktop:url(&quot;${escapeHtml(background.desktop)}&quot;);--post-background-mobile:url(&quot;${escapeHtml(background.mobile)}&quot;)">`
    + `<header class="sod29-reading-hero"><div class="sod29-reading-hero-grid"><div class="sod29-reading-hero-copy"><h1>${escapeHtml(title)}</h1>`
    + `<p class="sod29-reading-byline">${byline.credit ? `<span>${escapeHtml(byline.credit)}</span>` : ""}${byline.date ? `<time datetime="${escapeHtml(byline.date)}">${escapeHtml(byline.dateLabel)}</time>` : ""}</p>`
    + `</div></div></header>`
    + (cover ? `<figure class="sod29-reading-cover" data-ssr-cover="true"><div class="sod29-canonical-media-figure"><img class="sod29-canonical-media-image is-primary" src="${escapeHtml(cover)}" alt="" loading="eager" fetchpriority="high" decoding="async"></div></figure>` : "")
    + `<div class="sod29-reading-layout"><section class="sod29-reading-source" aria-label="טקסט המקור" data-ssr-body="true">${template.innerHTML}</section></div>`
    + `</article>`;
}

// While the document article is there, the app root keeps the opening bar's height (CSS only): the app's first frames (its loading state, the
// page while its code arrives) never push the article down. The rule ends by itself when the page removes the document article.
export const POST_ARTICLE_DOCUMENT_STYLE = `<style data-sod-article-first>html:has(#${POST_ARTICLE_DOCUMENT_ID}:not([data-ssr-standalone])) #root{height:132px;overflow:hidden}</style>`;
