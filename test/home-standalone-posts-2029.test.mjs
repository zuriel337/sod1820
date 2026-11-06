import test from "node:test";
import assert from "node:assert/strict";
import {
  HOME_STANDALONE_LIMIT, HOME_STANDALONE_WINDOW_DAYS, getHomeStandalonePostCards, isHomeDocumentationPost,
  isHomeStandalonePost, projectHomeStandalonePosts,
} from "../src/lib/research/homeLaunchPosts2029.js";
import { contentSeriesKeysForPost } from "../src/lib/research/contentSeries2029Identity.js";

// Stage 2 (ZURIEL series & Home plan, 6.11.2026): "מחקרים ותוכן נוסף" = public Posts that are in NO series and NOT in the
// "עכשיו" documentation pool. Presentation over the existing public Posts boundary; it assigns nothing to any series.
const NOW = Date.parse("2026-11-06T12:00:00Z");
const day = 86400000;
const row = (id, fields = {}) => ({ id, slug: `post-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, source: "sod1820",
  wp_id: 40000 + id, home_hidden: false, date: new Date(NOW - 10 * day).toISOString(), ...fields });

// Real classification shapes (read from the live Posts on 6.11.2026).
const shapes = {
  research5084: row(5084, { categories: ["גימטריה מרחבית", "סוד האותיות והמספרים"], author: "SOD1820", date: "2026-08-26T23:35:18Z" }),
  coreNoCategory5009: row(5009, { categories: ["סוד 1820", "סוד האותיות והמספרים"], tags: ["גאולה"], date: "2026-10-20T00:00:00Z" }),
  externalWriter: row(5124, { categories: ["מסרים", "מאמרי דעה"], author: "רות קדם", date: "2026-10-25T00:00:00Z" }),
  leaflet: row(5121, { categories: ["עלוני גאולה"], author: "הרב ווינטרוב זצ\"ל", date: "2026-10-19T00:00:00Z" }),
  d5OtherPublisher: row(5127, { categories: ["מימד חמש", "וידאו"], author: "מדריך לריפוי 10 הספירות", date: "2026-10-28T00:00:00Z" }),
  docPool: row(5112, { categories: ["תיעוד אירועים", "רמזים חזקים"], date: "2026-10-30T00:00:00Z" }),
  docWithStrongOnly: row(5107, { categories: ["רמזי הגאולה", "בחירות"], date: "2026-10-30T00:00:00Z" }),
  seriesReality: row(6001, { tags: ["מפת המציאות"], date: "2026-11-01T00:00:00Z" }),
  seriesD5: row(6002, { categories: ["מימד חמש"], author: "בדרך לנצח", date: "2026-11-02T00:00:00Z" }),
  seriesMkb: row(6003, { tags: ["מה קורה הבורא"], author: "אלון לוי", date: "2026-11-02T00:00:00Z" }),
  seriesHashmal: row(6004, { categories: ["סוד החשמל"], date: "2026-11-02T00:00:00Z" }),
  seriesMessages: row(6005, { categories: ["מסרים מצדיקים"], date: "2026-11-02T00:00:00Z" }),
  orphanD5Doc: row(2, { categories: ["מסרים", "מימד חמש", "תיעוד אירועים"], author: "", date: "2026-10-31T00:00:00Z" }),
};

test("standalone = in no series and not in the documentation pool, by the same predicates the other readers use", () => {
  const expected = { research5084: true, coreNoCategory5009: true, externalWriter: true, leaflet: true, d5OtherPublisher: true, orphanD5Doc: true,
    docPool: false, docWithStrongOnly: false, seriesReality: false, seriesD5: false, seriesMkb: false, seriesHashmal: false, seriesMessages: false };
  for (const [name, post] of Object.entries(shapes)) assert.equal(isHomeStandalonePost(post), expected[name], name);
});

test("the three Home content sources never overlap for any post", () => {
  for (const [name, post] of Object.entries(shapes)) {
    const inSeries = contentSeriesKeysForPost(post).length > 0, inPool = isHomeDocumentationPost(post), standalone = isHomeStandalonePost(post);
    assert.equal([inSeries, inPool, standalone].filter(Boolean).length <= 1, true, `${name} appears in more than one source`);
  }
  // Exhaustive over the classification dimensions that decide membership.
  const categories = [[], ["תיעוד אירועים"], ["רמזים חזקים"], ["רמזי הגאולה"], ["מימד חמש"], ["סוד החשמל"], ["מסרים מצדיקים"], ["רמזים מצדיקים"], ["סוד 1820"], ["תיעוד אירועים", "מימד חמש"], ["שבילי שפה", "רמזים חזקים", "תיעוד אירועים"]];
  const tags = [[], ["מפת המציאות"], ["מה קורה הבורא"], ["סוד החשמל"], ["טיוטה"], ["פורום"], ["מפת המציאות", "טיוטה"]];
  const authors = [null, "", "המערכת", "SOD1820", "אלון לוי", "בדרך לנצח", "כתב חיצוני"];
  let checked = 0;
  for (const c of categories) for (const t of tags) for (const a of authors) for (const hidden of [false, true]) {
    const post = row(9000 + checked, { categories: c, tags: t, author: a, home_hidden: hidden });
    const flags = [contentSeriesKeysForPost(post).length > 0 && !hidden && !t.includes("טיוטה") && !t.includes("פורום"), isHomeDocumentationPost(post), isHomeStandalonePost(post)];
    assert.ok(!(flags[1] && flags[2]) && !(flags[0] && flags[2]), JSON.stringify({ c, t, a, hidden }));
    checked += 1;
  }
  assert.ok(checked > 800);
});

test("projection: newest first, window enforced, hidden/draft/forum/no-slug/no-title rows dropped, exclusions and duplicates removed", () => {
  const rows = [
    shapes.research5084, shapes.coreNoCategory5009, shapes.externalWriter, shapes.leaflet, shapes.docPool, shapes.seriesReality,
    row(70, { date: new Date(NOW - (HOME_STANDALONE_WINDOW_DAYS + 1) * day).toISOString() }),
    row(71, { home_hidden: true }), row(72, { tags: ["טיוטה"] }), row(73, { tags: ["פורום"] }), row(74, { slug: "" }), row(75, { title: "  " }),
    row(76, { date: "not a date" }), shapes.leaflet,
  ];
  const cards = projectHomeStandalonePosts(rows, { limit: 10, now: NOW });
  assert.deepEqual(cards.map(card => card.id), [5124, 5009, 5121, 5084], "newest first (25.10, 20.10, 19.10, 26.8); only standalone rows in the window");
  assert.deepEqual(projectHomeStandalonePosts(rows, { limit: 2, now: NOW }).map(card => card.id), [5124, 5009]);
  assert.deepEqual(projectHomeStandalonePosts(rows, { limit: 10, now: NOW, exclude: ["post-5124", 5009] }).map(card => card.id), [5121, 5084],
    "an item already shown by another Home source (by slug or id) is not repeated");
  assert.equal(HOME_STANDALONE_LIMIT, 4);
  const [first] = cards;
  assert.equal(first.slug, "post-5124"); assert.equal(first.publishedAt, shapes.externalWriter.date); assert.equal(first.sourcePost, shapes.externalWriter);
});

function queryClient({ error = null, rows = [] } = {}) {
  const calls = [];
  const client = { from(table) {
    const q = { then(resolve, reject) { return Promise.resolve({ data: rows, error }).then(resolve, reject); } };
    for (const method of ["select", "or", "eq", "gte", "not", "order", "limit", "abortSignal"]) q[method] = (...args) => { calls.push([table, method, ...args]); return q; };
    return q;
  } };
  return { client, calls };
}

test("reader: one public read on the Posts boundary, windowed and bounded; no series, tag or category is written or assumed", async () => {
  const fake = queryClient({ rows: [shapes.research5084, shapes.docPool, shapes.seriesD5] }), controller = new AbortController();
  const cards = await getHomeStandalonePostCards({ client: fake.client, signal: controller.signal, now: NOW, limit: 4 });
  assert.deepEqual(cards.map(card => card.id), [5084], "pool and series rows returned by the read are filtered out by the shared predicates");
  assert.ok(fake.calls.every(call => call[0] === "posts"), "reads only Posts");
  assert.ok(fake.calls.some(call => call[1] === "or" && call[2].includes("טיוטה") && call[2].includes("פורום")), "public source boundary");
  assert.ok(fake.calls.some(call => call[1] === "eq" && call[2] === "home_hidden" && call[3] === false));
  assert.ok(fake.calls.some(call => call[1] === "not" && call[2] === "slug" && call[3] === "is" && call[4] === null));
  const since = fake.calls.find(call => call[1] === "gte" && call[2] === "date")?.[3];
  assert.equal(since, new Date(NOW - HOME_STANDALONE_WINDOW_DAYS * day).toISOString());
  assert.ok(fake.calls.some(call => call[1] === "order" && call[2] === "date" && call[3].ascending === false));
  assert.ok(fake.calls.some(call => call[1] === "limit" && call[2] >= 4 && call[2] <= 100), "bounded over-read so filtering still leaves a full strip");
  assert.ok(fake.calls.some(call => call[1] === "abortSignal" && call[2] === controller.signal));
  assert.equal(fake.calls.some(call => ["insert", "update", "upsert", "delete", "rpc"].includes(call[1])), false);
  await assert.rejects(getHomeStandalonePostCards({ client: queryClient({ error: Error("offline") }).client, now: NOW }), /offline/);
  await assert.rejects(getHomeStandalonePostCards({ client: null }), /public_posts_unavailable/);
});

test("the documentation pool reader and its behavior are unchanged by the standalone reader", () => {
  assert.equal(isHomeDocumentationPost(shapes.docPool), true);
  assert.equal(isHomeDocumentationPost(shapes.docWithStrongOnly), true, "HOME-01 stays: documentation or the editorial strong mark");
  assert.equal(isHomeDocumentationPost(shapes.orphanD5Doc), false);
  assert.equal(isHomeDocumentationPost(shapes.research5084), false);
});
