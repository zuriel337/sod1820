// The article of an imported Post in the FIRST document (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026): title, credit, date, cover and body, before
// any script, built by the page's own article pipeline (postArticlePipeline2029.js) and with the page's own class names, so the page's own
// stylesheets lay it out exactly as they lay out the page's article. Post2029Page adopts the body nodes (it never renders them a second time);
// anything that does not match exactly is replaced by the page in place. Needs a DOM: the browser's, or a server DOM installed by the caller.
import { postArticleSourceHtmlFromRow2029, postArticleSourceKey2029 } from "./postArticlePipeline2029.js";
import { humanContentTitle } from "../presentation/contentTitle.js";
import { bilingualDateLabel } from "../relativeTime2029.js";
import { postBackground2029 } from "./postBackground2029.js";
import { contentSeriesByKey, contentSeriesKeysForPost } from "./contentSeries2029Identity.js";
import { postClassification2029, postTagItems2029 } from "./postClassification2029.js";
import { clean, postPlainText2029, postImageRenditionSet2029, postArticleImageOriginals2029, postImageFactsFor2029, postReadingCoverYieldsToVideo2029, POST_COVER_IMAGE_SIZES } from "./postArticleCore2029.js";
import { postVoiceFor } from "../postVoice2029.js";
import { POST_ARTICLE_THEME_SCRIPT, POST_ARTICLE_FRAME_CLOSE, postArticleFrameOpen2029 } from "./postArticleFrame2029.js";

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
  // The edit date (ZURIEL 25.11.2026): shown only when the Post was really edited AFTER its publication day (the stored `modified`), never invented.
  const modifiedRaw = String(post?.modified || "").slice(0, 10);
  const modified = /^\d{4}-\d{2}-\d{2}$/.test(modifiedRaw) && /^\d{4}-\d{2}-\d{2}$/.test(date) && modifiedRaw > date ? modifiedRaw : "";
  return { credit: author ? `${publisher ? "מפרסם" : "ייחוס במקור"}: ${author}` : "", date, dateLabel: date ? bilingualDateLabel(date, date) : "",
    modified, modifiedLabel: modified ? bilingualDateLabel(modified, modified) : "" };
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

// The page's chips for a Post (PostCategories2029 with a post): the same items, links, titles and icon. The first-document article shows exactly
// what the page will show, so nothing moves when the page takes over (test/article-first-browser-2029.browser.mjs compares the markup).
const LAYERS_ICON = '<svg class="sod29-ui-icon sod29-ui-icon--layers " data-icon-shape="layers" data-icon-name="layers" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="width: 16px; height: 16px;"><path d="m12 4 8 4-8 4-8-4z"></path><path d="m4 12 8 4 8-4M4 16l8 4 8-4"></path></svg>';
function chipsHtml(classification, max) {
  const visible = classification.items.filter(item => item.role !== "legacy-media-label").slice(0, max);
  if (!visible.length) return "";
  return `<span class="k29-cats k29-post-classification" aria-label="סדרה וסיווג הפוסט">${visible.map(item => `<a class="k29-cat" href="${escapeHtml(item.href)}" title="${escapeHtml(`${item.prefix}: ${item.name}`)}" data-post-classification="${escapeHtml(item.role)}">${LAYERS_ICON}<span class="k29-post-role">${escapeHtml(item.prefix)}:</span> ${escapeHtml(item.name)}</a>`).join("")}</span>`;
}

// The frame's orientation mark in the Post header (SystemFrame2029 portals LearnMark2029 into the page's orientation host): the surface manifest
// of entryLearn2029.js for "post", as a first arrival sees it. Inactive until the page takes over (aria-disabled); a reader who already dismissed
// it gets the compact mark from the page. Buttons below are inactive the same way: the page's own controls replace them.
const ORIENTATION_MARK = '<span class="sod29-entry-orientation-slot is-in-header"><div class="sod29-learn-mark scope-surface has-visible-label is-prominent" data-learn-scope="surface">'
  + '<button type="button" class="sod29-learn-mark-trigger" aria-expanded="false" aria-disabled="true" aria-label="איך זה עובד? — חדש כאן? מה עושים בפוסט הזה?"><span class="sod29-learn-mark-symbol" aria-hidden="true">?</span>'
  + '<span class="sod29-learn-mark-label">איך זה עובד?</span></button></div></span>';

// facts: the real widths of the originals (public-reading-deploy/article-image-facts.json); the document carries exactly this Post's ones, so the page
// offers exactly the same copies (documentImageFactsFor in postArticleAdoption2029.js).
export function postArticleDocumentHtml2029(post, { document = globalThis.document, path = "", facts = null } = {}) {
  const template = document.createElement("template");
  template.innerHTML = postArticleSourceHtmlFromRow2029(post, { facts });
  const imageFacts = facts ? postImageFactsFor2029(postArticleImageOriginals2029(template.innerHTML, post.image_url), facts) : {};
  markDuplicateCover(template.content, post.image_url);
  const title = humanContentTitle(post.title, { max: 0 });
  const byline = postArticleByline2029(post);
  const cover = typeof post.image_url === "string" ? post.image_url.trim() : "";
  const coverFigure = Boolean(cover) && !postReadingCoverYieldsToVideo2029(post);   // the page's rule (Post2029Page coverItem)
  const background = postBackground2029(post);
  const voice = postVoiceFor(post).voice;
  const classification = postClassification2029(post);
  const tagItems = postTagItems2029(post);
  const sourceLabel = clean(post.author) || "מקור הפוסט";
  const excerpt = clean(post.excerpt) || postPlainText2029(post.content).slice(0, 220);
  const coverLabel = `פתח את תמונת הפוסט: ${title}`;
  const coverSet = postImageRenditionSet2029(cover, imageFacts);   // the page's cover offers the same smaller copies (Post2029Page)
  const frame = postArticleFrameOpen2029({ id: POST_ARTICLE_DOCUMENT_ID, "data-ssr-post": String(post.id), "data-ssr-source": postArticleSourceKey2029(post.content), "data-ssr-path": path,
    ...(Object.keys(imageFacts).length ? { "data-ssr-image-facts": JSON.stringify(imageFacts) } : {}) });
  // The page no longer draws the activity square (ZURIEL 21.11.2026: it lives only as one line in Now), so the
  // document reserves no space for it: document and page stay identical (no paragraph or anchor jump, CLS 0).
  return frame
    + `<article class="sod29-reading-post" data-golden="false" data-experience-surface="post-reading" data-experience-capability="post-master-reading-stage" data-post-slug="${escapeHtml(post.slug)}"`
    + ` data-post-character="plain" data-post-voice="${escapeHtml(voice)}" data-prefs-tick="0" data-post-background="${escapeHtml(background.key)}"`
    + ` style="--post-background-desktop: url(&quot;${escapeHtml(background.desktop)}&quot;); --post-background-mobile: url(&quot;${escapeHtml(background.mobile)}&quot;);">`
    + `<header id="post-story" class="sod29-reading-hero" data-experience-capability="post-master-hero"><div class="sod29-reading-hero-grid">`
    + (coverFigure ? `<figure class="sod29-reading-cover" data-experience-capability="post-reading-cover" data-ssr-cover="true"><button type="button" class="sod29-canonical-media-figure" data-media-id="" data-gallery-image-id="" aria-disabled="true" aria-label="${escapeHtml(coverLabel)}"><img alt="${escapeHtml(coverLabel)}" loading="eager" fetchpriority="high"${coverSet ? ` sizes="${POST_COVER_IMAGE_SIZES}"` : ""} class="sod29-canonical-media-image is-primary" data-media-fit="preserve-whole-image"${coverSet ? ` srcset="${escapeHtml(coverSet)}"` : ""} src="${escapeHtml(cover)}"></button></figure>` : "")
    + `<div class="sod29-reading-hero-copy"><h1>${escapeHtml(title)}</h1>`
    + (byline.credit || byline.date ? `<p class="sod29-reading-byline">${byline.credit ? `<span>${escapeHtml(byline.credit)}</span>` : ""}${byline.date ? `<time datetime="${escapeHtml(byline.date)}">${escapeHtml(byline.dateLabel)}</time>` : ""}${byline.modified ? `<time class="sod29-reading-modified" datetime="${escapeHtml(byline.modified)}">עודכן: ${escapeHtml(byline.modifiedLabel)}</time>` : ""}</p>` : "")
    + chipsHtml(classification, 4)
    + `<span class="sod29-orientation-host">${ORIENTATION_MARK}</span>`
    + `<details class="sod29-post-details"><summary><span class="sod29-reading-source-badge">${escapeHtml(sourceLabel)}</span><span class="sod29-post-details-label">פרטי הפוסט <span aria-hidden="true">⌄</span></span></summary>`
    + `<div class="sod29-post-details-body">`
    + (classification.credit ? `<p>${escapeHtml(classification.credit.prefix)}: ${escapeHtml(classification.credit.name)}</p>` : "")
    + (byline.date ? `<p>תאריך הפוסט: <time datetime="${escapeHtml(byline.date)}">${escapeHtml(byline.dateLabel)}</time></p>` : "")
    + (classification.items.length > 4 ? `<div class="sod29-reading-meta-line">${chipsHtml(classification, Infinity)}</div>` : "")
    + (tagItems.length ? `<p class="sod29-post-tags">${tagItems.map(tag => `<a href="${escapeHtml(tag.href)}">${escapeHtml(tag.name)}</a>`).join("")}</p>` : "")
    + (excerpt ? `<p>${escapeHtml(excerpt)}</p>` : "")
    + `<p>המקור נשמר כלשונו. חישוב, מקור ופרשנות נשארים שכבות נפרדות.</p>`
    + `</div></details><div class="sod29-post-actions-slot"></div></div></div></header>`
    + `<div class="sod29-reading-layout"><section class="sod29-reading-source" aria-label="טקסט המקור" data-ssr-body="true">${template.innerHTML}</section></div>`
    + `</article>` + POST_ARTICLE_FRAME_CLOSE;
}

// While the document article is there, the app root keeps exactly the opening bar and its reserve (the height of the frame's header at each
// breakpoint, as opening2029.css draws it): the app's first frames (its loading state, the page while its code arrives) never push the article
// down, and the article starts where the page's article starts. The rule ends by itself when the page removes the document article.
export const POST_ARTICLE_DOCUMENT_STYLE = `<style data-sod-article-first>html:has(#${POST_ARTICLE_DOCUMENT_ID}:not([data-ssr-standalone])) #root{height:132px;overflow:hidden}`
  + `@media(max-width:980px){html:has(#${POST_ARTICLE_DOCUMENT_ID}:not([data-ssr-standalone])) #root{height:122px}}`
  + `@media(max-width:340px){html:has(#${POST_ARTICLE_DOCUMENT_ID}:not([data-ssr-standalone])) #root{height:116px}}</style>`;
export { POST_ARTICLE_THEME_SCRIPT };
