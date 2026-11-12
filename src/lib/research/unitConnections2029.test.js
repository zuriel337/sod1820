import test from "node:test";
import assert from "node:assert/strict";
import { findUnitConnections, CONNECTION_MODES } from "./unitConnections2029.js";

const readers = {
  methodProfile: async () => [{ methodKey: "רגיל", displayLabel: "רגיל", computedValue: 384 }, { methodKey: "קדמי", displayLabel: "משולש", computedValue: 1437 }],
  phrases: async () => ({ rows: [{ phrase: "ביטוי א" }, { phrase: "ביטוי ב" }] }),
  bundle: async () => ({ posts: { items: [{ slug: "chibur-bein-hasafot-mafteach-lagan", title: "פוסט", wp_id: 36960, source: "ai", date: "2026-11-01" }] }, galleries: { items: [{ id: "11111111-1111-4111-8111-111111111111", gallery_id: 7, name: "תמונה", primary_value: 1437 }] } }),
  verses: async () => ({ verses: [{ ref: "בראשית א׳, א׳", text: "בראשית ברא" }] }),
  neighbors: async () => [{ value: 1011, weight: 0.5 }],
  galleryIds: async () => ({ 7: 345 }),
};

test("a typed number returns real results, each with a source and an open target; chosen ones are references, not copies", async () => {
  const out = await findUnitConnections("1437", { postId: 5107, postHref: "/post/sharshar-elections-redemption-hints-draft", readers });
  assert.equal(out.value, 1437);
  const kinds = new Set(out.results.map((r) => r.kind));
  for (const k of ["number", "phrase", "post", "gallery", "verse", "tree", "video"]) assert.ok(kinds.has(k), k);
  for (const r of out.results) { assert.ok(r.source && r.href && r.ref && r.kindLabel, r.key); assert.equal("content" in r, false); }
  assert.match(out.results.find((r) => r.kind === "gallery").href, /gallery=345&image=1111/);
  const videos = out.results.filter((r) => r.kind === "video");
  assert.equal(videos.length, 2);
  assert.ok(videos.every((v) => !v.href.includes("#t=")));
  assert.deepEqual(Object.keys(CONNECTION_MODES), ["highlight", "click", "page"]);
});

test("an expression resolves through the engine's regular value; a failing reader is reported, never invented", async () => {
  const out = await findUnitConnections("משיח הויה", { postId: 5107, readers: { ...readers, verses: async () => { throw new Error("x"); } } });
  assert.equal(out.value, 384);
  assert.ok(out.results.some((r) => r.kind === "method" && r.title === "משולש = 1437"));
  assert.deepEqual(out.errors, ["verses"]);
  assert.deepEqual((await findUnitConnections("  ", { readers })).results, []);
});
