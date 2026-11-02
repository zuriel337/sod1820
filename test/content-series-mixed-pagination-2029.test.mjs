import test from "node:test";
import assert from "node:assert/strict";
import { fetchPostsCatalog2029, completeMixedSeriesPostsPage2029, postsCatalogScope2029 } from "../src/lib/research/postsCatalog2029Projection.js";
import { mergeContentSeriesItems, projectContentSeriesItems } from "../src/lib/research/contentSeries2029Projection.js";

const scope = postsCatalogScope2029("series=messages-from-righteous");
const REF = "channel_updates:9d4e6b80-f52b-4461-9231-ca30f37f0db9";
const BASE = Date.parse("2026-11-02T12:00:00Z"), DAY = 86400000;
const posts = (count = 60) => Array.from({ length: count }, (_, index) => ({ id: index + 1,
  title: `פריט ${index + 1}`, slug: `old-${index + 1}`, source: "wordpress", wp_id: index + 1,
  categories: ["רמזים מצדיקים"], tags: [], date: new Date(BASE - index * DAY).toISOString(),
  modified: new Date(BASE + index * DAY).toISOString(),
}));
const source = rank => ({ id: REF, sourceRef: REF, kind: "channel_update", title: "מסר מקור",
  href: "/video/25e378462b55298219e5f7562698bfa7", decisionRef: "ZURIEL/20261102/8f8876f7",
  publishedAt: new Date(BASE - (rank - 0.5) * DAY).toISOString(),
});

function catalog(rows, { failHead = false, beforeResolve = null, range416 = false } = {}) {
  const calls = [];
  const client = { from(table) {
    assert.equal(table, "posts");
    const call = { operations: [], head: false }; calls.push(call);
    const query = { then(resolve, reject) {
      return Promise.resolve().then(() => {
        beforeResolve?.(call);
        if (failHead && call.head) return { data: null, error: Error("HEAD unavailable"), count: null };
        let filtered = [...rows];
        for (const [method, field, value] of call.operations) {
          if (method === "gte") filtered = filtered.filter(row => Date.parse(row[field]) >= Date.parse(value));
          if (method === "ilike") {
            const term = value.slice(1, -1).replace(/\\([\\%_])/g, "$1").toLocaleLowerCase();
            filtered = filtered.filter(row => row[field].toLocaleLowerCase().includes(term));
          }
        }
        const orders = call.operations.filter(op => op[0] === "order");
        filtered.sort((a, b) => {
          for (const [, field, options] of orders) {
            const left = field === "id" ? Number(a[field]) : Date.parse(a[field]);
            const right = field === "id" ? Number(b[field]) : Date.parse(b[field]);
            if (left !== right) return options.ascending ? left - right : right - left;
          }
          return 0;
        });
        const count = filtered.length, range = call.operations.find(op => op[0] === "range");
        if (range416 && range && range[1] >= count && count > 0) return { data: null, count: null, error: { code: "PGRST103" } };
        return { count, error: null, data: call.head ? null : range ? filtered.slice(range[1], range[2] + 1) : filtered };
      }).then(resolve, reject);
    } };
    for (const method of ["select", "or", "eq", "overlaps", "gte", "ilike", "order", "range", "abortSignal"]) {
      query[method] = (...args) => { call.operations.push([method, ...args]); if (method === "select") call.head = args[1]?.head === true; return query; };
    }
    return query;
  } };
  return { client, calls };
}

test("series publication order changes neither ordinary modified ordering nor numeric tie order", async () => {
  const rows = posts(3), fake = catalog(rows);
  assert.deepEqual((await fetchPostsCatalog2029({ scope, client: fake.client })).posts.map(row => row.id), [1, 2, 3]);
  assert.deepEqual((await fetchPostsCatalog2029({ client: fake.client })).posts.map(row => row.id), [3, 2, 1]);
  const tieRows = [{ ...rows[0], id: 10 }, { ...rows[0], id: 2 }];
  const tie = await fetchPostsCatalog2029({ scope, client: catalog(tieRows).client });
  const item = { ...source(0), publishedAt: rows[0].date };
  const finished = await completeMixedSeriesPostsPage2029({ scope, postResult: tie, sourceItems: [item], client: catalog(tieRows).client });
  const merged = mergeContentSeriesItems(projectContentSeriesItems(finished.posts, scope.spec).items, finished.sourceItems);
  assert.deepEqual(merged.map(row => row.sourceRef), ["posts:2", "posts:10", REF]);
});

test("source before, inside, after and exactly at a page boundary matches global bounded pagination", async () => {
  const rows = posts();
  for (const [rank, page] of [[0, 1], [0, 2], [12, 1], [24, 1], [24, 2], [25, 2], [48, 3], [59, 1]]) {
    const fake = catalog(rows), item = source(rank);
    const initial = await fetchPostsCatalog2029({ scope, page, client: fake.client });
    const finished = await completeMixedSeriesPostsPage2029({ scope, page, postResult: initial, sourceItems: [item], client: fake.client });
    const actual = mergeContentSeriesItems(projectContentSeriesItems(finished.posts, scope.spec).items, finished.sourceItems);
    const expected = mergeContentSeriesItems(projectContentSeriesItems(rows, scope.spec).items, [item]).slice((page - 1) * 24, page * 24);
    assert.deepEqual(actual.map(row => row.sourceRef), expected.map(row => row.sourceRef), `rank ${rank} page ${page}`);
    assert.equal(finished.total, 61); assert.equal(finished.postTotal, 60);
    assert.ok(actual.length <= 24);
    const ranges = fake.calls.flatMap(call => call.operations.filter(op => op[0] === "range"));
    assert.ok(ranges.every(([, from, to], index) => to - from + 1 <= (index === 0 ? 24 : 1)), "only one predecessor can be added to the original page read");
    assert.ok(fake.calls.every(call => call.operations.some(op => op[0] === "or" && op[1].includes("טיוטה"))));
    assert.ok(fake.calls.every(call => call.operations.some(op => op[0] === "or" && op[1].includes("רמזים מצדיקים"))));
  }
});

test("one source can create a real last page, including the empty-Post 416 response", async () => {
  const rows = posts(24);
  for (const rank of [0, 24]) {
    const fake = catalog(rows, { range416: true });
    const initial = await fetchPostsCatalog2029({ scope, page: 2, client: fake.client, allowApprovedSourcePage: true });
    assert.deepEqual(initial.posts, []); assert.equal(initial.total, 24);
    const finished = await completeMixedSeriesPostsPage2029({ scope, page: 2, postResult: initial, sourceItems: [source(rank)], client: fake.client });
    const actual = mergeContentSeriesItems(projectContentSeriesItems(finished.posts, scope.spec).items, finished.sourceItems);
    assert.deepEqual(actual.map(item => item.sourceRef), [rank === 0 ? "posts:24" : REF]);
    assert.equal(finished.total, 25);
  }
  await assert.rejects(fetchPostsCatalog2029({ page: 2, client: catalog(rows, { range416: true }).client, allowApprovedSourcePage: true }), error => error.code === "PGRST103",
    "ordinary Posts do not invent a new last page");
});

test("search exclusion and source failure do not invent a source or another rank request", async () => {
  const fake = catalog(posts());
  const initial = await fetchPostsCatalog2029({ scope, search: "פריט", client: fake.client });
  const countBefore = fake.calls.length;
  const finished = await completeMixedSeriesPostsPage2029({ scope, search: "פריט", postResult: initial, sourceItems: [source(12)], client: fake.client });
  assert.equal(fake.calls.length, countBefore);
  assert.equal(finished.total, initial.total); assert.deepEqual(finished.sourceItems, []);
  const absent = await completeMixedSeriesPostsPage2029({ scope, postResult: initial, sourceItems: [], client: fake.client });
  assert.deepEqual(absent.posts, initial.posts); assert.equal(fake.calls.length, countBefore);
});

test("HEAD failure and cancellation preserve the already-readable Post result", async () => {
  const initial = await fetchPostsCatalog2029({ scope, page: 2, client: catalog(posts()).client });
  const saved = JSON.stringify(initial);
  await assert.rejects(completeMixedSeriesPostsPage2029({ scope, page: 2, postResult: initial, sourceItems: [source(0)], client: catalog(posts(), { failHead: true }).client }), /HEAD unavailable/);
  assert.equal(JSON.stringify(initial), saved);
  const controller = new AbortController();
  const fake = catalog(posts(), { beforeResolve: call => { if (call.head) controller.abort(); } });
  await assert.rejects(completeMixedSeriesPostsPage2029({ scope, page: 2, postResult: initial, sourceItems: [source(0)], client: fake.client, signal: controller.signal }), { name: "AbortError" });
  assert.equal(fake.calls.length, 1, "abort after rank prevents predecessor read");
  assert.equal(JSON.stringify(initial), saved);
  const idle = catalog(posts());
  await assert.rejects(completeMixedSeriesPostsPage2029({ scope, postResult: initial, sourceItems: [source(0)], client: idle.client, signal: controller.signal }), { name: "AbortError" });
  assert.equal(idle.calls.length, 0);
});
