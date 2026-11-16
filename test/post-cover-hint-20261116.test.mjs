import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate as tick } from "node:timers/promises";
import { hintPostCover2029, postCoverHref2029 } from "../src/lib/research/postCoverHint2029.js";
import { isPublicPostReadingSource as boundaryRule } from "../src/lib/research/publicPostBoundary.js";
import { isPublicPostReadingSource as projectionRule } from "../src/lib/research/post2029ReadingProjection.js";
import { beginPostReadingSource } from "../src/lib/supabase.js";

// Old-address Posts (ZURIEL 16.11.2026): the cover the page renders first starts downloading when the source arrives, not when the page code mounts.
function fakeDocument() {
  const links = [];
  return { links, head: {
    querySelectorAll: (selector) => { assert.equal(selector, 'link[rel="preload"][as="image"]'); return links.filter((l) => l.rel === "preload" && l.as === "image"); },
    appendChild: (node) => { links.push(node); return node; },
  }, createElement: (tag) => { assert.equal(tag, "link"); return { dataset: {} }; } };
}
const post = (extra = {}) => ({ id: 31, slug: "%d7%aa%d7%a4%d7%99%d7%9c%d7%94", source: "wordpress", tags: [], image_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2025/08/c1a17b6b6ed632f2.webp", ...extra });

test("an admitted public post's cover is hinted once, with high priority, at its exact URL", () => {
  const doc = fakeDocument();
  assert.equal(hintPostCover2029(post(), { doc }), true);
  assert.equal(doc.links.length, 1);
  assert.deepEqual({ rel: doc.links[0].rel, as: doc.links[0].as, fetchPriority: doc.links[0].fetchPriority, href: doc.links[0].href }, { rel: "preload", as: "image", fetchPriority: "high", href: post().image_url });
  assert.equal(doc.links[0].dataset.postCoverHint, "true");
  assert.equal(hintPostCover2029(post(), { doc }), false, "the same URL is never hinted twice");
  assert.equal(doc.links.length, 1);
});

test("nothing is hinted for a source the page would not render as a public post, or for an unsafe or missing image address", () => {
  for (const row of [post({ tags: ["טיוטה"] }), post({ tags: ["פורום"] }), post({ source: "gpt-draft" }), post({ source: "web" }), post({ _privateStage: true }), post({ _previewSnapshot: true }), post({ id: null }), post({ slug: " " }),
    post({ image_url: "" }), post({ image_url: null }), post({ image_url: "/relative.webp" }), post({ image_url: "http://insecure.example/a.webp" }), post({ image_url: "javascript:alert(1)" }), post({ image_url: 'https://a.example/x" onerror="y' })]) {
    const doc = fakeDocument();
    assert.equal(hintPostCover2029(row, { doc }), false, JSON.stringify(row).slice(0, 120));
    assert.equal(doc.links.length, 0);
  }
  assert.equal(hintPostCover2029(post(), { doc: {} }), false, "no document head: no hint");
  assert.equal(hintPostCover2029(post(), { doc: { head: { querySelectorAll() { throw new Error("boom"); } } } }), false, "a failing document never throws");
  assert.equal(postCoverHref2029({ image_url: "  https://a.example/x.webp  " }), "https://a.example/x.webp", "the page trims the address the same way");
});

test("one admission rule: the projection re-exports the boundary's rule instead of keeping a second copy", () => {
  assert.equal(projectionRule, boundaryRule);
  const projection = readFileSync(new URL("../src/lib/research/post2029ReadingProjection.js", import.meta.url), "utf8");
  assert.doesNotMatch(projection, /export function isPublicPostReadingSource/);
});

test("the source read reports its row to onSource as soon as it arrives; an error, a cancellation or a failing hint changes nothing", async () => {
  const seen = []; let release;
  const request = beginPostReadingSource("s", { readPost: () => new Promise((r) => { release = r; }), onSource: (row) => seen.push(row) });
  await tick(); release({ id: 1, slug: "s" }); await tick(); await tick();
  assert.deepEqual(seen, [{ id: 1, slug: "s" }], "reported before any consumer asked for the row");
  assert.deepEqual(await request.read("s"), { id: 1, slug: "s" });
  const failing = beginPostReadingSource("f", { readPost: async () => { throw new Error("denied"); }, onSource: () => seen.push("never") });
  await assert.rejects(failing.read("f"), /denied/);
  let late; const cancelled = beginPostReadingSource("c", { readPost: () => new Promise((r) => { late = r; }), onSource: () => seen.push("never") });
  await tick(); cancelled.cancel(); late({ id: 2, slug: "c" }); await tick(); await tick();
  await assert.rejects(cancelled.read("c"), (e) => e.name === "AbortError");
  const throwing = beginPostReadingSource("t", { readPost: async () => ({ id: 3, slug: "t" }), onSource: () => { throw new Error("hint failed"); } });
  assert.deepEqual(await throwing.read("t"), { id: 3, slug: "t" }, "a failing hint never fails the read");
  assert.deepEqual(seen, [{ id: 1, slug: "s" }]);
  const plain = beginPostReadingSource("p", { readPost: async () => null, onSource: () => seen.push("never") });
  assert.equal(await plain.read("p"), null, "a missing post is not reported");
  assert.equal(seen.length, 1);
});

test("only the original-address entry hints, through an on-demand module (no static import in the entry: shell budget)", () => {
  const app = readFileSync(new URL("../src/App2029.jsx", import.meta.url), "utf8");
  const entry = app.slice(app.indexOf("function PublicPostAddressEntry2029()"), app.indexOf("const HomePreview2029Page"));
  assert.match(entry, /const coverHint = import\("\.\/lib\/research\/postCoverHint2029\.js"\)\.catch\(\(\) => null\);/);
  assert.match(entry, /beginPostReadingSource\(slug, \{ onSource: post => \{ void coverHint\.then\(module => module\?\.hintPostCover2029\(post\)\); \} \}\)/);
  assert.doesNotMatch(app, /^import[^\n]*postCoverHint2029/m);
  const postEntry = app.slice(app.indexOf("function PostEntry2029()"), app.indexOf("function PublicPostAddressEntry2029()"));
  assert.doesNotMatch(postEntry, /postCoverHint2029|onSource/, "/post/<slug> keeps its existing read (old addresses first)");
});
