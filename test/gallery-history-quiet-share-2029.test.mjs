import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { worldMediaPublicShare } from "../src/lib/research/worldFindingShare.js";

const id = "12345678-1234-4123-8123-123456789012";
const origin = "https://preview.example.test";
const image = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/original.jpg";
const item = (patch = {}) => ({
  galleryImageId: id, sourceRef: `gallery_images:${id}`, imageUrl: image,
  access: { scope: "public" }, label: "וראית את אחרי",
  legacyPlacement: { galleryImageId: id, wpGalleryId: 81, ordering: 7, originalCaption: "1237" },
  ...patch,
});

test("shares the exact public gallery occurrence on the current Preview, not Production", () => {
  const input = item(); const snapshot = JSON.stringify(input);
  const out = worldMediaPublicShare(input, { origin });
  assert.equal(out.url, `${origin}/world?view=gallery&gallery=81&image=${id}#gallery-source-${id}`);
  assert.equal(out.image, image);
  assert.equal(out.entityId, id);
  assert.deepEqual(out.exactState, { galleryImageId: id, sourceRef: `gallery_images:${id}` });
  assert.equal(JSON.stringify(input), snapshot, "source order, caption and identity unchanged");
  assert.equal(JSON.stringify(out).includes("1237"), false, "source OCR/caption is not exported as share context");
});

test("a public-looking image alone is not permission or an exact destination", () => {
  for (const patch of [{ access: undefined }, { access: { scope: "private" } }, { access: { scope: "public", available: false } },
    { sourceRef: `gallery_images:aaaaaaaa-1234-4123-8123-123456789012` },
    { legacyPlacement: { galleryImageId: "other", wpGalleryId: 81 } }])
    assert.equal(worldMediaPublicShare(item(patch), { origin }), null);
  assert.equal(worldMediaPublicShare(item({ legacyPlacement: { galleryImageId: id, wpGalleryId: 69 } }), { origin }), null,
    "does not invent an exact Archive image locator");
});

test("existing exact Topic source locator is allowed without minting a new route", () => {
  const input = item({ legacyPlacement: { galleryImageId: id, wpGalleryId: 69 }, reopen: { topicHref: `/topic/existing#topic-source-${id}` } });
  assert.equal(worldMediaPublicShare(input, { origin }).url, `${origin}/topic/existing#topic-source-${id}`);
  for (const href of [`/topic/existing#topic-source-other`, `/topic/existing?admin=1#topic-source-${id}`,
    `https://other.example/topic/existing#topic-source-${id}`, `/archive?gal=69&image=${id}`, `/topic/a/b#topic-source-${id}`])
    assert.equal(worldMediaPublicShare({ ...input, reopen: { topicHref: href } }, { origin }), null);
});

test("signed, private, credential-bearing media and unsafe origins fail closed", () => {
  for (const imageUrl of [`${image}?token=secret`, `${image}#secret`, image.replace("/public/", "/sign/"),
    "http://example.test/storage/v1/object/public/media/a.jpg", "https://secret@example.test/storage/v1/object/public/media/a.jpg"])
    assert.equal(worldMediaPublicShare(item({ imageUrl }), { origin }), null);
  for (const base of [null, "http://example.test", "https://user:secret@example.test", `${origin}/world?auth=secret`, "javascript:alert(1)"])
    assert.equal(worldMediaPublicShare(item(), { origin: base }), null);
  assert.ok(worldMediaPublicShare(item(), { origin: "http://127.0.0.1:4321" }));
});

test("one shared icon variant reuses share execution; old channel row remains the default", () => {
  const src = readFileSync(new URL("../src/components/ShareActions.jsx", import.meta.url), "utf8");
  assert.match(src, /variant = "default"/);
  const icon = src.slice(src.indexOf('if (variant === "icon")'), src.indexOf("const btn ="));
  assert.match(icon, /if \(canNative\) void native\(\); else void copy\(\)/);
  assert.match(icon, /event\.stopPropagation\(\)/);
  assert.match(icon, /size=\{16\}/);
  assert.doesNotMatch(icon, /fetch\(|navigator\.share|emitShare\(|shareImg\(/);
  const css = readFileSync(new URL("../src/components/experience2029/contentActions2029.css", import.meta.url), "utf8");
  assert.match(css, /width:44px;height:44px;min-width:44px;min-height:44px/);
  assert.match(css, /svg \{width:16px;height:16px\}/);
  for (const path of ["../src/pages/Gallery2029Page.jsx", "../src/components/experience2029/CanonicalMediaFigure2029.jsx"]) {
    const surface = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(surface, /worldMediaPublicShare\(/);
    assert.match(surface, /<ShareActions[^>]+variant="icon"/);
    assert.doesNotMatch(surface, /navigator\.share|clipboard\.writeText/);
  }
});

test("historical mapping is a complete reference snapshot, not a runtime relation registry", () => {
  const map = JSON.parse(readFileSync(new URL("../docs/reviews/gallery-historical-post-mapping-20261031.json", import.meta.url), "utf8"));
  assert.equal(map.kind, "read_only_historical_mapping_evidence_not_runtime_registry");
  assert.equal(map.galleries.length, map.counts.gallery_records);
  assert.equal(map.posts.length, map.counts.referencing_posts);
  assert.equal(map.posts.reduce((n, p) => n + p.gallery_references.length, 0), map.counts.post_references);
  const series = map.posts.find(p => p.post_id === 1076);
  assert.deepEqual(series.gallery_references.map(r => r.wp_gallery_id), [78,77,76,73,70,69,61,59,57,54], "original HTML is part10 above part1");
  const elections = map.posts.find(p => p.post_id === 906);
  assert.ok(elections.gallery_references.some(r => r.wp_gallery_id === 69));
  const groups=map.historical_series_post_groups.groups;
  assert.equal(new Set(groups.flatMap(g=>g.gallery_ids_top_to_bottom)).size,24);
  assert.deepEqual(groups.find(g=>g.post_id===37).gallery_ids_top_to_bottom,[105,104]);
  assert.deepEqual(groups.find(g=>g.post_id===58).gallery_ids_top_to_bottom,[104,103,102]);
  assert.deepEqual(groups.find(g=>g.post_id===168).gallery_ids_top_to_bottom,[99,95,91,88,86]);
  assert.deepEqual(groups.find(g=>g.post_id===260).gallery_ids_top_to_bottom,[84,83,82,80,79]);
  assert.equal(groups.filter(g=>g.gallery_ids_top_to_bottom.includes(104)).length,2,"part23 keeps both source post occurrences");
  for (const p of map.posts) {
    const offsets = p.gallery_references.map(r => r.first_marker_offset);
    assert.deepEqual(offsets, [...offsets].sort((a,b) => a-b));
    for (const r of p.gallery_references) assert.equal(r.relation, "explicit_post_gallery_marker_not_graph_edge");
  }
  assert.ok(!JSON.stringify(map).includes('"content":'));
  assert.ok(!JSON.stringify(map).includes('"ocr_text":'));
});
