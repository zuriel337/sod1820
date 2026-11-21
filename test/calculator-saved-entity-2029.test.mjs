import test from "node:test";
import assert from "node:assert/strict";
import { applyResearchOps, emptyResearchState, entityIdentity } from "../src/lib/research/researchSyncState.js";
import {
  calculatorSavedExpressionHref,
  matchingSavedCalculatorPhrase,
  buildCalculatorSavedEntity,
  calculatorSaveChoice,
} from "../src/lib/research/calculatorSavedEntity2029.js";

const regular = { expression: "צוריאל", methodKey: "רגיל", methodLabel: "רגיל", resultValue: 337, methodVersion: 4 };
const triangular = { ...regular, methodKey: "משולש", methodLabel: "משולש", resultValue: 1472, methodVersion: 5 };

test("one link restores phrase + preferred method in the professional calculator, not the shared-result page", () => {
  const href = calculatorSavedExpressionHref(regular);
  assert.equal(href, "/gematria?q=%D7%A6%D7%95%D7%A8%D7%99%D7%90%D7%9C&m=%D7%A8%D7%92%D7%99%D7%9C");
  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("q"), "צוריאל");
  assert.equal(params.get("m"), "רגיל");
  assert.equal(params.has("v"), false);
  assert.equal(params.has("s"), false);
});

test("a second method updates the same phrase entity without creating extra saved rows", () => {
  const first = buildCalculatorSavedEntity(regular);
  const next = buildCalculatorSavedEntity(triangular, first);
  assert.equal(first.id, "phrase:צוריאל");
  assert.equal(entityIdentity(first), entityIdentity(next));
  const saved1 = applyResearchOps(emptyResearchState(), [{ kind: "item_upsert", bucket: "library", entity: first }]);
  const saved2 = applyResearchOps(saved1, [{ kind: "item_upsert", bucket: "library", entity: next }]);
  assert.equal(saved2.saved.length, 1);
  assert.equal(saved2.saved[0].metadata.method, "משולש");
  assert.equal(saved2.saved[0].metadata.savedResultValue, 1472);
});

test("updating a prior phrase keeps personal note, title, collection and unrelated metadata", () => {
  const previous = {
    id: "phrase:צוריאל", type: "phrase", ref: "צוריאל", title: "השם שלי",
    note: "מחקר פרטי", coll: "collection-1", addedAt: 1234,
    metadata: { origin: "number-page", personalFlag: true, value: 111 },
  };
  const next = buildCalculatorSavedEntity(regular, previous);
  assert.equal(next.title, "השם שלי");
  assert.equal(next.note, "מחקר פרטי");
  assert.equal(next.coll, "collection-1");
  assert.equal(next.addedAt, 1234);
  assert.equal(next.metadata.personalFlag, true);
  assert.equal(next.metadata.origin, "number-page");
  assert.equal(next.link, calculatorSavedExpressionHref(regular));
});

test("invalid or unfinished calculation is not saved", () => {
  for (const selection of [null, {}, { ...regular, resultValue: 0 }, { ...regular, resultValue: null }, { ...regular, methodKey: "" }]) {
    assert.equal(buildCalculatorSavedEntity(selection), null);
    assert.equal(calculatorSaveChoice(selection), "unavailable");
  }
});

test("UI choice respects the selected method and historical phrase saves", () => {
  const previous = buildCalculatorSavedEntity(regular);
  assert.equal(matchingSavedCalculatorPhrase(regular, [previous]), previous);
  assert.equal(calculatorSaveChoice(regular, [previous]), "saved");
  assert.equal(calculatorSaveChoice(triangular, [previous]), "update");
  assert.equal(calculatorSaveChoice(regular, []), "save");
  assert.equal(calculatorSaveChoice(regular, [{ type: "number", ref: "צוריאל" }]), "save");
  assert.equal(calculatorSaveChoice(regular, [{ type: "phrase", ref: "צוריאל", metadata: { value: 337 } }]), "update");
});

test("different expressions never share an identity or personal fields", () => {
  const prior = buildCalculatorSavedEntity(regular);
  const other = buildCalculatorSavedEntity({ ...regular, expression: "התגלות", resultValue: 1237 }, prior);
  assert.equal(other.ref, "התגלות");
  assert.notEqual(other.id, prior.id);
  assert.notEqual(entityIdentity(other), entityIdentity(prior));
});
