import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicBookContentProjection, fetchWorldPublicBookContent } from "../src/lib/research/worldBookContentProjection.js";

const books = [
  { id: "book-a", type: "book", label: "ספר א", identity_key: "book:a", created_at: "2026-10-28", metadata: { slug: "book-a", source_ref_prefixes: ["book:archive:a"] } },
  { id: "book-b", type: "book", label: "ספר ב", metadata: { slug: "book-b" } },
];

test("only documented Book source prefixes become World source identities", () => {
  const result = buildPublicBookContentProjection(books);
  assert.equal(result.cards.length, 2);
  assert.equal(result.cards[1].sourceCount, 0);
  assert.deepEqual(result.contentProjection.sources.map((row) => row.sourceRef), ["book:archive:a"]);
  assert.equal(result.contentProjection.occurrences[0].href, "/book/book-a");
  assert.equal(result.contentProjection.metrics.corpusSources, 1);
  assert.equal(result.contentProjection.metrics.findings, null);
  assert.equal(result.contentProjection.metrics.treeRelations, null);
});

test("World books reuses the bounded canonical reader", async () => {
  const calls = [];
  const result = await fetchWorldPublicBookContent({ limit: 12, reader: async (options) => { calls.push(options); return books; } });
  assert.deepEqual(calls, [{ limit: 12 }]);
  assert.equal(result.contentProjection.sources[0].sourceHref, "/book/book-a");
});
