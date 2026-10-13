import test from "node:test";
import assert from "node:assert/strict";
import { prepareElsAutomaticResearchPlan, runElsAutomaticResearchSlice, summarizeElsAutomaticPlan } from "./elsAutomaticResearchPlan.js";

const base = { expressions: "סוד החשמל\nאמת", scope: "torah", skipMin: "2", skipMax: "80", pageSize: "2" };

test("automatic plan derives each expression once, explains every form and deduplicates canonical terms", () => {
  const plan = prepareElsAutomaticResearchPlan(base);
  assert.equal(plan.contract, "els_automatic_research_plan_v1");
  assert.deepEqual(plan.sources, ["סוד החשמל", "אמת"]);
  const words = plan.candidates.map(row => row.canonicalTerm);
  assert.ok(words.includes("סודהחשמל"));
  assert.ok(words.includes("למשחהדוס"));
  assert.ok(words.includes("דוסלמשחה"));
  assert.ok(words.includes("סודלמשחה"));
  assert.equal(new Set(words).size, words.length);
  assert.ok(plan.candidates.every(row => row.derivations.every(d => d.source && d.ruleId && d.ruleLabel)));
  assert.equal(plan.canonicalFormsPending, true);
  assert.equal(plan.skipMax, 80);
});

test("canonical FORMS are incorporated as evidence of one generator, without recreating its rules", () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, canonicalForms: [
    { source: "סוד החשמל", term: "סודהחשמל", derivation: "A + B" },
    { source: "סוד החשמל", term: "החשמלסוד", derivation: "B + A" },
  ] });
  assert.equal(plan.canonicalFormsIncluded, true);
  assert.equal(plan.canonicalFormsPending, false);
  assert.ok(plan.candidates.some(row => row.canonicalTerm === "החשמלסוד" && row.derivations.some(d => d.ruleId === "canonical_forms_splitjoin")));
  const duplicate = plan.candidates.find(row => row.canonicalTerm === "סודהחשמל");
  assert.ok(duplicate.derivations.some(d => d.ruleId === "original"));
  assert.ok(duplicate.derivations.some(d => d.ruleId === "canonical_forms_splitjoin"));
});

test("open-ended bounds and invalid input remain explicit", () => {
  assert.equal(prepareElsAutomaticResearchPlan({ ...base, skipMax: "" }).skipMax, 2_147_483_647);
  assert.ok(prepareElsAutomaticResearchPlan({ ...base, expressions: "" }).error);
  assert.ok(prepareElsAutomaticResearchPlan({ ...base, expressions: "abc" }).error);
  assert.ok(prepareElsAutomaticResearchPlan({ ...base, skipMax: "1" }).error);
});

test("automatic slices use only canonical page calls, preserve source and make no truth claim", async () => {
  const plan = prepareElsAutomaticResearchPlan(base);
  const calls = [];
  const result = await runElsAutomaticResearchSlice({ plan, invokePage: async request => {
    calls.push(request);
    return { data: { result: {
      contract: "els_search_page_v1", status: "OK", corpus_id: "torah-corpus", input: { normalized: request.term.replace(/\s/g, "") },
      hits: [{ occurrence_id: `els:torah-corpus:${request.term}:7:1:10`, skip: 7, dir: 1, start: 10, end: 17, positions: [10, 17] }],
      completion: { executed: true, returned_hits: 1, truncated: false, continuation: null },
    } } };
  } });
  assert.equal(calls.length, result.rows.length);
  assert.ok(calls.every(call => call.op === "page" && call.skip_min === 2 && call.skip_max === 80 && call.selection_protocol === "POST_HOC_EXPLORATORY"));
  assert.equal(result.rows[0].derivations[0].source, "סוד החשמל");
  assert.equal(result.rows[0].projection.occurrences.length, 1);
  assert.equal(result.scan.truthPromotion, false);
  assert.equal(summarizeElsAutomaticPlan(plan, [result]).evidencePromotion, false);
  assert.equal(summarizeElsAutomaticPlan(plan, [result]).hasPending, result.hasMoreCandidates);
});

test("a time-stopped slice never advances past candidates it did not scan", async () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "סוד החשמל, תורת אמת, אור אמת" });
  let clock = 0;
  const result = await runElsAutomaticResearchSlice({ plan, now: () => clock, invokePage: async request => {
    clock += 16_000;
    return { data: { result: { contract: "els_search_page_v1", status: "EXECUTED_EMPTY", corpus_id: "torah-corpus",
      input: { normalized: request.term.replace(/\s/g, "") }, hits: [], completion: { executed: true, returned_hits: 0, truncated: false } } } };
  } });
  assert.equal(result.nextOffset, 1);
  assert.equal(result.hasMoreCandidates, true);
  assert.equal(result.rows[1].state, "BUDGET_STOPPED");
});

test("a series longer than one slice continues through the same plan without a second search path", async () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "סוד החשמל, תורת אמת, אור אמת" });
  assert.ok(plan.candidates.length > 8);
  const calls = [];
  const invokePage = async request => {
    calls.push(request.term);
    return { data: { result: { contract: "els_search_page_v1", status: "EXECUTED_EMPTY", corpus_id: "torah-corpus",
      input: { normalized: request.term.replace(/\s/g, "") }, hits: [], completion: { executed: true, returned_hits: 0, truncated: false } } } };
  };
  const first = await runElsAutomaticResearchSlice({ plan, invokePage });
  const second = await runElsAutomaticResearchSlice({ plan, offset: first.nextOffset, invokePage });
  assert.equal(first.rows.length, 8);
  assert.equal(first.hasMoreCandidates, true);
  assert.equal(second.offset, 8);
  assert.equal(first.rows.length + second.rows.length, plan.candidates.length);
  assert.equal(new Set(calls).size, plan.candidates.length);
  assert.equal(summarizeElsAutomaticPlan(plan, [first, second]).hasPending, false);
});

test("automatic scan reports each active form and keeps a failed form distinct from no matches", async () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "חשפד" });
  const progress = [];
  const result = await runElsAutomaticResearchSlice({ plan, onProgress: event => progress.push(event), invokePage: async () => ({
    data: { error: "backend_error" }, error: { message: "Edge Function returned a non-2xx status code", context: { status: 503 } },
  }) });
  assert.equal(progress[0].phase, "searching");
  assert.equal(progress[1].phase, "done");
  assert.equal(progress[1].row.state, "FAILED");
  assert.match(progress[1].row.error, /לא.*נמצא/);
  assert.equal(result.rows[0].state, "FAILED");
  assert.equal(result.rows[0].partial, true);
  assert.equal(summarizeElsAutomaticPlan(plan, [result]).failedCount > 0, true);
});

test("Raziel coverage stops calling a variant partial after its keyset continuation finishes", () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "אמת" });
  const row = { canonicalTerm: "אמת", state: "OK", count: 2, partial: true, cursor: { skip: 8, start: 10, dir: 1 } };
  const slice = { rows: [row, ...plan.candidates.filter(candidate => candidate.canonicalTerm !== "אמת").map(candidate => ({ ...candidate, state: "EXECUTED_EMPTY", count: 0, partial: false, cursor: null }))] };
  assert.equal(summarizeElsAutomaticPlan(plan, [slice]).hasPending, true);
  assert.equal(summarizeElsAutomaticPlan(plan, [slice], { אמת: { pages: [{}], cursor: null } }).hasPending, false);
});
