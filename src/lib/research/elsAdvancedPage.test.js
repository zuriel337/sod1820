import test from "node:test";
import assert from "node:assert/strict";
import { buildElsAdvancedPageRequest, buildElsAdvancedSelection, buildElsAdvancedLoadItem, buildElsExactSkipProbe, elsSearchSpelling, projectElsAdvancedPage } from "./elsAdvancedPage.js";

const form = { term: "תורתאמת", scope: "torah", skipMin: "81", skipMax: "200", pageSize: "20" };

test("advanced ELS search is explicit, bounded and carries an exact keyset cursor", () => {
  const first = buildElsAdvancedPageRequest(form);
  assert.equal(first.request.op, "page");
  assert.equal(first.request.skip_min, 81);
  assert.equal(first.request.skip_max, 200);
  assert.equal(first.request.selection_protocol, "POST_HOC_EXPLORATORY");
  assert.equal(first.request.after_skip, undefined);
  const next = buildElsAdvancedPageRequest(form, { skip: 86, start: 1200, dir: -1 });
  assert.deepEqual([next.request.after_skip, next.request.after_start, next.request.after_dir], [86, 1200, -1]);
  assert.equal(buildElsAdvancedPageRequest({ ...form, skipMax: "10065" }).request.skip_max, 10065);
  assert.equal(buildElsAdvancedPageRequest({ ...form, skipMax: "" }).request.skip_max, 2_147_483_647);
  assert.equal(buildElsAdvancedPageRequest({ ...form, skipMax: "" }, { skip: 86, start: 1200, dir: -1 }).request.after_skip, 86);
  for (const bad of [{ ...form, skipMax: "2147483648" }, { ...form, skipMin: "201" }, { ...form, pageSize: "500" }, { ...form, term: "א" }])
    assert.ok(buildElsAdvancedPageRequest(bad).error);
});

test("reverse spelling variants preserve word boundaries and use the same page contract", () => {
  assert.equal(elsSearchSpelling("סוד החשמל", "reverse_all"), "למשחה דוס");
  assert.equal(elsSearchSpelling("סוד החשמל", "reverse_words"), "דוס למשחה");
  assert.equal(elsSearchSpelling("סוד החשמל", "reverse_last"), "סוד למשחה");
  assert.equal(buildElsAdvancedPageRequest({ ...form, term: "סוד החשמל", spelling: "reverse_all" }).request.term, "למשחה דוס");
  assert.equal(buildElsExactSkipProbe({ term: "סוד החשמל", spelling: "reverse_last", skip: 10065 }, 4).request.term, "סוד למשחה");
});

test("only a canonical page yields selectable occurrences and continuation", () => {
  const response = { data: { result: {
    contract: "els_search_page_v1", status: "OK", corpus_id: "torah-corpus", input: { normalized: "תורתאמת" },
    hits: [{ occurrence_id: "els:torah-corpus:תורתאמת:86:-1:1200", skip: 86, dir: -1, start: 1200, end: 598, positions: [1200, 1114] }],
    completion: { executed: true, returned_hits: 1, truncated: true, continuation: { after: { skip: 86, start: 1200, dir: -1 } } },
  } } };
  const page = projectElsAdvancedPage(response);
  assert.equal(page.projection.occurrences.length, 1);
  assert.deepEqual(page.cursor, { skip: 86, start: 1200, dir: -1 });
  const selection = buildElsAdvancedSelection(page.projection.occurrences[0], page.projection, "torah");
  assert.deepEqual([selection.term, selection.skip, selection.dir, selection.start], ["תורתאמת", 86, -1, 1200]);
  assert.deepEqual(buildElsAdvancedLoadItem(selection, page.projection), {
    term: "תורתאמת", scope: "torah", corpusId: "torah-corpus", skip: 86, dir: -1,
    start: 1200, hitId: "86_-1_1200", words: [],
  });
  assert.ok(projectElsAdvancedPage({ data: { result: { contract: "other", hits: response.data.result.hits } } }).error);
  const brokenContinuation = structuredClone(response);
  brokenContinuation.data.result.completion.continuation = null;
  assert.match(projectElsAdvancedPage(brokenContinuation).error, /סמן המשך/);
  const incomplete = structuredClone(response);
  incomplete.data.result.completion.executed = false;
  assert.match(projectElsAdvancedPage(incomplete).error, /לא השלים/);
});

test("a 503 timeout is incomplete, never an empty canonical result", () => {
  const failed = projectElsAdvancedPage({ data: { error: "backend_error" }, error: {
    message: "Edge Function returned a non-2xx status code", context: { status: 503 },
  } });
  assert.match(failed.error, /לא.*נמצא/);
  assert.equal(failed.projection, undefined);
});

test("exact skip uses canonical matrix load without the paged bridge's 500 ceiling", () => {
  const first = buildElsExactSkipProbe({ term: "תורה קדשה", scope: "torah", skip: "10065" }, 1);
  assert.deepEqual(first.request, { term: "תורה קדשה", scope: "torah", skip: 10065, requestId: 1 });
  assert.equal(buildElsExactSkipProbe({ term: "תורה קדשה", scope: "torah", skip: "10065" }, 2).request.requestId, 2);
  for (const skip of ["", "1", "2.5", "9007199254740992"]) assert.ok(buildElsExactSkipProbe({ term: "תורה", skip }).error);
});

test("a work-budget stop is a range still to scan, never a promise of another occurrence or a negative result", () => {
  const result = (completion, hits = []) => ({ data: { result: {
    contract: "els_search_page_v1", status: "OK", corpus_id: "tanakh-corpus", input: { normalized: "ויהיאור" }, hits, completion,
  } } });
  const budget = projectElsAdvancedPage(result({ executed: true, returned_hits: 0, has_more: true, truncated: true, stop_reason: "work_budget",
    scanned_through_skip: 84, continuation: { after: { skip: 84, start: 1204582, dir: -1 } } }));
  assert.equal(budget.error, undefined);
  assert.equal(budget.projection.occurrences.length, 0);
  assert.deepEqual(budget.cursor, { skip: 84, start: 1204582, dir: -1 });
  assert.equal(budget.scanPending, true);
  assert.ok(buildElsAdvancedPageRequest({ term: "ויהיאור", scope: "tanakh", skipMin: "2", skipMax: "", pageSize: "100" }, budget.cursor).request);
  const guard = projectElsAdvancedPage(result({ executed: true, returned_hits: 0, has_more: true, truncated: true, stop_reason: "time_guard",
    scanned_through_skip: 9, continuation: { after: { skip: 9, start: 1204582, dir: -1 } } }));
  assert.equal(guard.scanPending, true);
  const full = projectElsAdvancedPage(result({ executed: true, returned_hits: 1, has_more: true, truncated: true, stop_reason: "page_full",
    continuation: { after: { skip: 86, start: 1200, dir: -1 } } },
  [{ occurrence_id: "els:tanakh-corpus:ויהיאור:86:-1:1200", skip: 86, dir: -1, start: 1200, end: 684, positions: [1200, 1114, 1028, 942, 856, 770, 684] }]));
  assert.equal(full.scanPending, false);
  const done = projectElsAdvancedPage(result({ executed: true, returned_hits: 0, has_more: false, truncated: false, stop_reason: "range_complete",
    scanned_through_skip: 200, continuation: null }));
  assert.equal(done.cursor, null);
  assert.equal(done.scanPending, false);
  // The body deployed before the work budget has no stop_reason: its cursor keeps meaning "another occurrence exists".
  const before = projectElsAdvancedPage(result({ executed: true, returned_hits: 1, truncated: true, continuation: { after: { skip: 86, start: 1200, dir: -1 } } },
  [{ occurrence_id: "els:tanakh-corpus:ויהיאור:86:-1:1200", skip: 86, dir: -1, start: 1200, end: 684, positions: [1200, 1114, 1028, 942, 856, 770, 684] }]));
  assert.equal(before.scanPending, false);
});
