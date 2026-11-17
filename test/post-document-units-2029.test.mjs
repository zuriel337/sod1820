// Information units and the Post document CDN (ZURIEL 17.11.2026, POST_DOCUMENT_FRESHNESS_20261117, follow-up for Posts built from units such
// as the elections Post #5107). The finding these tests pin, so a future speed change cannot quietly break it:
//  - a Post built from units is never given its article in the first document (the article-first policy excludes the reality-map series,
//    Posts with registered unit updates and the special readings — #5107 is all three), so the document the CDN may keep holds the Post's
//    head only (title, description, share image, dates) and no unit: the page reads the units live from the database after it loads;
//  - therefore adding, removing, editing or reordering units (posts.content only, posts.modified unchanged, as the 16.11 unit was written)
//    leaves the kept document byte-for-byte the same — a kept copy cannot show an old unit, whether or not the purge ran;
//  - a unit link (?unit=<id>) carries a query string and is never kept;
//  - a whole unit Post that is hidden or deleted is answered 404 by the origin once the edge gate lists it (purge failed), and nothing of it
//    reaches the answer;
//  - where article-first does serve an article, it serves only the exact content that was proven: a unit change takes the Post off the proof.
// The database side (every unit change through SQL, the editor and the agents is logged and asks for a purge) is in
// tests/sql/post_document_freshness_v1.sql. Synthetic content only; the live Post is never read or written here.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import publicMiddleware from "../public-reading-deploy/middleware.js";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";
import { withArticleFirst2029 } from "../public-reading-deploy/api/article-first.js";
import { postArticleFirstCandidate2029, postArticleFirstProven2029, postArticleFirstNewPost2029 } from "../src/lib/research/postArticleFirstPolicy2029.js";
import { postArticleProofKey2029 } from "../src/lib/research/postArticlePipeline2029.js";
import { ELECTIONS_SLUG } from "../src/lib/research/postSpecialReadings2029.js";
import { readFileSync } from "node:fs";

const SITE = "https://sod1820.co.il";
const API = "https://linswmnnkjxvweumprav.supabase.co";
const BROWSER = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
const SHELL = '<html><head><title>static</title><meta name="robots" content="index, follow"/></head><body><div id="root">existing shell</div></body></html>';
const PATH = `/post/${ELECTIONS_SLUG}`;
const key = slug => createHash("sha256").update(slug, "utf8").digest("hex").slice(0, 16);

// The elections Post's identity as it is live (id, address, source, tags, categories, excerpt kind, dates), with synthetic units.
const unit = (id, title, body) => `<h2 id="${id}-title">${title}</h2><section id="${id}"><p>${body}</p></section>`;
const V1 = "<p>פתיחה</p>" + unit("unit-a", "UNIT-A-TITLE", 'UNIT-A-TEXT 1820 <img src="https://x.invalid/unit-a.png"> <a href="/post/unit-a-link">UNIT-A-LINK</a>')
  + unit("unit-b", "UNIT-B-TITLE", "UNIT-B-TEXT 631");
const V2 = "<p>פתיחה</p>" + unit("unit-c", "UNIT-C-TITLE", "UNIT-C-TEXT 2029")      // C added first (order), B removed
  + unit("unit-a", "UNIT-A-TITLE", 'UNIT-A-TEXT-EDITED 1821 <img src="https://x.invalid/unit-a2.png"> <a href="/post/unit-a-link2">UNIT-A-LINK</a>');
const UNIT_MARKS = ["UNIT-A", "UNIT-B", "UNIT-C", "unit-a", "unit-b", "unit-c", "x.invalid"];
const row = (content, extra = {}) => ({ id: 5107, slug: ELECTIONS_SLUG, source: "ai", wp_id: null, link: null, title: "הבחירות לכנסת ה־26 — בדיקה",
  excerpt: "תקציר קבוע של הפוסט", content, image_url: `${API}/storage/v1/object/public/media/post-5107-cover.webp`,
  tags: ["הבחירות", "שרשר", "מפת המציאות"], categories: ["רמזי הגאולה", "בחירות"], author: "SOD1820",
  date: "2026-09-30T08:55:06.593419+00:00", modified: "2026-11-10T16:56:00.412935+00:00", ...extra });

// The database as the anonymous key sees it (RLS hides rows tagged טיוטה), plus the edge's change list.
function database(rows, { changedKeys = [] } = {}) {
  const visible = () => rows().filter(r => !(r.tags || []).includes("טיוטה"));
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.origin !== API) throw new Error("unexpected origin " + url.origin);
    if (url.pathname === "/rest/v1/edge_blocked_countries") return Response.json([]);
    if (["/rest/v1/rpc/log_edge", "/rest/v1/rpc/log_crawl"].includes(url.pathname)) return new Response(null, { status: 204 });
    if (url.pathname === "/rest/v1/rpc/content_big_numbers") return Response.json([]);
    if (url.pathname === "/rest/v1/rpc/post_document_recent_changes_v1") return Response.json({ version: 1, keys: changedKeys, all_until: null, changes: changedKeys.length });
    if (url.pathname === "/rest/v1/rpc/public_post_slug_exists") {
      const { p_slug, p_encoded_slug } = JSON.parse(init.body);
      return Response.json(visible().some(r => r.slug === p_slug || r.slug === p_encoded_slug));
    }
    if (url.pathname === "/rest/v1/posts") {
      const slug = url.searchParams.get("slug");
      const wanted = slug?.startsWith("in.(") ? slug.slice(4, -1).split(",").map(v => v.replace(/^"|"$/g, "")) : slug?.startsWith("eq.") ? [slug.slice(3)] : [];
      return Response.json(visible().filter(r => wanted.includes(r.slug)).slice(0, 1));
    }
    if (url.pathname.startsWith("/rest/v1/")) return Response.json([]);
    throw new Error("unexpected dependency " + url.pathname);
  };
}

function nodeResponse() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), String(v)); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; } };
}
// The platform's order: the edge first; when it lets the request through or rewrites it, the document function answers.
async function visit(path, fetcher) {
  const original = globalThis.fetch; globalThis.fetch = fetcher;
  const keepAlive = setInterval(() => {}, 50);
  try {
    const pending = [];
    const edge = await publicMiddleware(new Request(SITE + path, { headers: { "user-agent": BROWSER, "x-vercel-ip-country": "IL" } }), { waitUntil: p => pending.push(p) });
    await Promise.all(pending);
    const rewrite = edge.headers.get("x-middleware-rewrite");
    if (edge.headers.get("x-middleware-next") !== "1" && !rewrite) return { by: "edge", status: edge.status, body: await edge.text(), headers: edge.headers, gate: null };
    const url = rewrite ? new URL(rewrite) : new URL(path, SITE);
    const overridden = {};
    for (const name of (edge.headers.get("x-middleware-override-headers") || "").split(",").filter(Boolean)) {
      const value = edge.headers.get("x-middleware-request-" + name); if (value !== null) overridden[name] = value;
    }
    const res = nodeResponse();
    await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => SHELL })({
      method: "GET", headers: { host: "sod1820.co.il", "user-agent": BROWSER, ...overridden }, url: url.pathname + url.search,
      query: { ...Object.fromEntries(url.searchParams), path: url.pathname } }, res);
    return { by: "document", status: res.code, body: res.body, headers: res.headers, gate: edge.headers.get("x-sod-doc-gate") };
  } finally { clearInterval(keepAlive); globalThis.fetch = original; }
}
// The document function alone, as the CDN asks it on a miss (no marker): what a kept copy would hold.
async function originDocument(path, fetcher) {
  const original = globalThis.fetch; globalThis.fetch = fetcher;
  try {
    const res = nodeResponse(), url = new URL(path, SITE);
    await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => SHELL })({
      method: "GET", headers: { host: "sod1820.co.il", "user-agent": BROWSER }, url: url.pathname + url.search,
      query: { ...Object.fromEntries(url.searchParams), path: url.pathname } }, res);
    return res;
  } finally { globalThis.fetch = original; }
}

test("a Post built from units is never given its article in the first document (#5107 is excluded three ways)", () => {
  const proven = JSON.parse(readFileSync(new URL("../public-reading-deploy/article-first-proven.json", import.meta.url), "utf8"));
  for (const content of [V1, V2]) {
    const post = row(content);
    assert.equal(postArticleFirstCandidate2029(post), false, "the elections Post is not an article-first candidate");
    assert.equal(postArticleFirstNewPost2029(post, proven.posts || proven), false);
    assert.equal(postArticleFirstProven2029(post, proven.posts || proven), false);
    // each reason alone is enough: the series tag, the registered unit updates (#5107), the special reading slug
    assert.equal(postArticleFirstCandidate2029({ ...post, id: 999001, slug: "plain-series-post" }), false, "the reality-map series alone");
    assert.equal(postArticleFirstCandidate2029({ ...post, tags: ["הבחירות"], slug: "another-address" }), false, "registered unit updates alone (#5107)");
    assert.equal(postArticleFirstCandidate2029({ ...post, id: 999002, tags: ["הבחירות"] }), false, "the special reading slug alone");
  }
  // the server step itself, with a template present: no article is added for this Post
  const html = SHELL.replace("</head>", '<template id="sod29-article-first-css"><style></style></template></head>');
  const out = withArticleFirst2029(html, { path: PATH, search: "", status: 200, post: row(V1), proven: {} });
  assert.equal(out.state, "not-proven"); assert.ok(!out.html.includes("sod29-ssr-article"));
});

test("the document a CDN may keep for a unit Post holds no unit, and is byte-for-byte the same after units are added, removed, edited and reordered", async () => {
  let content = V1;
  const fetcher = database(() => [row(content)]);
  const before = await originDocument(PATH, fetcher);
  assert.equal(before.code, 200);
  assert.ok(before.headers.get("vercel-cdn-cache-control"), "the head-only document may be kept");
  assert.equal(before.headers.get("vercel-cache-tag"), "post-document,post-document-5107");
  for (const mark of UNIT_MARKS) assert.ok(!before.body.includes(mark), `no unit in the kept document (${mark})`);
  assert.match(before.body, /תקציר קבוע של הפוסט/, "the head is the Post's own (description from the excerpt)");
  content = V2;   // units: C added, B removed, A edited (text, number, image, link), order changed; posts.modified unchanged
  const after = await originDocument(PATH, fetcher);
  assert.equal(after.body, before.body, "a kept copy made before the unit change is exactly what the origin answers after it");
});

test("a unit link (?unit=) is never kept by the CDN, and the edge gate leaves it to the origin", async () => {
  const fetcher = database(() => [row(V1)]);
  const res = await visit(`${PATH}?unit=unit-a`, fetcher);
  assert.equal(res.by, "document"); assert.equal(res.status, 200);
  assert.equal(res.headers.get("vercel-cdn-cache-control"), undefined, "a query string is never kept");
  assert.equal(res.gate, null, "not a gate candidate: it is never answered from a kept copy anyway");
});

test("purge failed, the reader would be offered a kept copy: a hidden or deleted unit Post is built fresh by the origin and answered 404, with nothing of it in the answer", async () => {
  for (const change of ["hidden", "deleted"]) {
    const rows = change === "hidden" ? [row(V1, { tags: ["הבחירות", "שרשר", "מפת המציאות", "טיוטה"] })] : [];
    // the database lists the Post as changed in the same transaction (layer 1); the purge is assumed to have failed
    const fetcher = database(() => rows, { changedKeys: [key(ELECTIONS_SLUG)] });
    let res;
    for (let i = 0; i < 3; i++) res = await visit(PATH, fetcher);   // a lone request makes no read; a repeated one reads the list in the background
    assert.equal(res.gate, "changed", `${change}: the edge names the Post as changed`);
    assert.equal(res.by, "document"); assert.equal(res.status, 404, `${change}: the origin answers 404, never a kept copy`);
    assert.equal(res.headers.get("vercel-cdn-cache-control"), undefined, `${change}: the 404 is never kept`);
    for (const mark of [...UNIT_MARKS, "הבחירות לכנסת ה־26 — בדיקה", "תקציר קבוע של הפוסט", "post-5107-cover"]) assert.ok(!res.body.includes(mark), `${change}: nothing of the Post (${mark})`);
  }
});

test("where article-first serves an article, it serves only the content that was proven: a unit change takes the Post off the proof", () => {
  const plain = { id: 999100, slug: "plain-native-post", source: "sod1820", title: "פוסט רגיל", content: V1, tags: [], categories: [] };
  const proven = { [String(plain.id)]: postArticleProofKey2029(plain) };
  assert.equal(postArticleFirstProven2029(plain, proven), true, "the proven content is served");
  assert.equal(postArticleFirstProven2029({ ...plain, content: V2 }, proven), false, "after a unit change the old proof no longer matches: no stale article in the first document");
});
