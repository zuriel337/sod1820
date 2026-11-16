// The first-document article of an imported Post (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026), server side: who gets it, what it contains, and
// that every other answer (and every failure) is exactly today's document. Runs the real document handler with the real metadata reader over a
// stubbed public API. Needs the generated document: run `node scripts/build-public-reading-production.mjs` first (CI does, in the same step).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";
import { withArticleFirst2029, loadArticleFirstRenderer, _resetArticleFirstForTests } from "../public-reading-deploy/api/article-first.js";
import { postArticleSourceHtmlFromRow2029, postArticleSourceKey2029, postArticleProofKey2029 } from "../src/lib/research/postArticlePipeline2029.js";
import { postClassification2029 } from "../src/lib/research/postClassification2029.js";

const SITE = "https://sod1820.co.il";
const TEMPLATE = readFileSync(new URL("../public-reading-deploy/.generated/2029.html", import.meta.url), "utf8");
// what every document without the article answers: today's document, without the build's inert article-first template
const PLAIN = TEMPLATE.replace(/<template id="sod29-article-first-css">[\s\S]*?<\/template>/, "");
const row = (extra = {}) => ({ id: 31, wp_id: 36173, slug: "%d7%aa%d7%a4%d7%99%d7%9c%d7%94-%d7%9c%d7%a8%d7%a4%d7%95%d7%90%d7%94", source: "wordpress", title: "תפילה לרפואה &#8211; הינוקא",
  excerpt: "", author: "מזכה הרבים", date: "2025-08-18T00:10:41+00:00", modified: "2025-08-18T00:12:03+00:00", tags: ["תפילה"], categories: ["רמזים מצדיקים"],
  image_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2025/08/c1a17b6b6ed632f2.webp",
  content: '<p><img src="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2025/08/c1a17b6b6ed632f2.webp" width="1070" height="1506" alt=""></p>\n<p>פסקה ראשונה של התפילה, <a href="/%d7%a2%d7%95%d7%93">קישור פנימי</a>.</p>\n<h3><a name="_Toc1"></a>כותרת משנה</h3>\n<p>פסקה שנייה.</p><script>alert(1)</script><style>p{color:red}</style>', ...extra });
const PATH = "/%D7%AA%D7%A4%D7%99%D7%9C%D7%94-%D7%9C%D7%A8%D7%A4%D7%95%D7%90%D7%94";
const provenFor = post => ({ [String(post.id)]: postArticleProofKey2029(post) });

function response() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), String(v)); }, status(c) { this.code = c; return this; }, send(v) { this.body = String(v); return this; } };
}
const req = path => ({ method: "GET", headers: { host: "sod1820.co.il" }, url: path, query: { ...Object.fromEntries(new URL(path, SITE).searchParams), path: new URL(path, SITE).pathname } });
async function serve(path, { rows, outage = false, proven }) {
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    if (outage) throw new TypeError("synthetic outage");
    if (String(url).includes("/rest/v1/posts?")) return Response.json(rows);
    return Response.json([]);
  };
  try {
    const res = response();
    await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => TEMPLATE,
      articleFirst: (html, options) => withArticleFirst2029(html, { ...options, proven }) })(req(path), res);
    return res;
  } finally { globalThis.fetch = original; }
}
const articleOf = html => new JSDOM(html).window.document.getElementById("sod29-ssr-article");

test("a cold instance answers exactly as today and loads the server DOM in the background; the next answer carries the article", async () => {
  _resetArticleFirstForTests();
  const post = row();
  const cold = await serve(PATH, { rows: [post], proven: provenFor(post) });
  assert.equal(cold.code, 200);
  assert.equal(cold.headers.get("x-sod-article-first"), "warming");
  assert.equal(articleOf(cold.body), null, "no article while the server DOM is not loaded");
  await loadArticleFirstRenderer();
  const warm = await serve(PATH, { rows: [post], proven: provenFor(post) });
  assert.equal(warm.headers.get("x-sod-article-first"), "served");
  const article = articleOf(warm.body);
  assert.ok(article, "the article is in the first document");
  assert.equal(article.dataset.ssrPost, "31"); assert.equal(article.dataset.ssrSource, postArticleSourceKey2029(post.content));
  assert.equal(article.querySelector("h1").textContent, "תפילה לרפואה – הינוקא", "the page's own title");
  assert.match(article.querySelector(".sod29-reading-byline").textContent, /ייחוס במקור: מזכה הרבים/);
  assert.equal(article.querySelector("article.sod29-reading-post").querySelectorAll("script").length, 0, "no script of the Post survives");
  assert.deepEqual([...article.querySelectorAll("script")].map(node => Object.keys(node.dataset)), [["sodArticleFirstFrame"]], "the frame's own theme script only");
  // inside the page's frame, with the page's header: chips, details, legend, cover, section navigation, in the page's order
  assert.equal(article.className, "sod29-root closed-shell native-frame surface-post sidebar-collapsed");
  assert.ok(article.querySelector(".sod29-main > .sod29-main-stage.has-context-rail > main.sod29-content > article.sod29-reading-post"));
  assert.deepEqual([...article.querySelector("article.sod29-reading-post").children].map(node => node.className),
    ["sod29-reading-hero", "sod29-semantic-legend", "sod29-reading-cover", "sod29-surface-tabs", "sod29-reading-layout"]);
  assert.deepEqual([...article.querySelector(".sod29-reading-hero-copy > .k29-cats").children].map(node => node.textContent.trim()),
    postClassification2029(post).items.filter(item => item.role !== "legacy-media-label").slice(0, 4).map(item => `${item.prefix}: ${item.name}`), "the page's own chips");
  assert.deepEqual([...article.querySelectorAll(".sod29-surface-tabs button")].map(node => node.textContent), ["הסיפור", "מקורות", "תגובות", "המשך"]);
  assert.ok([...article.querySelectorAll("button")].every(node => node.getAttribute("aria-disabled") === "true"), "its buttons are inactive until the page takes over");
  assert.ok(article.querySelector('a[href="/%d7%a2%d7%95%d7%93"]'), "internal links kept");
  assert.ok(article.querySelector('a[name="_Toc1"]'), "anchors kept");
  // the body is exactly the page pipeline's output (the duplicate cover mark aside)
  const { window } = new JSDOM("<!doctype html><body></body>");
  globalThis.document = window.document; globalThis.CSSStyleSheet = window.CSSStyleSheet;
  let expected; try { expected = postArticleSourceHtmlFromRow2029(post); } finally { delete globalThis.document; delete globalThis.CSSStyleSheet; }
  const body = article.querySelector('[data-ssr-body="true"]').cloneNode(true);
  body.querySelectorAll("[data-duplicate-cover]").forEach(node => node.removeAttribute("data-duplicate-cover"));
  const mine = window.document.createElement("template"); mine.innerHTML = expected;
  assert.equal(body.innerHTML, mine.innerHTML);
  // the page's own stylesheets are real stylesheets in this document only
  const { document } = new JSDOM(warm.body).window;
  assert.ok(document.querySelector('link[rel="stylesheet"][href^="/assets/Post2029Page-"]'), "the Post page stylesheet is linked");
  assert.equal(cold.body.includes("sod29-article-first-css"), false, "a document without the article does not carry the template");
  assert.equal(document.getElementById("sod29-article-first-css"), null, "the inert template was opened");
  assert.ok(document.head.querySelector("script[data-sod-article-first-theme]"), "the reader's theme is set before the first paint");
  // the first paint waits for the first-paint stylesheet only: no stylesheet in the head blocks it; the full stylesheets come after the article
  assert.ok(document.head.querySelector("style[data-sod-article-first-critical]"), "the first-paint stylesheet is in the head");
  assert.equal(document.head.querySelectorAll('link[rel="stylesheet"][href^="/assets/"]').length, 0, "no render-blocking stylesheet in the head");
  const full = [...document.querySelectorAll("link[data-sod-article-first-full]")];
  assert.ok(full.length >= 3 && full.every(link => link.parentElement === document.body), "the full stylesheets are in the body");
  assert.ok(full.every(link => link.compareDocumentPosition(document.getElementById("sod29-ssr-article")) & 2 /* the article precedes */), "after the article");
  assert.ok(full.some(link => /\/assets\/2029-[^/]+\.css$/.test(link.getAttribute("href"))), "the entry stylesheet moved with them");
  // and the metadata is the same as today's
  for (const name of ["canonical", "robots"]) {
    const a = new JSDOM(cold.body).window.document, b = document;
    const pick = d => name === "canonical" ? d.querySelector('link[rel="canonical"]')?.href : d.querySelector('meta[name="robots"]')?.content;
    assert.equal(pick(b), pick(a), name);
  }
  assert.equal(warm.headers.get("x-robots-tag"), cold.headers.get("x-robots-tag"));
});

test("not proven, edited, special, hidden, missing, unavailable, another address or a query: today's document, never an article", async () => {
  await loadArticleFirstRenderer();
  const post = row();
  const cases = [
    ["not on the list", PATH, { rows: [post], proven: {} }, 200, "not-proven"],
    ["edited since the proof", PATH, { rows: [{ ...post, content: post.content + "<p>עוד</p>" }], proven: provenFor(post) }, 200, "not-proven"],
    ["a query string", PATH + "?proto=0", { rows: [post], proven: provenFor(post) }, 200, "not-eligible"],
    ["the /post/ address", "/post/" + post.slug, { rows: [post], proven: provenFor(post) }, 200, "not-eligible"],
    ["not imported", "/post/native", { rows: [{ ...post, source: "sod1820", slug: "native" }], proven: provenFor(post) }, 200, "not-eligible"],
    ["a forum post", PATH, { rows: [{ ...post, tags: ["פורום"] }], proven: provenFor(post) }, 404, "not-eligible"],
    ["missing", PATH, { rows: [], proven: provenFor(post) }, 404, "not-eligible"],
    ["source unavailable", PATH, { rows: [post], outage: true, proven: provenFor(post) }, 503, null],
  ];
  for (const [label, path, options, code, state] of cases) {
    const res = await serve(path, options);
    assert.equal(res.code, code, label);
    if (state) assert.equal(res.headers.get("x-sod-article-first"), state, label);
    assert.equal(articleOf(res.body || "<html></html>"), null, label);
  }
});

test("a render failure or a server DOM that cannot load leaves today's document", async () => {
  _resetArticleFirstForTests();
  await assert.rejects(loadArticleFirstRenderer({ importDom: async () => { throw new Error("synthetic: no jsdom"); } }));
  const post = row();
  const still = withArticleFirst2029(TEMPLATE, { path: PATH, status: 200, post, proven: provenFor(post), load: () => Promise.reject(new Error("synthetic")) });
  assert.equal(still.state, "warming"); assert.equal(still.html, PLAIN);
  await loadArticleFirstRenderer();
  const broken = withArticleFirst2029(TEMPLATE, { path: PATH, status: 200, post: { ...post, get content() { throw new Error("synthetic render failure"); } }, proven: new Proxy({}, { get: () => undefined }) });
  assert.equal(broken.html, PLAIN);
  const noTemplate = withArticleFirst2029(TEMPLATE.replace(/<template id="sod29-article-first-css">[\s\S]*?<\/template>/, ""), { path: PATH, status: 200, post, proven: provenFor(post) });
  assert.equal(noTemplate.state, "off", "a build without the template (a stale proof) serves no article and loads nothing");
  assert.equal(noTemplate.html, TEMPLATE.replace(/<template id="sod29-article-first-css">[\s\S]*?<\/template>/, ""));
});

test("a cold instance hands the load of the server DOM to the platform's waitUntil, so it can finish after the answer", async () => {
  _resetArticleFirstForTests();
  const kept = [];
  const key = Symbol.for("@vercel/request-context");
  globalThis[key] = { get: () => ({ waitUntil: promise => kept.push(promise) }) };
  try {
    const post = row();
    const cold = withArticleFirst2029(TEMPLATE, { path: PATH, status: 200, post, proven: provenFor(post) });
    assert.equal(cold.state, "warming"); assert.equal(cold.html, PLAIN);
    assert.equal(kept.length, 1, "the load was handed to waitUntil");
    await kept[0];
    assert.equal(withArticleFirst2029(TEMPLATE, { path: PATH, status: 200, post, proven: provenFor(post) }).state, "served", "the kept load finished");
  } finally { delete globalThis[key]; }
});

test("the proof is bound to the post's voice as well as its source", async () => {
  await loadArticleFirstRenderer();
  const post = row(); const real = postArticleProofKey2029(post);
  const otherVoice = real.replace(/:[^:]+$/, real.endsWith(":original") ? ":unspecified" : ":original");
  assert.equal(withArticleFirst2029(TEMPLATE, { path: PATH, status: 200, post, proven: { [String(post.id)]: real } }).state, "served");
  assert.equal(withArticleFirst2029(TEMPLATE, { path: PATH, status: 200, post, proven: { [String(post.id)]: otherVoice } }).state, "not-proven");
});
