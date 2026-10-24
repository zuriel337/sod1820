import test from "node:test";
import assert from "node:assert/strict";
import {
  LIFE_JOURNEY_ELS_ADAPTER_CONTRACT,
  prepareLifeJourneyElsPlan,
  replayLifeJourneyElsSelection,
  verifyLifeJourneyElsOccurrence,
} from "./lifeJourneyElsAdapter.js";

const occurrence = Object.freeze({
  occurrenceId: "els:torah-v1:sample:7:1:120",
  skip: 7,
  dir: 1,
  start: 120,
});
const projection = Object.freeze({
  corpusId: "torah-v1",
  corpusVersion: "v1",
  term: "שםבדיקה",
  occurrences: [occurrence],
});
const verifyResponse = Object.freeze({
  data: {
    result: {
      contract: "els_occurrence_replay_v1",
      status: "OK",
      verification_state: "MATCH",
      corpus_id: "torah-v1",
    },
  },
});

test("Life Journey prepares only the existing bounded automatic ELS plan", () => {
  const plan = prepareLifeJourneyElsPlan("שם בדיקה");
  assert.equal(plan.contract, "els_automatic_research_plan_v1");
  assert.equal(plan.scope, "torah");
  assert.equal(plan.skipMin, 2);
  assert.equal(plan.skipMax, 80);
  assert.equal(plan.sources.length, 1);
  assert.equal(plan.truthPromotion, false);
});

test("selected occurrence is canonically verified and converted to an exact load item", async () => {
  const calls = [];
  const result = await verifyLifeJourneyElsOccurrence({
    occurrence,
    projection,
    scope: "torah",
    invoke: async (request) => {
      calls.push(request);
      return verifyResponse;
    },
  });

  assert.equal(result.contract, LIFE_JOURNEY_ELS_ADAPTER_CONTRACT);
  assert.equal(result.ok, true);
  assert.deepEqual(
    { term: result.loadItem.term, scope: result.loadItem.scope, skip: result.loadItem.skip, dir: result.loadItem.dir, start: result.loadItem.start },
    { term: "שםבדיקה", scope: "torah", skip: 7, dir: 1, start: 120 },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, "verify");
});

test("persisted exact selection replays through the same canonical verifier", async () => {
  const selection = {
    entityType: "els",
    term: "שםבדיקה",
    corpus: "torah",
    corpusVersion: "v1",
    occurrenceId: occurrence.occurrenceId,
    skip: 7,
    dir: 1,
    start: 120,
  };
  const result = await replayLifeJourneyElsSelection(selection, async () => verifyResponse);
  assert.equal(result.ok, true);
  assert.equal(result.loadItem.hitId, "7_1_120");
});
