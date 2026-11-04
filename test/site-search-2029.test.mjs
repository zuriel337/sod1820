import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchSiteSearch2029, siteSearchItems, siteSearchSeries, siteSearchTerm, siteSearchMoreHref } from "../src/lib/research/siteSearch2029.js";
import { fetchPostSearchSuggestions2029 } from "../src/lib/research/postsCatalog2029Projection.js";
import { fetchTopicCardList } from "../src/lib/research/topicConvergence.js";
import { fetchWorldPublicPeopleIndex } from "../src/lib/research/worldPublicPeopleIndex.js";

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const item = (id, kind = "posts") => ({ id, kind, href: `/post/${id}`, title: `פריט ${id}` });
function clientFor(response) {
  const calls = [];
  const chain = new Proxy({}, { get(_, key) {
    if (key === "then") return (yes, no) => Promise.resolve(typeof response === "function" ? response() : response).then(yes, no);
    return (...args) => { calls.push([key, ...args]); assert.ok(!["insert", "update", "upsert", "delete", "rpc"].includes(key)); return chain; };
  } });
  return { client: chain, calls };
}
test("short/blank input reads nothing; invalid input is rejected before transport", async () => {
  let calls = 0;
  const readers = Object.fromEntries(["posts", "topics", "sources"].map(k => [k, () => { calls++; throw Error("unexpected"); }]));
  assert.deepEqual(await fetchSiteSearch2029("א", { readers }), []);
  assert.deepEqual(await fetchSiteSearch2029("  ", { readers }), []);
  assert.deepEqual(await fetchSiteSearch2029("**", { readers }), []);
  assert.deepEqual(await fetchSiteSearch2029("%,_", { readers }), []);
  await assert.rejects(fetchSiteSearch2029("א".repeat(121), { readers }));
  assert.throws(() => siteSearchTerm("a\u0000b")); assert.equal(calls, 0);
});
test("real series identities complete partial input without an inferred new series", () => {
  const rows = siteSearchSeries("סוד");
  assert.equal(rows.length, 1); assert.equal(rows[0].title, "סוד החשמל");
  assert.equal(rows[0].href, "/2029/posts?series=sod-hashmal");
  assert.deepEqual(siteSearchSeries("סדרה מומצאת"), []);
});
test("ready groups appear independently; failed sources are not measured empty", async () => {
  const pending = deferred(), events = [];
  const promise = fetchSiteSearch2029("סוד", { onGroup: g => events.push(g), readers: {
    posts: async () => ({ items: [item("1")] }), topics: () => pending.promise, sources: async () => { throw Error("denied"); },
  } });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(events.some(g => g.key === "posts" && g.state === "ready"));
  assert.ok(events.some(g => g.key === "sources" && g.state === "failed"));
  assert.ok(!events.some(g => g.key === "topics"));
  pending.resolve({ items: [] });
  const result = await promise;
  assert.equal(result.find(g => g.key === "topics").state, "ready");
  assert.equal(result.find(g => g.key === "sources").state, "failed");
});
test("abort prevents late callbacks even when a reader ignores cancellation", async () => {
  const pending = deferred(), controller = new AbortController(), events = [];
  const promise = fetchSiteSearch2029("בדיקה", { signal: controller.signal, onGroup: g => events.push(g), readers: {
    posts: () => pending.promise, topics: () => pending.promise, sources: () => pending.promise,
  } });
  controller.abort(); pending.resolve({ items: [item("late")] });
  await assert.rejects(promise, { name: "AbortError" });
  assert.deepEqual(events.map(g => g.key), ["series"]);
});
test("bounded display deduplicates identities but retains separate same-number topics", () => {
  const groups = {
    posts: { items: [item("p"), item("p"), { ...item("evil"), href: "//evil.invalid" }] },
    topics: { items: [item("topic-a", "topics"), item("topic-b", "topics")] },
  };
  assert.deepEqual(siteSearchItems(groups).map(x => x.id), ["p", "topic-a", "topic-b"]);
  assert.equal(siteSearchItems(groups, "topics").length, 2);
  assert.equal(siteSearchItems(groups, "all", 2).length, 2);
  assert.match(siteSearchMoreHref("posts", "סוד & החשמל"), /^\/2029\/posts\?q=/);
  assert.match(siteSearchMoreHref("topics", "1820"), /view=sources&q=1820#world-public-content-map$/);
});
test("post suggestions retain public suppression, literal search, small range and caller abort without count", async () => {
  const signal = new AbortController().signal;
  const { client, calls } = clientFor({ data: [{ id: 1, slug: "legacy", title: "old", tags: [] }], error: null });
  const result = await fetchPostSearchSuggestions2029({ search: "a%_*\\b", client, signal });
  assert.equal(result.posts.length, 1);
  assert.ok(calls.some(c => c[0] === "or" && c[1].includes("טיוטה") && c[1].includes("פורום")));
  assert.deepEqual(calls.find(c => c[0] === "range"), ["range", 0, 4]);
  assert.equal(calls.find(c => c[0] === "select")[2].count, undefined);
  assert.deepEqual(calls.find(c => c[0] === "ilike"), ["ilike", "title", "%a\\%\\_\\*\\\\b%"]);
  assert.equal(calls.find(c => c[0] === "abortSignal")[1], signal);
  const denied = clientFor({ data: [{ id: 2, tags: ["טיוטה"] }], error: null });
  await assert.rejects(fetchPostSearchSuggestions2029({ search: "ab", client: denied.client }));
});
test("topic suggestions reuse public view, existing query/bounds and explicit anonymous client", async () => {
  const { client, calls } = clientFor({ data: [], error: null });
  const signal = new AbortController().signal;
  await fetchTopicCardList({ q: "בדיקה*%_", limit: 4, client, signal, literalTitleSearch: true });
  assert.deepEqual(calls.find(c => c[0] === "ilike"), ["ilike", "title", "%בדיקה\\*\\%\\_%"]);
  assert.deepEqual(calls.find(c => c[0] === "from"), ["from", "topic_cards_public"]);
  assert.deepEqual(calls.find(c => c[0] === "range"), ["range", 0, 4]);
  assert.equal(calls.find(c => c[0] === "abortSignal")[1], signal);
});
test("source suggestions retain public eligibility and cannot page through the full directory", async () => {
  const person = { id: "a", slug: "a", display_name: "צבי", active: true, locked: false, building: false, public_visibility: "public" };
  const { client, calls } = clientFor({ data: [person, { ...person, id: "private", slug: "private", public_visibility: "private" }, { ...person, id: "locked", locked: true }], error: null });
  const result = await fetchWorldPublicPeopleIndex({ client, search: "צב", limit: 4 });
  assert.deepEqual(result.people.map(p => p.id), ["a"]);
  assert.equal(calls.filter(c => c[0] === "from").length, 1);
  assert.ok(calls.some(c => c[0] === "or" && c[1].includes("visibility.eq.public")));
  assert.ok(!/email|phone|contact|dossier_settings,/.test(calls.find(c => c[0] === "select")[1]));
});
test("all optional readers fail closed before a request when already canceled", async () => {
  const controller = new AbortController(); controller.abort();
  const { client, calls } = clientFor({ data: [], error: null });
  for (const read of [() => fetchPostSearchSuggestions2029({ client, signal: controller.signal, search: "ab" }),
    () => fetchTopicCardList({ client, signal: controller.signal, q: "ab" }),
    () => fetchWorldPublicPeopleIndex({ client, signal: controller.signal, search: "ab" })]) await assert.rejects(read(), { name: "AbortError" });
  assert.equal(calls.length, 0);
});
test("top search is lazy and distinct from existing numeric callers and the bottom button", () => {
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  assert.match(frame, /SiteSearch2029 = React\.lazy/);
  assert.match(frame, /className="sod29-header-search"[^>]+onClick=\{openSiteSearch\}/);
  assert.match(frame, /if \(action === "number-search"\) openCommand\(\)/);
  assert.match(frame, /<small>גימטריה<\/small>/);
  assert.match(frame, /const openCommand = useCallback\(\(\) => openTransient\(TRANSIENT.COMMAND\)/);
});
