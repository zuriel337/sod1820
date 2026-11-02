import test from "node:test";
import assert from "node:assert/strict";
import { getHomeLaunchPostCards, projectHomeDocumentationPosts } from "../src/lib/research/homeLaunchPosts2029.js";
import { CONTENT_SERIES_2029, projectContentSeriesItems, fetchContentSeriesCatalog2029 } from "../src/lib/research/contentSeries2029Projection.js";
import { fetchHome2029Projection } from "../src/lib/research/home2029Projection.js";
import { supabase } from "../src/lib/supabase.js";

const row = (id, fields = {}) => ({ id, slug: `post-${id}`, title: `תיעוד ${id}`, categories: ["תיעוד אירועים"],
  tags: [], author: null, source: "wordpress", wp_id: id, date: "2026-10-20T00:00:00Z", home_hidden: false, ...fields });

test("latest external series never replaces editorial documentation, including event-category series", () => {
  const rows = [row(1), row(2, { date: "2026-11-02", author: "אלון לוי", tags: ["מה קורה הבורא"] }),
    row(3, { categories: ["מימד חמש", "תיעוד אירועים"], date: "2026-11-02" }),
    row(4, { author: "כתב חיצוני", date: "2026-11-02" }), row(5, { date: "2026-10-22", author: "המערכת" })];
  assert.deepEqual(projectHomeDocumentationPosts(rows).map(r => r.id), [5, 1]);
});

test("documentation retains URL provenance and never promotes draft/hidden rows or modified time", () => {
  const rows = [row(1, { modified: "2026-11-02" }), row(2, { date: "2026-10-22" }),
    row(3, { tags: ["טיוטה"] }), row(4, { home_hidden: true }), row(2)];
  const cards = projectHomeDocumentationPosts(rows);
  assert.deepEqual(cards.map(r => r.id), [2, 1]);
  assert.equal(cards[0].sourcePost.date, "2026-10-22");
  assert.equal(cards[0].wp_id, 2);
});

function queryClient({ error = null, rows = [] } = {}) {
  const calls = [];
  const client = { from(table) {
    const q = { then(resolve, reject) { return Promise.resolve({ data: rows, error, count: rows.length }).then(resolve, reject); } };
    for (const method of ["select", "or", "eq", "overlaps", "not", "order", "limit", "abortSignal"]) q[method] = (...args) => { calls.push([table, method, ...args]); return q; };
    return q;
  } };
  return { client, calls };
}

test("lead reader constrains public source before reading and propagates failure/cancellation", async () => {
  const fake = queryClient({ rows: [row(1)] }), controller = new AbortController();
  assert.equal((await getHomeLaunchPostCards({ client: fake.client, signal: controller.signal })).length, 1);
  assert.ok(fake.calls.some(call => call[1] === "or" && call[2].includes("טיוטה")));
  assert.ok(fake.calls.some(call => call[1] === "eq" && call[2] === "home_hidden" && call[3] === false));
  assert.ok(fake.calls.some(call => call[1] === "abortSignal" && call[2] === controller.signal));
  await assert.rejects(getHomeLaunchPostCards({ client: queryClient({ error: Error("offline") }).client }), /offline/);
});

test("Messages righteous is explicit post membership, OrGeula channel never becomes a series by name", () => {
  const spec = CONTENT_SERIES_2029.find(s => s.key === "messages-from-righteous");
  const result = projectContentSeriesItems([row(1, { categories: ["רמזים מצדיקים"] }), row(2, { categories: ["אור הגאולה"] }), row(3, { categories: ["מסרים מצדיקים"], tags: ["טיוטה"] })], spec);
  assert.deepEqual(result.items.map(item => item.id), ["1"]);
  assert.equal(result.items[0].href, "/post-1", "old WordPress address is retained");
  assert.equal(result.items[0].sourceRef, "posts:1");
});

test("series reads keep independent failures distinct from measured-empty; signal forwarded", async () => {
  const controller = new AbortController(), fake = queryClient({ error: Error("permission denied") });
  const result = await fetchContentSeriesCatalog2029({ client: fake.client, signal: controller.signal });
  assert.ok(result.series.every(series => series.readState === "failed" && series.total === null));
  assert.equal(fake.calls.filter(call => call[1] === "abortSignal").length, CONTENT_SERIES_2029.length);
  const empty = await fetchContentSeriesCatalog2029({ client: queryClient().client });
  assert.ok(empty.series.filter(series => !series.hasApprovedSources).every(series => series.readState === "measured_empty"));
  assert.equal(empty.byKey["messages-from-righteous"].readState, "not_loaded",
    "an unrequested approved source is not evidence that the whole mixed series is empty");
  assert.equal(empty.byKey["messages-from-righteous"].sourceTotal, null);
});

test("Home summary admission suppresses all seven reads, and admitted summary preserves existing reader", async () => {
  const original = supabase.from; let reads = 0;
  supabase.from = () => {
    reads++;
    const q = { then(resolve) { return Promise.resolve({ data: [], count: 0, error: null }).then(resolve); } };
    for (const method of ["select", "eq", "or", "gte", "order", "limit", "abortSignal"]) q[method] = () => q;
    return q;
  };
  try {
    const idle = await fetchHome2029Projection({ includeWorld: false, includeTemporal: false, includePulse: false });
    assert.equal(reads, 0); assert.equal(idle.systemPulse, null);
    const admitted = await fetchHome2029Projection({ includeWorld: false, includeTemporal: false });
    assert.equal(reads, 7); assert.equal(admitted.systemPulse.corpusTotal, 0);
  } finally { supabase.from = original; }
});
