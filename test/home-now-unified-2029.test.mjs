import test from "node:test";
import assert from "node:assert/strict";
import { feedRows } from "../src/lib/systemFeed2029.js";
import { postRowToWorldUpdate } from "../src/lib/research/worldDiscoveryStream.js";
import { publicGalleryToSystemItem } from "../src/lib/research/systemFeedPublicSources2029.js";
import { groupRowToWorldUpdate } from "../src/lib/research/worldGroupSource.js";
import { homeUpdateColumns, isSiteSourceKey, nowModels, nowSourceThreads } from "../src/lib/nowPublications2029.js";

// ZURIEL 25.11.2026 (D1–D11): ONE set of rows, two views. The Home's strip (desktop two columns / phone one list) and "עכשיו" (threads by source / all
// chronologically) are pure projections of the same models: no second reader, no pin, no priority by type.
const NOW = Date.parse("2026-11-25T12:00:00Z");
const iso = hours => new Date(NOW - hours * 3600e3).toISOString();
const post = (id, hours, extra = {}) => ({ id, slug: `p-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, excerpt: null, source: "sod1820", wp_id: 50000 + id, home_hidden: false,
  date: iso(hours), created_at: iso(hours), modified: iso(hours), ...extra });
const gallery = (n, hours) => publicGalleryToSystemItem({ id: `10000000-0000-4000-8000-00000000000${n}`, image_url: `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/g${n}.jpg`,
  name: `תמונה מזרם המציאות ${n}`, description: "תיאור", source: "update", published: 1, min_tier: 0, curator_hidden: false, stream_at: iso(hours), created_at: iso(hours), wp_gallery_id: 105 });
const group = (n, hours, slug = "tzvi-opoc", channel = "torat-haremez") => groupRowToWorldUpdate({ id: `20000000-0000-4000-8000-00000000000${n}`, body: `הודעת מקור ${n}`, created_at: iso(hours),
  contributor_slug: slug, contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique", group_channel: channel });
const finding = (n, hours) => ({ id: `finding:${n}`, kind: "finding", label: `ממצא צופן ${n}`, value: 26, at: iso(hours) });
const modelsOf = items => nowModels(feedRows(items.filter(Boolean), { now: NOW, limit: 160, caps: { post: 40, group: 40, gallery: 10, finding: 10 } }), NOW);

test("the site's own updates are the site's Posts, a substantive update of an existing Post, new ELS findings and site news; a source is everything else public", () => {
  assert.equal(isSiteSourceKey("site:posts"), true);
  assert.equal(isSiteSourceKey("site:els"), true);
  assert.equal(isSiteSourceKey("series:reality-map"), true);
  assert.equal(isSiteSourceKey("channel:site-news"), true);
  assert.equal(isSiteSourceKey("site:reality"), false, "the reality stream is a source, not a site update");
  assert.equal(isSiteSourceKey("channel:or-geula"), false);
  assert.equal(isSiteSourceKey("group:torat-haremez"), false);
  const updated = { ...postRowToWorldUpdate(post(3, 50)), sourceUpdate: { label: "עדכון מהותי בפוסט קיים", eventKey: "post:3:u1" } };
  const { site, sources } = homeUpdateColumns(modelsOf([postRowToWorldUpdate(post(1, 30)), updated, finding(1, 5), gallery(1, 2), group(1, 1)]));
  const ids = site.map(model => model.id);
  assert.ok(ids.includes("post:1") && ids.includes("post:3"), "new Posts and an existing Post's substantive update");
  assert.ok(ids.includes("finding:1"), "a new ELS finding");
  assert.ok(site.find(model => model.id === "post:3").updated, "marked as updated");
  assert.deepEqual(sources.map(model => model.id), ["group:20000000-0000-4000-8000-000000000001", "gallery:10000000-0000-4000-8000-000000000001"]);
});

test("one item per source (its latest), newest first; a source's older items are not repeated", () => {
  const { sources } = homeUpdateColumns(modelsOf([group(1, 1), group(2, 5), group(3, 9), gallery(1, 3), gallery(2, 20)]));
  assert.deepEqual(sources.map(model => model.id), ["group:20000000-0000-4000-8000-000000000001", "gallery:10000000-0000-4000-8000-000000000001"]);
});

test("the latest public publication leads, whatever its type: a reality-stream image uploaded last is first, with its thumbnail", () => {
  const items = [postRowToWorldUpdate(post(1, 2)), group(1, 4), gallery(1, 0.5)];
  const { merged, sources } = homeUpdateColumns(modelsOf(items));
  assert.equal(merged[0].id, "gallery:10000000-0000-4000-8000-000000000001", "phone: the one chronological list starts with it");
  assert.equal(sources[0].id, "gallery:10000000-0000-4000-8000-000000000001", "desktop: first of the sources column");
  assert.ok(/g1\.jpg/.test(merged[0].thumb || ""), "with the image as its thumbnail");
  assert.deepEqual(merged.map(model => model.id), ["gallery:10000000-0000-4000-8000-000000000001", "post:1", "group:20000000-0000-4000-8000-000000000001"], "time order, no priority by type");
});

test("no pin and no series priority anywhere in the Home views: a pinned item and the reality-map series sit at their own time", () => {
  const pinned = { ...postRowToWorldUpdate(post(5107, 72, { slug: "sharshar" })), pinned: true, pinUntil: new Date(NOW + 40 * 3600e3).toISOString() };
  const map = postRowToWorldUpdate(post(9, 100, { tags: ["מפת המציאות"] }));
  const { merged } = homeUpdateColumns(modelsOf([pinned, map, postRowToWorldUpdate(post(1, 2)), gallery(1, 1)]));
  assert.deepEqual(merged.map(model => model.id), ["gallery:10000000-0000-4000-8000-000000000001", "post:1", "post:5107", "post:9"]);
  assert.ok(merged.every(model => !model.pinned));
});

test("both views are bounded: at most seven site updates and seven sources, never the whole history", () => {
  const items = [...Array.from({ length: 12 }, (_, i) => postRowToWorldUpdate(post(i + 1, i + 1))), ...Array.from({ length: 9 }, (_, i) => group(i + 1, i + 0.5, `writer-${i}`, `chan-${i}`))];
  const { site, sources } = homeUpdateColumns(modelsOf(items));
  assert.ok(site.length <= 7 && sources.length <= 7);
});

test("'עכשיו' threads: one thread per source, the most recently updated source first, each thread's latest update on top; the same models as the Home", () => {
  const items = [postRowToWorldUpdate(post(1, 30)), postRowToWorldUpdate(post(2, 10)), group(1, 1), group(2, 8), gallery(1, 3), gallery(2, 40)];
  const models = modelsOf(items);
  const threads = nowSourceThreads(models);
  assert.deepEqual(threads.map(thread => thread.id), ["group:torat-haremez", "site:reality", "site:posts"], "ordered by each source's latest update");
  const reality = threads.find(thread => thread.id === "site:reality");
  assert.deepEqual(reality.models.map(model => model.id), ["gallery:10000000-0000-4000-8000-000000000001", "gallery:10000000-0000-4000-8000-000000000002"]);
  assert.ok(threads.every(thread => thread.count > 0 && thread.models.length === thread.count), "no empty thread, and the thread holds exactly the loaded rows");
  const homeIds = new Set(homeUpdateColumns(models).merged.map(model => model.id));
  for (const model of homeUpdateColumns(models).merged) assert.ok(threads.some(thread => thread.models.some(item => item.id === model.id)), model.id);
  assert.ok(homeIds.size > 0);
});

test("a new publication moves its source to the top of the list", () => {
  const before = nowSourceThreads(modelsOf([postRowToWorldUpdate(post(1, 5)), gallery(1, 20)])).map(thread => thread.id);
  assert.deepEqual(before, ["site:posts", "site:reality"]);
  const after = nowSourceThreads(modelsOf([postRowToWorldUpdate(post(1, 5)), gallery(1, 20), gallery(2, 0.1)])).map(thread => thread.id);
  assert.deepEqual(after, ["site:reality", "site:posts"]);
});
