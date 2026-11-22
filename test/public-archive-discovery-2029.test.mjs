import test from "node:test";
import assert from "node:assert/strict";
import { readPublicArchive2029 } from "../src/lib/research/publicArchive2029.js";

const imageId = "b83221ae-53bc-59f4-8cb6-158c852db7af";
const gallery = { id: "gallery-source", wp_gallery_id: 87, name: "גלריית מקור" };
const image = { id: imageId, gallery_id: gallery.id, galleries: gallery, name: "תמונה שפורסמה", published: 1,
  min_tier: 0, curator_hidden: false, image_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/example.jpg" };
const topic = { id: "topic-source", title: "נושא שפורסם", slug: "india-axis", status: "approved", occurred_at: "2015-06-01", image_ids: [imageId] };
const post = { id: 70, wp_id: 5341, title: "תיעוד במקור", slug: "original", source: "wordpress", date: "2025-07-03T08:00:00Z",
  tags: ["פומבי"], categories: ["וידאו"] };

function reader(tables, calls = []) {
  return async resource => {
    const [table, query] = resource.split("?");
    calls.push({ table, params: new URLSearchParams(query) });
    const rows = tables[table];
    if (rows instanceof Error) throw rows;
    assert.ok(Array.isArray(rows), table);
    return rows;
  };
}

test("archive years retain publication vs occurrence dates; authored memberships reopen their exact gallery, image and original Post", async () => {
  const calls = [];
  const data = await readPublicArchive2029(reader({ topic_cards_public: [topic], posts: [post], gallery_images: [image] }, calls));
  const byKey = new Map(data.collections.map(collection => [collection.key, collection.items]));
  assert.deepEqual(byKey.get("year-2025"), [{ title: "תיעוד במקור · פורסם 03.07.2025", href: "/original" }]);
  assert.deepEqual(byKey.get("year-2015"), [{ title: "נושא שפורסם · אירוע 01.06.2015", href: "/topic/india-axis" }]);
  assert.deepEqual(byKey.get("topic-india-axis").map(i => i.href), [
    "/topic/india-axis", "/world?view=gallery&gallery=87", `/world?view=gallery&gallery=87&image=${imageId}#gallery-source-${imageId}`,
  ]);
  assert.equal(byKey.get("categories")[0].href, "/category/" + encodeURIComponent("וידאו"));
  assert.equal(byKey.get("tags")[0].href, "/tag/" + encodeURIComponent("פומבי"));
  assert.equal(calls.find(c => c.table === "gallery_images").params.get("id"), `in.(${imageId})`);
});

test("historic year and page use half-open source-date bounds and stable pagination", async () => {
  const calls = [];
  const data = await readPublicArchive2029(reader({ posts: Array(13).fill(post) }, calls), "?year=2025&page=2");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, "posts");
  assert.deepEqual(calls[0].params.getAll("date"), ["not.is.null", "gte.2025-01-01", "lt.2026-01-01"]);
  assert.equal(calls[0].params.get("offset"), "12");
  assert.equal(calls[0].params.get("order"), "date.desc.nullslast,id.desc");
  assert.equal(data.hasMore, true);
  assert.equal(data.collections.find(group => group.key === "year-2025").items.length, 12);
});

test("archive uses only admitted memberships and safely admits a gallery with its selected public image", async () => {
  for (const withheld of [{ curator_hidden: true }, { min_tier: 1 }, { published: 0 }, { galleries: null },
    { image_url: image.image_url.replace("object/public/", "object/sign/") },
    { gallery_id: "another-gallery" }, { id: "b83221ae-53bc-59f4-8cb6-158c852db7a0" }]) {
    const data = await readPublicArchive2029(reader({ topic_cards_public: [topic], posts: [ { ...post, tags: ["טיוטה"] } ], gallery_images: [{ ...image, ...withheld }] }));
    assert.deepEqual(data.collections.flatMap(c => c.items.map(i => i.href)), ["/topic/india-axis"]);
  }
});

test("a failed optional media read preserves independent sources; unavailable primary data is distinguishable from empty", async () => {
  const partial = await readPublicArchive2029(reader({ topic_cards_public: [topic], posts: [], gallery_images: Error("failed") }));
  assert.equal(partial.partialMedia, true);
  assert.deepEqual(partial.collections[0].items.map(i => i.href), ["/topic/india-axis"]);
  await assert.rejects(readPublicArchive2029(reader({ topic_cards_public: [], posts: Error("failed") })), /failed/);
  const empty = await readPublicArchive2029(reader({ topic_cards_public: [], posts: [] }), "?year=2011");
  assert.deepEqual(empty.collections, []);
  assert.equal(empty.selectionNotice, null);
});

test("unsupported historical selections and malformed years never render a generic collection as a match", async () => {
  for (const search of ["?tab=pool", "?set=12", "?tab=cascade", "?tab=trial", "?q=text", "?year=bad", "?page=-2"]) {
    const calls = [];
    const result = await readPublicArchive2029(reader({}, calls), search);
    assert.deepEqual(calls, []);
    assert.ok(result.selectionNotice);
    assert.deepEqual(result.collections, []);
  }
});
