import test from "node:test";
import assert from "node:assert/strict";
import { prepareElsAdvancedBatch, runElsAdvancedBatch } from "./elsAdvancedBatch.js";

const base = { axis: "תורת אמת", related: "אמת, תורתאמת\nחסד", scope: "torah", skipMin: "2", skipMax: "80", pageSize: "5" };

test("batch plan requires two to four distinct user terms and explicit bounds", () => {
  assert.deepEqual(prepareElsAdvancedBatch(base).terms, ["תורתאמת", "אמת", "חסד"]);
  assert.ok(prepareElsAdvancedBatch({ ...base, related: "" }).error);
  assert.equal(prepareElsAdvancedBatch({ ...base, skipMax: "10065" }).skipMax, 10065);
  assert.ok(prepareElsAdvancedBatch({ ...base, related: "א, ב, ג, ד" }).error);
});

test("batch scanner makes one canonical bounded call per term and preserves partial results", async () => {
  const plan = prepareElsAdvancedBatch(base);
  const calls = [];
  const result = await runElsAdvancedBatch({ plan, invokePage: async request => {
    calls.push(request);
    return { data: { result: {
      contract: "els_search_page_v1", status: request.term === "חסד" ? "EXECUTED_EMPTY" : "OK",
      corpus_id: "torah-corpus", input: { normalized: request.term },
      hits: request.term === "חסד" ? [] : [{ occurrence_id: `els:torah-corpus:${request.term}:7:1:10`, skip: 7, dir: 1, start: 10, end: 10 + 7 * (request.term.length - 1), positions: [10, 17] }],
      completion: { executed: true, returned_hits: request.term === "חסד" ? 0 : 1, truncated: request.term === "אמת", continuation: request.term === "אמת" ? { after: { skip: 7, start: 10, dir: 1 } } : null },
    } } };
  } });
  assert.equal(calls.length, 3);
  assert.ok(calls.every(request => request.op === "page" && request.skip_min === 2 && request.skip_max === 80 && request.page_size === 5));
  assert.deepEqual(result.rows.map(row => [row.term, row.count, row.truncated]), [["תורתאמת", 1, false], ["אמת", 1, true], ["חסד", 0, false]]);
  assert.equal(result.rows[0].projection.occurrences[0].start, 10);
  assert.equal(result.scan.truthPromotion, false);
});
