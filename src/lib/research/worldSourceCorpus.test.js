import test from "node:test";
import assert from "node:assert/strict";
import { classifyCorpusRows, corpusForCreator, corpusOrFilter, fetchCorpusPage, fetchCorpusSource, CORPUS_PAGE_SIZE, WORLD_SOURCE_CORPORA } from "./worldSourceCorpus.js";

const HASHMAL = WORLD_SOURCE_CORPORA[0];

test("Hashmal corpus is selected by exact category OR title phrase, from the author chip label too", () => {
  assert.equal(corpusForCreator("סוד החשמל"), HASHMAL);
  assert.equal(corpusForCreator("מישהו אחר"), null);
  const f = corpusOrFilter(HASHMAL);
  assert.match(f, /categories\.cs\.\{"סוד החשמל"\}/);
  assert.match(f, /title\.ilike\.\*סוד החשמל\*/);
});

test("classification preserves excluded rows and never invents titles from slugs", () => {
  const { items, excluded } = classifyCorpusRows([
    { id: 1, slug: "a", title: "<b>כותרת</b>", excerpt: "<p>תוכן המקור</p>", home_hidden: false, tags: [] },
    { id: 2, slug: "b", title: "מוסתר", home_hidden: true, tags: [] },
    { id: 3, slug: "c", title: "טיוטה", tags: ["טיוטה"] },
    { id: 4, slug: "raw-slug-only", title: "  ", tags: [] },
  ]);
  assert.deepEqual(items.map((i) => i.id), ["1", "2"]);
  assert.equal(items[0].title, "כותרת");
  assert.equal(items[0].excerpt, "תוכן המקור");
  assert.equal(items[1].homeHidden, true); // visible but labelled, not dropped
  assert.deepEqual(excluded.map((e) => e.reason), ["draft_or_forum", "no_title"]);
});

test("full corpus read is paginated and reports the true total, distinct from last-N recent feed", async () => {
  const rows = Array.from({ length: CORPUS_PAGE_SIZE }, (_, i) => ({ id: i, slug: `s${i}`, title: `מקור ${i}`, tags: [] }));
  const client = { from: () => { const b = { select: () => b, or: () => b, order: () => b, range: () => Promise.resolve({ data: rows, count: 132 }) }; return b; } };
  const page = await fetchCorpusPage(HASHMAL, 0, { client });
  assert.equal(page.total, 132);
  assert.equal(page.items.length, CORPUS_PAGE_SIZE);
  assert.equal(page.hasMore, true);
  assert.ok(page.total > 40, "corpus total is not bounded by the discovery feed cap of 40");
});

test("read failure throws (shown as failure, never as an empty library)", async () => {
  const client = { from: () => { const b = { select: () => b, or: () => b, order: () => b, range: () => Promise.resolve({ data: null, error: { message: "boom" } }) }; return b; } };
  await assert.rejects(() => fetchCorpusPage(HASHMAL, 0, { client }));
});

test("draft/forum suppression happens in the SERVER query; count and hasMore are the exact public figures", async () => {
  const ors = [];
  const rows = Array.from({ length: CORPUS_PAGE_SIZE }, (_, i) => ({ id: i, slug: `s${i}`, title: `מקור ${i}`, tags: [] }));
  const client = { from: () => { const b = { select: () => b, or: (f) => { ors.push(f); return b; }, order: () => b, range: () => Promise.resolve({ data: rows, count: 131 }) }; return b; } };
  const page = await fetchCorpusPage(HASHMAL, 0, { client });
  assert.ok(ors.some((f) => f.includes("tags.not.ov.{טיוטה,פורום}") && f.includes("tags.is.null")), "server filter excludes draft/forum, keeps null tags");
  assert.equal(page.total, 131, "public count, not raw 132");
  assert.equal(page.hasMore, true);
  const last = await fetchCorpusPage(HASHMAL, 5, { client: { from: () => { const b = { select: () => b, or: () => b, order: () => b, range: () => Promise.resolve({ data: rows.slice(0, 11), count: 131 }) }; return b; } } });
  assert.equal(last.hasMore, false, "5*24+11 = 131 -> no more pages");
});


test("full source read keeps exact corpus/id/public filter and never substitutes excerpt", async () => {
  const calls = [];
  const makeClient = (data) => ({ from: (table) => {
    calls.push(table);
    const b = { select: () => b, eq: (...args) => { calls.push(args); return b; }, or: (f) => { calls.push(f); return b; }, maybeSingle: async () => ({ data }) };
    return b;
  } });
  const result = await fetchCorpusSource(HASHMAL, "source-1", { client: makeClient({ id: "source-1", content: "<p>ראשון</p><p>שני</p>", tags: [] }) });
  assert.equal(result.id, "source-1");
  assert.match(result.text, /ראשון\n\nשני/);
  assert.ok(calls.some((v) => Array.isArray(v) && v[0] === "id" && v[1] === "source-1"));
  assert.ok(calls.includes(corpusOrFilter(HASHMAL)));
  assert.ok(calls.some((v) => typeof v === "string" && v.includes("tags.not.ov")));
  await assert.rejects(fetchCorpusSource(HASHMAL, "source-1", { client: makeClient({ id: "source-1", excerpt: "תקציר בלבד" }) }));
  await assert.rejects(fetchCorpusSource(HASHMAL, "source-1", { client: makeClient({ id: "source-1", content: "פרטי", tags: ["טיוטה"] }) }));
});
