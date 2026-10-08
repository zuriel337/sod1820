import test from "node:test";
import assert from "node:assert/strict";
import { classifyCorpusRows, corpusForCreator, corpusOrFilter, fetchCorpusPage, CORPUS_PAGE_SIZE, WORLD_SOURCE_CORPORA } from "./worldSourceCorpus.js";

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
