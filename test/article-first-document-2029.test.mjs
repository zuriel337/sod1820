// The first-document article of an imported Post (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026), server side: who gets it, what it contains, and
// that every other answer (and every failure) is exactly today's document. Runs the real document handler with the real metadata reader over a
// stubbed public API. Needs the generated document: run `node scripts/build-public-reading-production.mjs` first (CI does, in the same step).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";
import { withArticleFirst2029, loadArticleFirstRenderer, _resetArticleFirstForTests } from "../public-reading-deploy/api/article-first.js";
import { postArticleSourceHtmlFromRow2029, postArticleSourceKey2029 } from "../src/lib/research/postArticlePipeline2029.js";

const SITE = "https://sod1820.co.il";
const TEMPLATE = readFileSync(new URL("../public-reading-deploy/.generated/2029.html", import.meta.url), "utf8");
const row = (extra = {}) => ({ id: 31, wp_id: 36173, slug: "%d7%aa%d7%a4%d7%99%d7%9c%d7%94-%d7%9c%d7%a8%d7%a4%d7%95%d7%90%d7%94", source: "wordpress", title: "תפילה לרפואה &#8211; הינוקא",
  excerpt: "", author: "מזכה הרבים", date: "2025-08-18T00:10:41+00:00", modified: "2025-08-18T00:12:03+00:00", tags: ["תפילה"], categories: ["רמזים מצדיקים"],
  image_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2025/08/c1a17b6b6ed632f2.webp",
  content: '<p><img src="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2025/08/c1a17b6b6ed632f2.webp" width="1070" height="1506" alt=""></p>\n<p>פסקה ראשונה של התפילה, <a href="/%d7%a2%d7%95%d7%93">קישור פנימי</a>.</p>\n<h3><a name="_Toc1"></a>כותרת משנה</h3>\n<p>פסקה שנייה.</p><script>alert(1)</script><style>p{color:red}</style>', ...extra });
const PATH = "/%D7%AA%D7%A4%D7%99%D7%9C%D7%94-%D7%9C%D7%A8%D7%A4%D7%95%D7%90%D7%94";
const provenFor = post => ({ [String(post.id)]: postArticleSourceKey2029(post.content) });

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
  assert.equal(article.querySelectorAll("script").length, 0, "no script survives");
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
  assert.equal(document.getElementById("sod29-article-first-css"), null, "the inert template was opened");
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
  assert.equal(still.state, "warming"); assert.equal(still.html, TEMPLATE);
  await loadArticleFirstRenderer();
  const broken = withArticleFirst2029(TEMPLATE, { path: PATH, status: 200, post: { ...post, get content() { throw new Error("synthetic render failure"); } }, proven: new Proxy({}, { get: () => undefined }) });
  assert.equal(broken.html, TEMPLATE);
  const noTemplate = withArticleFirst2029(TEMPLATE.replace(/<template id="sod29-article-first-css">[\s\S]*?<\/template>/, ""), { path: PATH, status: 200, post, proven: provenFor(post) });
  assert.equal(noTemplate.state, "failed", "without the page's stylesheets the article is not served");
});
