import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildCardExamples } from "./helpers/els-matrix-reading-card-examples.mjs";
import { groupReadingFindings, readingPhase } from "../src/lib/research/elsMatrixReadingClient.js";

const committed = (name) => JSON.parse(readFileSync(new URL(`./fixtures/els-matrix-reading/card-examples/${name}`, import.meta.url), "utf8"));

test("the committed card examples are exactly what the handler produces today (the examples cannot drift from the contract)", async () => {
  const fresh = await buildCardExamples();
  for (const [name, value] of Object.entries(fresh)) assert.deepEqual(committed(name), JSON.parse(JSON.stringify(value)), name);
});

test("every example is flagged as test data and none claims to be a live reading", async () => {
  for (const name of ["preview", "running", "complete", "incomplete-max-tokens", "error-admin-only"]) {
    const example = committed(`${name}.json`);
    assert.equal(example._fixture.is_test_fixture, true, name);
    assert.equal(example.response.is_test_fixture, true, name);
    assert.equal(example.response.contract, "els_matrix_reading_v1", name);
  }
});

test("the examples carry what a card needs, and a card can name the phase from them", () => {
  const phase = (name) => readingPhase(committed(`${name}.json`).response);
  assert.equal(phase("preview").phase, "preview");
  assert.equal(phase("running").phase, "running");
  assert.equal(phase("complete").phase, "complete");
  assert.deepEqual([phase("incomplete-max-tokens").phase, phase("incomplete-max-tokens").completed], ["incomplete", false]);
  assert.equal(phase("error-admin-only").phase, "error");
  const preview = committed("preview.json").response;
  assert.ok(preview.estimate.upper_bound_usd > 0 && preview.estimate.upper_bound_ils.status === "ESTIMATED" && preview.coverage.cells > 0 && preview.model.verified_available === true);
  const complete = committed("complete.json").response;
  assert.ok(complete.cost.usd > 0 && complete.cost.ils.status === "ESTIMATED" && complete.timing.elapsed_ms > 0 && complete.cap.meaning.includes("not proof"));
  const groups = groupReadingFindings(complete);
  assert.equal(groups.engineVerified.length, complete.summary.engine_verified);
  assert.equal(groups.isTestFixture, true, "the card can tell recorded test data from a real run");
});

test("a cut-off answer shows no findings but keeps the incurred cost; an unauthorised caller sees no spend", () => {
  const cut = committed("incomplete-max-tokens.json").response;
  assert.deepEqual([cut.state, cut.reason, cut.continuation_required, cut.findings.length], ["INCOMPLETE", "max_tokens", true, 0]);
  assert.ok(cut.cost.usd > 0);
  const denied = committed("error-admin-only.json").response;
  assert.deepEqual([denied.ok, denied.error], [false, "admin_only"]);
  assert.equal(denied.cost, undefined);
});
